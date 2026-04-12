"""
services/bom.py — Bill of Materials & Equipment Plan.
All quantities derived from area multipliers or static construction logic.
"""

from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models import ProjectInput


# ── BOM Multipliers (per sqft of built-up area) ───────────────────────────────

BOM_MULTIPLIERS = {
    "Cement (bags 50 kg)":          0.0085,
    "TMT Steel (MT)":               0.0042,
    "Brick / Block Masonry (units)": 55.0,   # per sqft (wall area proxy)
    "River Sand / M-Sand (cu.ft)":  0.55,
    "Coarse Aggregate (cu.ft)":     0.70,
    "Plaster Sand (cu.ft)":         0.20,
    "Shuttering Plywood (sqft)":    0.18,
    "Binding Wire (kg)":            0.35,
    "PCC / Concrete (cu.ft)":       0.30,
    "Tiles / Flooring (sqft)":      1.05,   # slight waste factor
    "Paint (litre)":                0.12,
    "Electrical Conduit (m)":       0.08,
    "GI Pipes (m)":                 0.045,
    "CPVC / PVC Pipes (m)":         0.065,
}

# Adjustments for structure type
STRUCTURE_STEEL_FACTOR = {
    "RCC":       1.0,
    "steel":     1.4,      # more steel, less masonry
    "composite": 1.2,
}

STRUCTURE_MASONRY_FACTOR = {
    "RCC":       1.0,
    "steel":     0.65,
    "composite": 0.80,
}


def generate_bom(inp: "ProjectInput") -> list[dict]:
    """
    Return a list of BOM line items:
        { item, quantity, unit, note }

    Rules applied:
        • Steel qty  × structure_steel_factor
        • Masonry qty × structure_masonry_factor
        • Renovation / extension → 60 % of normal quantities
    """
    area = inp.area
    reno_factor = 0.60 if inp.construction_type != "new" else 1.0
    steel_mul = STRUCTURE_STEEL_FACTOR.get(inp.structure_type, 1.0)
    masonry_mul = STRUCTURE_MASONRY_FACTOR.get(inp.structure_type, 1.0)

    items = []
    for material, rate in BOM_MULTIPLIERS.items():
        qty = area * rate * reno_factor

        # Material-specific adjustments
        if "Steel" in material or "Binding Wire" in material:
            qty *= steel_mul
        if "Masonry" in material:
            qty *= masonry_mul

        # Pick sensible unit from the material label
        unit = _infer_unit(material)

        items.append(
            {
                "item": material,
                "quantity": round(qty, 2),
                "unit": unit,
                "note": _note(material, inp),
            }
        )

    return items


def _infer_unit(label: str) -> str:
    if "bags" in label.lower() or "bag" in label.lower():
        return "bags"
    if "MT" in label:
        return "MT"
    if "cu.ft" in label:
        return "cu.ft"
    if "(m)" in label:
        return "m"
    if "sqft" in label.lower():
        return "sqft"
    if "litre" in label.lower():
        return "litre"
    if "kg" in label.lower():
        return "kg"
    if "units" in label.lower():
        return "units"
    return "nos"


def _note(material: str, inp: "ProjectInput") -> str:
    if "Cement" in material:
        grade = inp.concrete_grade
        return f"Based on {grade} concrete mix design"
    if "Steel" in material:
        return f"Grade {inp.steel_grade} TMT bars"
    if "Masonry" in material:
        return "AAC blocks preferred for urban projects; clay bricks otherwise"
    if "Tiles" in material:
        finish_map = {"economy": "Vitrified 600×600", "standard": "Glazed 800×800", "premium": "Italian Marble / Imported"}
        return finish_map.get(inp.finish_quality, "Vitrified")
    if "Paint" in material:
        paint_map = {"economy": "Distemper", "standard": "Acrylic Emulsion", "premium": "Luxury Emulsion"}
        return paint_map.get(inp.finish_quality, "Acrylic Emulsion")
    return ""


# ── Equipment Plan ─────────────────────────────────────────────────────────────

EQUIPMENT_CATALOG = [
    {
        "equipment": "Tower Crane",
        "action": "Rent",
        "quantity": None,       # derived below
        "note": "Required for structures > 3 floors",
    },
    {
        "equipment": "Concrete Pump",
        "action": "Rent",
        "quantity": 1,
        "note": "For continuous casting; reduces manual labour 40 %",
    },
    {
        "equipment": "Transit Mixer",
        "action": "Rent",
        "quantity": None,
        "note": "Hire as needed for RMC delivery",
    },
    {
        "equipment": "Bar Bending Machine",
        "action": "Buy",
        "quantity": None,
        "note": "Essential for onsite bending; resale value retained",
    },
    {
        "equipment": "Plate Compactor",
        "action": "Buy",
        "quantity": 1,
        "note": "Foundation compaction",
    },
    {
        "equipment": "Vibrator (Poker)",
        "action": "Buy",
        "quantity": None,
        "note": "Concrete compaction; 1 per 2 000 sqft",
    },
    {
        "equipment": "Scaffolding (Tubular)",
        "action": "Rent",
        "quantity": None,
        "note": "External / internal as required",
    },
    {
        "equipment": "Welding Set",
        "action": "Buy",
        "quantity": 2,
        "note": "Structural steel or formwork connections",
    },
    {
        "equipment": "Safety Equipment (Helmets, Harness, PPE)",
        "action": "Buy",
        "quantity": None,
        "note": "Mandatory per IS 3764; 1 set per worker",
    },
    {
        "equipment": "Cube Testing Moulds",
        "action": "Buy",
        "quantity": 12,
        "note": "QA/QC concrete testing",
    },
    {
        "equipment": "Surveying Total Station",
        "action": "Rent",
        "quantity": 1,
        "note": "Setting out, levels, and alignment checks",
    },
    {
        "equipment": "Generator (DG Set)",
        "action": "Rent",
        "quantity": 1,
        "note": "Power backup; kVA sizing = workers × 0.5",
    },
]


def equipment_plan(inp: "ProjectInput") -> list[dict]:
    """
    Return the equipment list with quantities computed where applicable.
    Rules:
        - Tower crane   → 1 per 5 000 sqft (only if floors ≥ 4)
        - Bar bender    → 1 per 3 000 sqft
        - Vibrators     → 1 per 2 000 sqft
        - Scaffolding   → in sqft = 0.30 × built-up area
        - PPE sets      → workers_available
    """
    area = inp.area
    workers = inp.workers_available
    items = []

    for eq in EQUIPMENT_CATALOG:
        row = dict(eq)

        if row["equipment"] == "Tower Crane":
            if inp.floors >= 4:
                row["quantity"] = max(1, int(area / 5_000))
                row["note"] = f"{row['quantity']} crane(s) for {inp.floors}-storey structure"
            else:
                row["action"] = "N/A"
                row["quantity"] = 0
                row["note"] = "Not required for structures ≤ 3 floors"

        elif row["equipment"] == "Bar Bending Machine":
            row["quantity"] = max(1, int(area / 3_000))

        elif row["equipment"] == "Vibrator (Poker)":
            row["quantity"] = max(1, int(area / 2_000))

        elif row["equipment"] == "Scaffolding (Tubular)":
            row["quantity"] = round(area * 0.30, 0)
            row["note"] = f"{row['quantity']:.0f} sqft of scaffolding area estimated"

        elif row["equipment"] == "Safety Equipment (Helmets, Harness, PPE)":
            row["quantity"] = workers

        elif row["equipment"] == "Generator (DG Set)":
            kva = round(workers * 0.5)
            row["note"] = f"Approx. {kva} kVA required"

        elif row["equipment"] == "Transit Mixer":
            row["quantity"] = max(1, int(area / 8_000))

        items.append(row)

    return items
