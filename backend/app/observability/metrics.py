"""Lightweight structured metric emitter (WBS 11.4).

No external deps — writes JSON-shaped log lines through the stdlib logger
configured for the backend. Downstream log aggregators (Grafana Loki,
Datadog, etc.) can parse these fields without our code caring which one
is wired up.

Two surface primitives:
  - ``phase_timer(name, **labels)`` — context manager; emits a single
    ``metric.phase`` log line on exit with ``duration_ms``, ``name``, and
    labels.
  - ``emit_counter(name, value=1, **labels)`` — emits a ``metric.counter``
    log line, used for outcomes like llm_json_parse_fail, tavily_timeout.

Field schema (locked in tests)::

    {
      "metric": "phase" | "counter",
      "name": "<string>",
      "duration_ms": <float>,        # phase only
      "value": <int>,                # counter only
      "labels": { ...arbitrary... }, # never None
      "status": "ok" | "error" | "fallback",  # phase only
      "error_type": "<ExceptionClassName>",   # phase only, when status=error
    }

Emission style: the payload is serialized to JSON and passed as the log
message *text* (not ``extra=``). Rationale: the backend's ``JSONFormatter``
(``app.core.logging``) already wraps every record in its own JSON envelope
and only surfaces ``record.getMessage()`` as the ``message`` field. Emitting
via ``extra=`` would silently drop our fields unless we taught the formatter
about them. A JSON message string is trivially parseable by both the
formatter-wrapped path (``message`` contains the JSON) and tests that read
``caplog.records`` directly (``record.getMessage()`` returns it verbatim).
"""

from __future__ import annotations

import contextlib
import json
import logging
import time
from typing import Any, Iterator

logger = logging.getLogger("metrics")


def _emit(payload: dict[str, Any]) -> None:
    """Serialize ``payload`` to JSON and log it at INFO level."""
    try:
        msg = json.dumps(payload, ensure_ascii=False, default=str)
    except (TypeError, ValueError):
        # Never let observability break the caller — fall back to repr.
        msg = json.dumps({"metric": payload.get("metric", "unknown"),
                          "name": payload.get("name", "unknown"),
                          "labels": {"_serialization_error": True}})
    logger.info(msg)


@contextlib.contextmanager
def phase_timer(name: str, **labels: Any) -> Iterator[dict[str, Any]]:
    """Context manager that emits a ``metric.phase`` line on exit.

    On exception, the metric is emitted with ``status="error"`` and
    ``error_type`` set to the exception class name, then the exception is
    re-raised. This is an observability layer — it never swallows errors.

    The yielded dict can be mutated by the caller to set ``status`` to
    ``"fallback"`` or to add ad-hoc fields before emission.
    """
    state: dict[str, Any] = {"status": "ok"}
    start = time.perf_counter()
    try:
        yield state
    except BaseException as exc:
        duration_ms = (time.perf_counter() - start) * 1000.0
        _emit({
            "metric": "phase",
            "name": name,
            "duration_ms": duration_ms,
            "status": "error",
            "error_type": type(exc).__name__,
            "labels": dict(labels),
        })
        raise
    else:
        duration_ms = (time.perf_counter() - start) * 1000.0
        _emit({
            "metric": "phase",
            "name": name,
            "duration_ms": duration_ms,
            "status": state.get("status", "ok"),
            "labels": dict(labels),
        })


def emit_counter(name: str, value: int = 1, **labels: Any) -> None:
    """Emit a ``metric.counter`` line.

    ``value`` is coerced to ``int`` so downstream parsers never see a float
    where a discrete count is expected.
    """
    _emit({
        "metric": "counter",
        "name": name,
        "value": int(value),
        "labels": dict(labels),
    })
