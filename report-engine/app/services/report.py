"""
services/report.py — Orchestrator: assembles all sub-module outputs
into the final structured report JSON.
"""

from __future__ import annotations
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from app.services.cost import cost_overview
from app.services.timeline import estimate_duration, timeline, feasibility_flag, confidence_score
from app.services.bom import generate_bom, equipment_plan
from app.services.workforce import workforce_distribution
from app.services.risk import risk_analysis, optimizations, procurement_sequence, assumptions

if TYPE_CHECKING:
    from app.models import ProjectInput


def build_report(inp: "ProjectInput") -> dict:
    """
    Entry point called by the FastAPI endpoint.
    Calls every calculation module and assembles the mandated output structure.

    Output matches the schema:
    {
        "meta": { ... },
        "summary": { ... },
        "cost": { ... },
        "timeline": [ ... ],
        "bom": [ ... ],
        "workforce": { ... },
        "equipment": [ ... ],
        "risks": [ ... ],
        "optimizations": [ ... ],
        "procurement": [ ... ],
        "assumptions": [ ... ]
    }
    """
    # ── Core computations ─────────────────────────────────────────────────────
    cost = cost_overview(inp)
    dur = estimate_duration(inp)
    tl = timeline(inp)
    bom = generate_bom(inp)
    eq = equipment_plan(inp)
    wf = workforce_distribution(inp)
    risks = risk_analysis(inp)
    opts = optimizations(inp)
    proc = procurement_sequence(inp)
    assum = assumptions(inp)

    feasibility = feasibility_flag(inp, cost["grand_total"])
    confidence = confidence_score(inp, cost["grand_total"])

    # ── Assemble ──────────────────────────────────────────────────────────────
    return {
        "meta": {
            "project_name": inp.project_name,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "engine_version": "1.0.0",
            "engine_type": "Deterministic Rule-Based (No AI/ML)",
        },
        "summary": {
            "est_days": dur["days"],
            "est_months": dur["months"],
            "est_cost": cost["grand_total"],
            "budget": inp.budget,
            "budget_variance_inr": round(inp.budget - cost["grand_total"], 2),
            "budget_variance_pct": round(
                (inp.budget - cost["grand_total"]) / inp.budget * 100, 1
            ) if inp.budget else 0,
            "feasibility": feasibility,
            "confidence": confidence,
            "area_sqft": inp.area,
            "total_floors": inp.floors,
            "project_type": inp.project_type,
            "priority": inp.priority,
        },
        "cost": cost,
        "timeline": tl,
        "bom": bom,
        "workforce": wf,
        "equipment": eq,
        "risks": risks,
        "optimizations": opts,
        "procurement": proc,
        "assumptions": assum,
    }
