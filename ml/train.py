import argparse
import logging
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline


# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent

FEATURES = ["YEAR", "AREA"]
TARGET = "PROD"
GROUP = "FARMERCODE"

MIN_RECORDS = 10
MIN_GROUPS = 5

DEFAULT_OUTPUT = (
    BASE_DIR / "models" / "ricephil_rf_year_area.joblib"
)

logger = logging.getLogger("agristock-ml-training")


# --------------------------------------------------
# LOAD AND VALIDATE DATASET
# --------------------------------------------------

def load_training_data(csv_path: Path) -> pd.DataFrame:

    if not csv_path.exists():
        raise FileNotFoundError(
            f"Dataset not found: {csv_path}"
        )

    data = pd.read_csv(
        csv_path,
        encoding="utf-8-sig",
    )

    if data.empty:
        raise ValueError("The training CSV is empty.")

    data.columns = [
        str(column).strip().upper()
        for column in data.columns
    ]

    if data.columns.duplicated().any():
        raise ValueError(
            "CSV contains duplicate columns after normalization."
        )

    required = FEATURES + [TARGET, GROUP]

    missing = [
        column
        for column in required
        if column not in data.columns
    ]

    if missing:
        raise ValueError(
            "CSV is missing required columns: "
            + ", ".join(missing)
        )

    data = data[required].copy()

    # Convert numerical columns.
    for column in FEATURES + [TARGET]:

        original = data[column]

        converted = pd.to_numeric(
            original,
            errors="coerce",
        )

        invalid = original.notna() & converted.isna()

        if invalid.any():
            raise ValueError(
                f"{column} contains non-numeric values."
            )

        if converted.isna().any():
            raise ValueError(
                f"{column} must be present for every record."
            )

        if np.isinf(converted).any():
            raise ValueError(
                f"{column} contains infinite values."
            )

        data[column] = converted

    # Validate YEAR.
    if not np.equal(
        data["YEAR"],
        np.floor(data["YEAR"]),
    ).all():
        raise ValueError(
            "YEAR must contain whole years."
        )

    # Validate AREA.
    if (data["AREA"] <= 0).any():
        raise ValueError(
            "AREA must be greater than zero."
        )

    # Validate target.
    if (data[TARGET] < 0).any():
        raise ValueError(
            "PROD cannot be negative."
        )

    # Validate FARMERCODE.
    groups = (
        data[GROUP]
        .astype("string")
        .str.strip()
    )

    if groups.isna().any() or groups.eq("").any():
        raise ValueError(
            "FARMERCODE must be present for every record."
        )

    data[GROUP] = groups

    if len(data) < MIN_RECORDS:
        raise ValueError(
            f"At least {MIN_RECORDS} valid records are required."
        )

    if data[GROUP].nunique() < MIN_GROUPS:
        raise ValueError(
            f"At least {MIN_GROUPS} distinct FARMERCODE "
            "values are required."
        )

    logger.info("Dataset: %s", csv_path.name)
    logger.info("Usable records: %s", len(data))
    logger.info(
        "Distinct farmers: %s",
        data[GROUP].nunique(),
    )
    logger.info("Features: %s", FEATURES)

    return data


# --------------------------------------------------
# MODEL
# --------------------------------------------------

def make_model() -> Pipeline:

    return Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(strategy="median"),
            ),
            (
                "regressor",
                RandomForestRegressor(
                    n_estimators=300,
                    min_samples_leaf=2,
                    n_jobs=-1,
                    random_state=42,
                ),
            ),
        ]
    )


# --------------------------------------------------
# TRAIN AND EVALUATE
# --------------------------------------------------

def train_model(
    data: pd.DataFrame,
    dataset_name: str,
) -> dict[str, Any]:

    features = data[FEATURES]
    target = data[TARGET]
    groups = data[GROUP]

    splitter = GroupShuffleSplit(
        n_splits=1,
        test_size=0.20,
        random_state=42,
    )

    train_indices, test_indices = next(
        splitter.split(
            features,
            target,
            groups=groups,
        )
    )

    if len(test_indices) < 2:
        raise ValueError(
            "The test set must contain at least two records."
        )

    # Evaluation model.
    evaluation_model = make_model()

    evaluation_model.fit(
        features.iloc[train_indices],
        target.iloc[train_indices],
    )

    predictions = evaluation_model.predict(
        features.iloc[test_indices]
    )

    actual = target.iloc[test_indices]

    evaluation = {
        "mae_tonnes": float(
            mean_absolute_error(actual, predictions)
        ),
        "rmse_tonnes": float(
            np.sqrt(
                mean_squared_error(actual, predictions)
            )
        ),
        "r2": float(
            r2_score(actual, predictions)
        ),
        "evaluation_method": (
            "GroupShuffleSplit by FARMERCODE"
        ),
    }

    # Final model trained on all records.
    model = make_model()
    model.fit(features, target)

    feature_ranges = {
        feature: {
            "min": float(features[feature].min()),
            "max": float(features[feature].max()),
        }
        for feature in FEATURES
    }

    return {
        "model": model,
        "features": FEATURES,
        "target": TARGET,
        "target_unit": "tonnes",
        "model_name": "RandomForestRegressor",
        "dataset": dataset_name,
        "training_records": int(len(data)),
        "training_year_range": {
            "min": int(features["YEAR"].min()),
            "max": int(features["YEAR"].max()),
        },
        "feature_ranges": feature_ranges,
        "evaluation": evaluation,
        "warning": (
            "Experimental historical Tarlac dataset from "
            "1990-1997. This model uses YEAR and AREA only. "
            "It has not been validated for modern AgriStock "
            "farms or rice varieties. Random Forest does not "
            "reliably extrapolate beyond its training range."
        ),
    }


# --------------------------------------------------
# MAIN
# --------------------------------------------------

def main() -> None:

    parser = argparse.ArgumentParser(
        description=(
            "Train the AgriStock YEAR + AREA "
            "Palay Production Prediction model."
        )
    )

    parser.add_argument(
        "--data",
        required=True,
        type=Path,
        help=(
            "CSV containing YEAR, AREA, PROD, and FARMERCODE."
        ),
    )

    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=(
            "Output model artifact. Defaults to "
            "models/ricephil_rf_year_area.joblib."
        ),
    )

    args = parser.parse_args()

    try:

        training_data = load_training_data(
            args.data
        )

        artifact = train_model(
            training_data,
            args.data.name,
        )

        args.output.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        joblib.dump(
            artifact,
            args.output,
        )

    except (
        OSError,
        ValueError,
        pd.errors.ParserError,
    ) as error:

        parser.error(str(error))

    logger.info("Training completed successfully.")

    logger.info(
        "Training records: %s",
        artifact["training_records"],
    )

    logger.info(
        "Training year range: %s",
        artifact["training_year_range"],
    )

    logger.info(
        "MAE: %.3f tonnes",
        artifact["evaluation"]["mae_tonnes"],
    )

    logger.info(
        "RMSE: %.3f tonnes",
        artifact["evaluation"]["rmse_tonnes"],
    )

    logger.info(
        "R²: %.3f",
        artifact["evaluation"]["r2"],
    )

    logger.info(
        "Saved model: %s",
        args.output.resolve(),
    )


if __name__ == "__main__":

    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)s: %(message)s",
    )

    main()
