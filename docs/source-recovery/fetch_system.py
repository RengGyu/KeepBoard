#!/usr/bin/env python3
"""One public GET with macOS curl's normal certificate verification.

The Python trust store failed before any HTTP response. This client uses the
system trust store; it does not disable TLS verification or change identity.
No credentials, browser cookies, retries, proxy overrides, or -k.
"""
import datetime
import hashlib
import json
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parent
source_id, url, basename = sys.argv[1:4]
max_bytes = int(sys.argv[4]) if len(sys.argv) > 4 else 35_000_000
assert 0 < max_bytes <= 100_000_000
assert url.startswith('https://') and Path(basename).name == basename
receipt = root / 'sources' / (source_id + '.receipt.json')
if receipt.exists():
    raise SystemExit('Existing attempt; no automatic retry.')
path = root / 'sources' / basename
if path.exists():
    raise SystemExit('Existing source; will not overwrite.')
record = {'id': source_id, 'requested_url': url,
          'accessed_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'method': 'macOS curl default TLS verification; one GET; no retries/auth/UA spoofing',
          'local_size_ceiling_bytes': max_bytes,
          'origin_http_status': None, 'result': 'FAILED'}
r = subprocess.run(['/usr/bin/curl', '--silent', '--show-error', '--fail', '--location',
                    '--max-redirs', '5', '--max-time', '55', '--max-filesize', str(max_bytes),
                    '--output', str(path), '--write-out', '%{http_code}\n%{url_effective}\n%{content_type}\n',
                    url], capture_output=True, text=True)
meta = r.stdout.splitlines()
record['exit_code'] = r.returncode
if meta:
    record['origin_http_status'] = int(meta[0]) if meta[0].isdigit() and meta[0] != '000' else None
    record['final_url'] = meta[1] if len(meta) > 1 else None
    record['content_type'] = meta[2] if len(meta) > 2 else None
if r.returncode == 0 and path.exists():
    data = path.read_bytes()
    record.update(result='DOWNLOADED', local_path=str(path.relative_to(root)),
                  bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), pdf_magic=data.startswith(b'%PDF-'))
else:
    record['error'] = r.stderr[:1000]
    record['stop_same_route'] = True
    if path.exists():
        path.unlink()  # Only our failed, newly created partial download.
receipt.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(record, ensure_ascii=False))
