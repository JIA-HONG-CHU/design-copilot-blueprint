"""FastAPI application entry point.

Ref: AI_Agent_Architecture.md §6.1 — FastAPI backend for multi-agent orchestration.
"""

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import setup_logging
from app.middleware.auth import get_current_user
from app.middleware.error_handler import register_error_handlers
from app.middleware.request_id import RequestIDMiddleware
from app.routers import (
    brief, socratic, cld, anti_anchor, triz, scamper,
    risk, action, convergence, must,
    contradictions, assumptions, pre_cad, want, gates, exports, knowledge_wb,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up TRIZ KB cache on startup
    from app.tools.triz_kb import load_39_parameters, load_40_principles
    try:
        load_39_parameters()
        load_40_principles()
    except FileNotFoundError:
        pass  # KB files may not exist in test/CI
    yield


setup_logging()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

register_error_handlers(app)

app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth dependency applied to all business routers.
# Health and docs endpoints remain public (no auth required).
# To apply per-router instead:
#   router = APIRouter(dependencies=[Depends(get_current_user)])
_auth = [Depends(get_current_user)]

# Register routers — aligned with SOW module naming
app.include_router(brief.router, prefix="/api/v1", tags=["任務定義 definitions"], dependencies=_auth)
app.include_router(socratic.router, prefix="/api/v1", tags=["索克拉底問答 questions"], dependencies=_auth)
app.include_router(cld.router, prefix="/api/v1", tags=["因果迴路 causal-loops"], dependencies=_auth)
app.include_router(contradictions.router, prefix="/api/v1", tags=["矛盾管理 contradictions"], dependencies=_auth)
app.include_router(assumptions.router, prefix="/api/v1", tags=["假設台帳 assumptions"], dependencies=_auth)
app.include_router(anti_anchor.router, prefix="/api/v1", tags=["方案管理 alternatives"], dependencies=_auth)
app.include_router(triz.router, prefix="/api/v1", tags=["TRIZ 求解 triz"], dependencies=_auth)
app.include_router(scamper.router, prefix="/api/v1", tags=["SCAMPER scamper"], dependencies=_auth)
app.include_router(risk.router, prefix="/api/v1", tags=["風險登錄 risks"], dependencies=_auth)
app.include_router(action.router, prefix="/api/v1", tags=["行動建議 actions"], dependencies=_auth)
app.include_router(convergence.router, prefix="/api/v1", tags=["收斂掃描 convergence"], dependencies=_auth)
app.include_router(must.router, prefix="/api/v1", tags=["MUST 篩選 must"], dependencies=_auth)
app.include_router(pre_cad.router, prefix="/api/v1", tags=["Pre-CAD 審查 pre-cad-reviews"], dependencies=_auth)
app.include_router(want.router, prefix="/api/v1", tags=["WANT 評分 want"], dependencies=_auth)
app.include_router(gates.router, prefix="/api/v1", tags=["Gate 檢查 gates"], dependencies=_auth)
app.include_router(exports.router, prefix="/api/v1", tags=["匯出 export"], dependencies=_auth)
app.include_router(knowledge_wb.router, prefix="/api/v1", tags=["知識回寫 knowledge"], dependencies=_auth)


@app.get("/health")
async def health():
    return {"status": "ok"}
