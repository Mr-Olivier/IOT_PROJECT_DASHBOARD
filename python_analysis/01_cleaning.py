"""
Step 1 - Data Cleaning & Preparation
  - Remove extreme outliers (IQR method)
  - Assign class labels per sensor (matching dashboard thresholds)
  - One-hot encode class labels -> binary indicators for ML
  - Output: data/cleaned.csv  and  data/cleaned_encoded.csv
"""
import pandas as pd
from db_config import SENSORS, classify

df = pd.read_csv("data/raw_readings.csv", parse_dates=["timestamp"])

print(f"Starting rows: {len(df):,}")
print(f"Zero-value counts:\n{(df[SENSORS] == 0).sum()}\n")

# -- 1. Remove zero-sensor readings (sensor dropout / missing read) ----------
zero_mask = (df[SENSORS] == 0).any(axis=1)
df = df[~zero_mask].copy()
print(f"After zero-drop: {len(df):,} rows (removed {zero_mask.sum():,})")

# -- 2. IQR outlier removal (factor 3.0 = extreme outliers only) ------------
def remove_iqr_outliers(data, cols, factor=3.0):
    mask = pd.Series(True, index=data.index)
    report = {}
    for col in cols:
        q1 = data[col].quantile(0.25)
        q3 = data[col].quantile(0.75)
        iqr = q3 - q1
        lo, hi = q1 - factor * iqr, q3 + factor * iqr
        col_mask = data[col].between(lo, hi)
        removed = (~col_mask).sum()
        if removed:
            report[col] = removed
        mask &= col_mask
    return data[mask].copy(), report

df, report = remove_iqr_outliers(df, SENSORS)
print(f"After IQR outlier removal: {len(df):,} rows")
if report:
    for col, n in report.items():
        print(f"  {col}: {n} outliers removed")
else:
    print("  No extreme outliers found.")

# -- 3. Assign class labels --------------------------------------------------
for sensor in SENSORS:
    df[f"{sensor}_class"] = df[sensor].apply(lambda v: classify(v, sensor))

print("\nClass distribution - soilMoisture:")
print(df["soilMoisture_class"].value_counts())
print("\nClass distribution - reservoirLevel:")
print(df["reservoirLevel_class"].value_counts())

df.to_csv("data/cleaned.csv", index=False)
print(f"\nSaved -> data/cleaned.csv  ({len(df):,} rows)")

# -- 4. One-hot encode class labels -> binary indicators ---------------------
class_cols = [f"{s}_class" for s in SENSORS]
df_encoded = pd.get_dummies(df, columns=class_cols)
df_encoded.to_csv("data/cleaned_encoded.csv", index=False)
print(f"Saved -> data/cleaned_encoded.csv  ({df_encoded.shape[1]} columns)")
print("\nNew binary columns:")
for c in df_encoded.columns:
    if "_class_" in c:
        print(f"  {c}")
