"""
main.py — FastAPI application entry point.

Routes:
    POST /generate-report   → full raw JSON report (internal format)
    POST /generate-pdf      → binary PDF download
    POST /generate          → PlanningReport JSON consumed by the React frontend
    POST /revise            → Revised PlanningReport after a chat revision request
    GET  /health            → liveness probe
"""

import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
import traceback

from app.models import ProjectInput
from app.models_planning import PlanningFormValues, ReviseRequest, PlanningReport
from app.services.report import build_report
from app.services.pdf_export import generate_pdf, REPORTLAB_AVAILABLE
from app.services.planning_adapter import generate_planning_report, revise_planning_report

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Sanrachna Construction Report Engine",
    description=(
        "Production-ready, deterministic construction project report generator. "
        "No AI/ML — all calculations use rule-based construction domain logic.\n\n"
        "**Frontend integration**: The `/generate` and `/revise` endpoints are called "
        "directly by the React AI Planning Studio and return `PlanningReport` JSON."
    ),
    version="1.0.0",
    contact={"name": "Sanrachna Engineering Platform"},
    license_info={"name": "Proprietary"},
)

# ── CORS ─────────────────────────────────────────────────────────────────────
# In production set CORS_ORIGINS env var to a comma-separated list of allowed
# origins, e.g. "https://sanrachna-final.vercel.app". Falls back to "*" so
# local development keeps working without any extra config.
_raw_origins = os.environ.get("CORS_ORIGINS", "")
_extra = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",     # Vite default
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        *_extra,
    ] or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global exception handler ──────────────────────────────────────────────────

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal calculation error",
            "detail": str(exc),
            "traceback": tb,        # remove in production
        },
    )


# ── Utility ───────────────────────────────────────────────────────────────────

@app.get("/health", tags=["Utility"])
def health() -> dict:
    """Liveness probe — returns service status and capabilities."""
    return {
        "status": "ok",
        "engine": "deterministic-rule-based",
        "ai_used": False,
        "pdf_export": REPORTLAB_AVAILABLE,
        "version": "1.0.0",
        "endpoints": {
            "planning_generate": "POST /generate",
            "planning_revise":   "POST /revise",
            "full_report":       "POST /generate-report",
            "pdf_export":        "POST /generate-pdf",
        },
    }


# ══════════════════════════════════════════════════════════════════════════════
#  🌐  PLANNING STUDIO INTEGRATION ENDPOINTS
#  These are called directly by the React frontend (planningApi.ts).
# ══════════════════════════════════════════════════════════════════════════════

@app.post(
    "/generate",
    tags=["Planning Studio"],
    response_model=PlanningReport,
    response_model_exclude_none=True,
    summary="Generate PlanningReport from React form data",
)
def planning_generate(form: PlanningFormValues) -> PlanningReport:
    """
    **Primary endpoint for the React AI Planning Studio.**

    Accepts the `PlanningFormValues` JSON posted by `InputForm.tsx` and
    returns a `PlanningReport` object that `ReportView.tsx` can render directly.

    All values are computed deterministically — zero LLM calls.
    """
    try:
        return generate_planning_report(form)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@app.post(
    "/revise",
    tags=["Planning Studio"],
    response_model=PlanningReport,
    response_model_exclude_none=True,
    summary="Revise PlanningReport based on a chat message",
)
def planning_revise(req: ReviseRequest) -> PlanningReport:
    """
    **Revision endpoint for the React AI Planning Studio (Step 3 chat).**

    Parses the user's natural-language revision request (e.g.
    "increase workers to 60", "switch to double shift", "use economy finish")
    and regenerates the `PlanningReport` with the appropriate parameter changes.

    The frontend sends: `{ form, report, chatHistory, newMessage }`.
    """
    try:
        return revise_planning_report(
            form=req.form,
            current_report=req.report,
            chat_history=req.chatHistory,
            new_message=req.newMessage,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


# ══════════════════════════════════════════════════════════════════════════════
#  📊  INTERNAL FULL-DETAIL REPORT (separate from frontend PlanningReport)
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/generate-report", tags=["Internal Report"], response_model=None)
def generate_report(inp: ProjectInput) -> dict:
    """
    Generate a full internal construction project report.

    Returns the complete engine output (more detailed than the frontend
    PlanningReport) — useful for PDF export, Excel, or advanced dashboards.
    """
    try:
        report = build_report(inp)
        return report
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@app.post("/generate-pdf", tags=["Internal Report"])
def generate_report_pdf(inp: ProjectInput) -> Response:
    """
    Generate the full internal report as a PDF file (requires `reportlab`).
    """
    if not REPORTLAB_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="PDF export is not available. Install reportlab: pip install reportlab",
        )
    try:
        report = build_report(inp)
        pdf_bytes = generate_pdf(report, inp)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e

    safe_name = "".join(c if c.isalnum() or c in "-_ " else "_" for c in inp.project_name)
    filename = f"{safe_name}_report.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Dev runner ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
