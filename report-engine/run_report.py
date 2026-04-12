# -*- coding: utf-8 -*-
"""
run_report.py
─────────────────────────────────────────────────────────────────────────────
Calls the live FastAPI Report Engine at http://localhost:8001/generate
with a real construction project and prints the complete structured report.

Run this from the report-engine folder:
    python -X utf8 run_report.py
"""

import json
import sys
import urllib.request
import urllib.error
from datetime import datetime

# ── Input payload  (mirrors PlanningFormValues from the React frontend) ───────
PROJECT = {
    "projectName": "Sanrachna Tower Block A",
    "siteLocation": "Ahmedabad, Gujarat",
    "plotArea": 8000,
    "builtUpArea": 24000,
    "numberOfFloors": 12,
    "projectType": "Residential",
    "constructionType": "New",
    "priorityMode": "Balanced",
    "totalBudget": 80_000_000,          # INR 8 Crore
    "targetCompletionDate": "2027-12-31",
    "structuralSystem": "RCC",
    "soilCondition": "Medium",
    "seismicZone": "Zone III",
    "floorHeightFt": 10.0,
    "concreteGrade": "M25",
    "steelGrade": "Fe500",
    "finishQuality": "Standard",
    "availableWorkforce": "100",
    "shiftPolicy": "Single",
    "siteAccessibility": "Good",
    "locationType": "Urban",
    "seasonalConstraints": "monsoon (June-September)",
    "customConstraints": [],
}

BASE_URL = "http://localhost:8001"

SEP = "=" * 65


def inr(amount: float) -> str:
    """Format a number as ₹ crore / lakh / plain."""
    if amount >= 1_00_00_000:
        return f"INR {amount / 1_00_00_000:.2f} Cr"
    if amount >= 1_00_000:
        return f"INR {amount / 1_00_000:.2f} L"
    return f"INR {amount:,.0f}"


def post(endpoint: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"\nHTTP {e.code} error from {endpoint}:\n{body}\n")
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"\nCould not connect to {BASE_URL}: {e.reason}")
        print("Make sure the FastAPI server is running:")
        print("  cd report-engine")
        print("  python -m uvicorn app.main:app --port 8001 --reload")
        sys.exit(1)


def bar(pct: float, width: int = 30) -> str:
    filled = int(pct / 100 * width)
    return "[" + "#" * filled + "." * (width - filled) + f"] {pct:.1f}%"


def print_report(report: dict) -> None:
    es = report["executiveSummary"]
    cb = report["costBreakdown"]
    tl = report["timeline"]
    wf = report["workforcePlan"]
    bom = report["billOfMaterials"]
    eq = report["equipmentPlan"]
    risks = report["riskForecast"]
    opts = report["optimizations"]
    assum = report["assumptions"]

    print()
    print(SEP)
    print("  SANRACHNA REPORT ENGINE  —  CONSTRUCTION PROJECT REPORT")
    print(f"  Generated: {datetime.now().strftime('%Y-%m-%d  %H:%M:%S')}")
    print(SEP)
    print(f"  Project  : {PROJECT['projectName']}")
    print(f"  Location : {PROJECT['siteLocation']}")
    print(f"  Area     : {PROJECT['builtUpArea']:,} sqft  |  {PROJECT['numberOfFloors']} floors")
    print(f"  Budget   : {inr(PROJECT['totalBudget'])}")
    print(SEP)

    # ── Executive Summary ─────────────────────────────────────────────────────
    print()
    print("  EXECUTIVE SUMMARY")
    print("  " + "-" * 45)
    feasibility = es["feasibility"]
    flag = "OK " if feasibility == "Feasible" else "!!!" if feasibility == "Not Feasible" else "(/)"
    print(f"  Feasibility      : [{flag}] {feasibility}")
    print(f"  Estimated Cost   : {inr(es['estimatedCost'])}")
    print(f"  Duration         : {es['estimatedMonths']} months")
    print(f"  Confidence       : {es['confidencePercent']} %  {bar(es['confidencePercent'], 20)}")
    print()
    print("  Top Risks Identified:")
    for r in es["majorRisks"]:
        print(f"    * {r[:72]}")
    print()
    print("  Key Assumptions:")
    for a in es["keyAssumptions"]:
        print(f"    * {a[:72]}")

    # ── Cost Breakdown ────────────────────────────────────────────────────────
    print()
    print("  COST BREAKDOWN")
    print("  " + "-" * 45)
    print(f"  Total Cost       : {inr(cb['totalCost'])}")
    print(f"  Cost per sqft    : {inr(cb['costPerSqFt'])}")
    print(f"  Contingency (5%) : {inr(cb['contingencyAmount'])}")
    print(f"  Grand Total      : {inr(cb['totalCost'] + cb['contingencyAmount'])}")
    print()
    for phase in cb["phases"]:
        print(f"  {phase['name'][:30]:<30}  {bar(phase['percent'], 25)}")

    # ── Timeline ──────────────────────────────────────────────────────────────
    print()
    print("  PROJECT TIMELINE")
    print("  " + "-" * 45)
    cursor = 0
    for phase in tl["phases"]:
        months = phase["months"]
        cursor += months
        month_bar = "=" * max(1, int(months / tl["totalMonths"] * 30))
        print(f"  {phase['name'][:22]:<22}  {months:5.1f} mo  {month_bar}")
        for ms in phase["milestones"]:
            print(f"    > {ms}")
    print(f"  {'TOTAL':<22}  {tl['totalMonths']:5.1f} months")

    # ── Workforce ─────────────────────────────────────────────────────────────
    print()
    print("  WORKFORCE PLAN")
    print("  " + "-" * 45)
    print(f"  Required workers : {wf['totalWorkers']}")
    print(f"  Peak headcount   : {wf['peakWorkers']}")
    print(f"  Available        : {PROJECT['availableWorkforce']}")
    print()
    print(f"  {'Trade':<22}  {'Count':>5}  Phase")
    for t in wf["byTrade"]:
        print(f"  {t['trade']:<22}  {t['count']:>5}  {t['phase']}")

    # ── Bill of Materials ─────────────────────────────────────────────────────
    print()
    print("  BILL OF MATERIALS")
    print("  " + "-" * 65)
    print(f"  {'Material':<38}  {'Qty':>10}  {'Unit':<8}  {'Rate':>8}  {'Total'}")
    print("  " + "-" * 65)
    for row in bom:
        total = row["quantity"] * row["unitRate"]
        print(
            f"  {row['material'][:38]:<38}  {row['quantity']:>10,.1f}"
            f"  {row['unit']:<8}  {row['unitRate']:>8,.0f}  {inr(total)}"
        )

    # ── Equipment ─────────────────────────────────────────────────────────────
    print()
    print("  EQUIPMENT PLAN")
    print("  " + "-" * 45)
    print(f"  {'Equipment':<30}  {'Action':>8}  Qty")
    for e in eq:
        action = e.get("recommendation", e.get("action", "Rent"))
        qty = e.get("quantity", "-")
        if action == "Not needed" or qty == 0:
            continue
        print(f"  {e['name'][:30]:<30}  {str(action):>8}  {qty}")

    # ── Risk Register ─────────────────────────────────────────────────────────
    print()
    print("  RISK REGISTER")
    print("  " + "-" * 65)
    severity_order = {"High": 0, "Medium": 1, "Low": 2}
    sorted_risks = sorted(risks, key=lambda x: severity_order.get(x["level"], 3))
    for risk in sorted_risks:
        lvl = risk["level"].upper()
        print(f"  [{lvl:<6}] {risk['risk'][:62]}")
        print(f"          Mitigation: {risk['mitigation'][:60]}")

    # ── Optimisations ─────────────────────────────────────────────────────────
    print()
    print("  VALUE ENGINEERING / OPTIMISATIONS")
    print("  " + "-" * 65)
    for i, opt in enumerate(opts, 1):
        saving = f"  Saving: {opt['impact']}" if opt.get("impact") else ""
        print(f"  {i:2}. {opt['suggestion'][:70]}")
        if saving:
            print(f"     {saving}")

    # ── Assumptions ───────────────────────────────────────────────────────────
    print()
    print("  DESIGN & CALCULATION ASSUMPTIONS")
    print("  " + "-" * 65)
    for i, a in enumerate(assum, 1):
        print(f"  {i:2}. {a[:75]}")

    # ── Footer ────────────────────────────────────────────────────────────────
    print()
    print(SEP)
    print("  Engine  : Sanrachna Deterministic Report Engine v1.0.0")
    print("  AI Used : NO  |  All values computed by rule-based formulas")
    print(f"  JSON    : {len(json.dumps(report)):,} bytes  |  Keys: {list(report.keys())}")
    print(SEP)
    print()


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"\nConnecting to {BASE_URL} ...")

    # 1. Health check
    try:
        with urllib.request.urlopen(f"{BASE_URL}/health", timeout=5) as r:
            health = json.loads(r.read())
            print(f"Server: {health['status'].upper()}  |  "
                  f"AI: {health['ai_used']}  |  "
                  f"PDF: {health['pdf_export']}")
    except Exception as e:
        print(f"Health check failed: {e}")
        print("Start the server first: python -m uvicorn app.main:app --port 8001 --reload")
        sys.exit(1)

    # 2. Generate report
    print(f"\nGenerating report for '{PROJECT['projectName']}' ...")
    report = post("/generate", PROJECT)
    print("Report received. Rendering...\n")

    # 3. Print full report
    print_report(report)

    # 4. Save JSON to file
    out_file = "generated_report.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"  Full JSON saved to: {out_file}")
    print()
