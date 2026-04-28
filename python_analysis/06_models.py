"""
Step 6 - Predictive Modelling
  - Classification: predict soilMoisture_class from other sensors
  - Regression: predict soilMoisture value from other sensors
  - Compare ML classifier vs manual threshold classifier
  - Output: data/model_results.csv, plots/07_feature_importance.png
"""
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.metrics import (
    classification_report, confusion_matrix,
    mean_squared_error, r2_score, ConfusionMatrixDisplay,
)
import seaborn as sns
from db_config import SENSORS, THRESHOLDS, classify

df = pd.read_csv("data/cleaned.csv", parse_dates=["timestamp"])

FEATURES = ["temperature", "humidity", "reservoirLevel",
            "nitrogen", "phosphorus", "potassium"]
TARGET_CLASS = "soilMoisture_class"
TARGET_REG   = "soilMoisture"
ORDERED = ["criticalLow", "low", "optimal", "high", "criticalHigh"]

X = df[FEATURES]
y_cls = df[TARGET_CLASS]
y_reg = df[TARGET_REG]

le = LabelEncoder()
le.fit(ORDERED)
y_enc = le.transform(y_cls)

X_train, X_test, y_train, y_test = train_test_split(
    X, y_enc, test_size=0.2, random_state=42, stratify=y_enc
)
X_train_r, X_test_r, yr_train, yr_test = train_test_split(
    X, y_reg, test_size=0.2, random_state=42
)

scaler = StandardScaler()
X_train_s  = scaler.fit_transform(X_train)
X_test_s   = scaler.transform(X_test)
X_train_rs = scaler.fit_transform(X_train_r)
X_test_rs  = scaler.transform(X_test_r)

# ----------------------------------------------------------------
# PART A - CLASSIFICATION (predict soilMoisture class)
# ----------------------------------------------------------------
print("=" * 60)
print(" PART A - CLASSIFICATION: Predict Soil Moisture Class")
print("=" * 60)

clf_models = {
    "Decision Tree":       DecisionTreeClassifier(max_depth=10, random_state=42),
    "Random Forest":       RandomForestClassifier(n_estimators=100, n_jobs=-1, random_state=42),
    "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
}

clf_results = {}
for name, model in clf_models.items():
    model.fit(X_train_s, y_train)
    y_pred = model.predict(X_test_s)
    report = classification_report(y_test, y_pred, target_names=le.classes_, output_dict=True)
    clf_results[name] = report
    print(f"\n-- {name} --")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

# -- Confusion matrix for Random Forest -----------------------------------
best_clf = clf_models["Random Forest"]
y_pred_rf = best_clf.predict(X_test_s)
cm = confusion_matrix(y_test, y_pred_rf)
fig, ax = plt.subplots(figsize=(8, 6))
disp = ConfusionMatrixDisplay(cm, display_labels=le.classes_)
disp.plot(ax=ax, colorbar=True, cmap="Blues")
ax.set_title("Random Forest - Confusion Matrix (soilMoisture_class)", fontweight="bold")
plt.tight_layout()
plt.savefig("plots/07_confusion_matrix.png", dpi=150)
plt.close()
print("Saved plots/07_confusion_matrix.png")

# -- Feature importance from Random Forest --------------------------------
importances = pd.Series(
    best_clf.feature_importances_, index=FEATURES
).sort_values(ascending=False)
fig, ax = plt.subplots(figsize=(8, 5))
importances.plot(kind="bar", color="steelblue", edgecolor="white", ax=ax)
ax.set_title("Random Forest - Feature Importance\n(predicting soilMoisture_class)", fontweight="bold")
ax.set_ylabel("Importance Score")
ax.tick_params(axis="x", rotation=30)
plt.tight_layout()
plt.savefig("plots/08_feature_importance.png", dpi=150)
plt.close()
print("Saved plots/08_feature_importance.png")

# -- Manual threshold classifier vs ML classifier -------------------------
print("\n-- Manual Threshold Classifier vs Random Forest --")
test_df = X_test.copy()
test_df["soilMoisture"] = df.loc[X_test.index, "soilMoisture"]
test_df["true_class"]   = le.inverse_transform(y_test)
test_df["rf_class"]     = le.inverse_transform(y_pred_rf)

match_rf  = (test_df["true_class"] == test_df["rf_class"]).mean()
print(f"Random Forest accuracy  : {match_rf*100:.2f}%")

manual_pred = test_df["soilMoisture"].apply(lambda v: classify(v, "soilMoisture"))
match_manual = (test_df["true_class"] == manual_pred).mean()
print(f"Manual threshold accuracy: {match_manual*100:.2f}%")
print("(Manual classifier should be ~100% because classes were defined by the same thresholds)")

# ----------------------------------------------------------------
# PART B - REGRESSION (predict soilMoisture value)
# ----------------------------------------------------------------
print("\n" + "=" * 60)
print(" PART B - REGRESSION: Predict Soil Moisture Value")
print("=" * 60)

reg_models = {
    "Linear Regression": LinearRegression(),
    "Gradient Boosting": GradientBoostingRegressor(n_estimators=100, random_state=42),
}

reg_results = {}
for name, model in reg_models.items():
    model.fit(X_train_rs, yr_train)
    y_pred = model.predict(X_test_rs)
    rmse = np.sqrt(mean_squared_error(yr_test, y_pred))
    r2   = r2_score(yr_test, y_pred)
    reg_results[name] = {"RMSE": round(rmse, 4), "R2": round(r2, 4)}
    print(f"{name}: RMSE={rmse:.4f}  R-={r2:.4f}")

# -- Scatter: predicted vs actual (Gradient Boosting) ---------------------
gb = reg_models["Gradient Boosting"]
y_pred_gb = gb.predict(X_test_rs)
fig, ax = plt.subplots(figsize=(7, 6))
ax.scatter(yr_test, y_pred_gb, alpha=0.15, s=4, color="steelblue")
lims = [min(yr_test.min(), y_pred_gb.min()), max(yr_test.max(), y_pred_gb.max())]
ax.plot(lims, lims, "r--", linewidth=1.5, label="Perfect fit")
ax.set_xlabel("Actual Soil Moisture (%)")
ax.set_ylabel("Predicted Soil Moisture (%)")
ax.set_title("Gradient Boosting - Predicted vs Actual", fontweight="bold")
ax.legend()
plt.tight_layout()
plt.savefig("plots/09_regression_scatter.png", dpi=150)
plt.close()
print("Saved plots/09_regression_scatter.png")

# -- Save results summary -------------------------------------------------
rows = []
for name, report in clf_results.items():
    rows.append({"model": name, "task": "classification",
                 "metric": "weighted_f1", "value": round(report["weighted avg"]["f1-score"], 4)})
for name, res in reg_results.items():
    for metric, value in res.items():
        rows.append({"model": name, "task": "regression", "metric": metric, "value": value})
pd.DataFrame(rows).to_csv("data/model_results.csv", index=False)
print("\nSaved -> data/model_results.csv")
