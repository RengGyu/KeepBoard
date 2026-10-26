#!/bin/sh
# Regenerates every artifact coupled to the canonical game sources, in dependency order.
# Unrevised games keep their exact profiles, contract rows and photo definitions; see tests/gamepack-revision-history.test.ts.
# The photo-definition step refuses a contract whose SHA is not the reviewed pin in generate-photo-definitions.mts:
# review the printed contract diff, then update APPROVED_CONTRACT.sha256 and rerun.
set -e
cd "$(dirname "$0")/../.."
npx tsx tools/game-runtime/revision-ledger.ts --write
npx tsx tools/game-runtime/generate.ts
npx tsx tools/game-runtime/revise-inputs.ts inputs
python3 tools/readouts/generate.py --report-dir "${READOUT_REPORT_DIR:-${TMPDIR:-/tmp}/keepboard-readout-report}"
npx tsx tools/game-runtime/revise-capture.ts --write
npx tsx tools/game-runtime/revise-inputs.ts contract
npx tsx tools/lightweight-recognition/generate-photo-definitions.mts
python3 tools/game-board-visuals/generate.py
npx tsx tools/game-specs/cli.ts validate docs/research/game-specs-120/games --complete >/dev/null
