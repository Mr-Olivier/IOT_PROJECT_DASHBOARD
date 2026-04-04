#!/bin/bash
echo "Starting commit batch 2..."
echo ""

git add next.config.mjs 2>/dev/null
git commit -m "chore: update Next.js config" 2>/dev/null || echo "Already committed"

git add tailwind.config.ts 2>/dev/null
git commit -m "chore: update Tailwind config" 2>/dev/null || echo "Already committed"

git add postcss.config.mjs 2>/dev/null
git commit -m "chore: update PostCSS config" 2>/dev/null || echo "Already committed"

git add jest.config.ts 2>/dev/null
git commit -m "chore: update Jest config" 2>/dev/null || echo "Already committed"

git add jest.setup.ts 2>/dev/null
git commit -m "chore: update Jest setup" 2>/dev/null || echo "Already committed"

git add prisma/schema.prisma 2>/dev/null
git commit -m "feat(db): update schema with NPK fields" 2>/dev/null || echo "Already committed"

git add prisma/seed.ts 2>/dev/null
git commit -m "feat(db): update seed with thresholds" 2>/dev/null || echo "Already committed"

git add prisma/tsconfig.seed.json 2>/dev/null
git commit -m "chore(db): add seed tsconfig" 2>/dev/null || echo "Already committed"

git add prisma/migrations/migration_lock.toml 2>/dev/null
git commit -m "chore(db): add migration lock" 2>/dev/null || echo "Already committed"

git add prisma/migrations/20260318180617_init/migration.sql 2>/dev/null
git commit -m "feat(db): add initial migration" 2>/dev/null || echo "Already committed"

git add prisma/clear_readings.sql 2>/dev/null
git commit -m "chore(db): add clear readings script" 2>/dev/null || echo "Already committed"

git add prisma/update_thresholds.sql 2>/dev/null
git commit -m "chore(db): add update thresholds script" 2>/dev/null || echo "Already committed"

git add lib/prisma.ts 2>/dev/null
git commit -m "feat(lib): add Prisma client" 2>/dev/null || echo "Already committed"

git add lib/validation.ts 2>/dev/null
git commit -m "feat(lib): add sensor validation" 2>/dev/null || echo "Already committed"

git add lib/readings.ts 2>/dev/null
git commit -m "feat(lib): add readings queries" 2>/dev/null || echo "Already committed"

git add lib/aggregation.ts 2>/dev/null
git commit -m "feat(lib): add data aggregation" 2>/dev/null || echo "Already committed"

git add next-env.d.ts 2>/dev/null
git commit -m "chore: add Next.js env types" 2>/dev/null || echo "Already committed"

git add tsconfig.json 2>/dev/null
git commit -m "chore: update TypeScript config" 2>/dev/null || echo "Already committed"

git add package.json 2>/dev/null
git commit -m "chore: update package.json" 2>/dev/null || echo "Already committed"

git add .gitignore 2>/dev/null
git commit -m "chore: update gitignore" 2>/dev/null || echo "Already committed"

git add .env.example 2>/dev/null
git commit -m "chore: update env example" 2>/dev/null || echo "Already committed"

git add commit2.sh
git commit -m "chore: add commit batch 2 script"

echo ""
echo "Done! Run: git push origin main"
