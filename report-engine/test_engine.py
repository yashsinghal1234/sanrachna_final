"""
test_engine.py — Quick self-contained test of the calculation engine.
Run with:   python test_engine.py
Or via pytest:  pytest test_engine.py -v
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.models import ProjectInput
from app.services.cost import cost_per_sqft, total_cost, cost_overview
from app.services.timeline import estimate_duration, timeline, feasibility_flag, confidence_score
from app.services.bom import generate_bom, equipment_plan
from app.services.workforce import workforce_distribution
from app.services.risk import risk_analysis, optimizations, procurement_sequence, assumptions
from app.services.report import build_report

# ── Canonical test input ──────────────────────────────────────────────────────

SAMPLE = ProjectInput(
    project_name="Anand Heights — Phase 1",
    area=12_000,
    plot_area=5_000,
    floors=8,
    floor_height=10.5,
    project_type="residential",
    construction_type="new",
    priority="balanced",
    structure_type="RCC",
    soil_type="medium",
    seismic_zone="III",
    concrete_grade="M25",
    steel_grade="Fe500",
    finish_quality="standard",
    budget=2_50_00_000,          # ₹2.5 Cr
    deadline_days=540,
    workers_available=80,
    shift_type="single",
    site_access="good",
    location_type="urban",
    seasonal_risk="monsoon (June–Sept)",
)


def test_cost():
    rate = cost_per_sqft(SAMPLE)
    assert rate > 1_500, f"Rate too low: {rate}"
    total = total_cost(SAMPLE)
    assert abs(total - SAMPLE.area * rate) < 1, "total_cost mismatch"
    overview = cost_overview(SAMPLE)
    assert "grand_total" in overview
    assert len(overview["breakdown"]) == 5
    sum_breakdown = sum(i["amount"] for i in overview["breakdown"])
    assert abs(sum_breakdown - overview["total"]) < 2, "Breakdown doesn't sum to total"
    print(f"  ✓ cost_per_sqft  = ₹{rate:,.0f}")
    print(f"  ✓ total_cost     = ₹{total:,.0f}")
    print(f"  ✓ grand_total    = ₹{overview['grand_total']:,.0f}")


def test_timeline():
    dur = estimate_duration(SAMPLE)
    assert dur["days"] > 0
    assert dur["months"] > 0
    tl = timeline(SAMPLE)
    assert len(tl) == 3
    assert tl[0]["start_day"] == 1
    flag = feasibility_flag(SAMPLE, cost_overview(SAMPLE)["grand_total"])
    conf = confidence_score(SAMPLE, cost_overview(SAMPLE)["grand_total"])
    assert 0 <= conf <= 100
    print(f"  ✓ duration       = {dur['days']} days ({dur['months']} months)")
    print(f"  ✓ feasibility    = {flag}")
    print(f"  ✓ confidence     = {conf} %")


def test_bom():
    bom = generate_bom(SAMPLE)
    assert len(bom) > 5
    cement = next((i for i in bom if "Cement" in i["item"]), None)
    assert cement is not None
    assert cement["quantity"] > 0
    print(f"  ✓ BOM items      = {len(bom)}")
    print(f"  ✓ Cement         = {cement['quantity']:,.1f} {cement['unit']}")


def test_workforce():
    wf = workforce_distribution(SAMPLE)
    assert wf["total_required"] > 0
    assert len(wf["trades"]) == 5
    print(f"  ✓ Workers needed = {wf['total_required']}")
    print(f"  ✓ Gap            = {wf['gap']} ({wf['gap_label']})")


def test_equipment():
    eq = equipment_plan(SAMPLE)
    assert len(eq) > 5
    crane = next((e for e in eq if "Crane" in e["equipment"]), None)
    assert crane is not None
    print(f"  ✓ Equipment items= {len(eq)}")
    print(f"  ✓ Crane qty      = {crane['quantity']}")


def test_risks():
    risks = risk_analysis(SAMPLE)
    assert len(risks) >= 3
    cats = [r["category"] for r in risks]
    assert "Schedule" in cats
    assert "Financial" in cats
    assert "Regulatory" in cats
    print(f"  ✓ Risks          = {len(risks)}")
    print(f"  ✓ Severities     = {set(r['severity'] for r in risks)}")


def test_full_report():
    report = build_report(SAMPLE)
    required_keys = ["meta", "summary", "cost", "timeline", "bom",
                     "workforce", "equipment", "risks", "optimizations",
                     "procurement", "assumptions"]
    for k in required_keys:
        assert k in report, f"Missing key: {k}"
    assert report["summary"]["feasibility"]
    print(f"  ✓ Report keys    = {list(report.keys())}")
    print(f"  ✓ Feasibility    = {report['summary']['feasibility']}")
    print(f"  ✓ Est months     = {report['summary']['est_months']}")
    print(f"  ✓ Est cost       = ₹{report['summary']['est_cost']:,.0f}")


if __name__ == "__main__":
    print("\n🏗  SANRACHNA REPORT ENGINE — SELF-TEST\n" + "=" * 50)
    tests = [
        ("Cost Calculations",       test_cost),
        ("Timeline Calculations",   test_timeline),
        ("Bill of Materials",       test_bom),
        ("Workforce Distribution",  test_workforce),
        ("Equipment Plan",          test_equipment),
        ("Risk Analysis",           test_risks),
        ("Full Report Assembly",    test_full_report),
    ]
    passed = failed = 0
    for name, fn in tests:
        try:
            print(f"\n▶ {name}")
            fn()
            passed += 1
            print(f"  → PASSED")
        except Exception as e:
            failed += 1
            print(f"  → FAILED: {e}")
            import traceback; traceback.print_exc()

    print(f"\n{'=' * 50}")
    print(f"Results: {passed} passed, {failed} failed")
    print(f"{'=' * 50}\n")
    sys.exit(1 if failed else 0)
