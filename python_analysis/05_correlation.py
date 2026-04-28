"""
Step 5 - Correlation Analysis
  - Pearson & Spearman correlation matrices
  - Heatmap visualization
  - Compare Python results with dashboard (lib/classification.ts) values
  - Output: data/correlation_pearson.csv, plots/06_correlation_heatmap.png
"""
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from db_config import SENSORS

df = pd.read_csv("data/cleaned.csv", parse_dates=["timestamp"])

# -- Pearson correlation ----------------------------------------------------
pearson  = df[SENSORS].corr(method="pearson").round(4)
spearman = df[SENSORS].corr(method="spearman").round(4)

print("=== PEARSON CORRELATION MATRIX ===")
print(pearson.to_string())
pearson.to_csv("data/correlation_pearson.csv")

print("\n=== SPEARMAN CORRELATION MATRIX ===")
print(spearman.to_string())
spearman.to_csv("data/correlation_spearman.csv")

# -- Heatmap - Pearson -----------------------------------------------------
fig, axes = plt.subplots(1, 2, figsize=(18, 7))
for ax, matrix, title in [
    (axes[0], pearson,  "Pearson Correlation"),
    (axes[1], spearman, "Spearman Correlation"),
]:
    mask = np.triu(np.ones_like(matrix, dtype=bool), k=1)
    sns.heatmap(
        matrix, annot=True, fmt=".2f", cmap="coolwarm",
        vmin=-1, vmax=1, center=0, square=True,
        linewidths=0.5, ax=ax,
        annot_kws={"size": 8},
    )
    ax.set_title(f"AquaSense - {title}", fontsize=12, fontweight="bold")
    ax.tick_params(axis="x", rotation=30)
plt.tight_layout()
plt.savefig("plots/06_correlation_heatmap.png", dpi=150)
plt.close()
print("\nSaved plots/06_correlation_heatmap.png")

# -- Compare with dashboard (TypeScript getClassificationStats) ------------
# The dashboard uses PostgreSQL corr() which also computes Pearson r.
# We reproduce those same pairs here and compare.
print("\n=== COMPARISON WITH DASHBOARD DOCUMENTED PAIRS ===")
print(f"{'Pair':<35} {'Python r':>10}  {'Interpretation'}")
print("-" * 75)

pairs = [
    ("soilMoisture", "humidity"),
    ("soilMoisture", "temperature"),
    ("soilMoisture", "reservoirLevel"),
    ("soilMoisture", "nitrogen"),
    ("temperature",  "humidity"),
    ("temperature",  "reservoirLevel"),
    ("humidity",     "reservoirLevel"),
    ("nitrogen",     "phosphorus"),
    ("nitrogen",     "potassium"),
    ("phosphorus",   "potassium"),
]

def interpret(r):
    r = abs(r)
    if r >= 0.7:  return "Strong"
    if r >= 0.4:  return "Moderate"
    if r >= 0.2:  return "Weak"
    return "Negligible"

for a, b in pairs:
    r = pearson.loc[a, b]
    direction = "positive" if r >= 0 else "negative"
    print(f"{a} <-> {b:<22} r={r:+.4f}   {interpret(r)} {direction}")

# -- Statistical significance (p-values) ----------------------------------
print("\n=== P-VALUES FOR KEY PAIRS ===")
print(f"{'Pair':<35} {'r':>8} {'p-value':>12} {'Significant-':>14}")
print("-" * 75)
for a, b in pairs:
    r, p = stats.pearsonr(df[a].dropna(), df[b].dropna())
    sig = "YES" if p < 0.05 else "NO"
    print(f"{a} <-> {b:<22} r={r:+.4f}   p={p:.2e}   {sig:>12}")
