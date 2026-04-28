# AquaSense — Data Analysis with Python: Complete Guide

> Assignment: *Assignment One continuation-3.docx* — "Data Analysis with Python" section  
> Project: AquaSense Smart Irrigation IoT System  
> Date: 2026-04-28

---

## What Is Already Done (Do Not Redo)

| Done | Where |
|------|-------|
| Sensor data classification (5 classes per metric, thresholds defined) | `lib/classification.ts` |
| Pearson correlation between 10 sensor pairs | `lib/classification.ts` → `getClassificationStats()` |
| Dashboard visualisation of classes + correlation | `app/dashboard/components/DataClassificationPanel.tsx` |
| 100,000+ records in PostgreSQL | `prisma/seed.ts` |
| Conversion formulas (ADC → real units) | `serial_bridge/bridge.py` |

The Python data analysis work is **separate** — it lives in a new `python_analysis/` folder and works against the same database (or exported CSV).

---

## Required Deliverables (From Assignment)

The assignment names these specific outputs — each section below maps directly to one:

| # | Assignment Requirement | Section Below |
|---|----------------------|---------------|
| 1 | Data Augmentation (NumPy bootstrap sampling) | §3 |
| 2 | Summary Statistics — count, mean, std, min, quartiles, max | §4 |
| 3 | Data Cleaning — outlier removal, categorical → binary | §5 |
| 4 | Exploratory Data Analysis — patterns for decision logic | §6 |
| 5 | Correlation Analysis — compare with documented correlation | §7 |
| 6 | Predictive Modelling — classification + regression models | §8 |
| 7 | Business Rules & Decision Tables (If-Then logic) | §9 |
| 8 | Model comparison — find best among multiple alternatives | §10 |

---

## §1 — Recommended File Structure

```
IOT_PROJECT/
└── python_analysis/
    ├── 00_export_data.py         # pull data from DB → CSV
    ├── 01_cleaning.py            # outlier removal, encode classes
    ├── 02_augmentation.py        # NumPy bootstrap sampling
    ├── 03_summary_stats.py       # pandas .describe() + group stats
    ├── 04_eda.py                 # plots — distributions, time-series
    ├── 05_correlation.py         # Pearson + Spearman, heatmap
    ├── 06_models.py              # ML models (classify + predict)
    ├── 07_decision_logic.py      # rule engine + decision table
    ├── 08_model_comparison.py    # accuracy, F1, compare models
    ├── data/
    │   ├── raw_readings.csv      # exported from DB
    │   ├── augmented.csv         # after §3
    │   └── cleaned.csv           # after §4
    ├── plots/                    # all saved figures (.png)
    └── requirements.txt
```

---

## §2 — Setup & Data Export

### requirements.txt
```
pandas
numpy
matplotlib
seaborn
scikit-learn
psycopg2-binary
python-dotenv
scipy
```

Install: `pip install -r requirements.txt`

### 00_export_data.py — Pull from PostgreSQL

```python
import os
import pandas as pd
import psycopg2
from dotenv import load_dotenv

load_dotenv('../.env')  # uses the same .env as Next.js

conn = psycopg2.connect(os.getenv('DATABASE_URL'))

df = pd.read_sql("""
    SELECT
        r.id,
        r."nodeId",
        r.timestamp,
        r."soilMoisture",
        r.temperature,
        r.humidity,
        r."reservoirLevel",
        r.ph,
        r.nitrogen,
        r.phosphorus,
        r.potassium
    FROM "SensorReading" r
    ORDER BY r.timestamp
""", conn)

conn.close()
df.to_csv('data/raw_readings.csv', index=False)
print(f"Exported {len(df):,} rows")
```

**Why:** Every analysis script below reads from `data/raw_readings.csv` — no need to reconnect to DB each time.

---

## §3 — Data Augmentation (NumPy Bootstrap Sampling)

**What the assignment asks:** Use NumPy to randomly sample existing values *with replacement* to create a larger dataset that mimics the statistical properties of real data.

```python
# 02_augmentation.py
import numpy as np
import pandas as pd

df = pd.read_csv('data/cleaned.csv')

SENSORS = ['soilMoisture', 'temperature', 'humidity',
           'reservoirLevel', 'ph', 'nitrogen', 'phosphorus', 'potassium']

TARGET_SIZE = 200_000  # double the dataset
rng = np.random.default_rng(seed=42)

# Bootstrap: sample rows with replacement
indices = rng.integers(low=0, high=len(df), size=TARGET_SIZE)
augmented = df.iloc[indices].copy().reset_index(drop=True)

# Add small Gaussian noise to avoid exact duplicates (±2% of std)
for col in SENSORS:
    noise = rng.normal(0, df[col].std() * 0.02, size=TARGET_SIZE)
    augmented[col] = (augmented[col] + noise).clip(
        lower=df[col].min(), upper=df[col].max()
    )

augmented.to_csv('data/augmented.csv', index=False)
print(f"Augmented dataset: {len(augmented):,} rows")
print(augmented[SENSORS].describe())
```

**What to document:** Show that mean/std of augmented data is within 1–2% of original — this proves the bootstrap preserved the statistical distribution.

---

## §4 — Summary Statistics

**What the assignment asks:** Comprehensive summary — count, mean, std, min, quartiles, max using Python libraries.

```python
# 03_summary_stats.py
import pandas as pd

df = pd.read_csv('data/augmented.csv')

SENSORS = ['soilMoisture', 'temperature', 'humidity',
           'reservoirLevel', 'ph', 'nitrogen', 'phosphorus', 'potassium']

# Full describe() — this is exactly what the assignment wants
stats = df[SENSORS].describe(percentiles=[0.25, 0.5, 0.75])
print(stats.to_string())
stats.to_csv('data/summary_statistics.csv')

# Group analysis — stats per node
group_stats = df.groupby('nodeId')[SENSORS].agg(['mean', 'std', 'min', 'max'])
print("\nPer-node group analysis:")
print(group_stats.to_string())
group_stats.to_csv('data/group_statistics.csv')
```

**What to document:** Print the full table in your report. Point out which sensor has highest variability (std) and which nodes differ most.

---

## §5 — Data Cleaning & Preparation

**What the assignment asks:**
1. Handle inconsistencies — identify and remove extreme outliers
2. Convert categorical data (class labels) into binary indicators

```python
# 01_cleaning.py
import pandas as pd
import numpy as np

df = pd.read_csv('data/raw_readings.csv')

SENSORS = ['soilMoisture', 'temperature', 'humidity',
           'reservoirLevel', 'ph', 'nitrogen', 'phosphorus', 'potassium']

# --- 1. Outlier removal using IQR method ---
def remove_outliers_iqr(df, cols, factor=3.0):
    mask = pd.Series([True] * len(df))
    for col in cols:
        Q1 = df[col].quantile(0.25)
        Q3 = df[col].quantile(0.75)
        IQR = Q3 - Q1
        lower = Q1 - factor * IQR
        upper = Q3 + factor * IQR
        mask &= df[col].between(lower, upper)
    return df[mask]

before = len(df)
df = remove_outliers_iqr(df, SENSORS)
print(f"Removed {before - len(df):,} outlier rows ({(before-len(df))/before*100:.1f}%)")

# --- 2. Assign class labels (matches lib/classification.ts thresholds) ---
def classify_soil_moisture(v):
    if v <= 20:   return 'criticalLow'
    if v <= 40:   return 'low'
    if v <= 70:   return 'optimal'
    if v <= 85:   return 'high'
    return 'criticalHigh'

def classify_temperature(v):
    if v <= 10:   return 'criticalLow'
    if v <= 18:   return 'low'
    if v <= 30:   return 'optimal'
    if v <= 38:   return 'high'
    return 'criticalHigh'

# Add label column
df['soilMoisture_class'] = df['soilMoisture'].apply(classify_soil_moisture)
df['temperature_class']  = df['temperature'].apply(classify_temperature)
# ... repeat for all sensors using the same thresholds in lib/classification.ts

# --- 3. One-hot encode class labels → binary indicators ---
# This makes them compatible with mathematical / ML models
df_encoded = pd.get_dummies(df, columns=['soilMoisture_class', 'temperature_class'])

df.to_csv('data/cleaned.csv', index=False)
df_encoded.to_csv('data/cleaned_encoded.csv', index=False)
print("Cleaned data saved.")
print(df['soilMoisture_class'].value_counts())
```

**What to document:** Number of outliers removed, the IQR method formula, example of binary encoding (e.g. `soilMoisture_class_optimal = 1`).

---

## §6 — Exploratory Data Analysis (EDA)

**What the assignment asks:** Identify patterns needed for decision logic.

```python
# 04_eda.py
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

df = pd.read_csv('data/cleaned.csv')
df['timestamp'] = pd.to_datetime(df['timestamp'])

SENSORS = ['soilMoisture', 'temperature', 'humidity',
           'reservoirLevel', 'ph', 'nitrogen', 'phosphorus', 'potassium']

# --- Plot 1: Distribution histograms ---
fig, axes = plt.subplots(2, 4, figsize=(16, 8))
for ax, col in zip(axes.flatten(), SENSORS):
    df[col].hist(ax=ax, bins=50, edgecolor='black')
    ax.set_title(col)
plt.tight_layout()
plt.savefig('plots/01_distributions.png', dpi=150)

# --- Plot 2: Class distribution per sensor ---
sns.countplot(data=df, x='soilMoisture_class',
              order=['criticalLow','low','optimal','high','criticalHigh'])
plt.title('Soil Moisture Class Distribution')
plt.savefig('plots/02_class_distribution.png', dpi=150)

# --- Plot 3: Time-series for one node ---
node_df = df[df['nodeId'] == df['nodeId'].iloc[0]].set_index('timestamp')
node_df[['soilMoisture', 'temperature', 'humidity']].plot(figsize=(14, 5))
plt.title('Time-Series: Soil Moisture, Temperature, Humidity')
plt.savefig('plots/03_time_series.png', dpi=150)

print("EDA plots saved to plots/")
```

**What to document:** Comment on each plot — which class is most common, any visible trends over time, any bimodal distributions.

---

## §7 — Correlation Analysis

**What the assignment asks:** Find relationships between variables; compare with your documented correlation from `DataClassificationPanel.tsx`.

```python
# 05_correlation.py
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats

df = pd.read_csv('data/cleaned.csv')

SENSORS = ['soilMoisture', 'temperature', 'humidity',
           'reservoirLevel', 'ph', 'nitrogen', 'phosphorus', 'potassium']

# --- Pearson correlation matrix ---
corr_matrix = df[SENSORS].corr(method='pearson')
print("Pearson Correlation Matrix:")
print(corr_matrix.round(3))

# --- Heatmap ---
plt.figure(figsize=(10, 8))
sns.heatmap(corr_matrix, annot=True, fmt='.2f', cmap='coolwarm',
            vmin=-1, vmax=1, center=0)
plt.title('Pearson Correlation Heatmap — AquaSense Sensors')
plt.tight_layout()
plt.savefig('plots/04_correlation_heatmap.png', dpi=150)

# --- Compare with pre-documented values (from DataClassificationPanel) ---
# Documented pairs from lib/classification.ts:
documented = {
    ('soilMoisture', 'humidity'):       'Expected: moderate positive (~0.4–0.6)',
    ('soilMoisture', 'reservoirLevel'): 'Expected: weak positive',
    ('nitrogen', 'phosphorus'):         'Expected: strong positive (~0.7+)',
}
print("\nComparison with documented correlation:")
for (a, b), note in documented.items():
    r = corr_matrix.loc[a, b]
    print(f"  {a} ↔ {b}: r={r:.3f}  |  {note}")
```

**What to document:** Write whether the Python-computed Pearson r values match or differ from what your TypeScript code computed from PostgreSQL. Any discrepancy shows the effect of data augmentation or cleaning.

---

## §8 — Predictive Modelling (ML Models)

**What the assignment asks:** Build classification AND regression models. Compare with manual classifications.

```python
# 06_models.py
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.metrics import classification_report, mean_squared_error, r2_score

df = pd.read_csv('data/cleaned.csv')

FEATURES = ['temperature', 'humidity', 'reservoirLevel',
            'ph', 'nitrogen', 'phosphorus', 'potassium']

# ============================================================
# TASK A: CLASSIFICATION — Predict soilMoisture_class
# ============================================================
TARGET_CLASS = 'soilMoisture_class'
X = df[FEATURES]
y = df[TARGET_CLASS]

le = LabelEncoder()
y_enc = le.fit_transform(y)

X_train, X_test, y_train, y_test = train_test_split(
    X, y_enc, test_size=0.2, random_state=42, stratify=y_enc
)
scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)

models_clf = {
    'Decision Tree':      DecisionTreeClassifier(max_depth=8, random_state=42),
    'Random Forest':      RandomForestClassifier(n_estimators=100, random_state=42),
    'Logistic Regression': LogisticRegression(max_iter=1000, random_state=42),
}

print("=== CLASSIFICATION: Predict Soil Moisture Class ===")
for name, model in models_clf.items():
    model.fit(X_train_s, y_train)
    y_pred = model.predict(X_test_s)
    print(f"\n{name}:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

# ============================================================
# TASK B: REGRESSION — Predict soilMoisture value
# ============================================================
y_reg = df['soilMoisture']
X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(
    X, y_reg, test_size=0.2, random_state=42
)
X_train_rs = scaler.fit_transform(X_train_r)
X_test_rs  = scaler.transform(X_test_r)

from sklearn.ensemble import GradientBoostingRegressor
models_reg = {
    'Linear Regression':   LinearRegression(),
    'Gradient Boosting':   GradientBoostingRegressor(n_estimators=100, random_state=42),
}

print("\n=== REGRESSION: Predict Soil Moisture Value ===")
for name, model in models_reg.items():
    model.fit(X_train_rs, y_train_r)
    y_pred = model.predict(X_test_rs)
    rmse = np.sqrt(mean_squared_error(y_test_r, y_pred))
    r2   = r2_score(y_test_r, y_pred)
    print(f"{name}: RMSE={rmse:.2f}, R²={r2:.3f}")
```

**What to document:** Include the classification report table (precision, recall, F1) for each model. Compare Random Forest accuracy vs your manual threshold-based classifier — Random Forest should be similar or better.

---

## §9 — Business Rules & Decision Tables

**What the assignment asks:** Define If-Then scenarios. This mirrors what the dashboard already does but now done explicitly in Python.

```python
# 07_decision_logic.py
import pandas as pd

df = pd.read_csv('data/cleaned.csv')

# ============================================================
# DECISION TABLE — Irrigation control rules
# (matches the pump automation in the dashboard)
# ============================================================

DECISION_TABLE = [
    # Rule | soilMoisture_class | reservoirLevel_class | action        | priority
    {'rule': 'R1', 'soil': 'criticalLow',  'reservoir': 'optimal',     'action': 'PUMP_ON_HIGH',  'priority': 1},
    {'rule': 'R2', 'soil': 'criticalLow',  'reservoir': 'low',         'action': 'PUMP_ON_LOW',   'priority': 2},
    {'rule': 'R3', 'soil': 'criticalLow',  'reservoir': 'criticalLow', 'action': 'ALERT_REFILL',  'priority': 1},
    {'rule': 'R4', 'soil': 'low',          'reservoir': 'optimal',     'action': 'PUMP_ON_LOW',   'priority': 3},
    {'rule': 'R5', 'soil': 'optimal',      'reservoir': 'any',         'action': 'PUMP_OFF',      'priority': 4},
    {'rule': 'R6', 'soil': 'high',         'reservoir': 'any',         'action': 'PUMP_OFF',      'priority': 4},
    {'rule': 'R7', 'soil': 'criticalHigh', 'reservoir': 'any',         'action': 'ALERT_DRAINAGE','priority': 1},
]

def apply_decision(row):
    soil = row['soilMoisture_class']
    res  = row['reservoirLevel_class']
    for rule in sorted(DECISION_TABLE, key=lambda r: r['priority']):
        if rule['soil'] == soil and (rule['reservoir'] == res or rule['reservoir'] == 'any'):
            return rule['action']
    return 'MONITOR'

df['decision'] = df.apply(apply_decision, axis=1)
print("Decision Distribution:")
print(df['decision'].value_counts())
df[['timestamp', 'nodeId', 'soilMoisture', 'soilMoisture_class',
    'reservoirLevel', 'reservoirLevel_class', 'decision']].to_csv(
    'data/decisions.csv', index=False
)
```

**What to document:** Print the full decision table. Show the count per action — how many times would PUMP_ON vs PUMP_OFF be triggered. This directly answers the assignment's "implementing decision logic" requirement.

---

## §10 — Model Comparison

**What the assignment asks:** Use and compare different mathematical models to find the best decision among multiple alternatives.

```python
# 08_model_comparison.py
import pandas as pd
import numpy as np
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
import matplotlib.pyplot as plt

df = pd.read_csv('data/cleaned.csv')
FEATURES = ['temperature', 'humidity', 'reservoirLevel',
            'ph', 'nitrogen', 'phosphorus', 'potassium']
X = df[FEATURES]
y = LabelEncoder().fit_transform(df['soilMoisture_class'])

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

models = {
    'Decision Tree':        DecisionTreeClassifier(max_depth=8, random_state=42),
    'Random Forest':        RandomForestClassifier(n_estimators=100, random_state=42),
    'Gradient Boosting':    GradientBoostingClassifier(n_estimators=100, random_state=42),
    'Logistic Regression':  LogisticRegression(max_iter=1000, random_state=42),
    'SVM (RBF kernel)':     SVC(kernel='rbf', random_state=42),
}

results = {}
for name, model in models.items():
    scores = cross_val_score(model, X_scaled, y, cv=5, scoring='f1_weighted')
    results[name] = {'mean_f1': scores.mean(), 'std': scores.std()}
    print(f"{name:25s}: F1={scores.mean():.3f} ± {scores.std():.3f}")

# Bar chart
names  = list(results.keys())
f1s    = [v['mean_f1'] for v in results.values()]
stds   = [v['std'] for v in results.values()]

plt.figure(figsize=(10, 5))
bars = plt.bar(names, f1s, yerr=stds, capsize=5, color='steelblue')
plt.ylabel('Weighted F1 Score (5-fold CV)')
plt.title('Model Comparison — Soil Moisture Class Prediction')
plt.xticks(rotation=20, ha='right')
plt.ylim(0, 1.0)
plt.tight_layout()
plt.savefig('plots/05_model_comparison.png', dpi=150)
print(f"\nBest model: {max(results, key=lambda k: results[k]['mean_f1'])}")
```

**What to document:** The bar chart goes directly in the report. State which model won and why (Random Forest/GBoost usually win on tabular data because they handle non-linear boundaries and outliers better).

---

## §11 — Running Order

```bash
cd python_analysis/
pip install -r requirements.txt

python 00_export_data.py     # export DB → data/raw_readings.csv
python 01_cleaning.py        # clean → data/cleaned.csv
python 02_augmentation.py    # augment → data/augmented.csv
python 03_summary_stats.py   # print + save summary tables
python 04_eda.py             # save plots to plots/
python 05_correlation.py     # heatmap + compare with TS correlation
python 06_models.py          # train classify + regression models
python 07_decision_logic.py  # apply business rules
python 08_model_comparison.py# compare models → bar chart
```

---

## §12 — What to Write in the Report

For each section the assignment explicitly asks for marks per item:

| Marks item | What to write |
|-----------|--------------|
| Goal of classification | Anomaly detection + irrigation optimization + future prediction |
| Categorize data into classes | Show the 5-class table + distribution bar chart |
| Document correlation logic | Show heatmap; explain which pairs are ≥ 0.5 and why |
| Mathematical methods / algorithms | Min-Max normalisation, IQR outlier removal, Pearson r formula, Decision Tree Gini, Random Forest bagging, Logistic Regression sigmoid |
| Decision logic | Decision table (§9 above), pump automation rules |
| Data augmentation | Bootstrap sampling formula + comparison of original vs augmented stats |
| Summary statistics | Pandas describe() output table |
| ML model comparison | F1 bar chart + winner justification |

---

## §13 — Key Things to Be Careful About

1. **Use the same class thresholds** as `lib/classification.ts` — this proves consistency between the dashboard and the Python analysis.
2. **Compare Pearson r values** between what PostgreSQL computed (in `getClassificationStats()`) and what Python computes — write about any difference.
3. **Data augmentation ≠ synthetic fabrication** — show that bootstrap sampling preserves the distribution (mean/std within 2%).
4. **One-hot encoding justification** — explain that binary indicators are needed because ML models expect numeric input, not text labels.
5. **Cross-validation** — use 5-fold CV in model comparison, not a single train/test split, for reliable accuracy estimates.
