"""
Backfill IrrigationDecision table from existing SensorReading records.

Reads all sensor readings from PostgreSQL, runs each through the trained
Random Forest model, and writes decisions directly to the IrrigationDecision
table so the dashboard ML panel is fully populated immediately.

Usage:
    python ml_service/backfill_decisions.py
"""

import sys
import os
import json
import uuid
from pathlib import Path
from datetime import datetime, timezone

# Allow imports from ml_service/
sys.path.insert(0, str(Path(__file__).parent))

import psycopg2
import psycopg2.extras
import joblib
import numpy as np

# ---------------------------------------------------------------------------
# Config — same DB params as main.py
# ---------------------------------------------------------------------------

DB_PARAMS = dict(
    host     = os.environ.get("DB_HOST",     "localhost"),
    port     = int(os.environ.get("DB_PORT", "5432")),
    dbname   = os.environ.get("DB_NAME",     "aquasense"),
    user     = os.environ.get("DB_USER",     "postgres"),
    password = os.environ.get("DB_PASSWORD", "Taekwondo@12"),
)

MODEL_PATH = Path(__file__).parent / "model" / "rf_model.pkl"
FEATURES   = ["soilMoisture", "temperature", "humidity",
               "reservoirLevel", "nitrogen", "phosphorus", "potassium"]
MODEL_VER  = "rf-v1"
BATCH_SIZE = 2000   # rows processed per DB transaction


# ---------------------------------------------------------------------------
# Load model
# ---------------------------------------------------------------------------

def load_model():
    if not MODEL_PATH.exists():
        sys.exit(
            "ERROR: Model file not found. Run the ML service first so it trains:\n"
            "  python ml_service/main.py"
        )
    bundle = joblib.load(MODEL_PATH)
    print(f"Model loaded from {MODEL_PATH}")
    return bundle["clf"], bundle["le"]


# ---------------------------------------------------------------------------
# Backfill
# ---------------------------------------------------------------------------

def backfill():
    clf, le = load_model()

    # Two separate connections: one read-only cursor, one write cursor
    read_conn  = psycopg2.connect(**DB_PARAMS)
    write_conn = psycopg2.connect(**DB_PARAMS)
    read_conn.autocommit  = True
    write_conn.autocommit = False

    read_cur  = read_conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    write_cur = write_conn.cursor()

    # Clear existing decisions to avoid duplicates on re-run
    print("Clearing existing IrrigationDecision rows …")
    write_cur.execute('DELETE FROM "IrrigationDecision"')
    write_conn.commit()

    # Count total readings
    read_cur.execute('SELECT COUNT(*) FROM "SensorReading"')
    total = read_cur.fetchone()[0]
    print(f"Processing {total:,} sensor readings …\n")

    # Stream all readings ordered by timestamp
    read_cur.execute("""
        SELECT id, "nodeId", timestamp,
               "soilMoisture", temperature, humidity, "reservoirLevel",
               COALESCE(nitrogen, 0)   AS nitrogen,
               COALESCE(phosphorus, 0) AS phosphorus,
               COALESCE(potassium, 0)  AS potassium
        FROM "SensorReading"
        ORDER BY timestamp ASC
    """)

    inserted = 0

    while True:
        chunk = read_cur.fetchmany(BATCH_SIZE)
        if not chunk:
            break

        X = np.array([
            [r["soilMoisture"], r["temperature"], r["humidity"],
             r["reservoirLevel"], r["nitrogen"], r["phosphorus"], r["potassium"]]
            for r in chunk
        ], dtype=float)

        probs_all   = clf.predict_proba(X)
        class_idxs  = np.argmax(probs_all, axis=1)
        decisions   = le.inverse_transform(class_idxs)
        confidences = probs_all[np.arange(len(chunk)), class_idxs]

        batch_rows = [
            (
                str(uuid.uuid4()),
                row["timestamp"],
                row["nodeId"],
                decision,
                float(confidence),
                decision == "IRRIGATE",
                float(row["soilMoisture"]),
                float(row["temperature"]),
                float(row["humidity"]),
                float(row["reservoirLevel"]),
                float(row["nitrogen"]),
                float(row["phosphorus"]),
                float(row["potassium"]),
                MODEL_VER,
            )
            for row, decision, confidence in zip(chunk, decisions, confidences)
        ]

        psycopg2.extras.execute_values(
            write_cur,
            """
            INSERT INTO "IrrigationDecision"
                (id, timestamp, "nodeId", decision, confidence, "pumpCommand",
                 "soilMoisture", temperature, humidity, "reservoirLevel",
                 nitrogen, phosphorus, potassium, "modelVersion")
            VALUES %s
            """,
            batch_rows,
            template="(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        )
        write_conn.commit()

        inserted += len(chunk)
        pct = inserted / total * 100
        print(f"  {inserted:>7,} / {total:,}  ({pct:.0f}%)", end="\r", flush=True)

    read_cur.close();  read_conn.close()
    write_cur.close(); write_conn.close()

    print(f"\n\nDone — {inserted:,} irrigation decisions saved to DB.")
    print("Open http://localhost:3000 and the ML panel will be fully populated.")


if __name__ == "__main__":
    backfill()
