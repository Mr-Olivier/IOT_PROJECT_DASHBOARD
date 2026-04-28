"""
Step 4 - Exploratory Data Analysis (EDA)
  - Distribution histograms per sensor
  - Class distribution bar charts
  - Time-series overview
  - Box plots per class
  - All plots saved to plots/
"""
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import seaborn as sns
from db_config import SENSORS

sns.set_theme(style="whitegrid", palette="muted")
df = pd.read_csv("data/cleaned.csv", parse_dates=["timestamp"])

# -- Plot 1: Sensor distribution histograms --------------------------------
fig, axes = plt.subplots(2, 4, figsize=(18, 9))
fig.suptitle("AquaSense - Sensor Value Distributions (Cleaned Data)", fontsize=14, fontweight="bold")
for ax, col in zip(axes.flatten(), SENSORS):
    ax.hist(df[col], bins=60, color="steelblue", edgecolor="white", linewidth=0.4)
    ax.set_title(col, fontsize=10, fontweight="bold")
    ax.set_xlabel("Value")
    ax.set_ylabel("Count")
plt.tight_layout()
plt.savefig("plots/01_sensor_distributions.png", dpi=150)
plt.close()
print("Saved plots/01_sensor_distributions.png")

# -- Plot 2: Class distribution per sensor (stacked bar) ------------------
ORDERED = ["criticalLow", "low", "optimal", "high", "criticalHigh"]
COLORS  = ["#d32f2f", "#f57c00", "#388e3c", "#1976d2", "#7b1fa2"]

class_data = {}
for s in SENSORS:
    col = f"{s}_class"
    if col in df.columns:
        counts = df[col].value_counts()
        class_data[s] = [counts.get(c, 0) for c in ORDERED]

fig, ax = plt.subplots(figsize=(14, 6))
x      = range(len(class_data))
labels = list(class_data.keys())
bottoms = [0] * len(class_data)
for i, (cls, color) in enumerate(zip(ORDERED, COLORS)):
    vals = [class_data[s][i] for s in labels]
    ax.bar(x, vals, bottom=bottoms, label=cls, color=color)
    bottoms = [b + v for b, v in zip(bottoms, vals)]
ax.set_xticks(list(x))
ax.set_xticklabels(labels, rotation=20, ha="right")
ax.set_ylabel("Record Count")
ax.set_title("Class Distribution per Sensor", fontsize=13, fontweight="bold")
ax.legend(title="Class", bbox_to_anchor=(1.01, 1), loc="upper left")
plt.tight_layout()
plt.savefig("plots/02_class_distribution.png", dpi=150)
plt.close()
print("Saved plots/02_class_distribution.png")

# -- Plot 3: Time-series - soil moisture, temperature, humidity ------------
sample = df.set_index("timestamp").sort_index()
# Down-sample to ~2,000 points for speed
step = max(1, len(sample) // 2000)
s3   = sample.iloc[::step]

fig, axes = plt.subplots(3, 1, figsize=(16, 10), sharex=True)
fig.suptitle("AquaSense - Time-Series Overview", fontsize=13, fontweight="bold")
pairs = [
    ("soilMoisture",   "#1976d2", "Soil Moisture (%)"),
    ("temperature",    "#e53935", "Temperature (-C)"),
    ("humidity",       "#00897b", "Humidity (%)"),
]
for ax, (col, color, label) in zip(axes, pairs):
    ax.plot(s3.index, s3[col], color=color, linewidth=0.8, alpha=0.85)
    ax.set_ylabel(label, fontsize=9)
    ax.tick_params(axis="x", labelsize=8)
axes[-1].xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
plt.tight_layout()
plt.savefig("plots/03_time_series.png", dpi=150)
plt.close()
print("Saved plots/03_time_series.png")

# -- Plot 4: Box plots - sensor values by soilMoisture class --------------
fig, axes = plt.subplots(2, 3, figsize=(16, 10))
fig.suptitle("Sensor Values by Soil Moisture Class", fontsize=13, fontweight="bold")
related = ["temperature", "humidity", "reservoirLevel", "nitrogen", "phosphorus", "potassium"]
for ax, col in zip(axes.flatten(), related):
    order = [c for c in ORDERED if c in df["soilMoisture_class"].unique()]
    sns.boxplot(data=df, x="soilMoisture_class", y=col, order=order,
                palette=COLORS[:len(order)], ax=ax)
    ax.set_title(col, fontsize=10, fontweight="bold")
    ax.set_xlabel("")
    ax.tick_params(axis="x", rotation=20)
plt.tight_layout()
plt.savefig("plots/04_boxplots_by_class.png", dpi=150)
plt.close()
print("Saved plots/04_boxplots_by_class.png")

# -- Plot 5: Reservoir level + soilMoisture over time ---------------------
fig, ax1 = plt.subplots(figsize=(16, 5))
ax2 = ax1.twinx()
ax1.plot(s3.index, s3["soilMoisture"],   color="#1976d2", lw=0.9, label="Soil Moisture %")
ax2.plot(s3.index, s3["reservoirLevel"], color="#e65100", lw=0.9, label="Reservoir Level %", alpha=0.75)
ax1.set_ylabel("Soil Moisture (%)", color="#1976d2")
ax2.set_ylabel("Reservoir Level (%)", color="#e65100")
ax1.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
fig.suptitle("Soil Moisture vs Reservoir Level Over Time", fontsize=12, fontweight="bold")
lines1, labels1 = ax1.get_legend_handles_labels()
lines2, labels2 = ax2.get_legend_handles_labels()
ax1.legend(lines1 + lines2, labels1 + labels2, loc="upper left")
plt.tight_layout()
plt.savefig("plots/05_soil_vs_reservoir.png", dpi=150)
plt.close()
print("Saved plots/05_soil_vs_reservoir.png")

print("\nAll EDA plots saved to plots/")
