
import os
import logging
from pathlib import Path
from typing import List

import joblib
import numpy as np
import pandas as pd
import sklearn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict


# --------------------------------------------------
# PATHS AND LOGGING
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = Path(
    os.getenv(
        "AGRI_ML_MODEL_PATH",
        str(BASE_DIR / "models" / "ricephil_rf_year_area.joblib"),
    )
).expanduser().resolve()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agristock-ml")


# --------------------------------------------------
# LOAD TRAINED MODEL
# --------------------------------------------------

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Model file not found: {MODEL_PATH}. "
        "Place ricephil_rf_year_area.joblib inside the ml/models folder "
        "or set AGRI_ML_MODEL_PATH to its exact location."
    )

artifact = joblib.load(MODEL_PATH)

if not isinstance(artifact, dict) or "model" not in artifact:
    raise ValueError(
        "Invalid model artifact. Expected a dictionary containing the 'model' key."
    )

model = artifact["model"]

FEATURES = artifact.get("features", ["YEAR", "AREA"])
TARGET = artifact.get("target", "PROD")
TARGET_UNIT = artifact.get("target_unit", "tonnes")
EVALUATION = artifact.get("evaluation", {})

EXPECTED_FEATURES = ["YEAR", "AREA"]

if FEATURES != EXPECTED_FEATURES:
    raise ValueError(
        f"Unexpected model features: {FEATURES}. "
        f"Expected: {EXPECTED_FEATURES}. "
        "Make sure the YEAR + AREA model was trained."
    )

DEFAULT_TRAINING_RANGES = {
    "YEAR": {"min": 1990, "max": 1997},
    "AREA": {"min": 0.2, "max": 7.0},
}

TRAINING_RANGES = artifact.get(
    "feature_ranges",
    DEFAULT_TRAINING_RANGES,
)

TRAINING_YEAR_RANGE = artifact.get(
    "training_year_range",
    {
        "min": TRAINING_RANGES["YEAR"]["min"],
        "max": TRAINING_RANGES["YEAR"]["max"],
    },
)


# --------------------------------------------------
# FASTAPI APPLICATION
# --------------------------------------------------

app = FastAPI(
    title="AgriStock Palay Prediction API",
    description=(
        "Experimental palay production prediction API "
        "using a Random Forest model with YEAR and AREA features."
    ),
    version="2.0.0",
)

configured_origins = os.getenv(
    "AGRI_FRONTEND_ORIGINS",
    "http://localhost:3000,http://localhost:3001,"
    "http://127.0.0.1:3000,http://127.0.0.1:3001",
)

allowed_origins = [
    origin.strip()
    for origin in configured_origins.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


# --------------------------------------------------
# REQUEST / RESPONSE SCHEMAS
# --------------------------------------------------

class PredictionRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "year": 2026,
                "area_hectares": 2.0,
            }
        }
    )

    year: int = Field(..., ge=1900, le=2200)
    area_hectares: float = Field(..., gt=0)


class PredictionResponse(BaseModel):
    success: bool
    model_name: str
    prediction_tonnes: float
    prediction_kg: float
    target: str
    target_unit: str
    experimental: bool
    warnings: List[str]


# --------------------------------------------------
# HELPERS
# --------------------------------------------------

def get_warnings(values: dict) -> List[str]:
    year_min = TRAINING_YEAR_RANGE["min"]
    year_max = TRAINING_YEAR_RANGE["max"]

    warnings = [
        (
            "The prediction is an experimental baseline estimate, "
            "not a guaranteed harvest result. Do not save it as actual harvested yield."
        ),
        artifact.get(
            "warning",
            (
                "This model has not been validated for current AgriStock farms "
                "or modern rice varieties."
            ),
        ),
    ]

    if values["YEAR"] < year_min or values["YEAR"] > year_max:
        warnings.append(
            f"YEAR ({values['YEAR']}) is outside the training period "
            f"({year_min} to {year_max}). A Random Forest cannot reliably "
            "extrapolate beyond its training data."
        )

    area_limits = TRAINING_RANGES["AREA"]
    if (
        values["AREA"] < area_limits["min"]
        or values["AREA"] > area_limits["max"]
    ):
        warnings.append(
            f"AREA value ({values['AREA']}) is outside the training dataset range "
            f"({area_limits['min']} to {area_limits['max']}). "
            "The prediction may be unreliable."
        )

    return warnings


# --------------------------------------------------
# ROUTES
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "success": True,
        "message": "AgriStock Palay Prediction API is running.",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health():
    return {
        "success": True,
        "status": "healthy",
        "model_loaded": True,
        "model_name": artifact.get(
            "model_name",
            "RandomForestRegressor",
        ),
        "model_file": MODEL_PATH.name,
        "features": FEATURES,
        "target": TARGET,
        "target_unit": TARGET_UNIT,
        "scikit_learn_version": sklearn.__version__,
        "training_records": artifact.get("training_records"),
        "training_year_range": TRAINING_YEAR_RANGE,
        "feature_ranges": TRAINING_RANGES,
        "evaluation": EVALUATION,
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    try:
        values = {
            "YEAR": request.year,
            "AREA": request.area_hectares,
        }

        if not all(
            np.isfinite(float(value))
            for value in values.values()
        ):
            raise HTTPException(
                status_code=422,
                detail="All input values must be finite numbers.",
            )

        input_data = pd.DataFrame(
            [[
                values["YEAR"],
                values["AREA"],
            ]],
            columns=FEATURES,
        )

        raw_prediction = float(model.predict(input_data)[0])

        if not np.isfinite(raw_prediction):
            raise ValueError(
                "The model returned a non-finite prediction."
            )

        # PROD is measured in tonnes.
        prediction_tonnes = max(0.0, raw_prediction)
        prediction_kg = prediction_tonnes * 1000.0

        return PredictionResponse(
            success=True,
            model_name=artifact.get(
                "model_name",
                "RandomForestRegressor",
            ),
            prediction_tonnes=round(prediction_tonnes, 4),
            prediction_kg=round(prediction_kg, 2),
            target=TARGET,
            target_unit=TARGET_UNIT,
            experimental=True,
            warnings=get_warnings(values),
        )

    except HTTPException:
        raise

    except Exception as error:
        logger.exception(
            "Palay prediction failed: %s",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to generate a prediction. "
                "Check the ML service log."
            ),
        )
