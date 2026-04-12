"""
services/timeline.py — Deterministic schedule calculation module.
Duration is driven by productivity rules, shift multipliers, and phase splits.
"""

from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models import ProjectInput


# ── Constants ─────────────────────────────────────────────────────────────────

SQFT_PER_WORKER_DAY = 10.0          # base single-shift productivity

SHIFT_MULTIPLIER = {
    "single": 1.0,
    "double": 1.8,
    "night":  1.3,                  # night shift ≈ 130 % of single
}

PHASE_SPLITS = {
    "Design & Approvals":  0.20,
    "Structural Works":    0.50,
    "Finishing Works":     0.30,
}

DAYS_PER_MONTH = 26                 # working days per month


# ── Functions ─────────────────────────────────────────────────────────────────

def effective_productivity(inp: "ProjectInput") -> float:
    """Workers × base sqft/day × shift multiplier (sqft/day)."""
    multiplier = SHIFT_MULTIPLIER.get(inp.shift_type, 1.0)
    return inp.workers_available * SQFT_PER_WORKER_DAY * multiplier


def estimate_duration(inp: "ProjectInput") -> dict:
    """
    Return:
        days    — calendar working days (ceiling integer)
        months  — days ÷ 26
        productivity_sqft_per_day — effective throughput
    Site-access penalty:
        limited   → productivity × 0.85
        congested → productivity × 0.70
    """
    prod = effective_productivity(inp)

    access_factor = {"good": 1.0, "limited": 0.85, "congested": 0.70}
    prod *= access_factor.get(inp.site_access, 1.0)

    days = int(-(-inp.area // prod))      # ceiling division
    months = round(days / DAYS_PER_MONTH, 1)

    return {
        "days": days,
        "months": months,
        "productivity_sqft_per_day": round(prod, 2),
    }


def timeline(inp: "ProjectInput") -> list[dict]:
    """
    Split the total duration across construction phases.
    Returns a list of:
        { phase, duration_days, duration_weeks, start_day, end_day }
    """
    dur = estimate_duration(inp)
    total_days = dur["days"]

    result = []
    cursor = 1
    for phase, pct in PHASE_SPLITS.items():
        d = max(1, round(total_days * pct))
        result.append(
            {
                "phase": phase,
                "percentage": round(pct * 100),
                "duration_days": d,
                "duration_weeks": round(d / 7, 1),
                "start_day": cursor,
                "end_day": cursor + d - 1,
            }
        )
        cursor += d

    return result


def feasibility_flag(inp: "ProjectInput", cost_total: float) -> str:
    """
    Simple feasibility check:
        'Feasible'       if estimated cost ≤ client budget
        'Over Budget'    if estimated cost > client budget
        'Tight Schedule' if estimated days > deadline_days × 0.9
    Returns the most critical flag.
    """
    dur = estimate_duration(inp)
    over_budget = cost_total > inp.budget
    tight = dur["days"] > inp.deadline_days

    if over_budget and tight:
        return "Over Budget & Tight Schedule"
    if over_budget:
        return "Over Budget"
    if tight:
        return "Tight Schedule"
    return "Feasible"


def confidence_score(inp: "ProjectInput", cost_total: float) -> int:
    """
    Rule-based confidence %  (0 – 100):
        Start at 85.
        Deduct:
            soft soil          −5
            seismic IV/V       −5
            congested access   −5
            no worker surplus  −5   (workers < area/500)
            over budget        −10
            seasonal risk      −5   (non-trivial)
    """
    score = 85

    if inp.soil_type == "soft":
        score -= 5
    if inp.seismic_zone in ("IV", "V"):
        score -= 5
    if inp.site_access == "congested":
        score -= 5
    if inp.workers_available < (inp.area / 500):
        score -= 5
    if cost_total > inp.budget:
        score -= 10
    if inp.seasonal_risk.lower() not in ("none", "low", "minimal", ""):
        score -= 5

    return max(0, min(100, score))
