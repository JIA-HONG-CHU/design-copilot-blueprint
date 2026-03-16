"""Gate Checking: unified quality gate verification.

SOW Module: Gate 檢查 (gates)
SOW Endpoints:
  - GET /gates/{gate_id}/check  ← 8 gate variants (1.1, 1.2, PG1, 2.1, 2.2, PG2, 3.2, PG3)

NOTE: Gate checks query Supabase to count artifacts. Requires service-role key.
"""

from fastapi import APIRouter, HTTPException

from app.models.schemas import GateCheckResponse, GateCheckItem
from app.core.supabase import get_supabase

router = APIRouter()

VALID_GATES = {"1.1", "1.2", "PG1", "2.1", "2.2", "PG2", "3.2", "PG3"}


@router.get("/gates/{gate_id}/check", response_model=GateCheckResponse)
async def gates_check(gate_id: str, project_id: str):
    """Check whether a project passes the specified quality gate.

    gate_id: 1.1 | 1.2 | PG1 | 2.1 | 2.2 | PG2 | 3.2 | PG3
    """
    if gate_id not in VALID_GATES:
        raise HTTPException(status_code=400, detail=f"Invalid gate_id: {gate_id}. Valid: {VALID_GATES}")

    sb = get_supabase()
    checklist: list[GateCheckItem] = []
    failed_reasons: list[str] = []

    if gate_id == "1.1":
        # Mission defined + ≥3 KPIs with measurement method
        brief = sb.table("briefs").select("mission").eq("project_id", project_id).maybe_single().execute()
        has_mission = bool(brief.data and brief.data.get("mission"))
        checklist.append(GateCheckItem(label="Mission 已定義", met=has_mission))
        if not has_mission:
            failed_reasons.append("Mission 尚未定義")

        kpis = sb.table("kpis").select("id, measurement_method").eq("project_id", project_id).execute()
        kpi_count = len(kpis.data) if kpis.data else 0
        kpi_with_method = sum(1 for k in (kpis.data or []) if k.get("measurement_method"))
        checklist.append(GateCheckItem(label=f"KPI 數量 ≥ 3（現有 {kpi_count}）", met=kpi_count >= 3))
        checklist.append(GateCheckItem(label=f"KPI 皆有量測方法（{kpi_with_method}/{kpi_count}）", met=kpi_with_method >= kpi_count and kpi_count >= 3))
        if kpi_count < 3:
            failed_reasons.append(f"KPI 不足：需要 ≥3，目前 {kpi_count}")

    elif gate_id == "1.2":
        # ≥10 assumptions + ≥3 high-risk + ≥3 contradictions
        assumptions = sb.table("assumptions").select("id, worst_severity").eq("project_id", project_id).execute()
        a_count = len(assumptions.data) if assumptions.data else 0
        high_risk = sum(1 for a in (assumptions.data or []) if a.get("worst_severity") in ("critical", "high"))
        checklist.append(GateCheckItem(label=f"假設 ≥ 10（現有 {a_count}）", met=a_count >= 10))
        checklist.append(GateCheckItem(label=f"高風險假設 ≥ 3（現有 {high_risk}）", met=high_risk >= 3))
        if a_count < 10:
            failed_reasons.append(f"假設不足：需要 ≥10，目前 {a_count}")

        contradictions = sb.table("contradictions").select("id", count="exact").eq("project_id", project_id).execute()
        c_count = contradictions.count or 0
        checklist.append(GateCheckItem(label=f"矛盾 ≥ 3（現有 {c_count}）", met=c_count >= 3))
        if c_count < 3:
            failed_reasons.append(f"矛盾不足：需要 ≥3，目前 {c_count}")

    elif gate_id == "PG1":
        # ≥1 CLD + ≥3 breakpoints + contradictions formalized
        cld_nodes = sb.table("cld_nodes").select("id", count="exact").eq("project_id", project_id).execute()
        has_cld = (cld_nodes.count or 0) > 0
        checklist.append(GateCheckItem(label="CLD 已建立", met=has_cld))
        if not has_cld:
            failed_reasons.append("尚未建立因果迴路圖")

        breakpoints = sb.table("cld_nodes").select("id", count="exact").eq("project_id", project_id).eq("is_leverage", True).execute()
        bp_count = breakpoints.count or 0
        checklist.append(GateCheckItem(label=f"Breakpoints ≥ 3（現有 {bp_count}）", met=bp_count >= 3))
        if bp_count < 3:
            failed_reasons.append(f"Breakpoints 不足：需要 ≥3，目前 {bp_count}")

    elif gate_id == "2.1":
        # ≥3 high-risk assumptions with experiments
        experiments = sb.table("experiments").select("assumption_code").eq("project_id", project_id).execute()
        exp_codes = {e.get("assumption_code") for e in (experiments.data or [])}
        assumptions = sb.table("assumptions").select("code, worst_severity").eq("project_id", project_id).execute()
        high_risk_with_exp = sum(1 for a in (assumptions.data or []) if a.get("worst_severity") in ("critical", "high") and a.get("code") in exp_codes)
        checklist.append(GateCheckItem(label=f"高風險假設有實驗 ≥ 3（現有 {high_risk_with_exp}）", met=high_risk_with_exp >= 3))
        if high_risk_with_exp < 3:
            failed_reasons.append(f"高風險假設缺少實驗：需要 ≥3，目前 {high_risk_with_exp}")

    elif gate_id == "2.2":
        # ≥3 alternatives + all MUST passed
        alternatives = sb.table("alternatives").select("id, must_scores, overall_pass").eq("project_id", project_id).execute()
        alt_count = len(alternatives.data) if alternatives.data else 0
        checklist.append(GateCheckItem(label=f"方案 ≥ 3（現有 {alt_count}）", met=alt_count >= 3))
        if alt_count < 3:
            failed_reasons.append(f"方案不足：需要 ≥3，目前 {alt_count}")

    elif gate_id == "PG2":
        # ≥1 Pre-CAD overall_pass
        passed = sb.table("alternatives").select("id", count="exact").eq("project_id", project_id).eq("overall_pass", True).execute()
        pass_count = passed.count or 0
        checklist.append(GateCheckItem(label=f"Pre-CAD 通過 ≥ 1（現有 {pass_count}）", met=pass_count >= 1))
        if pass_count < 1:
            failed_reasons.append("尚無方案通過 Pre-CAD 審查")

    elif gate_id == "3.2":
        # Decision signed + WANT has evidence
        decisions = sb.table("decisions").select("status").eq("project_id", project_id).execute()
        has_signed = any(d.get("status") in ("confirmed", "signed") for d in (decisions.data or []))
        checklist.append(GateCheckItem(label="決策記錄已簽核", met=has_signed))
        if not has_signed:
            failed_reasons.append("決策記錄尚未簽核")

    elif gate_id == "PG3":
        # All core artifacts released
        checklist.append(GateCheckItem(label="所有核心 artifacts 已發佈", met=False, detail="需人工確認"))
        failed_reasons.append("Phase Gate 3 需人工確認所有 artifacts 狀態")

    passed = len(failed_reasons) == 0
    return GateCheckResponse(
        gate_id=gate_id,
        passed=passed,
        failed_reasons=failed_reasons,
        checklist_items=checklist,
    )
