import psycopg2
import pandas as pd

DB = dict(host="localhost", port=5432, dbname="aquasense",
          user="postgres", password="Taekwondo@12")

SENSORS = ["soilMoisture", "temperature", "humidity",
           "reservoirLevel", "nitrogen", "phosphorus", "potassium"]

# pH excluded - constant 7.0 in this dataset (zero variance, useless for ML)

# Thresholds matching lib/classification.ts (used in dashboard)
THRESHOLDS = {
    "soilMoisture":  [20, 40, 70, 85],   # CL | L | O | H | CH
    "temperature":   [10, 18, 30, 38],
    "humidity":      [30, 45, 75, 85],
    "reservoirLevel":[10, 25, 75, 90],
    "nitrogen":      [5,  14, 27, 35],   # scaled to actual data range 0-43.6
    "phosphorus":    [5,  18, 34, 42],   # scaled to actual data range 0-47.9
    "potassium":     [10, 39, 67, 84],   # scaled to actual data range 0-98.6
}

CLASSES = ["criticalLow", "low", "optimal", "high", "criticalHigh"]


def get_connection():
    return psycopg2.connect(**DB)


def classify(value, sensor):
    t = THRESHOLDS[sensor]
    if value <= t[0]: return "criticalLow"
    if value <= t[1]: return "low"
    if value <= t[2]: return "optimal"
    if value <= t[3]: return "high"
    return "criticalHigh"
