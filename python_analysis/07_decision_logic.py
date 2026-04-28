"""
Step 7 - Business Rules & Decision Tables (If-Then Logic)
  - Irrigation decision table based on soilMoisture + reservoirLevel classes
  - Apply rules to full dataset, count action distribution
  - Output: data/decisions.csv, plots/10_decision_distribution.png
"""
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("data/cleaned.csv", parse_dates=["timestamp"])

# ----------------------------------------------------------------
# DECISION TABLE - AquaSense Irrigation Control
# Mirrors the pump automation logic in the dashboard
# ----------------------------------------------------------------

DECISION_TABLE = [
    # priority | soilMoisture class  | reservoirLevel class | action
    (1, "criticalLow",  "criticalLow",  "ALERT_REFILL"),
    (1, "criticalHigh", "*",            "ALERT_DRAINAGE"),
    (2, "criticalLow",  "optimal",      "PUMP_ON_HIGH"),
    (2, "criticalLow",  "high",         "PUMP_ON_HIGH"),
    (2, "criticalLow",  "criticalHigh", "PUMP_ON_HIGH"),
    (3, "criticalLow",  "low",          "PUMP_ON_LOW"),
    (4, "low",          "optimal",      "PUMP_ON_LOW"),
    (4, "low",          "high",         "PUMP_ON_LOW"),
    (4, "low",          "criticalHigh", "PUMP_ON_LOW"),
    (5, "low",          "criticalLow",  "ALERT_REFILL"),
    (5, "low",          "low",          "MONITOR"),
    (6, "optimal",      "*",            "PUMP_OFF"),
    (7, "high",         "*",            "PUMP_OFF"),
]

# Print decision table
print("=" * 65)
print(f"  {'Priority':<10} {'Soil Moisture Class':<22} {'Reservoir Class':<18} {'Action'}")
print("=" * 65)
for pri, soil, res, action in DECISION_TABLE:
    print(f"  {pri:<10} {soil:<22} {res:<18} {action}")

def apply_rules(soil_class, res_class):
    for pri, soil, res, action in sorted(DECISION_TABLE, key=lambda x: x[0]):
        if soil == soil_class and (res == "*" or res == res_class):
            return action
    return "MONITOR"

df["decision"] = df.apply(
    lambda row: apply_rules(row["soilMoisture_class"], row["reservoirLevel_class"]),
    axis=1
)

# -- Summary -------------------------------------------------------------
print("\n=== DECISION DISTRIBUTION ===")
counts = df["decision"].value_counts()
total  = len(df)
for action, n in counts.items():
    print(f"  {action:<20}: {n:>8,}  ({n/total*100:.1f}%)")

# -- Bar chart -------------------------------------------------------------
colors_map = {
    "PUMP_ON_HIGH":  "#d32f2f",
    "PUMP_ON_LOW":   "#f57c00",
    "PUMP_OFF":      "#388e3c",
    "ALERT_REFILL":  "#7b1fa2",
    "ALERT_DRAINAGE":"#0288d1",
    "MONITOR":       "#546e7a",
}
fig, ax = plt.subplots(figsize=(10, 5))
actions = counts.index.tolist()
vals    = counts.values.tolist()
colors  = [colors_map.get(a, "grey") for a in actions]
bars = ax.bar(actions, vals, color=colors, edgecolor="white")
for bar, val in zip(bars, vals):
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 200,
            f"{val:,}", ha="center", va="bottom", fontsize=9)
ax.set_ylabel("Number of Readings")
ax.set_title("AquaSense - Irrigation Decision Distribution\n(Rule-Based Engine on Cleaned Data)",
             fontweight="bold")
ax.tick_params(axis="x", rotation=15)
plt.tight_layout()
plt.savefig("plots/10_decision_distribution.png", dpi=150)
plt.close()
print("\nSaved plots/10_decision_distribution.png")

# -- Save CSV ---------------------------------------------------------------
out_cols = ["timestamp", "nodeId", "soilMoisture", "soilMoisture_class",
            "reservoirLevel", "reservoirLevel_class", "decision"]
df[out_cols].to_csv("data/decisions.csv", index=False)
print("Saved -> data/decisions.csv")

# -- If-Then scenario examples ---------------------------------------------
print("\n=== IF-THEN SCENARIO EXAMPLES ===")
for action in ["PUMP_ON_HIGH", "PUMP_ON_LOW", "PUMP_OFF", "ALERT_REFILL"]:
    sample = df[df["decision"] == action].head(1)
    if len(sample):
        row = sample.iloc[0]
        print(f"\n  Action = {action}")
        print(f"    IF soilMoisture={row['soilMoisture']:.1f}% ({row['soilMoisture_class']})")
        print(f"    AND reservoirLevel={row['reservoirLevel']:.1f}% ({row['reservoirLevel_class']})")
        print(f"    THEN -> {row['decision']}")
