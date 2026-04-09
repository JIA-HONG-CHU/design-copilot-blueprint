"""Observability primitives (WBS 11.4).

See ``metrics`` for the public surface: ``phase_timer`` and ``emit_counter``.
"""

from app.observability.metrics import emit_counter, phase_timer

__all__ = ["emit_counter", "phase_timer"]
