"""One normal TLS-verifying curl retry for local urllib TLS/time-out errors."""
import concurrent.futures,hashlib,json,subprocess
from pathlib import Path
out=Path(__file__).resolve().parent
rows=json.loads((out/'download-receipts.json').read_text())
def retry(r):
 if r.get('saved') or not any(s in r.get('error','') for s in ['CERTIFICATE_VERIFY_FAILED','timed out']):return r
 dest=out/'sources'/(r['gameId']+'.pdf')
 result=subprocess.run(['curl','--location','--fail','--silent','--show-error','--max-time','45','--max-filesize','35000000','--output',str(dest),'--write-out','%{http_code}\n%{url_effective}\n%{content_type}',r['url']],capture_output=True,text=True)
 r['urllibErrorClassification']='local-client-tls' if 'CERTIFICATE' in r['error'] else 'client-timeout';r['curlRetry']={'exit':result.returncode,'response':result.stdout,'error':result.stderr.strip(),'tlsVerification':True}
 if result.returncode==0 and dest.exists() and dest.read_bytes().startswith(b'%PDF'):
  data=dest.read_bytes();r.update(saved=True,path=str(dest.relative_to(out.parents[2])),bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
 return r
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(retry,rows))
(out/'download-curl-receipts.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
for r in results:print(r['gameId'],r.get('curlRetry',{}).get('exit'),r['saved'])
