@echo off
REM start_report_engine.bat — Start the Sanrachna FastAPI Report Engine
REM Runs on port 8001; the React frontend reads VITE_PLANNING_API_BASE=http://localhost:8001

echo.
echo  Sanrachna Report Engine
echo  Listening on http://localhost:8001
echo  Interactive docs: http://localhost:8001/docs
echo  Press CTRL+C to stop
echo.

python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
