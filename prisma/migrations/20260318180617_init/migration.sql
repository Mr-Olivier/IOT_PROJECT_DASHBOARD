-- CreateTable
CREATE TABLE "SensorNode" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zone" TEXT,
    "location" TEXT,
    "apiKeyHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SensorNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorReading" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "soilMoisture" DOUBLE PRECISION NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "humidity" DOUBLE PRECISION NOT NULL,
    "reservoirLevel" DOUBLE PRECISION NOT NULL,
    "ph" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SensorReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PumpEvent" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT,
    "source" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "triggeredBy" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL,
    "errorMsg" TEXT,

    CONSTRAINT "PumpEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "breachValue" DOUBLE PRECISION NOT NULL,
    "thresholdValue" DOUBLE PRECISION NOT NULL,
    "direction" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Threshold" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT,
    "metric" TEXT NOT NULL,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Threshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherCache" (
    "id" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB NOT NULL,

    CONSTRAINT "WeatherCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MLPrediction" (
    "id" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horizon" TEXT NOT NULL,
    "predictions" JSONB NOT NULL,
    "inputFeatures" JSONB NOT NULL,
    "isStale" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MLPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SensorNode_slug_key" ON "SensorNode"("slug");

-- CreateIndex
CREATE INDEX "SensorReading_nodeId_timestamp_idx" ON "SensorReading"("nodeId", "timestamp");

-- CreateIndex
CREATE INDEX "Alert_nodeId_createdAt_idx" ON "Alert"("nodeId", "createdAt");

-- AddForeignKey
ALTER TABLE "SensorReading" ADD CONSTRAINT "SensorReading_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "SensorNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PumpEvent" ADD CONSTRAINT "PumpEvent_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "SensorNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "SensorNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Threshold" ADD CONSTRAINT "Threshold_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "SensorNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
