"""
Step 3 - Summary Statistics & Group Analysis
  - Full pandas describe() on original, cleaned, and augmented datasets
  - Per-class group statistics for soilMoisture
  - Output: data/summary_statistics.csv, data/group_statistics.csv
"""
import pandas as pd
from db_config import SENSORS

raw  = pd.read_csv("data/raw_readings.csv",  parse_dates=["timestamp"])
clean = pd.read_csv("data/cleaned.csv",       parse_dates=["timestamp"])
aug  = pd.read_csv("data/augmented.csv",      parse_dates=["timestamp"])

datasets = {"RAW": raw, "CLEANED": clean, "AUGMENTED": aug}

for label, df in datasets.items():
    print(f"\n{'='*60}")
    print(f"  {label} DATASET  ({len(df):,} rows)")
    print(f"{'='*60}")
    stats = df[SENSORS].describe(percentiles=[0.25, 0.5, 0.75])
    print(stats.round(3).to_string())

# -- Save full stats to CSV -------------------------------------------------
stats_clean = clean[SENSORS].describe(percentiles=[0.25, 0.5, 0.75]).round(3)
stats_clean.to_csv("data/summary_statistics.csv")
print("\nSaved -> data/summary_statistics.csv")

# -- Group analysis: stats per soilMoisture class --------------------------
group = (
    clean.groupby("soilMoisture_class")[SENSORS]
    .agg(["mean", "std", "min", "max"])
    .round(2)
)
ORDERED = ["criticalLow", "low", "optimal", "high", "criticalHigh"]
group = group.reindex([c for c in ORDERED if c in group.index])
print("\n=== Per-Class Group Statistics (soilMoisture_class) ===")
print(group.to_string())
group.to_csv("data/group_statistics.csv")
print("\nSaved -> data/group_statistics.csv")

# -- Class count summary across all sensors --------------------------------
print("\n=== Class Distribution Summary ===")
for s in SENSORS:
    col = f"{s}_class"
    if col in clean.columns:
        counts = clean[col].value_counts()
        total  = len(clean)
        row = "  ".join(f"{k}:{counts.get(k,0):,}({counts.get(k,0)/total*100:.1f}%)"
                        for k in ORDERED)
        print(f"{s:<18}: {row}")
