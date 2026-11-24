#!/usr/bin/env bash
# Checks the shipped typings, dist/stolon.d.ts, against Siphonophore.Stolon.Tests/types/typings.test.ts.
# Run it from anywhere with scripts/check-types.sh, after scripts/bundle.sh has built the bundle and the typings.
set -euo pipefail
cd "$(dirname "$0")/.."

node_modules/.bin/tsc -p Siphonophore.Stolon.Tests/types/tsconfig.json
echo "Typings check passed."
