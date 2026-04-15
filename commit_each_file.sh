#!/usr/bin/env bash
# commit_each_file.sh
# Stages and commits every modified/untracked file individually,
# then pushes all commits at once so local and remote counts match.

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# ── helper: derive a short commit message from a file path ─────────────────
commit_message() {
  local file="$1"
  local dir
  local base
  dir=$(dirname "$file")
  base=$(basename "$file" | sed 's/\.[^.]*$//')   # strip extension

  # Map common directories to short prefixes
  case "$dir" in
    app/api/*)           echo "feat(api): update $base endpoint" ;;
    app/components)      echo "feat(components): update $base component" ;;
    app/dashboard/components) echo "feat(dashboard): update $base component" ;;
    app/dashboard)       echo "feat(dashboard): update $base page" ;;
    app/nodes/*/components) echo "feat(nodes): update $base component" ;;
    app/nodes/*)         echo "feat(nodes): update $base page" ;;
    app/docs*)           echo "docs: update $base" ;;
    arduino)             echo "feat(arduino): update $base sketch" ;;
    data)                echo "chore(data): update $base config" ;;
    lib)                 echo "feat(lib): add $base module" ;;
    serial_bridge)       echo "feat(serial-bridge): update $base" ;;
    prisma)              echo "chore(prisma): update $base script" ;;
    *)                   echo "chore: update $base" ;;
  esac
}

# ── collect all changed files (tracked modifications + untracked) ───────────
mapfile -t FILES < <(
  git status --short | awk '{ print $NF }'
)

if [ ${#FILES[@]} -eq 0 ]; then
  echo "Nothing to commit. Working tree is clean."
  exit 0
fi

echo "Found ${#FILES[@]} file(s) to commit individually."
echo "──────────────────────────────────────────────────"

COMMITTED=0
for FILE in "${FILES[@]}"; do
  if [ ! -e "$FILE" ] && [ ! -d "$FILE" ]; then
    echo "  SKIP  (no longer exists): $FILE"
    continue
  fi

  MSG=$(commit_message "$FILE")

  git add "$FILE"

  # Only commit if there is actually something staged
  if git diff --cached --quiet; then
    echo "  SKIP  (nothing staged):   $FILE"
    continue
  fi

  git commit -m "$MSG

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

  echo "  OK    [$MSG]  →  $FILE"
  (( COMMITTED++ )) || true
done

echo "──────────────────────────────────────────────────"
echo "Committed $COMMITTED file(s)."

# ── push everything in one shot ─────────────────────────────────────────────
if [ "$COMMITTED" -gt 0 ]; then
  echo "Pushing to remote…"
  git push
  echo "Done. Local and remote commit counts now match."
else
  echo "Nothing was pushed (no new commits)."
fi
