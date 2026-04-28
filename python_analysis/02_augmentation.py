"""
Step 2 - Data Augmentation (NumPy Bootstrap Sampling)
  - Randomly sample existing rows WITH REPLACEMENT
  - Add small Gaussian noise (-2% of std) to avoid exact duplicates
  - Verify augmented data preserves original distribution
  - Output: data/augmented.csv
"""
import numpy as np
import pandas as pd
from db_config import SENSORS

df = pd.read_csv("data/cleaned.csv", parse_dates=["timestamp"])

TARGET_SIZE = 200_000
rng = np.random.default_rng(seed=42)

print(f"Original dataset : {len(df):,} rows")
print(f"Target size      : {TARGET_SIZE:,} rows")

# -- Bootstrap: sample row indices with replacement -------------------------
indices = rng.integers(low=0, high=len(df), size=TARGET_SIZE)
augmented = df.iloc[indices].reset_index(drop=True)

# -- Add small Gaussian noise to sensor columns ----------------------------
orig_stats = df[SENSORS].describe()
for col in SENSORS:
    noise = rng.normal(0, df[col].std() * 0.02, size=TARGET_SIZE)
    augmented[col] = (augmented[col] + noise).clip(
        lower=df[col].min(), upper=df[col].max()
    )

# Re-assign class labels after noise
from db_config import classify
for sensor in SENSORS:
    augmented[f"{sensor}_class"] = augmented[sensor].apply(lambda v: classify(v, sensor))

augmented.to_csv("data/augmented.csv", index=False)
print(f"\nSaved -> data/augmented.csv  ({len(augmented):,} rows)")

# -- Verify distribution was preserved ------------------------------------
print("\n=== Distribution Preservation Check (mean +/- std) ===")
print(f"{'Sensor':<18} {'Orig mean':>10} {'Aug mean':>10} {'D mean%':>8}  {'Orig std':>9} {'Aug std':>9}")
print("-" * 70)
for col in SENSORS:
    om = df[col].mean();  am = augmented[col].mean()
    os = df[col].std();   as_ = augmented[col].std()
    delta = abs(om - am) / om * 100 if om != 0 else 0
    print(f"{col:<18} {om:>10.3f} {am:>10.3f} {delta:>7.2f}%  {os:>9.3f} {as_:>9.3f}")
