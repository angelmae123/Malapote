# AgriStock Palay Prediction

The API loads a scikit-learn model artifact and predicts palay production in
tonnes. The bundled `models/ricephil_rf_baseline.joblib` was trained on 344
historical Tarlac records from 1990–1997. Its held-out farmer-group evaluation
is MAE 1.88 tonnes, RMSE 2.54 tonnes, and R² 0.58. These results do not validate
it for present-day AgriStock farms.

## What the 1990–1997 data can and cannot do

The historical data is useful for reproducing estimates within its period and
testing the ML pipeline. It cannot by itself support a reliable 2026 harvest
forecast: the bundled Random Forest does not extrapolate beyond the years and
input ranges it learned. The API returns warnings when a prediction is outside
those ranges.

For a current harvest forecast, gather labeled, recent harvest records and
retrain using the same definitions and units for all features. The CSV must
contain:

| Column | Meaning |
|---|---|
| `YEAR` | Crop year |
| `AREA` | Planted area in hectares |
| `NPK` | NPK feature using the training dataset's exact definition and scale |
| `OTHER` | OTHER feature using the training dataset's exact definition and scale |
| `PROD` | Actual harvested production in tonnes |
| `FARMERCODE` | Farmer/group ID used to keep validation farmers separate from training |

`OTHER` in `ricephil.csv` is a Laspeyres input index, not kilograms of other
fertilizer. Do not substitute AgriStock fertilizer totals for that index. The
bundled UI also asks for the original feature definitions. If current data uses
different definitions, harmonize it first or build a separately validated
model and matching inputs; the training command intentionally will not guess
unit conversions.

## Train a compatible model

From `AgriStock/ml` in PowerShell:

```powershell
.\.venv\Scripts\python.exe train.py `
  --data .\data\palay_training.csv `
  --output .\models\palay_harvest_model.joblib
```

Training requires at least 10 valid records from at least 5 farmers. It holds
out complete farmer groups for evaluation, then refits the final model on all
valid rows. It prints held-out MAE, RMSE, and R². Review those metrics and the
dataset's relevance before using the model; a low error on a small historical
dataset is not proof of present-day accuracy.

Point the API at the new artifact with `AGRI_ML_MODEL_PATH`:

```powershell
$env:AGRI_ML_MODEL_PATH = (Resolve-Path .\models\palay_harvest_model.joblib).Path
python -m uvicorn app:app --host 127.0.0.1 --port 8001
```

The bundled model remains unchanged if training produces a separate output
file. `/health` reports the loaded training period, input ranges, record count,
and evaluation metrics.

## Run the API

Install dependencies and start the service:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn app:app --host 127.0.0.1 --port 8001 --reload
```

Open:
- API health: http://127.0.0.1:8001/health
- Interactive API docs: http://127.0.0.1:8001/docs

The API returns both tonnes and kilograms. It does not save predictions as
actual harvest records. Keep it bound to `127.0.0.1`; do not expose it directly
to the public internet. In production, set the PHP backend's
`PALAY_ML_API_URL` to this service's `/predict` endpoint on a private network
reachable by the backend. The local `127.0.0.1` address is only valid when both
services run on the same machine.

## Deploy on Render

The repository's root `render.yaml` defines a separate Python web service for
this API. In Render, create a Blueprint Instance for the repository and deploy
the `agristock-palay-ml` service. Wait for its `/health` check to pass and
confirm `model_loaded` is `true`.

Then set the PHP backend's `PALAY_ML_API_URL` environment variable to the
deployed service's `/predict` URL, for example
`https://agristock-palay-ml.onrender.com/predict`, and redeploy the PHP backend.
Use the ML service's private URL instead if both services support private
networking. Do not set this variable to the service root or `/health`: those
return status information, not a prediction. A Render free web service may
sleep between requests, so its cold start can exceed the PHP backend's current
30-second prediction timeout.
