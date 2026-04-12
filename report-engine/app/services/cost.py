"""
services/cost.py — Deterministic cost calculation module.
All arithmetic uses only the supplied inputs; no randomness, no ML.
"""

from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models import ProjectInput


# ── Constants ─────────────────────────────────────────────────────────────────

BASE_COST_PER_SQFT = 1_500          # INR / sqft  (base residential RCC)

MODIFIERS = {
    # Project type
    "commercial": 500,
    "industrial": 300,
    # Finish quality
    "premium_finish": 800,
    "standard_finish": 400,
    # Location
    "urban": 300,
    "semi-urban": 100,
    # Structure type
    "steel": 200,
    "composite": 150,
    # Construction type
    "renovation": -200,             # renovation is cheaper than new build
    "extension": -100,
    # Priority
    "premium": 600,
    "fastest": 250,
    "low_cost": -300,
}

CONTINGENCY_PCT = 0.05              # 5 %

COST_BREAKDOWN_PCTS = {
    "Design & Consultancy":  0.08,
    "Foundation Works":      0.18,
    "Structural Works":      0.36,
    "MEP Services":          0.20,
    "Finishing & Interiors": 0.18,
}


# ── Helper Functions ──────────────────────────────────────────────────────────

def cost_per_sqft(inp: "ProjectInput") -> float:
    """
    Compute the all-in rate in ₹/sqft using rule-based modifiers.

    Rules (additive on top of BASE_COST_PER_SQFT = ₹1 500):
        • Commercial project          +₹500
        • Industrial project          +₹300
        • Premium finish quality      +₹800
        • Standard finish quality     +₹400
        • Urban location              +₹300
        • Semi-urban location         +₹100
        • Steel structure type        +₹200
        • Composite structure type    +₹150
        • Renovation work             −₹200
        • Extension work              −₹100
        • Premium priority            +₹600
        • Fastest priority            +₹250
        • Low-cost priority           −₹300
    """
    rate = float(BASE_COST_PER_SQFT)

    # Project type
    if inp.project_type == "commercial":
        rate += MODIFIERS["commercial"]
    elif inp.project_type == "industrial":
        rate += MODIFIERS["industrial"]

    # Finish quality
    if inp.finish_quality == "premium":
        rate += MODIFIERS["premium_finish"]
    elif inp.finish_quality == "standard":
        rate += MODIFIERS["standard_finish"]

    # Location
    if inp.location_type == "urban":
        rate += MODIFIERS["urban"]
    elif inp.location_type == "semi-urban":
        rate += MODIFIERS["semi-urban"]

    # Structure type
    if inp.structure_type == "steel":
        rate += MODIFIERS["steel"]
    elif inp.structure_type == "composite":
        rate += MODIFIERS["composite"]

    # Construction type
    if inp.construction_type == "renovation":
        rate += MODIFIERS["renovation"]
    elif inp.construction_type == "extension":
        rate += MODIFIERS["extension"]

    # Priority
    if inp.priority == "premium":
        rate += MODIFIERS["premium"]
    elif inp.priority == "fastest":
        rate += MODIFIERS["fastest"]
    elif inp.priority == "low_cost":
        rate += MODIFIERS["low_cost"]

    return round(rate, 2)


def total_cost(inp: "ProjectInput") -> float:
    """Total raw construction cost = area × rate per sqft."""
    return round(inp.area * cost_per_sqft(inp), 2)


def cost_overview(inp: "ProjectInput") -> dict:
    """
    Return a detailed cost object:
        total              — raw construction cost
        contingency        — 5 % reserve on total
        grand_total        — total + contingency
        per_sqft           — derived rate
        breakdown          — list of {phase, percentage, amount} dicts
    """
    raw = total_cost(inp)
    contingency = round(raw * CONTINGENCY_PCT, 2)
    grand_total = round(raw + contingency, 2)
    rate = cost_per_sqft(inp)

    breakdown = [
        {
            "phase": phase,
            "percentage": round(pct * 100, 1),
            "amount": round(raw * pct, 2),
        }
        for phase, pct in COST_BREAKDOWN_PCTS.items()
    ]

    return {
        "total": raw,
        "per_sqft": rate,
        "contingency": contingency,
        "grand_total": grand_total,
        "breakdown": breakdown,
    }
