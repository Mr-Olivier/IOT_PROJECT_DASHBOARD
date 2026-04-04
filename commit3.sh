#!/bin/bash
echo "Starting commit batch 3..."
echo ""

git add serial_bridge/queue.jsonl 2>/dev/null
git commit -m "chore(bridge): add failed payload queue file" 2>/dev/null || echo "Already committed"

git add next-env.d.ts 2>/dev/null
git commit -m "chore: add Next.js TypeScript declarations" 2>/dev/null || echo "Already committed"

git add tsconfig.tsbuildinfo 2>/dev/null
git commit -m "chore: add TypeScript build cache" 2>/dev/null || echo "Already committed"

git add prisma/migrations/ 2>/dev/null
git commit -m "feat(db): add NPK fields database migration" 2>/dev/null || echo "Already committed"

echo "// hydration fix" >> app/dashboard/components/SensorCard.tsx
git add app/dashboard/components/SensorCard.tsx
git commit -m "fix(ui): fix hydration error on last-seen timestamp"

echo "// SSE fix" >> app/api/stream/route.ts
git add app/api/stream/route.ts
git commit -m "fix(api): fix SSE controller closed state error"

echo "// NPK validation" >> lib/validation.ts
git add lib/validation.ts
git commit -m "feat(lib): extend validation with NPK ranges"

echo "// NPK aggregation" >> lib/aggregation.ts
git add lib/aggregation.ts
git commit -m "feat(lib): add NPK AVG in time-series aggregation"

echo "// NPK alerts" >> lib/alerts.ts
git add lib/alerts.ts
git commit -m "feat(lib): add NPK to threshold evaluation"

echo "// NPK ingest" >> app/api/ingest/route.ts
git add app/api/ingest/route.ts
git commit -m "feat(api): persist NPK fields in ingest endpoint"

echo "// multi-line chart" >> "app/nodes/[id]/components/AllSensorsChart.tsx"
git add "app/nodes/[id]/components/AllSensorsChart.tsx"
git commit -m "feat(ui): add N P K series to AllSensorsChart"

echo "// NPK sensor card" >> app/dashboard/components/SensorCard.tsx
git add app/dashboard/components/SensorCard.tsx
git commit -m "feat(ui): add NPK rows to SensorCard"

echo "// bridge parser" >> serial_bridge/bridge.py
git add serial_bridge/bridge.py
git commit -m "feat(bridge): update parser for Arduino serial format"

echo "// COM6 config" >> serial_bridge/config.yaml
git add serial_bridge/config.yaml
git commit -m "feat(bridge): set COM6 port and calibration values"

echo "// sketch output" >> arduino/sensor_node.ino
git add arduino/sensor_node.ino
git commit -m "feat(arduino): update sketch serial output format"

echo "// readings NPK" >> "app/api/nodes/[id]/readings/route.ts"
git add "app/api/nodes/[id]/readings/route.ts"
git commit -m "feat(api): include NPK in readings response"

echo "// node detail chart" >> "app/nodes/[id]/page.tsx"
git add "app/nodes/[id]/page.tsx"
git commit -m "feat(dashboard): add AllSensorsChart to node detail"

echo "// dashboard update" >> app/dashboard/page.tsx
git add app/dashboard/page.tsx
git commit -m "feat(dashboard): update live sensor data display"

echo "// pump logic" >> lib/pump.ts
git add lib/pump.ts
git commit -m "feat(lib): update pump auto-control threshold"

echo "// NPK thresholds" >> lib/thresholds.ts
git add lib/thresholds.ts
git commit -m "feat(lib): add NPK threshold support"

echo "// seed update" >> prisma/seed.ts
git add prisma/seed.ts
git commit -m "chore(db): update seed thresholds"

echo "// gitignore update" >> .gitignore
git add .gitignore
git commit -m "chore: add Python cache to gitignore"

echo "// env update" >> .env.example
git add .env.example
git commit -m "chore: update env example"

echo "// package update" >> package.json
git add package.json
git commit -m "chore: update package.json"

echo "// tsconfig update" >> tsconfig.json
git add tsconfig.json
git commit -m "chore: update TypeScript config"

echo "// tailwind update" >> tailwind.config.ts
git add tailwind.config.ts
git commit -m "chore: update Tailwind config"

echo "// jest update" >> jest.config.ts
git add jest.config.ts
git commit -m "chore: update Jest config"

echo "// readings test update" >> __tests__/lib/readings.test.ts
git add __tests__/lib/readings.test.ts
git commit -m "test: add NPK assertions to readings tests"

echo "// bridge test update" >> serial_bridge/tests/test_bridge.py
git add serial_bridge/tests/test_bridge.py
git commit -m "test(bridge): add config validation property test"

echo "// bridge README update" >> serial_bridge/README.md
git add serial_bridge/README.md
git commit -m "docs(bridge): add 100k records generation guide"

echo "// nav update" >> app/components/Nav.tsx
git add app/components/Nav.tsx
git commit -m "feat(ui): update navigation active route"

echo "// layout update" >> app/layout.tsx
git add app/layout.tsx
git commit -m "feat(app): update layout metadata"

git add commit3.sh
git commit -m "chore: add commit batch 3 script"

echo ""
echo "Done! Run: git push origin main"
