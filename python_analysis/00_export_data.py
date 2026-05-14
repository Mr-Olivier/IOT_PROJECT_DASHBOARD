"""
Step 0 - Export data from PostgreSQL -> data/raw_readings.csv

Exports the most recent 30 days of data so all charts always show
current dates. If fewer than 1,000 rows exist in the last 30 days
(e.g. system was just set up) it falls back to the most recent 50,000
rows regardless of date so the analysis still has enough to work with.
"""
import pandas as pd
from datetime import datetime, timezone, timedelta
from db_config import get_connection

print("Connecting to database...")
conn = get_connection()

cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S")

df = pd.read_sql(
    f"""
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
    WHERE r.timestamp >= '{cutoff}'
    ORDER BY r.timestamp
    """,
    conn,
)

# Fallback: if last 30 days has too few rows, take the most recent 50,000
if len(df) < 1000:
    print(f"  Only {len(df):,} rows in last 30 days — falling back to most recent 50,000 rows")
    df = pd.read_sql(
        """
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
        ORDER BY r.timestamp DESC
        LIMIT 50000
        """,
        conn,
    ).sort_values("timestamp").reset_index(drop=True)

conn.close()

df["timestamp"] = pd.to_datetime(df["timestamp"])
df.to_csv("data/raw_readings.csv", index=False)

print(f"Exported {len(df):,} rows  ({df['timestamp'].min().date()} -> {df['timestamp'].max().date()})")
print(f"Nodes: {df['nodeId'].nunique()}")
print("\nColumn summary:")
print(df.describe().round(2).to_string())
