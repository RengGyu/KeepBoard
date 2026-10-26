from pathlib import Path
import subprocess,os,signal,json,datetime
ROOT=Path(__file__).resolve().parents[3];PID=6133
cmd=subprocess.check_output(['ps','-p',str(PID),'-o','command='],text=True);assert 'server/index.ts' in cmd and str(ROOT)+'/node_modules/tsx/' in cmd
cwd=subprocess.check_output(['lsof','-a','-p',str(PID),'-d','cwd','-Fn'],text=True);assert 'n'+str(ROOT) in cwd.splitlines()
ports=subprocess.check_output(['lsof','-nP','-iTCP:4319','-sTCP:LISTEN','-Fp'],text=True);assert {int(s[1:]) for s in ports.splitlines() if s.startswith('p')}=={PID}
connections=subprocess.run(['lsof','-nP','-a','-p','18287','-iTCP','-sTCP:ESTABLISHED','-Fpf'],capture_output=True,text=True);assert connections.returncode==1 and not connections.stdout.strip(),'Gateway activity: do not pause'
for f in Path('/tmp/keepboard-preview/data/analysis-jobs').glob('*.json'):
 j=json.loads(f.read_text());assert j.get('state') not in ['queued','running'],'Wait for active analysis; never retry model'
os.kill(PID,signal.SIGSTOP)
state=subprocess.check_output(['ps','-p',str(PID),'-o','state='],text=True).strip();assert state.startswith('T')
receipt={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'pid':PID,'state':state,'action':'SIGSTOP','reason':'consistent read-only migration snapshot','gatewayEstablishedCheck':'lsof -Fpf exit1 + empty stdout','activePersistedJobs':0,'otherPIDsChanged':False,'resumeCommand':'kill -CONT 6133 only after rollback write reconciliation'}
(ROOT/'docs/vercel-deployment/migration/backend-paused.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
