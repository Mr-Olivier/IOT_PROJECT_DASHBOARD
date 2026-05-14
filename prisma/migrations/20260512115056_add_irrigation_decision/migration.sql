-- CreateTable
CREATE TABLE "IrrigationDecision" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nodeId" TEXT,
    "decision" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "pumpCommand" BOOLEAN NOT NULL,
    "soilMoisture" DOUBLE PRECISION NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "humidity" DOUBLE PRECISION NOT NULL,
    "reservoirLevel" DOUBLE PRECISION NOT NULL,
    "nitrogen" DOUBLE PRECISION,
    "phosphorus" DOUBLE PRECISION,
    "potassium" DOUBLE PRECISION,
    "modelVersion" TEXT NOT NULL DEFAULT 'rf-v1',

    CONSTRAINT "IrrigationDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IrrigationDecision_timestamp_idx" ON "IrrigationDecision"("timestamp");

-- CreateIndex
CREATE INDEX "IrrigationDecision_nodeId_timestamp_idx" ON "IrrigationDecision"("nodeId", "timestamp");
