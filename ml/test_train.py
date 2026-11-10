
import tempfile
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

from train import load_training_data, train_model


# --------------------------------------------------
# SAMPLE DATASET
# --------------------------------------------------

def sample_data() -> pd.DataFrame:
    rows = []

    for farmer in range(10):
        for year in range(1990, 1993):
            area = 1.0 + farmer / 10

            rows.append(
                {
                    "YEAR": year,
                    "AREA": area,
                    "NPK": 50 + farmer,
                    "OTHER": 90 + year - 1990,
                    "PROD": area * 3 + farmer / 10,
                    "FARMERCODE": f"F{farmer:02d}",
                }
            )

    return pd.DataFrame(rows)


# --------------------------------------------------
# TESTS
# --------------------------------------------------

class TrainingWorkflowTests(unittest.TestCase):

    def save_csv(self, data, directory):
        csv_path = Path(directory) / "training.csv"
        data.to_csv(csv_path, index=False)
        return csv_path

    # ----------------------------------------------
    # DATA LOADING
    # ----------------------------------------------

    def test_load_training_data_normalizes_headers_and_validates_groups(self):
        data = sample_data()
        data.columns = [
            column.lower()
            for column in data.columns
        ]

        with tempfile.TemporaryDirectory() as temporary_directory:
            csv_path = self.save_csv(data, temporary_directory)
            loaded = load_training_data(csv_path)

        self.assertEqual(len(loaded), 30)
        self.assertEqual(loaded["FARMERCODE"].nunique(), 10)

        self.assertEqual(
            list(loaded.columns),
            [
                "YEAR",
                "AREA",
                "NPK",
                "OTHER",
                "PROD",
                "FARMERCODE",
            ],
        )

    def test_missing_group_column_is_rejected(self):
        data = sample_data().drop(columns=["FARMERCODE"])

        with tempfile.TemporaryDirectory() as temporary_directory:
            csv_path = self.save_csv(data, temporary_directory)

            with self.assertRaisesRegex(ValueError, "FARMERCODE"):
                load_training_data(csv_path)

    def test_feature_missing_for_every_record_is_rejected(self):
        data = sample_data()
        data["NPK"] = None

        with tempfile.TemporaryDirectory() as temporary_directory:
            csv_path = self.save_csv(data, temporary_directory)

            with self.assertRaisesRegex(ValueError, "NPK"):
                load_training_data(csv_path)

    def test_partial_missing_features_are_allowed(self):
        data = sample_data()
        data.loc[0, "NPK"] = None
        data.loc[1, "AREA"] = None

        with tempfile.TemporaryDirectory() as temporary_directory:
            csv_path = self.save_csv(data, temporary_directory)
            loaded = load_training_data(csv_path)

        self.assertTrue(loaded["NPK"].isna().any())
        self.assertTrue(loaded["AREA"].isna().any())

        artifact = train_model(loaded, "training.csv")

        self.assertIsNotNone(artifact["model"])

    def test_missing_target_is_rejected(self):
        data = sample_data()
        data.loc[0, "PROD"] = None

        with tempfile.TemporaryDirectory() as temporary_directory:
            csv_path = self.save_csv(data, temporary_directory)

            with self.assertRaisesRegex(ValueError, "PROD"):
                load_training_data(csv_path)

    def test_invalid_numeric_value_is_rejected(self):
        data = sample_data()
        data["NPK"] = data["NPK"].astype(object)
        data.loc[0, "NPK"] = "invalid"

        with tempfile.TemporaryDirectory() as temporary_directory:
            csv_path = self.save_csv(data, temporary_directory)

            with self.assertRaisesRegex(ValueError, "NPK"):
                load_training_data(csv_path)

    def test_non_integer_year_is_rejected(self):
        data = sample_data()

        # Convert YEAR to float before assigning a decimal value.
        data["YEAR"] = data["YEAR"].astype(float)
        data.loc[0, "YEAR"] = 1990.5

        with tempfile.TemporaryDirectory() as temporary_directory:
            csv_path = self.save_csv(data, temporary_directory)

            with self.assertRaisesRegex(ValueError, "whole year"):
                load_training_data(csv_path)

    def test_missing_year_is_rejected(self):
        data = sample_data()
        data.loc[0, "YEAR"] = None

        with tempfile.TemporaryDirectory() as temporary_directory:
            csv_path = self.save_csv(data, temporary_directory)

            with self.assertRaisesRegex(ValueError, "YEAR"):
                load_training_data(csv_path)

    def test_negative_values_are_rejected(self):
        data = sample_data()
        data.loc[0, "NPK"] = -10

        with tempfile.TemporaryDirectory() as temporary_directory:
            csv_path = self.save_csv(data, temporary_directory)

            with self.assertRaisesRegex(ValueError, "cannot be negative"):
                load_training_data(csv_path)

    def test_zero_area_is_rejected(self):
        data = sample_data()
        data.loc[0, "AREA"] = 0

        with tempfile.TemporaryDirectory() as temporary_directory:
            csv_path = self.save_csv(data, temporary_directory)

            with self.assertRaisesRegex(ValueError, "AREA"):
                load_training_data(csv_path)

    def test_insufficient_farmer_groups_are_rejected(self):
        data = sample_data()
        data["FARMERCODE"] = "FARMER_1"

        with tempfile.TemporaryDirectory() as temporary_directory:
            csv_path = self.save_csv(data, temporary_directory)

            with self.assertRaisesRegex(ValueError, "distinct FARMERCODE"):
                load_training_data(csv_path)

    # ----------------------------------------------
    # MODEL TRAINING
    # ----------------------------------------------

    def test_training_artifact_contains_metrics_and_ranges(self):
        artifact = train_model(sample_data(), "training.csv")

        self.assertEqual(
            artifact["features"],
            ["YEAR", "AREA", "NPK", "OTHER"]
        )

        self.assertEqual(artifact["training_records"], 30)

        self.assertEqual(
            artifact["training_year_range"],
            {
                "min": 1990,
                "max": 1992,
            }
        )

        self.assertEqual(
            artifact["evaluation"]["evaluation_method"],
            "GroupShuffleSplit by FARMERCODE"
        )

        self.assertEqual(
            artifact["feature_ranges"]["AREA"]["min"],
            1.0
        )

        self.assertIn("mae_tonnes", artifact["evaluation"])
        self.assertIn("rmse_tonnes", artifact["evaluation"])
        self.assertIn("r2", artifact["evaluation"])

    def test_trained_model_generates_valid_prediction(self):
        artifact = train_model(sample_data(), "training.csv")

        test_input = pd.DataFrame(
            [
                {
                    "YEAR": 1992,
                    "AREA": 1.5,
                    "NPK": 55,
                    "OTHER": 92,
                }
            ]
        )

        prediction = artifact["model"].predict(test_input)[0]

        self.assertTrue(np.isfinite(prediction))
        self.assertGreaterEqual(prediction, 0)

    def test_artifact_has_correct_target_unit(self):
        artifact = train_model(sample_data(), "training.csv")

        self.assertEqual(artifact["target"], "PROD")
        self.assertEqual(artifact["target_unit"], "tonnes")
        self.assertEqual(
            artifact["model_name"],
            "RandomForestRegressor"
        )


# --------------------------------------------------
# RUN TESTS
# --------------------------------------------------

if __name__ == "__main__":
    unittest.main(verbosity=2)
