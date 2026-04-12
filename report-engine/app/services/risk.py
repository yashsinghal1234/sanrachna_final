"""
services/risk.py — Rule-based risk analysis and optimisation suggestions.
No ML. All rules are explicit domain heuristics.
"""

from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models import ProjectInput

SEVERITY_ORDER = {"High": 0, "Medium": 1, "Low": 2}


# ── Risk Rules ────────────────────────────────────────────────────────────────

def risk_analysis(inp: "ProjectInput") -> list[dict]:
    """
    Return a sorted list of identified risks:
        { id, category, description, severity, probability, mitigation }

    Rules are deterministic: each condition maps to a fixed risk entry.
    Always-present risks: schedule slip, cost drift, regulatory delay.
    """
    risks: list[dict] = []
    rid = 1

    def add(category: str, description: str, severity: str,
            probability: int, mitigation: str) -> None:
        nonlocal rid
        risks.append(
            {
                "id": f"R{rid:02d}",
                "category": category,
                "description": description,
                "severity": severity,
                "probability_pct": probability,
                "mitigation": mitigation,
            }
        )
        rid += 1

    # ── Soil & Foundation ──────────────────────────────────────────────────────
    if inp.soil_type == "soft":
        add(
            "Geotechnical",
            "Soft soil may cause differential settlement and bearing capacity failure.",
            "High", 75,
            "Conduct detailed soil investigation (SBC test). Use raft / pile foundation. "
            "Monitor settlement with gauges.",
        )
    elif inp.soil_type == "medium":
        add(
            "Geotechnical",
            "Medium soil — moderate risk of settlement under heavy loads.",
            "Low", 30,
            "Standard soil investigation sufficient. Isolated / strip footings acceptable.",
        )

    # ── Seismic ───────────────────────────────────────────────────────────────
    if inp.seismic_zone in ("IV", "V"):
        add(
            "Seismic",
            f"Seismic Zone {inp.seismic_zone} — high probability of earthquake event during project lifetime.",
            "High", 65,
            "Design to IS 1893. Use ductile detailing per IS 13920. "
            "Engage seismic consultant for zone V.",
        )
    elif inp.seismic_zone == "III":
        add(
            "Seismic",
            "Seismic Zone III — moderate seismic demand.",
            "Medium", 40,
            "Follow IS 1893 (Part 1) provisions. Shear walls or braced frames recommended.",
        )

    # ── Site Access ───────────────────────────────────────────────────────────
    if inp.site_access == "congested":
        add(
            "Logistics",
            "Congested site access limits material delivery windows and heavy equipment movement.",
            "Medium", 60,
            "Prepare detailed traffic management plan. Use Just-In-Time delivery. "
            "Schedule concrete pours during off-peak hours.",
        )
    elif inp.site_access == "limited":
        add(
            "Logistics",
            "Limited access may delay material procurement timelines.",
            "Low", 35,
            "Maintain 2-week buffer stock for critical materials on site.",
        )

    # ── Seasonal / Weather ────────────────────────────────────────────────────
    seasonal = inp.seasonal_risk.lower()
    if seasonal not in ("none", "low", "minimal", ""):
        add(
            "Weather",
            f"Seasonal risk identified: '{inp.seasonal_risk}'. Adverse weather can halt outdoor works.",
            "Medium", 55,
            "Build weather contingency in schedule (10 % float). "
            "Procure weather-protection sheeting. Plan indoor / covered works during risk period.",
        )

    # ── Workforce Shortage ────────────────────────────────────────────────────
    required = max(5, int(-(-inp.area / 150 // 1)))
    if inp.workers_available < required * 0.75:
        add(
            "Labour",
            f"Available workforce ({inp.workers_available}) is significantly below "
            f"the estimated requirement ({required}). Critical labour shortage risk.",
            "High", 80,
            "Engage labour contractor with mobilisation guarantee. "
            "Consider double-shift or mechanised alternatives.",
        )
    elif inp.workers_available < required:
        add(
            "Labour",
            f"Available workforce ({inp.workers_available}) is below estimated requirement ({required}).",
            "Medium", 50,
            "Early subcontractor engagement. Monitor productivity weekly.",
        )

    # ── Budget Tightness ──────────────────────────────────────────────────────
    from app.services.cost import total_cost
    est = total_cost(inp)
    ratio = est / inp.budget if inp.budget > 0 else 999

    if ratio > 1.10:
        add(
            "Financial",
            f"Estimated cost (₹{est:,.0f}) exceeds budget by {round((ratio - 1) * 100, 1)} %. "
            "Project may be financially non-viable as scoped.",
            "High", 90,
            "Value-engineer structural scheme. Reduce finish quality or phased construction.",
        )
    elif ratio > 0.90:
        add(
            "Financial",
            "Budget is tight relative to estimated cost. Cost drift likely.",
            "Medium", 60,
            "Enforce strict change-order control. Monthly cost-to-complete review.",
        )

    # ── Deadline Pressure ─────────────────────────────────────────────────────
    from app.services.timeline import estimate_duration
    dur = estimate_duration(inp)
    if dur["days"] > inp.deadline_days:
        add(
            "Schedule",
            f"Estimated duration ({dur['days']} days) exceeds contractual deadline "
            f"({inp.deadline_days} days) by {dur['days'] - inp.deadline_days} days.",
            "High", 85,
            "Accelerate by adding workers, shifting to double-shift, or fast-tracking procurement. "
            "Negotiate deadline extension with client.",
        )
    elif dur["days"] > inp.deadline_days * 0.90:
        add(
            "Schedule",
            "Schedule has minimal float; any disruption may breach the deadline.",
            "Medium", 55,
            "Monitor S-curve weekly. Pre-position critical materials.",
        )

    # ── Always-present systemic risks ─────────────────────────────────────────
    add(
        "Schedule",
        "Schedule slip due to unplanned design revisions, RFI delays, or scope creep.",
        "Medium", 50,
        "Freeze design before construction kickoff. Limit post-approval changes. Track RFIs.",
    )
    add(
        "Financial",
        "Cost drift from material price escalation over the project duration.",
        "Medium", 45,
        "Lock material rates via price-escalation clauses with suppliers. "
        "Monthly market-rate benchmarking.",
    )
    add(
        "Regulatory",
        "Regulatory delays — plan approvals, NOCs, completion certificates.",
        "Low", 40,
        "Engage experienced liaison consultant. Submit documents 3 months before needed. "
        "Maintain digital document register.",
    )
    add(
        "Quality",
        "Concrete cube failure risk if mix design, curing, or testing protocols are not followed.",
        "Low", 35,
        "Appoint third-party QC agency. Daily cube casting. Minimum 7-day / 28-day tests.",
    )

    # Sort: High → Medium → Low, then by probability descending
    risks.sort(key=lambda r: (SEVERITY_ORDER[r["severity"]], -r["probability_pct"]))
    return risks


# ── Optimisations ──────────────────────────────────────────────────────────────

def optimizations(inp: "ProjectInput") -> list[dict]:
    """
    Return a list of actionable optimisation suggestions derived from the inputs.
    Each item: { area, suggestion, expected_saving, category }
    """
    opts = []

    # Finish quality downgrade
    if inp.finish_quality == "premium":
        opts.append(
            {
                "area": "Cost Reduction",
                "suggestion": "Specify premium finishes only in public / client-facing zones; "
                              "use standard grade in service / back-of-house areas.",
                "expected_saving": "₹200–₹400 / sqft",
                "category": "Value Engineering",
            }
        )

    # Shift improvement
    if inp.shift_type == "single":
        opts.append(
            {
                "area": "Schedule Compression",
                "suggestion": "Move to double-shift operation for structural works. "
                              "Increases daily output by ~80 %.",
                "expected_saving": "25–40 % schedule reduction",
                "category": "Resource Optimisation",
            }
        )

    # Pre-cast elements
    if inp.floors >= 5:
        opts.append(
            {
                "area": "Structural Efficiency",
                "suggestion": "Evaluate pre-cast column / beam / slab elements. "
                              "Reduces formwork cost and improves quality.",
                "expected_saving": "10–18 % structural cost reduction",
                "category": "Technology",
            }
        )

    # RMC vs site concrete
    opts.append(
        {
            "area": "Material Quality",
            "suggestion": "Use Ready-Mix Concrete (RMC) from a certified plant for all structural pours. "
                          "Eliminates batch variations and reduces wastage by ~12 %.",
            "expected_saving": "₹15–₹30 / cu.ft",
            "category": "Quality & Cost",
        }
    )

    # Procurement bulking
    opts.append(
        {
            "area": "Procurement",
            "suggestion": "Purchase cement, steel, and aggregates in bulk at project start using BOM quantities. "
                          "Lock prices with suppliers for 6-month tenure.",
            "expected_saving": "8–15 % material cost reduction",
            "category": "Procurement Strategy",
        }
    )

    # Solar / green
    if inp.project_type in ("commercial", "residential") and inp.floors >= 3:
        opts.append(
            {
                "area": "Sustainability",
                "suggestion": "Install rooftop solar (3–5 kW) to offset construction-phase DG costs and enable "
                              "GRIHA / LEED rating that improves property value.",
                "expected_saving": "₹60 000–₹1.5 L / year power savings",
                "category": "Green Building",
            }
        )

    # Waste management
    opts.append(
        {
            "area": "Waste Reduction",
            "suggestion": "Implement on-site C&D waste segregation and recycling. "
                          "Crushed concrete may be reused as sub-base; saves disposal costs.",
            "expected_saving": "₹10–₹25 / sqft disposal cost reduction",
            "category": "Sustainability",
        }
    )

    # Digital monitoring
    opts.append(
        {
            "area": "Project Management",
            "suggestion": "Deploy cloud-based project management + daily progress photo logs. "
                          "Reduces schedule slippage detection time from weeks to days.",
            "expected_saving": "5–10 % schedule improvement",
            "category": "Technology",
        }
    )

    # Urban special — site logistics
    if inp.location_type == "urban" and inp.site_access in ("limited", "congested"):
        opts.append(
            {
                "area": "Logistics",
                "suggestion": "Negotiate a nearby transit storage yard for pre-sorting deliveries "
                              "before bringing to congested site. Use smaller tippers for last-mile.",
                "expected_saving": "Minimises double handling; saves 0.5–1 h / delivery",
                "category": "Logistics",
            }
        )

    return opts


# ── Procurement Sequence ──────────────────────────────────────────────────────

def procurement_sequence(inp: "ProjectInput") -> list[dict]:
    """
    Return a phase-wise material procurement plan with recommended lead times.
    """
    total_days = inp.deadline_days or 180

    def day(pct: float) -> int:
        return max(1, round(total_days * pct))

    return [
        {
            "phase": "Pre-construction (Before Day 1)",
            "order_by_day": "Before mobilisation",
            "items": [
                "Soil investigation / geotechnical report",
                "Structural design + drawings",
                "Building plan approval",
                "Labour contractor agreements",
                "Safety equipment (PPE, helmets, harness)",
            ],
            "lead_time_days": 30,
            "priority": "Critical",
        },
        {
            "phase": "Foundation (Day 1 – {})" .format(day(0.20)),
            "order_by_day": day(0.02),
            "items": [
                "Cement (initial lot — 20 % of BOM)",
                "TMT Steel (foundation quantity)",
                "Brick / AAC Blocks (initial course)",
                "River sand & aggregates (foundation mix)",
                "Shuttering materials",
                "PCC materials",
            ],
            "lead_time_days": 14,
            "priority": "Critical",
        },
        {
            "phase": "Structural Works (Day {} – {})".format(day(0.20), day(0.70)),
            "order_by_day": day(0.15),
            "items": [
                "TMT Steel — remaining BOM quantity (schedule delivery floor-by-floor)",
                "Cement — bulk order with price lock",
                "Aggregates & M-Sand (bulk)",
                "Shuttering plywood & props",
                "Concrete pump & transit mixer (rental)",
                "Electrical conduit (embedded)",
            ],
            "lead_time_days": 21,
            "priority": "Critical",
        },
        {
            "phase": "MEP Rough-in (Day {} – {})".format(day(0.40), day(0.75)),
            "order_by_day": day(0.35),
            "items": [
                "CPVC / PVC pipes (plumbing)",
                "GI pipes (fire / HVAC)",
                "Electrical conduits & boxes",
                "Sanitary ware (order early — lead time 6–8 weeks for premium)",
                "Fire alarm / sprinkler materials",
            ],
            "lead_time_days": 45,
            "priority": "High",
        },
        {
            "phase": "Finishing (Day {} – {})".format(day(0.65), day(1.0)),
            "order_by_day": day(0.60),
            "items": [
                "Tiles & flooring material",
                "Paint (primer + finish coats)",
                "Plaster sand",
                "Doors & windows (custom items — 10-week lead)",
                "False ceiling materials",
                "Fixtures & fittings",
                "Lifts / elevators (if applicable)",
            ],
            "lead_time_days": 70,
            "priority": "Medium",
        },
        {
            "phase": "Handover Preparation (Final 2 weeks)",
            "order_by_day": day(0.90),
            "items": [
                "Punch-list materials (touch-up paint, filler)",
                "Landscaping materials",
                "Signage",
                "Fire extinguishers & safety signage",
                "Completion certificate documents",
            ],
            "lead_time_days": 7,
            "priority": "Low",
        },
    ]


# ── Assumptions ───────────────────────────────────────────────────────────────

def assumptions(inp: "ProjectInput") -> list[str]:
    """Return a list of textual assumptions embedded in the calculations."""
    from app.services.timeline import estimate_duration
    dur = estimate_duration(inp)

    return [
        f"All costs are in Indian Rupees (INR) at Q1 2025 market rates.",
        f"Built-up area of {inp.area:,.0f} sqft is taken as the primary quantification basis.",
        f"Construction type is '{inp.construction_type}'; BOM quantities "
        + ("reduced to 60 % of new-build norms." if inp.construction_type != "new" else "use full multipliers."),
        f"Effective productivity = {inp.workers_available} workers × "
        f"10 sqft/day × {'1.8 (double shift)' if inp.shift_type == 'double' else '1.3 (night shift)' if inp.shift_type == 'night' else '1.0 (single shift)'} "
        f"= {dur['productivity_sqft_per_day']:,.0f} sqft/day.",
        f"Site access penalty: {inp.site_access} → "
        + ("no reduction." if inp.site_access == "good" else "15 % productivity reduction." if inp.site_access == "limited" else "30 % productivity reduction."),
        f"All concrete is designed to grade {inp.concrete_grade} per IS 456:2000.",
        f"Reinforcement steel is {inp.steel_grade} TMT bars per IS 1786.",
        f"Seismic design per IS 1893 (Part 1) for Zone {inp.seismic_zone}.",
        f"Foundation type subject to final soil investigation; "
        + ("pile / raft assumed (soft soil)." if inp.soil_type == "soft" else "isolated / combined footing assumed."),
        f"A 5 % contingency reserve is included in the cost overview.",
        "Labour rates are indicative urban-India 2024 benchmarks; actual rates vary by region and season.",
        "Material prices exclude GST. Apply 18 % GST on civil materials and 28 % on certain equipment.",
        "Monsoon disruption is NOT included in the base schedule; add 10–15 % float for monsoon-prone regions.",
        f"Shift type: {inp.shift_type}. Night / double shifts incur premium of 20–30 % on labour wages.",
        "Environmental clearance, heritage NOC, and aviation NOC (if applicable) are not in scope.",
        "This report is generated by a deterministic rule-based engine. "
        "Final design, quantities, and costs must be verified by a licensed structural engineer.",
    ]
