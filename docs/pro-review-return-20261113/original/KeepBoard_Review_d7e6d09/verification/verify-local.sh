#!/usr/bin/env bash
# Local checks only. No network, API requests, repository writes or dependency installs.
# Prerequisites: Python 3.10+ with NumPy/SciPy, Node.js 22+, TypeScript CLI on PATH, Git.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
mkdir -p verification/compiled verification/geometry-compiled
python -m unittest discover -s tests -p 'test_*.py' -v > verification/final-python.log 2>&1
tsc patch/files/shared/estimatedStructureSafety.ts --target ES2022 --module commonjs --strict --skipLibCheck --outDir verification/compiled > verification/final-safety-typecheck.log 2>&1
node --test tests/structure-safety.test.cjs > verification/final-safety.log 2>&1
node --test tests/source-predicates.test.mjs > verification/final-source-predicates.log 2>&1
python analysis/build_response_comparison.py > verification/final-response-comparison.log 2>&1
tsc analysis/geometry_excerpt.ts --target ES2022 --module commonjs --strict --skipLibCheck --outDir verification/geometry-compiled > verification/final-geometry-typecheck.log 2>&1
node analysis/run_lattice.cjs > verification/final-lattice.log 2>&1
python patch/apply_minimum.py --repo verification/pinned --diff verification/regenerated.patch > verification/final-patch-dry-run.log 2>&1
cmp patch/minimum.patch verification/regenerated.patch
(cd verification/pinned && git apply --check "$ROOT/patch/minimum.patch") > verification/final-git-apply-check.log 2>&1
# A syntax/transpilation check, NOT a full-project type check.
NODE_PATH="$(npm root -g)${NODE_PATH:+:$NODE_PATH}" node verification/check-syntax.cjs > verification/final-syntax.log 2>&1
python verification/report_verification.py
cat verification/final-python.log | tail -5
cat verification/final-safety.log | tail -9
cat verification/final-source-predicates.log | tail -9
cat verification/final-patch-dry-run.log
cat verification/final-syntax.log
printf '\nLocal checks completed. Full application, photos and browser integration remain UNVERIFIED.\n'
