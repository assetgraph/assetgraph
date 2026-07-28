#!/usr/bin/env bash
# Claude Code Stop hook (shared, see .claude/settings.json).
# At end of turn, format + lint the JS files changed in the working tree:
#   prettier --write : best-effort, never blocks
#   eslint --fix     : autofix; if problems remain, block (exit 2) with the
#                      report so Claude fixes them before the turn ends.
# To avoid an unbounded loop, it will not block a second consecutive time
# (stop_hook_active): the turn is allowed to end even if a residual,
# non-autofixable lint error remains.
# prettier/eslint honor .prettierignore/.eslintignore, so testdata fixtures and
# lib/3rdparty are skipped automatically. Scope is uncommitted changes vs HEAD;
# files committed earlier in the same turn are not revisited.
set -u

input=$(cat)
active=$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)

root=${CLAUDE_PROJECT_DIR:-.}
cd "$root" 2>/dev/null || exit 0

files=()
while IFS= read -r line; do
  [ -n "$line" ] && [ -f "$line" ] && files+=("$line")
done < <(
  {
    git diff --name-only --diff-filter=ACMR HEAD -- '*.js'
    git ls-files --others --exclude-standard -- '*.js'
  } 2>/dev/null | sort -u
)
[ ${#files[@]} -gt 0 ] || exit 0

[ -x node_modules/.bin/prettier ] && node_modules/.bin/prettier --write "${files[@]}" >/dev/null 2>&1

[ -x node_modules/.bin/eslint ] || exit 0
out=$(node_modules/.bin/eslint --fix "${files[@]}" 2>&1)
[ $? -eq 0 ] && exit 0

# eslint found problems it could not autofix.
[ "$active" = "true" ] && exit 0 # already blocked once this cycle; don't loop
echo "eslint reported issues in changed JS files (fix before finishing):" >&2
echo "$out" >&2
exit 2
