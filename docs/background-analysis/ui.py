from pathlib import Path
import json
D=Path(__file__).parent;A=Path(json.loads((D/'baseline.json').read_text())['isolation'])
p=A/'src/api.ts';s=p.read_text();s="import type {AnalysisJob} from '../shared/analysisJobs';\n"+s;needle="  analyze: (id: string,";at=s.index(needle);s=s[:at]+"  startAnalysisJob:(id:string,body:{requestId:string;evidenceIds:string[];expectedCaptureEpoch:string;scope:'public'|'owner';ownerId?:string;purpose?:'capture'|'restore';instruction?:string})=>request<{job:AnalysisJob}>(`/sessions/${id}/analysis-jobs`,'POST',body),\n  analysisJobs:(id:string,ownerId?:string)=>request<{jobs:AnalysisJob[]}>(`/sessions/${id}/analysis-jobs${ownerId?'?ownerId='+encodeURIComponent(ownerId):''}`),\n"+s[at:];p.write_text(s)
p=A/'src/SessionWorkspace.tsx';s=p.read_text();s="import {activeAnalysisJob,type AnalysisJob} from '../shared/analysisJobs';\n"+s
needle='  const analysisInFlight = useRef(new Set<string>());';s=s.replace(needle,needle+"\n  const [serverJob,setServerJob]=useState<AnalysisJob|null>(null);\n  const [jobConnectionLost,setJobConnectionLost]=useState(false);\n  const jobRefresh=useRef({mutate});jobRefresh.current={mutate};\n  const refreshedJobs=useRef(new Set<string>());\n  useEffect(()=>{if(privateLocked){setServerJob(null);return;}let stopped=false,inFlight=false;\n    const poll=async()=>{if(inFlight)return;inFlight=true;try{const response=await api.analysisJobs(session.id,ownerId);if(stopped)return;const job=response.jobs[0]??null;setServerJob(job);setJobConnectionLost(false);if(job?.state==='completed'&&!refreshedJobs.current.has(job.id)){refreshedJobs.current.add(job.id);try{await jobRefresh.current.mutate(()=>api.session(session.id));}catch{refreshedJobs.current.delete(job.id);}}}catch{if(!stopped)setJobConnectionLost(true);}finally{inFlight=false;}};\n    void poll();const timer=setInterval(()=>void poll(),2000);return()=>{stopped=true;clearInterval(timer);};\n  },[session.id,ownerId,privateLocked]);")
start=s.index('  async function analyzeBatch(');end=s.index('  async function readStoredPhotos()',start)
s=s[:start]+'''  async function analyzeBatch(batch: Pick<BatchReadout, 'context' | 'evidenceIds'>) {
    const {context,evidenceIds}=batch;if(!evidenceIds.length||analysisInFlight.current.has(context.id))return;
    analysisInFlight.current.add(context.id);setLastScan(null);
    try{const response=await api.startAnalysisJob(context.sessionId,{requestId:context.id,evidenceIds:[...evidenceIds],expectedCaptureEpoch:context.captureEpoch,purpose:context.purpose,instruction:context.instruction,scope:context.ownerId?'owner':'public',ownerId:context.ownerId});if(alive.current)setServerJob(response.job);}
    catch(reason){if(alive.current)setLastScan({context,evidenceIds:[...evidenceIds],state:'failed',error:reason instanceof Error?reason.message:'写真読み取りを開始できませんでした。'});throw reason;}
    finally{analysisInFlight.current.delete(context.id);}
  }
'''.replace('写真読み取りを開始できませんでした。','사진 읽기를 시작하지 못했어요.')+s[end:]
s=s.replace('onReadyToLeave?.(flush);','onReadyToLeave?.(()=>flush(PHOTO_INPUT_SAVE_OPTIONS));').replace('try { await flush();await setOwnerId(id);','try { await flush(PHOTO_INPUT_SAVE_OPTIONS);await setOwnerId(id);')
needle='        {gallery &&';pos=s.index(needle);s=s[:pos]+'''        {serverJob&&<p className="scan-readout" role="status">{jobConnectionLost&&activeAnalysisJob(serverJob)?'상태 연결을 기다리고 있어요. 서버 작업은 계속돼요.':analysisJobMessage(serverJob)}</p>}
'''+s[pos:]
s=s.replace('disabled={locked||!status?.configured||!canRecognizePhotos(view.pack,ownerId)}','disabled={locked||!!serverJob&&activeAnalysisJob(serverJob)||!status?.configured||!canRecognizePhotos(view.pack,ownerId)}')
s=s.replace("onReread={status?.configured && currentPhotos.length > 0 ?", "onReread={status?.configured && currentPhotos.length > 0 && !(serverJob&&activeAnalysisJob(serverJob)) ?")
# Show actual start error rather than pretending a saved upload was analyzed.
s=s.replace("'사진 읽기에 실패했어요. 다시 읽거나 직접 고쳐 주세요.'", "(lastScan.error||'사진 읽기에 실패했어요. 원본은 남아 있어요.')")
s=s.replace("{lastScan.state === 'failed' && <button", "{lastScan.state === 'failed' && <button").replace('onClick={() => void analyzeBatch(lastScan)}','onClick={() => fire(analyzeBatch({...lastScan,context:{...lastScan.context,id:crypto.randomUUID()}}))}')
p.write_text(s)
p=A/'src/analysisJobMessage.ts';p.write_text('''import type {AnalysisJob} from '../shared/analysisJobs';
export function analysisJobMessage(job:AnalysisJob){switch(job.state){case 'queued':return '서버에서 사진 읽기를 준비해요. 나갔다 와도 확인할 수 있어요.';case 'running':return '서버에서 사진을 읽고 있어요. 나갔다 와도 계속돼요.';case 'completed':return job.mode==='manual'?'사진을 보관했어요. AI 연결 후 읽을 수 있어요.':job.candidateCount?'사진 읽기를 마쳤어요. 후보를 확인하고 적용해 주세요.':'확인할 새 후보가 없어요. 원본은 남아 있어요.';case 'stale':return '기록이 바뀌어 결과를 적용하지 않았어요. 원본은 남아 있어요.';case 'interrupted':return '서버 재시작으로 작업이 중단됐어요. 자동으로 다시 읽지 않았어요.';default:return '사진 읽기에 실패했어요. 원본은 남아 있어요.';}}
''')
p=A/'src/SessionWorkspace.tsx';s=p.read_text().replace("import {activeAnalysisJob,type AnalysisJob}","import {analysisJobMessage} from './analysisJobMessage';\nimport {activeAnalysisJob,type AnalysisJob}");p.write_text(s)
