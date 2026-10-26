#!/usr/bin/env python3
"""One ordinary public GET; no retries, credentials, proxy override or UA spoofing.

Usage: python3 docs/source-recovery/fetch_public.py ID URL BASENAME
Writes only in this research folder. A failed response is recorded, never promoted
to content evidence. Re-running an existing ID is refused to avoid blind retries.
"""
import datetime
import hashlib
import json
from pathlib import Path
import sys
import urllib.error
import urllib.request

root = Path(__file__).resolve().parent
source_id, url, basename = sys.argv[1:]
assert url.startswith("https://")
assert Path(basename).name == basename
receipt = root / "sources" / (source_id + ".receipt.json")
if receipt.exists():
    raise SystemExit("Existing attempt: inspect its receipt before choosing another official source.")
record = {"id": source_id, "requested_url": url,
          "accessed_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
          "method": "Python urllib ordinary GET, default UA; one attempt, no credentials or retries",
          "origin_http_status": None, "result": "FAILED"}
try:
    with urllib.request.urlopen(url, timeout=35) as response:
        record.update(origin_http_status=response.status, final_url=response.url,
                      content_type=response.headers.get("Content-Type"))
        data = response.read(35_000_001)
        if len(data) > 35_000_000:
            raise ValueError("Research download size ceiling exceeded (35 MB)")
        path = root / "sources" / basename
        path.write_bytes(data)
        record.update(result="DOWNLOADED", local_path=str(path.relative_to(root)),
                      bytes=len(data), sha256=hashlib.sha256(data).hexdigest(),
                      pdf_magic=data.startswith(b"%PDF-"))
except urllib.error.HTTPError as error:
    record.update(origin_http_status=error.code, final_url=error.url,
                  error=str(error), stop_same_route=True)
except Exception as error:
    record.update(error=str(error))
receipt.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(record, ensure_ascii=False))
