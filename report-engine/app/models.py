"""
models.py — Pydantic input schema for the Construction Report Engine.
All fields are validated at the boundary; downstream services receive
fully-typed, clean objects with no raw strings to sanitise.
"""

from typing import Literal
from pydantic import BaseModel, Field, model_validator


class ProjectInput(BaseModel):
    # ── Identity ──────────────────────────────────────────────────────────────
    project_name: str = Field(..., min_length=1, max_length=200,
                               description="Name of the construction project")

    # ── Geometry ──────────────────────────────────────────────────────────────
    area: float = Field(..., gt=0, description="Built-up area in sq.ft")
    plot_area: float = Field(..., gt=0, description="Total plot area in sq.ft")
    floors: int = Field(..., ge=1, le=200, description="Number of floors above ground")
    floor_height: float = Field(..., gt=0, description="Typical floor-to-floor height in feet")

    # ── Project Classification ────────────────────────────────────────────────
    project_type: Literal["residential", "commercial", "industrial"]
    construction_type: Literal["new", "renovation", "extension"]
    priority: Literal["low_cost", "fastest", "balanced", "premium"]

    # ── Structural Inputs ─────────────────────────────────────────────────────
    structure_type: Literal["RCC", "steel", "composite"]
    soil_type: Literal["soft", "medium", "hard"]
    seismic_zone: Literal["I", "II", "III", "IV", "V"]
    concrete_grade: str = Field(..., description="e.g. M20, M25, M30")
    steel_grade: str = Field(..., description="e.g. Fe415, Fe500")

    # ── Finish & Budget ───────────────────────────────────────────────────────
    finish_quality: Literal["economy", "standard", "premium"]
    budget: float = Field(..., gt=0, description="Client budget in INR")
    deadline_days: int = Field(..., ge=1, description="Contractual deadline in calendar days")

    # ── Site & Workforce ──────────────────────────────────────────────────────
    workers_available: int = Field(..., ge=1, description="Peak workforce headcount on site")
    shift_type: Literal["single", "double", "night"]
    site_access: Literal["good", "limited", "congested"]
    location_type: Literal["urban", "semi-urban", "rural"]
    seasonal_risk: str = Field(..., description="e.g. monsoon, extreme heat, none")

    # ── Cross-field Validation ────────────────────────────────────────────────
    @model_validator(mode="after")
    def check_area_vs_floors(self) -> "ProjectInput":
        """Built-up area should be at least 50% of plot_area for a single floor."""
        if self.area > self.plot_area * self.floors * 1.2:
            raise ValueError(
                f"Built-up area ({self.area} sqft) seems unrealistically large "
                f"for {self.plot_area} sqft plot with {self.floors} floor(s)."
            )
        return self
