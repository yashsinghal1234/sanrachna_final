"""
services/planning_adapter.py
────────────────────────────
Bridges the React PlanningFormValues → internal ProjectInput,
runs the calculation engine, then maps the full engine output
back to the PlanningReport shape expected by the React frontend.

No AI / LLM used anywhere in this file.
"""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Optional

from app.models import ProjectInput
from app.models_planning import (
    PlanningFormValues,
    PlanningReport,
    ExecutiveSummary,
    CostBreakdown, CostPhase,
    BillOfMaterialRow,
    WorkforcePlan, WorkforceByTrade,
    EquipmentRow,
    TimelinePlan, TimelinePhase,
    RiskRow,
    OptimizationRow,
)
from app.services.cost import cost_overview
from app.services.timeline import estimate_duration, feasibility_flag, confidence_score, timeline
from app.services.bom import generate_bom, equipment_plan
from app.services.workforce import workforce_distribution
from app.services.risk import risk_analysis, optimizations, assumptions


# ── Unit rates for BOM cost calculation (INR, 2025 benchmarks) ────────────────

UNIT_RATES: dict[str, float] = {
    "Cement (bags 50 kg)":           400,
    "TMT Steel (MT)":                65_000,
    "Brick / Block Masonry (units)": 8,
    "River Sand / M-Sand (cu.ft)":   35,
    "Coarse Aggregate (cu.ft)":      28,
    "Plaster Sand (cu.ft)":          30,
    "Shuttering Plywood (sqft)":     55,
    "Binding Wire (kg)":             80,
    "PCC / Concrete (cu.ft)":        250,
    "Tiles / Flooring (sqft)":       90,
    "Paint (litre)":                 180,
    "Electrical Conduit (m)":        45,
    "GI Pipes (m)":                  320,
    "CPVC / PVC Pipes (m)":          150,
}


# ── Value mapping helpers ─────────────────────────────────────────────────────

def _map_project_type(v: str) -> str:
    v = v.lower()
    if "commercial" in v or "office" in v or "retail" in v or "shop" in v:
        return "commercial"
    if "industrial" in v or "factory" in v or "warehouse" in v:
        return "industrial"
    return "residential"


def _map_construction_type(v: str) -> str:
    v = v.lower()
    if "renovation" in v or "refurb" in v:
        return "renovation"
    if "extension" in v or "addition" in v:
        return "extension"
    return "new"


def _map_priority(v: str) -> str:
    v = v.lower()
    if "low_cost" in v or "low cost" in v or "economic" in v or "economy" in v:
        return "low_cost"
    if "fast" in v or "urgent" in v or "speed" in v:
        return "fastest"
    if "premium" in v or "high end" in v:
        return "premium"
    return "balanced"


def _map_structure(v: str) -> str:
    v = v.upper()
    if "STEEL" in v:
        return "steel"
    if "COMPOSITE" in v or "HYBRID" in v:
        return "composite"
    return "RCC"


def _map_soil(v: str) -> str:
    v = v.lower()
    if "soft" in v or "clay" in v or "loose" in v or "fill" in v:
        return "soft"
    if "hard" in v or "rock" in v or "gravel" in v:
        return "hard"
    return "medium"


def _map_seismic(v: str) -> str:
    for z in ("V", "IV", "III", "II", "I"):
        if z in v.upper():
            return z
    return "II"


def _map_finish(v: str) -> str:
    v = v.lower()
    if "premium" in v or "luxury" in v or "high" in v:
        return "premium"
    if "economy" in v or "basic" in v or "low" in v:
        return "economy"
    return "standard"


def _map_shift(v: str) -> str:
    v = v.lower()
    if "double" in v or "two" in v or "2" in v:
        return "double"
    if "night" in v:
        return "night"
    return "single"


def _map_access(v: str) -> str:
    v = v.lower()
    if "congest" in v or "narrow" in v or "restrict" in v:
        return "congested"
    if "limit" in v or "difficult" in v or "poor" in v:
        return "limited"
    return "good"


def _map_location(v: str) -> str:
    v = v.lower()
    if "rural" in v or "remote" in v or "village" in v:
        return "rural"
    if "semi" in v or "suburb" in v or "peri" in v:
        return "semi-urban"
    return "urban"


def _parse_workers(raw: str) -> int:
    """Extract integer from strings like '50', '30-50', '~40', 'about 60'."""
    digits = re.findall(r"\d+", raw or "")
    if not digits:
        return 20
    nums = [int(d) for d in digits]
    return max(1, round(sum(nums) / len(nums)))


def _deadline_days(target_date: str, construction_type_raw: str) -> int:
    """
    Compute the number of calendar days from today to the target date.
    If the date is missing or invalid, fall back to heuristic defaults.
    """
    try:
        d = date.fromisoformat(target_date)
        delta = (d - date.today()).days
        if delta > 0:
            return delta
    except (ValueError, TypeError):
        pass
    # Fallback by construction type
    ct = _map_construction_type(construction_type_raw)
    return {"new": 540, "renovation": 270, "extension": 360}.get(ct, 540)


# ── Main adapter ──────────────────────────────────────────────────────────────

def planning_form_to_project_input(form: PlanningFormValues) -> ProjectInput:
    """Convert React PlanningFormValues → Python ProjectInput for the engine."""
    workers = _parse_workers(form.availableWorkforce)
    floors = form.numberOfFloors or 1
    area = float(form.builtUpArea)
    plot_area = float(form.plotArea)

    # Safety: ensure plot_area ≥ area (single floor footprint)
    if plot_area < area / floors:
        plot_area = area / floors * 1.05

    return ProjectInput(
        project_name=form.projectName,
        area=area,
        plot_area=plot_area,
        floors=floors,
        floor_height=form.floorHeightFt or 10.0,
        project_type=_map_project_type(form.projectType),
        construction_type=_map_construction_type(form.constructionType),
        priority=_map_priority(form.priorityMode),
        structure_type=_map_structure(form.structuralSystem),
        soil_type=_map_soil(form.soilCondition),
        seismic_zone=_map_seismic(form.seismicZone),
        concrete_grade=form.concreteGrade or form.cementGrade or "M25",
        steel_grade=form.steelGrade or "Fe500",
        finish_quality=_map_finish(form.finishQuality),
        budget=float(form.totalBudget),
        deadline_days=_deadline_days(form.targetCompletionDate, form.constructionType),
        workers_available=workers,
        shift_type=_map_shift(form.shiftPolicy),
        site_access=_map_access(form.siteAccessibility),
        location_type=_map_location(form.locationType),
        seasonal_risk=form.seasonalConstraints or "none",
    )


def _feasibility_to_frontend(flag: str) -> str:
    """Map engine feasibility flag to frontend enum."""
    if "Over Budget" in flag or "Non-viable" in flag:
        return "Challenging" if "Tight" not in flag else "Not Feasible"
    if "Tight" in flag:
        return "Challenging"
    return "Feasible"


def _build_timeline_phases(engine_tl: list[dict], dur_months: float) -> list[TimelinePhase]:
    """Convert engine timeline (days) to frontend timeline (months with milestones)."""
    phase_milestones = {
        "Design & Approvals": [
            "Structural drawings complete",
            "Building plan approved",
            "BOQ and tender finalized",
        ],
        "Structural Works": [
            "Foundation & plinth complete",
            "All slab levels cast",
            "Brick/block masonry done",
            "Structural steel / topping slab complete",
        ],
        "Finishing Works": [
            "Plaster & waterproofing complete",
            "MEP rough-in done",
            "Tiles & flooring laid",
            "Final paint, fixtures & handover",
        ],
    }
    result = []
    for ph in engine_tl:
        months = round(ph["duration_days"] / 26, 1)  # 26 working days/month
        result.append(TimelinePhase(
            name=ph["phase"],
            months=months,
            milestones=phase_milestones.get(ph["phase"], ["Phase complete"]),
        ))
    return result


def _build_bom_rows(engine_bom: list[dict]) -> list[BillOfMaterialRow]:
    rows = []
    for item in engine_bom:
        rate = UNIT_RATES.get(item["item"], 100)
        rows.append(BillOfMaterialRow(
            material=item["item"],
            quantity=item["quantity"],
            unit=item["unit"],
            unitRate=rate,
            totalCost=round(item["quantity"] * rate, 2),
        ))
    return rows


def _build_equipment_rows(engine_eq: list[dict]) -> list[EquipmentRow]:
    rows = []
    for eq in engine_eq:
        action = eq.get("action", "Rent")
        if action == "N/A":
            rec = "Not needed"
        elif action == "Buy":
            rec = "Buy"
        else:
            rec = "Rent"
        rows.append(EquipmentRow(
            name=eq["equipment"],
            recommendation=rec,
            reason=eq.get("note", ""),
        ))
    return rows


def _build_risks(engine_risks: list[dict]) -> list[RiskRow]:
    rows = []
    for r in engine_risks:
        rows.append(RiskRow(
            risk=f"[{r['category']}] {r['description'][:120]}",
            level=r["severity"],
            mitigation=r["mitigation"][:200],
        ))
    return rows


def _build_optimizations(engine_opts: list[dict]) -> list[OptimizationRow]:
    rows = []
    for o in engine_opts:
        saving_str = o.get("expected_saving", "")
        # Try to parse a numeric saving from the string (e.g. "₹200–₹400 / sqft")
        amounts = re.findall(r"[\d,]+", saving_str.replace("₹", "").replace(",", ""))
        saving_num = float(amounts[0]) if amounts else None
        rows.append(OptimizationRow(
            suggestion=o["suggestion"][:150],
            impact=o["expected_saving"],
            savingAmount=saving_num,
        ))
    return rows


def _major_risks(engine_risks: list[dict]) -> list[str]:
    """Top 4 high-priority risk one-liners for the executive summary."""
    top = [r for r in engine_risks if r["severity"] == "High"][:4]
    if not top:
        top = engine_risks[:4]
    return [f"{r['category']}: {r['description'][:80]}" for r in top]


def generate_planning_report(form: PlanningFormValues) -> PlanningReport:
    """
    Full pipeline:
        PlanningFormValues → ProjectInput → engine → PlanningReport
    Pure deterministic; no AI, no external calls.
    """
    inp = planning_form_to_project_input(form)

    # Run all engine functions
    cost = cost_overview(inp)
    dur = estimate_duration(inp)
    tl_phases = timeline(inp)
    bom = generate_bom(inp)
    eq = equipment_plan(inp)
    wf = workforce_distribution(inp)
    risks = risk_analysis(inp)
    opts = optimizations(inp)
    assum = assumptions(inp)

    feasibility_raw = feasibility_flag(inp, cost["grand_total"])
    confidence = confidence_score(inp, cost["grand_total"])
    feasibility_fe = _feasibility_to_frontend(feasibility_raw)

    # Cost phases for frontend (percent-based)
    cost_phases = [
        CostPhase(name=p["phase"], cost=p["amount"], percent=p["percentage"])
        for p in cost["breakdown"]
    ]

    # Workforce for frontend
    wf_by_trade = [
        WorkforceByTrade(
            trade=t["trade"],
            count=t["count"],
            phase="Structural Works" if t["trade"] in ("Masons", "Bar Benders", "Carpenters")
                  else "MEP & Finishing",
        )
        for t in wf["trades"]
    ]

    # Timeline
    tl_fe_phases = _build_timeline_phases(tl_phases, dur["months"])
    total_months = sum(p.months for p in tl_fe_phases)

    return PlanningReport(
        executiveSummary=ExecutiveSummary(
            feasibility=feasibility_fe,
            estimatedMonths=dur["months"],
            estimatedCost=cost["grand_total"],
            confidencePercent=confidence,
            majorRisks=_major_risks(risks),
            keyAssumptions=assum[:5],
        ),
        costBreakdown=CostBreakdown(
            totalCost=cost["total"],
            costPerSqFt=cost["per_sqft"],
            contingencyAmount=cost["contingency"],
            phases=cost_phases,
        ),
        billOfMaterials=_build_bom_rows(bom),
        workforcePlan=WorkforcePlan(
            totalWorkers=wf["total_required"],
            peakWorkers=int(wf["total_required"] * 1.2),
            byTrade=wf_by_trade,
        ),
        equipmentPlan=_build_equipment_rows(eq),
        timeline=TimelinePlan(
            totalMonths=total_months,
            phases=tl_fe_phases,
        ),
        riskForecast=_build_risks(risks),
        optimizations=_build_optimizations(opts),
        assumptions=assum,
    )


def revise_planning_report(
    form: PlanningFormValues,
    current_report: dict,
    chat_history: list[dict],
    new_message: str,
) -> PlanningReport:
    """
    Deterministic revision handler.

    Parses the user's revision request for specific numeric changes
    (e.g. "reduce workers to 40", "increase budget by 10%", "change to double shift")
    and re-runs the full engine with the adjusted parameters.
    """
    msg = new_message.lower()

    # ── Parse revision intents from the chat message ───────────────────────────
    # Workers
    worker_match = re.search(r"(\d+)\s*workers?", msg)
    if worker_match:
        form.availableWorkforce = worker_match.group(1)

    # Shift
    if "double shift" in msg or "two shift" in msg:
        form.shiftPolicy = "Double"
    elif "night shift" in msg:
        form.shiftPolicy = "Night"
    elif "single shift" in msg:
        form.shiftPolicy = "Single"

    # Priority
    if "low cost" in msg or "cheaper" in msg or "reduce cost" in msg:
        form.priorityMode = "Low_cost"
    elif "fastest" in msg or "speed" in msg or "urgent" in msg:
        form.priorityMode = "Fastest"
    elif "premium" in msg or "high quality" in msg:
        form.priorityMode = "Premium"

    # Finish quality
    if "economy finish" in msg or "basic finish" in msg:
        form.finishQuality = "Economy"
    elif "premium finish" in msg or "luxury finish" in msg:
        form.finishQuality = "Premium"
    elif "standard finish" in msg:
        form.finishQuality = "Standard"

    # Budget increase/decrease
    budget_pct = re.search(r"budget.{0,20}(\d+)\s*%", msg)
    if budget_pct:
        pct = int(budget_pct.group(1))
        if "increas" in msg or "raise" in msg or "more" in msg:
            form.totalBudget *= (1 + pct / 100)
        elif "decreas" in msg or "reduc" in msg or "cut" in msg or "less" in msg:
            form.totalBudget *= (1 - pct / 100)

    # Regenerate with adjusted form
    report = generate_planning_report(form)

    # Attach a human-readable revision summary
    changes = []
    if worker_match:
        changes.append(f"workforce adjusted to {worker_match.group(1)} workers")
    if "double shift" in msg:
        changes.append("moved to double-shift operation")
    elif "night shift" in msg:
        changes.append("moved to night-shift operation")
    if "low cost" in msg or "cheaper" in msg:
        changes.append("priority set to low-cost mode")
    if "fastest" in msg or "speed" in msg:
        changes.append("priority set to fastest mode")
    if budget_pct:
        changes.append(f"budget {'increased' if 'increas' in msg or 'raise' in msg else 'decreased'} by {budget_pct.group(1)}%")

    if changes:
        report.revisionSummary = (
            f"Revised based on: {', '.join(changes)}. "
            "All figures recalculated deterministically from updated parameters."
        )
    else:
        report.revisionSummary = (
            f"Report regenerated with current inputs. "
            f"Note: '{new_message[:100]}' — for structural scope changes, "
            "please update the form inputs and regenerate."
        )

    return report
