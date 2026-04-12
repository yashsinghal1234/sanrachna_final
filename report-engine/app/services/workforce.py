"""
services/workforce.py — Deterministic workforce distribution.
Headcount derived from area ÷ 150 rule, then split by trade.
"""

from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models import ProjectInput


# ── Trade Share Constants ─────────────────────────────────────────────────────

TRADE_FRACTIONS = {
    "Masons":              0.30,
    "Bar Benders":         0.15,
    "Carpenters":          0.10,
    "MEP Workers":         0.20,
    "Finishing Workers":   0.25,
}

SUPERVISORY_RATIO = 0.10            # 1 supervisor per 10 workers


def workforce_distribution(inp: "ProjectInput") -> dict:
    """
    Compute workforce allocation by trade.

    Formula:
        base_headcount = area / 150   (sqft per worker as design capacity)
        Each trade gets its fraction × base_headcount (ceiling to whole persons).

    Site-access factor:
        congested → base_headcount × 0.75   (fewer workers can work at once)
        limited   → base_headcount × 0.90

    Returns:
        {
          "total_required": int,
          "total_available": int,
          "gap": int,          # negative means shortage
          "supervisors": int,
          "trades": [ {trade, count, percentage} ]
        }
    """
    access_factor = {"good": 1.0, "limited": 0.90, "congested": 0.75}
    factor = access_factor.get(inp.site_access, 1.0)

    base = inp.area / 150.0 * factor
    total_required = max(5, int(-(-base // 1)))     # ceiling

    supervisors = max(1, round(total_required * SUPERVISORY_RATIO))
    gap = inp.workers_available - total_required

    trades = []
    for trade, fraction in TRADE_FRACTIONS.items():
        count = max(1, round(total_required * fraction))
        trades.append(
            {
                "trade": trade,
                "count": count,
                "percentage": round(fraction * 100),
                "daily_wage_inr": _daily_wage(trade),
                "monthly_cost_inr": round(count * _daily_wage(trade) * 26),
            }
        )

    return {
        "total_required": total_required,
        "total_available": inp.workers_available,
        "gap": gap,
        "gap_label": "Surplus" if gap >= 0 else "Shortage",
        "supervisors": supervisors,
        "shift_type": inp.shift_type,
        "trades": trades,
    }


def _daily_wage(trade: str) -> int:
    """Indicative daily wage rates in INR (2024 benchmark — urban India)."""
    wages = {
        "Masons":            750,
        "Bar Benders":       700,
        "Carpenters":        700,
        "MEP Workers":       800,
        "Finishing Workers": 650,
    }
    return wages.get(trade, 700)
