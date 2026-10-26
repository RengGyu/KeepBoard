"""One fixed no-download, oracle-only treatment of the baseline18 Catan crops.
No automatic detection, rotation search, value correction, tuning sweep, or model call.
"""
import pathlib,json,hashlib,tempfile,os,time,subprocess,csv,re,collections
from PIL import Image,ImageOps
H=pathlib.Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
EXE='/opt/homebrew/bin/tesseract'
def main():
 os.umask(0o077)
 baseline=H/'ocr-diagnostic.json';b=json.loads(baseline.read_text());original=pathlib.Path(b['privateDirectory']);oldplan=original/'plan.json';p=json.loads(oldplan.read_text())
 assert sha(oldplan)==b['planSHA256'] and len(p['crops'])==18
 for c in p['crops']:assert sha(c['file'])==c['sha256']
 private=pathlib.Path(tempfile.mkdtemp(prefix='kb-ocr-digit-'));private.chmod(0o700)
 command=[EXE,'<treated-crop>','<output>','-l','eng','--psm','8','-c','tessedit_char_whitelist=0123456789','-c','load_system_dawg=0','-c','load_freq_dawg=0','tsv']
 # Freeze settings and source hashes before preprocessing or ANY OCR result exists.
 plan={'schema':'oracle-digit-treatment-v1','baselineReportSHA256':sha(baseline),'baselinePlanSHA256':sha(oldplan),'scriptSHA256':sha(__file__),'toolSHA256':sha(EXE),'traineddataSHA256':sha('/opt/homebrew/share/tessdata/eng.traineddata'),'preprocessing':{'scale':4,'filter':'Pillow.Resampling.LANCZOS','borderPx':10,'borderColor':'white','rotationDegrees':0},'commandShape':command,'sourceCrops':[{'sequence':c['sequence'],'file':c['file'],'sha256':c['sha256'],'sourceBoxPx':c['sourceBoxPx']} for c in p['crops']],'maxProcesses':18,'retry':0,'matching':'One ASCII numeric TSV word per exact original oracle crop; multiple numeric words ambiguous; no nearest-value or spelling correction.','scope':'ORACLE_ONLY_NOT_AUTOMATIC_DETECTOR_OR_GAME_ACCURACY'}
 planfile=private/'plan.json';planfile.write_text(json.dumps(plan,indent=2));planSHA=sha(planfile);(private/'execution.claim').write_text(planSHA)
 processed=[];preStart=time.perf_counter()
 for c in p['crops']:
  target=private/f"crop-{c['sequence']:02d}.png";image=Image.open(c['file']).convert('RGB');image=ImageOps.expand(image.resize((image.width*4,image.height*4),Image.Resampling.LANCZOS),border=10,fill='white');image.save(target)
  processed.append({**c,'treatedFile':str(target),'treatedSHA256':sha(target),'treatedSize':list(image.size)})
 preMs=(time.perf_counter()-preStart)*1000
 runs=[];ocrStart=time.perf_counter()
 for c in processed:
  prefix=private/f"ocr-{c['sequence']:02d}";cmd=[EXE,c['treatedFile'],str(prefix),*command[3:]];start=time.perf_counter()
  with pathlib.Path(str(prefix)+'.stderr').open('wb') as err:r=subprocess.run(cmd,stdout=subprocess.DEVNULL,stderr=err,check=False)
  ms=(time.perf_counter()-start)*1000;words=[];tsv=pathlib.Path(str(prefix)+'.tsv')
  if r.returncode==0:
   with tsv.open() as f:
    for row in csv.DictReader(f,delimiter='\t'):
     if row.get('text','').strip():
      n={k:int(row[k]) for k in ['left','top','width','height']};n.update(text=row['text'],confidence=float(row['conf']));n['originalBoxPx']=[c['sourceBoxPx'][0]+(n['left']-10)/4,c['sourceBoxPx'][1]+(n['top']-10)/4,n['width']/4,n['height']/4];words.append(n)
  runs.append({'sequence':c['sequence'],'GTid':c['GTid'],'command':cmd,'exit':r.returncode,'latencyMs':ms,'sourceSHA256':c['sha256'],'treatedSHA256':c['treatedSHA256'],'rawPrivatePath':str(tsv),'rawSHA256':sha(tsv) if tsv.exists() else None,'stderrSHA256':sha(str(prefix)+'.stderr'),'words':words})
 ocrMs=(time.perf_counter()-ocrStart)*1000
 # Scoring after all inference. No expected value appears in OCR inputs, filenames or commands.
 gtInput=next(i for i in p['inputs'] if i['gameId']=='catan');assert sha(gtInput['GTPrivatePath'])==gtInput['GTSHA256'];gt=json.loads(pathlib.Path(gtInput['GTPrivatePath']).read_text());answers={t['id']:t['number'] for t in gt['tiles'] if t['number'] is not None};counts=collections.Counter();rows=[]
 for run in runs:
  numeric=[n for n in run['words'] if re.fullmatch(r'[0-9]+',n['text'].strip())];status='missing' if not numeric else 'ambiguous' if len(numeric)>1 else 'correct' if numeric[0]['text'].strip()==str(answers[run['GTid']]) else 'wrong';counts[status]+=1;rows.append({**run,'expected':answers[run['GTid']],'status':status})
 detail=private/'evaluation-private.json';detail.write_text(json.dumps(rows,indent=2));assert sha(oldplan)==b['planSHA256']
 for c in p['crops']:assert sha(c['file'])==c['sha256']
 result={'schema':'oracle-digit-diagnostic-v1','label':plan['scope'],'status':'COMPLETED','baseline':{'correct':2,'total':18,'reportSHA256':sha(baseline)},'fixedSettings':plan['preprocessing'],'commandShape':command,'settingsFrozenBeforeInference':True,'GT':{'sha256':gtInput['GTSHA256'],'denominator':18,'unchanged':True},'counts':{k:counts[k] for k in ['correct','wrong','missing','ambiguous']},'timing':{'preprocessingMs':preMs,'ocrWallMs':ocrMs,'ocrProcessSumMs':sum(r['latencyMs'] for r in runs),'cache':'fresh CLI each; OS/cache uncontrolled; no cold/warm claim'},'privateDirectory':str(private),'planSHA256':planSHA,'scriptSHA256':sha(__file__),'detailSHA256':sha(detail),'runs':[{k:v for k,v in r.items() if k not in ['words','GTid']} for r in runs],'paidCalls':0,'processes':len(runs),'retry':0,'downloads':0,'productEdits':0,'allExit0':all(r['exit']==0 for r in runs),'recommendation':'Potential number-region helper only; automatic detection/orientation/terrain and holdout remain unverified.' if counts['correct']>2 else 'No improvement over baseline. Stop OCR tuning; this treatment is not a usable game reader.'}
 out=H/'ocr-digit-diagnostic.json';out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'report':str(out),'counts':result['counts'],'processes':len(runs),'allExit0':result['allExit0'],'timing':result['timing'],'paidCalls':0},ensure_ascii=False))
if __name__=='__main__':main()
