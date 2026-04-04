UPDATE "Threshold" SET "minValue" = 0, "maxValue" = 100 WHERE metric = 'soilMoisture';
UPDATE "Threshold" SET "minValue" = 0, "maxValue" = 50 WHERE metric = 'temperature';
UPDATE "Threshold" SET "minValue" = 4.0, "maxValue" = 9.0 WHERE metric = 'ph';
UPDATE "Threshold" SET "minValue" = 0, "maxValue" = NULL WHERE metric = 'reservoirLevel';
DELETE FROM "Alert";
