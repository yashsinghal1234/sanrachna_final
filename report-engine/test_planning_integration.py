"""
test_planning_integration.py — Tests the /generate and /revise endpoints
using the same data shape as the React frontend.
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.models_planning import PlanningFormValues
from app.services.planning_adapter import generate_planning_report, revise_planning_report

SAMPLE_FORM = PlanningFormValues(
    projectName="Greenfield Towers Phase 1",
    siteLocation="Pune, Maharashtra",
    plotArea=6000,
    builtUpArea=18000,
    numberOfFloors=10,
    projectType="Residential",
    constructionType="New",
    priorityMode="Balanced",
    totalBudget=5_00_00_000,           # ₹5 Crore
    targetCompletionDate="2027-06-30",
    structuralSystem="RCC",
    soilCondition="Medium",
    seismicZone="Zone III",
    floorHeightFt=10.0,
    concreteGrade="M25",
    steelGrade="Fe500",
    finishQuality="Standard",
    availableWorkforce="80",
    shiftPolicy="Single",
    siteAccessibility="Good",
    locationType="Urban",
    seasonalConstraints="monsoon (June-September)",
)


def test_generate():
    print("\n▶  generate_planning_report()")
    report = generate_planning_report(SAMPLE_FORM)

    assert report.executiveSummary.feasibility in ("Feasible", "Challenging", "Not Feasible")
    assert report.executiveSummary.estimatedMonths > 0
    assert report.executiveSummary.estimatedCost > 0
    assert 0 <= report.executiveSummary.confidencePercent <= 100
    assert len(report.executiveSummary.majorRisks) > 0
    assert len(report.costBreakdown.phases) == 5
    assert len(report.billOfMaterials) > 5
    assert report.workforcePlan.totalWorkers > 0
    assert len(report.equipmentPlan) > 5
    assert len(report.timeline.phases) == 3
    assert len(report.riskForecast) > 3
    assert len(report.optimizations) > 3
    assert len(report.assumptions) > 5

    print(f"  ✓ feasibility      = {report.executiveSummary.feasibility}")
    print(f"  ✓ estimatedMonths  = {report.executiveSummary.estimatedMonths}")
    print(f"  ✓ estimatedCost    = ₹{report.executiveSummary.estimatedCost:,.0f}")
    print(f"  ✓ confidence       = {report.executiveSummary.confidencePercent} %")
    print(f"  ✓ BOM rows         = {len(report.billOfMaterials)}")
    print(f"  ✓ risks            = {len(report.riskForecast)}")
    print(f"  ✓ optimizations    = {len(report.optimizations)}")
    print("  → PASSED")
    return report


def test_revise(initial_report):
    print("\n▶  revise_planning_report() — 'increase workers to 120, switch to double shift'")
    form2 = SAMPLE_FORM.model_copy()
    revised = revise_planning_report(
        form=form2,
        current_report=initial_report.model_dump(),
        chat_history=[],
        new_message="increase workers to 120, switch to double shift",
    )
    # Duration should be shorter with more workers + double shift
    assert revised.executiveSummary.estimatedMonths <= initial_report.executiveSummary.estimatedMonths
    assert revised.revisionSummary is not None
    print(f"  ✓ revised months   = {revised.executiveSummary.estimatedMonths} "
          f"(was {initial_report.executiveSummary.estimatedMonths})")
    print(f"  ✓ revisionSummary  = {revised.revisionSummary[:80]}")
    print("  → PASSED")


def test_json_serializable(initial_report):
    print("\n▶  JSON serialization check")
    import json
    j = json.dumps(initial_report.model_dump())
    parsed = json.loads(j)
    assert "executiveSummary" in parsed
    assert "costBreakdown" in parsed
    print(f"  ✓ JSON length = {len(j):,} bytes")
    print("  → PASSED")


if __name__ == "__main__":
    print("\n🏗  PLANNING INTEGRATION TEST\n" + "=" * 50)
    passed = failed = 0
    report = None
    for name, fn, args in [
        ("Generate Planning Report", test_generate, []),
        ("Revise Planning Report",   test_revise, [None]),
        ("JSON Serializable",        test_json_serializable, [None]),
    ]:
        try:
            if name == "Generate Planning Report":
                report = fn()
            elif args == [None]:
                fn(report)
            else:
                fn(*args)
            passed += 1
        except Exception as e:
            failed += 1
            print(f"  → FAILED: {e}")
            import traceback; traceback.print_exc()

    print(f"\n{'=' * 50}")
    print(f"Results: {passed} passed, {failed} failed")
    sys.exit(1 if failed else 0)
