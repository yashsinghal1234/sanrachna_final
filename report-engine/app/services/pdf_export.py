"""
services/pdf_export.py — Optional PDF generation using ReportLab.
Generates a professional A4 construction report PDF.
Falls back gracefully if reportlab is not installed.
"""

from __future__ import annotations

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table,
        TableStyle, HRFlowable, PageBreak
    )
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

import io
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models import ProjectInput


# ── Colour palette ────────────────────────────────────────────────────────────
if REPORTLAB_AVAILABLE:
    BRAND_DARK  = colors.HexColor("#0F172A")
    BRAND_TEAL  = colors.HexColor("#2FBFAD")
    BRAND_LIGHT = colors.HexColor("#F8FAFC")
    BRAND_GREY  = colors.HexColor("#64748B")
    RISK_HIGH   = colors.HexColor("#FEE2E2")
    RISK_MED    = colors.HexColor("#FEF9C3")
    RISK_LOW    = colors.HexColor("#DCFCE7")


def _fmt_inr(amount: float) -> str:
    """Format a number as Indian Rupee string with lakh/crore suffixes."""
    if amount >= 1_00_00_000:
        return f"₹{amount / 1_00_00_000:.2f} Cr"
    if amount >= 1_00_000:
        return f"₹{amount / 1_00_000:.2f} L"
    return f"₹{amount:,.0f}"


def generate_pdf(report: dict, inp: "ProjectInput") -> bytes:
    """
    Render the report dict to a PDF byte-string.
    Raises RuntimeError if reportlab is not installed.
    """
    if not REPORTLAB_AVAILABLE:
        raise RuntimeError(
            "reportlab is not installed. "
            "Run: pip install reportlab"
        )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"{inp.project_name} — Construction Report",
        author="Sanrachna Report Engine",
    )

    styles = getSampleStyleSheet()
    story = []

    h1 = ParagraphStyle(
        "h1",
        fontSize=20,
        textColor=BRAND_DARK,
        spaceAfter=6,
        fontName="Helvetica-Bold",
        alignment=TA_CENTER,
    )
    h2 = ParagraphStyle(
        "h2",
        fontSize=13,
        textColor=BRAND_TEAL,
        spaceAfter=4,
        spaceBefore=12,
        fontName="Helvetica-Bold",
    )
    body = ParagraphStyle(
        "body",
        fontSize=9,
        textColor=BRAND_GREY,
        spaceAfter=3,
        fontName="Helvetica",
        leading=14,
    )
    small = ParagraphStyle(
        "small",
        fontSize=8,
        textColor=BRAND_GREY,
        fontName="Helvetica",
        leading=11,
    )

    def hr():
        return HRFlowable(width="100%", thickness=0.5, color=BRAND_TEAL, spaceAfter=6, spaceBefore=4)

    def table_style_base():
        return TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BRAND_DARK),
            ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
            ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",   (0, 0), (-1, 0), 8),
            ("ALIGN",      (0, 0), (-1, -1), "LEFT"),
            ("FONTSIZE",   (0, 1), (-1, -1), 8),
            ("FONTNAME",   (0, 1), (-1, -1), "Helvetica"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [BRAND_LIGHT, colors.white]),
            ("GRID",       (0, 0), (-1, -1), 0.25, BRAND_GREY),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING",   (0, 0), (-1, -1), 6),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ])

    W = A4[0] - 36 * mm    # usable page width

    # ── Cover ─────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 20 * mm))
    story.append(Paragraph("CONSTRUCTION PROJECT REPORT", h1))
    story.append(Paragraph(inp.project_name, h1))
    story.append(Spacer(1, 6))

    meta = report.get("meta", {})
    story.append(Paragraph(
        f"Generated: {meta.get('generated_at', 'N/A')} | Engine: {meta.get('engine_type', '')}",
        small,
    ))
    story.append(Spacer(1, 8 * mm))
    story.append(hr())

    # ── Executive Summary ─────────────────────────────────────────────────────
    s = report["summary"]
    story.append(Paragraph("Executive Summary", h2))
    summary_data = [
        ["Parameter", "Value"],
        ["Project Type",         inp.project_type.title()],
        ["Construction Type",    inp.construction_type.title()],
        ["Built-up Area",        f"{inp.area:,.0f} sqft"],
        ["Total Floors",         str(inp.floors)],
        ["Estimated Duration",   f"{s['est_months']} months ({s['est_days']} working days)"],
        ["Client Budget",        _fmt_inr(s["budget"])],
        ["Estimated Cost",       _fmt_inr(s["est_cost"])],
        ["Budget Variance",      f"{_fmt_inr(abs(s['budget_variance_inr']))} "
                                  f"({'surplus' if s['budget_variance_inr'] >= 0 else 'overrun'})"],
        ["Feasibility",          s["feasibility"]],
        ["Confidence Score",     f"{s['confidence']} %"],
        ["Priority Mode",        inp.priority.replace("_", " ").title()],
    ]
    t = Table(summary_data, colWidths=[W * 0.4, W * 0.6])
    t.setStyle(table_style_base())
    story.append(t)
    story.append(Spacer(1, 4 * mm))

    # ── Cost Overview ─────────────────────────────────────────────────────────
    cost = report["cost"]
    story.append(Paragraph("Cost Overview", h2))
    story.append(Paragraph(
        f"Cost per sqft: <b>{_fmt_inr(cost['per_sqft'])}</b> &nbsp;|&nbsp; "
        f"Total (excl. contingency): <b>{_fmt_inr(cost['total'])}</b> &nbsp;|&nbsp; "
        f"Contingency (5 %): <b>{_fmt_inr(cost['contingency'])}</b> &nbsp;|&nbsp; "
        f"Grand Total: <b>{_fmt_inr(cost['grand_total'])}</b>",
        body,
    ))
    story.append(Spacer(1, 3))
    cost_data = [["Phase", "% Share", "Amount (INR)"]]
    for item in cost["breakdown"]:
        cost_data.append([
            item["phase"],
            f"{item['percentage']} %",
            _fmt_inr(item["amount"]),
        ])
    t = Table(cost_data, colWidths=[W * 0.50, W * 0.15, W * 0.35])
    t.setStyle(table_style_base())
    story.append(t)

    # ── Timeline ─────────────────────────────────────────────────────────────
    story.append(Paragraph("Project Timeline", h2))
    tl_data = [["Phase", "Share", "Days", "Weeks", "Start Day", "End Day"]]
    for ph in report["timeline"]:
        tl_data.append([
            ph["phase"],
            f"{ph['percentage']} %",
            ph["duration_days"],
            ph["duration_weeks"],
            ph["start_day"],
            ph["end_day"],
        ])
    t = Table(tl_data, colWidths=[W * 0.34, W * 0.10, W * 0.10, W * 0.10, W * 0.18, W * 0.18])
    t.setStyle(table_style_base())
    story.append(t)

    # ── BOM ──────────────────────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("Bill of Materials (BOM)", h2))
    bom_data = [["Material", "Quantity", "Unit", "Note"]]
    for item in report["bom"]:
        bom_data.append([
            item["item"],
            f"{item['quantity']:,.2f}",
            item["unit"],
            Paragraph(item["note"], small) if item["note"] else "",
        ])
    t = Table(bom_data, colWidths=[W * 0.35, W * 0.12, W * 0.10, W * 0.43])
    t.setStyle(table_style_base())
    story.append(t)

    # ── Workforce ────────────────────────────────────────────────────────────
    wf = report["workforce"]
    story.append(Paragraph("Workforce Distribution", h2))
    story.append(Paragraph(
        f"Required: <b>{wf['total_required']}</b> workers &nbsp;|&nbsp; "
        f"Available: <b>{wf['total_available']}</b> &nbsp;|&nbsp; "
        f"Gap: <b>{wf['gap']} ({wf['gap_label']})</b> &nbsp;|&nbsp; "
        f"Supervisors: <b>{wf['supervisors']}</b>",
        body,
    ))
    wf_data = [["Trade", "Count", "% Share", "Daily Wage", "Monthly Cost"]]
    for tr in wf["trades"]:
        wf_data.append([
            tr["trade"],
            tr["count"],
            f"{tr['percentage']} %",
            f"₹{tr['daily_wage_inr']:,}",
            _fmt_inr(tr["monthly_cost_inr"]),
        ])
    t = Table(wf_data, colWidths=[W * 0.30, W * 0.12, W * 0.12, W * 0.22, W * 0.24])
    t.setStyle(table_style_base())
    story.append(t)

    # ── Equipment Plan ────────────────────────────────────────────────────────
    story.append(Paragraph("Equipment Plan", h2))
    eq_data = [["Equipment", "Action", "Qty", "Note"]]
    for eq in report["equipment"]:
        if eq.get("action") == "N/A":
            continue
        eq_data.append([
            eq["equipment"],
            eq["action"],
            eq.get("quantity", "—"),
            Paragraph(eq["note"], small),
        ])
    t = Table(eq_data, colWidths=[W * 0.30, W * 0.10, W * 0.08, W * 0.52])
    t.setStyle(table_style_base())
    story.append(t)

    # ── Risk Analysis ─────────────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("Risk Register", h2))
    risk_data = [["ID", "Category", "Severity", "Prob.", "Description", "Mitigation"]]
    severity_colors = {"High": RISK_HIGH, "Medium": RISK_MED, "Low": RISK_LOW}

    risk_style = table_style_base()
    for i, risk in enumerate(report["risks"], start=1):
        risk_data.append([
            risk["id"],
            risk["category"],
            risk["severity"],
            f"{risk['probability_pct']} %",
            Paragraph(risk["description"], small),
            Paragraph(risk["mitigation"], small),
        ])
        bg = severity_colors.get(risk["severity"], colors.white)
        risk_style.add("BACKGROUND", (0, i), (-1, i), bg)

    t = Table(risk_data, colWidths=[W * 0.06, W * 0.11, W * 0.09, W * 0.07, W * 0.34, W * 0.33])
    t.setStyle(risk_style)
    story.append(t)

    # ── Optimisations ─────────────────────────────────────────────────────────
    story.append(Paragraph("Optimisation Opportunities", h2))
    for i, opt in enumerate(report["optimizations"], start=1):
        story.append(Paragraph(
            f"<b>{i}. [{opt['category']}] {opt['area']}</b> — {opt['suggestion']} "
            f"<i>(Expected saving: {opt['expected_saving']})</i>",
            body,
        ))

    # ── Assumptions ───────────────────────────────────────────────────────────
    story.append(Paragraph("Key Assumptions", h2))
    for i, assum in enumerate(report["assumptions"], start=1):
        story.append(Paragraph(f"{i}. {assum}", body))

    # ── Footer note ───────────────────────────────────────────────────────────
    story.append(Spacer(1, 8 * mm))
    story.append(hr())
    story.append(Paragraph(
        "This report is generated by SANRACHNA Report Engine v1.0.0 using deterministic rule-based calculations. "
        "All quantities and costs are indicative estimates and must be reviewed by a licensed structural engineer "
        "before use in contract documents.",
        small,
    ))

    doc.build(story)
    return buffer.getvalue()
