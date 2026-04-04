#!/bin/bash
echo "Starting commit process..."
echo ""

git rm -r --cached .kiro/ 2>/dev/null && git commit -m "chore: remove .kiro from tracking" || echo ".kiro not tracked"

git add lib/alerts.ts 2>/dev/null
git commit -m "feat(lib): add alert evaluation" 2>/dev/null || echo "Already committed"

git add lib/thresholds.ts 2>/dev/null
git commit -m "feat(lib): add threshold queries" 2>/dev/null || echo "Already committed"

git add lib/nodes.ts 2>/dev/null
git commit -m "feat(lib): add node queries" 2>/dev/null || echo "Already committed"

git add lib/pump.ts 2>/dev/null
git commit -m "feat(lib): add pump control" 2>/dev/null || echo "Already committed"

git add lib/predictions.ts 2>/dev/null
git commit -m "feat(lib): add ML predictions" 2>/dev/null || echo "Already committed"

git add lib/weather.ts 2>/dev/null
git commit -m "feat(lib): add weather API" 2>/dev/null || echo "Already committed"

git add app/globals.css 2>/dev/null
git commit -m "feat(app): add global CSS" 2>/dev/null || echo "Already committed"

git add app/layout.tsx 2>/dev/null
git commit -m "feat(app): add root layout" 2>/dev/null || echo "Already committed"

git add app/page.tsx 2>/dev/null
git commit -m "feat(app): add root page" 2>/dev/null || echo "Already committed"

git add app/components/Nav.tsx 2>/dev/null
git commit -m "feat(ui): add navigation bar" 2>/dev/null || echo "Already committed"

git add app/api/ingest/route.ts 2>/dev/null
git commit -m "feat(api): add ingest endpoint" 2>/dev/null || echo "Already committed"

git add app/api/stream/route.ts 2>/dev/null
git commit -m "feat(api): add SSE stream" 2>/dev/null || echo "Already committed"

git add app/api/nodes/route.ts 2>/dev/null
git commit -m "feat(api): add nodes endpoint" 2>/dev/null || echo "Already committed"

git add "app/api/nodes/[id]/route.ts" 2>/dev/null
git commit -m "feat(api): add node detail endpoint" 2>/dev/null || echo "Already committed"

git add "app/api/nodes/[id]/readings/route.ts" 2>/dev/null
git commit -m "feat(api): add readings endpoint" 2>/dev/null || echo "Already committed"

git add "app/api/nodes/[id]/latest/route.ts" 2>/dev/null
git commit -m "feat(api): add latest reading endpoint" 2>/dev/null || echo "Already committed"

git add app/api/alerts/route.ts 2>/dev/null
git commit -m "feat(api): add alerts endpoint" 2>/dev/null || echo "Already committed"

git add app/api/alerts/thresholds/route.ts 2>/dev/null
git commit -m "feat(api): add thresholds endpoint" 2>/dev/null || echo "Already committed"

git add "app/api/alerts/[id]/ack/route.ts" 2>/dev/null
git commit -m "feat(api): add alert ack endpoint" 2>/dev/null || echo "Already committed"

git add app/api/pump/route.ts 2>/dev/null
git commit -m "feat(api): add pump endpoint" 2>/dev/null || echo "Already committed"

git add app/api/pump/auto/route.ts 2>/dev/null
git commit -m "feat(api): add auto pump endpoint" 2>/dev/null || echo "Already committed"

git add app/api/predictions/route.ts 2>/dev/null
git commit -m "feat(api): add predictions endpoint" 2>/dev/null || echo "Already committed"

git add app/api/weather/route.ts 2>/dev/null
git commit -m "feat(api): add weather endpoint" 2>/dev/null || echo "Already committed"

git add app/dashboard/page.tsx 2>/dev/null
git commit -m "feat(dashboard): add dashboard page" 2>/dev/null || echo "Already committed"

git add app/dashboard/components/SensorCard.tsx 2>/dev/null
git commit -m "feat(ui): add SensorCard" 2>/dev/null || echo "Already committed"

git add app/dashboard/components/NodeStatusGrid.tsx 2>/dev/null
git commit -m "feat(ui): add NodeStatusGrid" 2>/dev/null || echo "Already committed"

git add app/dashboard/components/AlertBanner.tsx 2>/dev/null
git commit -m "feat(ui): add AlertBanner" 2>/dev/null || echo "Already committed"

git add app/dashboard/components/AlertHistoryTable.tsx 2>/dev/null
git commit -m "feat(ui): add AlertHistoryTable" 2>/dev/null || echo "Already committed"

git add app/dashboard/components/PumpControlPanel.tsx 2>/dev/null
git commit -m "feat(ui): add PumpControlPanel" 2>/dev/null || echo "Already committed"

git add app/dashboard/components/WeatherWidget.tsx 2>/dev/null
git commit -m "feat(ui): add WeatherWidget" 2>/dev/null || echo "Already committed"

git add app/dashboard/components/PredictionPanel.tsx 2>/dev/null
git commit -m "feat(ui): add PredictionPanel" 2>/dev/null || echo "Already committed"

git add app/dashboard/components/CalibrationPanel.tsx 2>/dev/null
git commit -m "feat(ui): add CalibrationPanel" 2>/dev/null || echo "Already committed"

git add "app/nodes/[id]/page.tsx" 2>/dev/null
git commit -m "feat(dashboard): add node detail page" 2>/dev/null || echo "Already committed"

git add "app/nodes/[id]/components/TimeSeriesChart.tsx" 2>/dev/null
git commit -m "feat(ui): add TimeSeriesChart" 2>/dev/null || echo "Already committed"

git add "app/nodes/[id]/components/AllSensorsChart.tsx" 2>/dev/null
git commit -m "feat(ui): add AllSensorsChart" 2>/dev/null || echo "Already committed"

git add "app/nodes/[id]/components/NodeDetailCharts.tsx" 2>/dev/null
git commit -m "feat(ui): add NodeDetailCharts" 2>/dev/null || echo "Already committed"

git add "app/nodes/[id]/components/TimeRangePicker.tsx" 2>/dev/null
git commit -m "feat(ui): add TimeRangePicker" 2>/dev/null || echo "Already committed"

git add app/settings/page.tsx 2>/dev/null
git commit -m "feat(settings): add settings page" 2>/dev/null || echo "Already committed"

git add app/settings/components/NodeManagement.tsx 2>/dev/null
git commit -m "feat(settings): add NodeManagement" 2>/dev/null || echo "Already committed"

git add app/settings/components/ThresholdConfig.tsx 2>/dev/null
git commit -m "feat(settings): add ThresholdConfig" 2>/dev/null || echo "Already committed"

git add __tests__/lib/readings.test.ts 2>/dev/null
git commit -m "test: add readings unit tests" 2>/dev/null || echo "Already committed"

git add data/pump-config.json 2>/dev/null
git commit -m "feat(data): add pump config" 2>/dev/null || echo "Already committed"

git add arduino/sensor_node.ino 2>/dev/null
git commit -m "feat(arduino): add sensor sketch" 2>/dev/null || echo "Already committed"

git add serial_bridge/config.yaml 2>/dev/null
git commit -m "feat(bridge): add bridge config" 2>/dev/null || echo "Already committed"

git add serial_bridge/bridge.py 2>/dev/null
git commit -m "feat(bridge): add Python serial bridge" 2>/dev/null || echo "Already committed"

git add serial_bridge/README.md 2>/dev/null
git commit -m "docs(bridge): add bridge README" 2>/dev/null || echo "Already committed"

git add serial_bridge/tests/__init__.py 2>/dev/null
git commit -m "test(bridge): add test package" 2>/dev/null || echo "Already committed"

git add serial_bridge/tests/test_bridge.py 2>/dev/null
git commit -m "test(bridge): add property tests" 2>/dev/null || echo "Already committed"

git add package-lock.json 2>/dev/null
git commit -m "chore: add package-lock.json" 2>/dev/null || echo "Already committed"

git add commit.sh
git commit -m "chore: update commit script"

echo ""
echo "Done! Run: git push origin main"
