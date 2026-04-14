#!/usr/bin/env bash
# commit_all_files.sh
# Commits every modified and untracked file as a separate git commit, then pushes.

set -e

commit_file() {
  local file="$1"
  local action="$2"   # "update" or "add"

  git add -- "$file"

  # Derive a human-readable commit message from the file path
  local name
  name=$(basename "$file")
  local dir
  dir=$(dirname "$file")

  case "$file" in
    .env.example)            msg="chore: update environment variable example" ;;
    .gitignore)              msg="chore: update gitignore rules" ;;
    README.md)               msg="docs: add project README" ;;
    package.json)            msg="chore: update package dependencies" ;;
    tsconfig.json)           msg="chore: update TypeScript config" ;;
    tailwind.config.ts)      msg="chore: update Tailwind CSS config" ;;
    jest.config.ts)          msg="chore: update Jest config" ;;
    prisma/seed.ts)          msg="chore: update database seed script" ;;

    arduino/sensor_node.ino) msg="feat(arduino): update sensor node firmware" ;;

    serial_bridge/README.md)            msg="docs(serial-bridge): update bridge README" ;;
    serial_bridge/bridge.py)            msg="feat(serial-bridge): update Python bridge script" ;;
    serial_bridge/config.yaml)          msg="chore(serial-bridge): update bridge config" ;;
    serial_bridge/tests/test_bridge.py) msg="test(serial-bridge): update bridge tests" ;;

    lib/aggregation.ts)  msg="feat(lib): update aggregation logic" ;;
    lib/alerts.ts)       msg="feat(lib): update alerts logic" ;;
    lib/pump.ts)         msg="feat(lib): update pump control logic" ;;
    lib/thresholds.ts)   msg="feat(lib): update sensor thresholds" ;;
    lib/validation.ts)   msg="feat(lib): update input validation" ;;
    lib/mockReadings.ts) msg="feat(lib): add mock readings helper" ;;

    __tests__/lib/readings.test.ts) msg="test: update readings unit tests" ;;

    app/api/ingest/route.ts)             msg="feat(api): update ingest route" ;;
    app/api/nodes/\[id\]/readings/route.ts) msg="feat(api): update node readings route" ;;
    app/api/stream/route.ts)             msg="feat(api): update SSE stream route" ;;

    app/layout.tsx)        msg="feat(app): update root layout" ;;
    app/components/Nav.tsx) msg="feat(ui): update navigation component" ;;

    app/dashboard/page.tsx)                          msg="feat(dashboard): update dashboard page" ;;
    app/dashboard/components/NodeStatusGrid.tsx)     msg="feat(dashboard): update NodeStatusGrid component" ;;
    app/dashboard/components/SensorCard.tsx)         msg="feat(dashboard): update SensorCard component" ;;
    app/dashboard/components/ConversionFormulas.tsx) msg="feat(dashboard): add ConversionFormulas component" ;;
    app/dashboard/components/DashboardChart.tsx)     msg="feat(dashboard): add DashboardChart component" ;;
    app/dashboard/components/SystemSensorRow.tsx)    msg="feat(dashboard): add SystemSensorRow component" ;;

    app/nodes/\[id\]/page.tsx)                              msg="feat(nodes): update node detail page" ;;
    app/nodes/\[id\]/components/AllSensorsChart.tsx)        msg="feat(nodes): update AllSensorsChart component" ;;
    app/nodes/\[id\]/components/NodeDetailCharts.tsx)       msg="feat(nodes): update NodeDetailCharts component" ;;
    app/nodes/\[id\]/components/TimeSeriesChart.tsx)        msg="feat(nodes): update TimeSeriesChart component" ;;
    app/nodes/\[id\]/components/ClassificationPanel.tsx)    msg="feat(nodes): add ClassificationPanel component" ;;
    app/nodes/\[id\]/components/SensorMetricsRow.tsx)       msg="feat(nodes): add SensorMetricsRow component" ;;

    *) msg="${action}(${dir}): ${action} ${name}" ;;
  esac

  git commit -m "$msg"
  echo "  committed: $file"
}

echo "=== Committing modified files ==="
while IFS= read -r file; do
  [ -z "$file" ] && continue
  echo "-> $file"
  commit_file "$file" "update"
done < <(git diff --name-only)

echo ""
echo "=== Committing new (untracked) files ==="
while IFS= read -r file; do
  [ -z "$file" ] && continue
  echo "-> $file"
  commit_file "$file" "add"
done < <(git ls-files --others --exclude-standard)

echo ""
echo "=== Pushing to origin/main ==="
git push origin main

echo ""
echo "Done! All files committed and pushed."
