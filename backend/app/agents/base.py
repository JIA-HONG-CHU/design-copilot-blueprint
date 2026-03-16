"""Base agent utilities — shared LLM client and structured output helpers.

All agents use Anthropic SDK directly (not LangChain) for simplicity in v0.1.
LangGraph orchestration will be added in v0.2 for multi-step stateful flows.
"""

from __future__ import annotations

import functools
import json
import logging
import re
import time
from typing import TypeVar

from anthropic import (
    Anthropic,
    APIConnectionError,
    APIStatusError,
    AuthenticationError,
    BadRequestError,
    RateLimitError,
)
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: Anthropic | None = None

T = TypeVar("T")

# ---------------------------------------------------------------------------
# Retry decorator
# ---------------------------------------------------------------------------

_TRANSIENT_EXCEPTIONS = (RateLimitError, APIConnectionError)
_NON_RETRYABLE_EXCEPTIONS = (BadRequestError, AuthenticationError)
_MAX_RETRIES = 3
_BASE_BACKOFF = 1  # seconds


def retry_on_transient(fn):
    """Decorator that retries a function on transient Anthropic errors.

    Retries up to 3 times with exponential backoff (1s, 2s, 4s).
    Retries on: RateLimitError, APIConnectionError, APIStatusError (5xx only).
    Does NOT retry on: BadRequestError, AuthenticationError.
    """

    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        last_exc: Exception | None = None
        for attempt in range(_MAX_RETRIES + 1):  # 0, 1, 2, 3 = initial + 3 retries
            try:
                return fn(*args, **kwargs)
            except _NON_RETRYABLE_EXCEPTIONS:
                raise
            except _TRANSIENT_EXCEPTIONS as exc:
                last_exc = exc
            except APIStatusError as exc:
                if exc.status_code >= 500:
                    last_exc = exc
                else:
                    raise

            # If we've exhausted retries, re-raise
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

        raise last_exc  # type: ignore[misc]  # unreachable but satisfies type checker

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
# LLM client
# ---------------------------------------------------------------------------


def get_llm() -> Anthropic:
    global _client
    if _client is None:
        _client = Anthropic(api_key=settings.anthropic_api_key)
    return _client


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
    """Call Claude and return the text response."""
    _warn_if_high_token_usage(system, user_message, max_tokens)
    client = get_llm()
    response = client.messages.create(
        model=model or settings.default_model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=system,
        messages=[{"role": "user", "content": user_message}],
    )
    return response.content[0].text


@retry_on_transient
def call_llm_json(
    system: str,
    user_message: str,
    *,
    model: str | None = None,
    max_tokens: int = 4096,
    temperature: float = 0.2,
) -> str:
    """Call Claude requesting JSON output. Strips markdown fences if present."""
    _warn_if_high_token_usage(system, user_message, max_tokens)
    client = get_llm()
    response = client.messages.create(
        model=model or settings.default_model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=system + "\n\n回覆格式：純 JSON，不要 markdown code block。",
        messages=[{"role": "user", "content": user_message}],
    )
    raw = response.content[0].text
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
    """Call Claude for JSON, then parse into a Pydantic model.

    Parameters
    ----------
    response_model:
        A Pydantic BaseModel subclass to validate/parse the JSON into.
    """
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
