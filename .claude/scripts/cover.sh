#!/usr/bin/env bash
# Scoped test coverage for one subject, for fast iteration.
#
# Usage: .claude/scripts/cover.sh <subject> [lib-include]
#   <subject>     test path under test/, without .js
#                 (e.g. relations/HtmlImage, assets/Css, findAssets).
#                 Runs test/<subject>.js.
#   [lib-include] optional nyc --include glob. Defaults to lib/<subject>.js when
#                 that file exists, otherwise lib/** (use the explicit arg for
#                 top-level method tests like findAssets whose code lives in
#                 lib/AssetGraph.js, e.g. `cover.sh findAssets lib/AssetGraph.js`).
#
# Wraps the fiddly bits that make a naive scoped run misbehave:
#   --no-all             so only the included file(s) report, not all of lib
#   --globals __coverage__  so mocha's --check-leaks does not flag nyc's global
#                           and report a passing test as a leak failure
set -u

root=$(cd "$(dirname "$0")/../.." && pwd)
cd "$root" || exit 1

subject=${1:-}
if [ -z "$subject" ]; then
  echo "usage: .claude/scripts/cover.sh <subject> [lib-include]" >&2
  echo "  e.g. .claude/scripts/cover.sh relations/HtmlImage" >&2
  exit 2
fi

# Normalize: strip a leading test/ or lib/ and a trailing .js.
subject=${subject#test/}
subject=${subject#lib/}
subject=${subject%.js}

testfile="test/$subject.js"
if [ ! -f "$testfile" ]; then
  echo "cover.sh: no such test file: $testfile" >&2
  exit 2
fi

include=${2:-}
if [ -z "$include" ]; then
  if [ -f "lib/$subject.js" ]; then
    include="lib/$subject.js"
  else
    include="lib/**"
    echo "cover.sh: lib/$subject.js not found; reporting coverage over the lib files this test loads (pass a lib-include to scope)" >&2
  fi
fi

nyc="$root/node_modules/.bin/nyc"
mocha="$root/node_modules/.bin/mocha"
if [ ! -x "$nyc" ] || [ ! -x "$mocha" ]; then
  echo "cover.sh: nyc/mocha not found in node_modules; run npm install first" >&2
  exit 1
fi

export NODE_ENV=test
exec "$nyc" --reporter=text --include "$include" --no-all -- \
  "$mocha" "$testfile" --globals __coverage__
