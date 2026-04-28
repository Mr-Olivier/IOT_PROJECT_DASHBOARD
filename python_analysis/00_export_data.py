"""
Step 0 - Export data from PostgreSQL -> data/raw_readings.csv
Run this once; all other scripts read from the CSV.
"""
import pandas as pd
from db_config import get_connection

print("Connecting to database...")
conn = get_connection()

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
    ORDER BY r.timestamp
    """,
    conn,
)
conn.close()

df["timestamp"] = pd.to_datetime(df["timestamp"])
df.to_csv("data/raw_readings.csv", index=False)

print(f"Exported {len(df):,} rows  ({df['timestamp'].min().date()} -> {df['timestamp'].max().date()})")
print(f"Nodes: {df['nodeId'].nunique()}")
print("\nColumn summary:")
print(df.describe().round(2).to_string())
