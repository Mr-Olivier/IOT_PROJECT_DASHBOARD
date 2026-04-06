#!/bin/bash
echo "Starting commit batch 4..."
echo ""

git add .vscode/settings.json 2>/dev/null
git commit -m "chore: add VSCode settings" 2>/dev/null || echo "Already committed"

git add .kiro/specs/arduino-sensor-integration/.config.kiro 2>/dev/null
git commit -m "chore(kiro): add arduino integration spec config" 2>/dev/null || echo "Already committed"

git add .kiro/specs/arduino-sensor-integration/requirements.md 2>/dev/null
git commit -m "docs(kiro): add arduino integration requirements" 2>/dev/null || echo "Already committed"

git add .kiro/specs/arduino-sensor-integration/design.md 2>/dev/null
git commit -m "docs(kiro): add arduino integration design" 2>/dev/null || echo "Already committed"

git add .kiro/specs/arduino-sensor-integration/tasks.md 2>/dev/null
git commit -m "docs(kiro): add arduino integration tasks" 2>/dev/null || echo "Already committed"

git add .kiro/specs/smart-irrigation-dashboard/.config.kiro 2>/dev/null
git commit -m "chore(kiro): add dashboard spec config" 2>/dev/null || echo "Already committed"

git add .kiro/specs/smart-irrigation-dashboard/requirements.md 2>/dev/null
git commit -m "docs(kiro): add dashboard requirements" 2>/dev/null || echo "Already committed"

git add .kiro/specs/smart-irrigation-dashboard/design.md 2>/dev/null
git commit -m "docs(kiro): add dashboard design" 2>/dev/null || echo "Already committed"

git add .kiro/specs/smart-irrigation-dashboard/tasks.md 2>/dev/null
git commit -m "docs(kiro): add dashboard tasks" 2>/dev/null || echo "Already committed"

git add commit2.sh 2>/dev/null
git commit -m "chore: update commit batch 2 script" 2>/dev/null || echo "Already committed"

git add commit.sh
git commit -m "chore: add commit batch 4 script"

echo ""
echo "Done! Run: git push origin main"
