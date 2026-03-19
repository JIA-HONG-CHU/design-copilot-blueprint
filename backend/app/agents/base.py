"""Base agent utilities — shared LLM client and structured output helpers.

Supports multiple LLM providers (Anthropic / OpenAI / Azure OpenAI / Gemini /
Qwen) via config.llm_provider. LangGraph orchestration will be added in v0.2.
"""

from __future__ import annotations

import functools
import json
import logging
import re
import time
from typing import Protocol, TypeVar

from pydantic import BaseModel

from app.core.config import LLMProvider, settings

logger = logging.getLogger(__name__)

T = TypeVar("T")

# ---------------------------------------------------------------------------
# Retry decorator (provider-agnostic)
# ---------------------------------------------------------------------------

_MAX_RETRIES = 3
_BASE_BACKOFF = 1  # seconds


def _is_transient(exc: Exception) -> bool:
    """Return True if the exception is transient and should be retried."""
    # Anthropic SDK
    try:
        from anthropic import APIConnectionError as AConn, RateLimitError as ARL, APIStatusError as ASt
        if isinstance(exc, (ARL, AConn)):
            return True
        if isinstance(exc, ASt) and exc.status_code >= 500:
            return True
    except ImportError:
        pass

    # OpenAI SDK
    try:
        from openai import APIConnectionError as OConn, RateLimitError as ORL, APIStatusError as OSt
        if isinstance(exc, (ORL, OConn)):
            return True
        if isinstance(exc, OSt) and exc.status_code >= 500:
            return True
    except ImportError:
        pass

    return False


def _is_non_retryable(exc: Exception) -> bool:
    """Return True if the exception should NOT be retried."""
    try:
        from anthropic import BadRequestError as ABR, AuthenticationError as AAE
        if isinstance(exc, (ABR, AAE)):
            return True
    except ImportError:
        pass
    try:
        from openai import BadRequestError as OBR, AuthenticationError as OAE
        if isinstance(exc, (OBR, OAE)):
            return True
    except ImportError:
        pass
    return False


def retry_on_transient(fn):
    """Decorator that retries on transient LLM API errors.

    Retries up to 3 times with exponential backoff (1s, 2s, 4s).
    Works with both Anthropic and OpenAI SDKs.
    """

    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        last_exc: Exception | None = None
        for attempt in range(_MAX_RETRIES + 1):
            try:
                return fn(*args, **kwargs)
            except Exception as exc:
                if _is_non_retryable(exc):
                    raise
                if _is_transient(exc):
                    last_exc = exc
                else:
                    raise

            if attempt == _MAX_RETRIES:
                raise last_exc  # type: ignore[misc]

            delay = _BASE_BACKOFF * (2 ** attempt)
            logger.warning(
                "LLM call failed (attempt %d/%d), retrying in %ds: %s",
                attempt + 1,
                _MAX_RETRIES + 1,
                delay,
                last_exc,
            )
            time.sleep(delay)

        raise last_exc  # type: ignore[misc]

    return wrapper


# ---------------------------------------------------------------------------
# JSON response cleaning
# ---------------------------------------------------------------------------

_CODE_FENCE_RE = re.compile(r"^```(?:json)?\s*\n(.*?)\n```\s*$", re.DOTALL)


def _strip_code_fences(text: str) -> str:
    """Remove markdown code fences (```json ... ```) from LLM output."""
    m = _CODE_FENCE_RE.match(text.strip())
    return m.group(1).strip() if m else text.strip()


# ---------------------------------------------------------------------------
# Token estimation + warning
# ---------------------------------------------------------------------------


def _estimate_tokens(text: str) -> int:
    """Rough token count: chars / 4 approximation."""
    return len(text) // 4


def _warn_if_high_token_usage(system: str, user_message: str, max_tokens: int) -> None:
    """Log a warning if the estimated input tokens exceed 80% of max_tokens."""
    estimated = _estimate_tokens(system + user_message)
    threshold = int(max_tokens * 0.8)
    if estimated > threshold:
        logger.warning(
            "Estimated input token count (%d) exceeds 80%% of max_tokens (%d). "
            "Consider increasing max_tokens or shortening the prompt.",
            estimated,
            max_tokens,
        )


# ---------------------------------------------------------------------------
# LLM clients — provider-agnostic singleton
# ---------------------------------------------------------------------------

_anthropic_client = None
# OpenAI-compatible clients keyed by provider name
_openai_compat_clients: dict[str, object] = {}


def _get_anthropic():
    global _anthropic_client
    if _anthropic_client is None:
        from anthropic import Anthropic

        kwargs: dict = {}

        # Azure proxy 指向 Anthropic 的場景
        if settings.llm_provider == LLMProvider.AZURE_OPENAI:
            base_url = (settings.azure_openai_base_url or "").lower()
            if "anthropic" in base_url:
                kwargs["api_key"] = settings.azure_openai_api_key
                kwargs["base_url"] = settings.azure_openai_base_url

        if "api_key" not in kwargs:
            kwargs["api_key"] = settings.anthropic_api_key

        _anthropic_client = Anthropic(**kwargs)
    return _anthropic_client


def _get_openai_compat(provider: LLMProvider):
    """Get or create an OpenAI-compatible client for the given provider.

    Works for: openai, azure_openai, gemini, qwen — all use the OpenAI SDK
    with different base_url / api_key combinations.
    """
    key = provider.value
    if key not in _openai_compat_clients:
        from openai import OpenAI
        cfg = {
            LLMProvider.OPENAI: {
                "api_key": settings.openai_api_key,
            },
            LLMProvider.AZURE_OPENAI: {
                "api_key": settings.azure_openai_api_key,
                "base_url": settings.azure_openai_base_url or None,
            },
            LLMProvider.GEMINI: {
                "api_key": settings.gemini_api_key,
                "base_url": settings.gemini_base_url,
            },
            LLMProvider.QWEN: {
                "api_key": settings.qwen_api_key,
                "base_url": settings.qwen_base_url,
            },
        }
        params = {k: v for k, v in cfg[provider].items() if v}
        _openai_compat_clients[key] = OpenAI(**params)
    return _openai_compat_clients[key]


def _call_anthropic(
    system: str,
    user_message: str,
    *,
    model: str | None = None,
    max_tokens: int = 4096,
    temperature: float = 0.3,
) -> str:
    client = _get_anthropic()
    response = client.messages.create(
        model=model or settings.default_model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=system,
        messages=[{"role": "user", "content": user_message}],
    )
    return response.content[0].text


def _call_openai_compat(
    system: str,
    user_message: str,
    *,
    provider: LLMProvider,
    model: str | None = None,
    max_tokens: int = 4096,
    temperature: float = 0.3,
) -> str:
    """Call any OpenAI-compatible provider (OpenAI / Azure / Gemini / Qwen)."""
    client = _get_openai_compat(provider)
    response = client.chat.completions.create(
        model=model or settings.default_model,
        max_tokens=max_tokens,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_message},
        ],
    )
    return response.choices[0].message.content or ""


def _call_provider(
    system: str,
    user_message: str,
    *,
    model: str | None = None,
    max_tokens: int = 4096,
    temperature: float = 0.3,
) -> str:
    """Route to the active LLM provider."""
    use_anthropic = settings.llm_provider == LLMProvider.ANTHROPIC

    # Azure OpenAI 但 base_url 指向 Anthropic → 走 Anthropic
    if settings.llm_provider == LLMProvider.AZURE_OPENAI:
        base_url = (settings.azure_openai_base_url or "").lower()
        if "anthropic" in base_url:
            use_anthropic = True

    if use_anthropic:
        return _call_anthropic(system, user_message, model=model, max_tokens=max_tokens, temperature=temperature)
    return _call_openai_compat(
        system, user_message,
        provider=settings.llm_provider,
        model=model, max_tokens=max_tokens, temperature=temperature,
    )

# Keep backward-compatible accessor
def get_llm():
    """Return the Anthropic client (for legacy callers)."""
    return _get_anthropic()


# ---------------------------------------------------------------------------
# LLM call functions
# ---------------------------------------------------------------------------


@retry_on_transient
def call_llm_structured(
    system: str,
    user_message: str,
    *,
    model: str | None = None,
    max_tokens: int = 4096,
    temperature: float = 0.3,
) -> str:
    """Call LLM and return the text response."""
    _warn_if_high_token_usage(system, user_message, max_tokens)
    return _call_provider(system, user_message, model=model, max_tokens=max_tokens, temperature=temperature)


@retry_on_transient
def call_llm_json(
    system: str,
    user_message: str,
    *,
    model: str | None = None,
    max_tokens: int = 4096,
    temperature: float = 0.2,
) -> str:
    """Call LLM requesting JSON output. Strips markdown fences if present."""
    _warn_if_high_token_usage(system, user_message, max_tokens)
    json_system = system + "\n\n回覆格式：純 JSON，不要 markdown code block。"
    raw = _call_provider(json_system, user_message, model=model, max_tokens=max_tokens, temperature=temperature)
    return _strip_code_fences(raw)


def call_llm_json_parsed(
    system: str,
    user_message: str,
    *,
    response_model: type[T],
    model: str | None = None,
    max_tokens: int = 4096,
    temperature: float = 0.2,
) -> T:
    """Call LLM for JSON, then parse into a Pydantic model."""
    raw_json = call_llm_json(
        system,
        user_message,
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    data = json.loads(raw_json)
    if isinstance(response_model, type) and issubclass(response_model, BaseModel):
        return response_model.model_validate(data)  # type: ignore[return-value]
    raise TypeError(f"response_model must be a Pydantic BaseModel subclass, got {response_model}")
