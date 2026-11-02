# Rejected short native experiment

**FAILED — withdrawn from the default reader.** The supervisor reported 49 objects for the existing reader versus 8 for the compact candidate on the same photo. The provider raw itself contained only 8 objects and falsely claimed full coverage. The 21.340-second candidate result does not establish a quality-preserving 30-second success. See [live interpretation](../astra/live-followup.md).

The experimental module and experimental tests are archived as `.snapshot` files in this directory. They are evidence, not executable tests. The supervisor restored the original production module; its SHA256 is `d89caf23705771a6c5113cef83f0ab669f0beb8b82bf3c8d881aa8cbb9b885bf`, matching the pre-experiment baseline.

The active native regressions now cover full-schema source/raw/unknown/null/0/small-object compatibility. Compact prompt bounds, omitted-source expansion and optional required-key assertions were removed from active tests. Nothing is skipped or faked. The 15 native tests pass.

Exact commands, archived/current hashes and limits: [withdrawal verification](withdrawal-verification.json). Earlier [synthetic verification](../sol2/verification.json) is marked historical and withdrawn.
