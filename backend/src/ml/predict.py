"""
Sanrachna Budget Estimation - ML Inference Script
Called by Node.js via child_process.spawn.

Reads: JSON from stdin  { "material": N, "labor": N, "profit_rate": N, "markup": N, "discount": N }
Writes: JSON to stdout  { "prediction": N, "model": "pipeline|fallback", "features": [...] }
"""
import sys
import json
import os

def main():
    try:
        raw = sys.stdin.read()
        data = json.loads(raw)

        material    = float(data.get("material", 0))
        labor       = float(data.get("labor", 0))
        profit_rate = float(data.get("profit_rate", 0))
        markup      = float(data.get("markup", 0))
        discount    = float(data.get("discount", 0))

        sample = [[material, labor, profit_rate, markup, discount]]

        models_dir = os.path.dirname(os.path.abspath(__file__))
        pipeline_path = os.path.join(models_dir, "estimate_pipeline.pkl")
        model_path    = os.path.join(models_dir, "estimate_model.pkl")

        import joblib

        # Prefer the pipeline dict (has the XGBRegressor inside)
        prediction = None
        used_model = "unknown"

        if os.path.exists(pipeline_path):
            obj = joblib.load(pipeline_path)
            if isinstance(obj, dict) and "model" in obj:
                prediction = float(obj["model"].predict(sample)[0])
                used_model = "pipeline"
            elif hasattr(obj, "predict"):
                prediction = float(obj.predict(sample)[0])
                used_model = "pipeline"

        if prediction is None and os.path.exists(model_path):
            obj = joblib.load(model_path)
            if hasattr(obj, "predict"):
                prediction = float(obj.predict(sample)[0])
                used_model = "model"

        if prediction is None:
            raise ValueError("Could not load any model file")

        result = {
            "prediction": round(prediction, 2),
            "model": used_model,
            "features": {
                "Material_Cost": material,
                "Labor_Cost": labor,
                "Profit_Rate": profit_rate,
                "Markup_cost": markup,
                "Discount_cost": discount,
            }
        }
        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        err = {"error": str(e)}
        print(json.dumps(err), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
