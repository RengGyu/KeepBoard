"""Fixed, zero-download real OCR diagnostic. Raw/GT/crops stay private.
Whole: eng/PSM11, one pass per original. Oracle Catan: fixed40px square,
rotation0, eng/PSM7/digits, one pass per18preGT number positions.
Never use oracle locations as an automatic detector or product constants.
"""
import pathlib,json,hashlib,tempfile,os,subprocess,time,csv,re,collections
from PIL import Image
H=pathlib.Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
EXE='/opt/homebrew/bin/tesseract'
def read_words(p):
 with p.open() as f:
  return [{**{k:int(row[k]) for k in ['left','top','width','height']},'confidence':float(row['conf']),'text':row['text']} for row in csv.DictReader(f,delimiter='\t') if row.get('text','').strip()]
def infer(image,prefix,psm,whitelist=False):
 tsv=pathlib.Path(str(prefix)+'.tsv');stderr=pathlib.Path(str(prefix)+'.stderr');tsv.touch(mode=0o600)
 cmd=[EXE,str(image),str(prefix),'-l','eng','--psm',str(psm)]
 if whitelist:cmd+=['-c','tessedit_char_whitelist=0123456789']
 cmd+=['tsv'];t0=time.perf_counter()
 with stderr.open('wb') as err:r=subprocess.run(cmd,stdout=subprocess.DEVNULL,stderr=err,check=False)
 elapsed=(time.perf_counter()-t0)*1000
 words=read_words(tsv) if r.returncode==0 else []
 return {'command':cmd,'exit':r.returncode,'latencyMs':elapsed,'rawTSV':str(tsv),'rawSHA256':sha(tsv),'stderrSHA256':sha(stderr),'words':words}
def main():
 os.umask(0o077);pre=json.loads((H/'sol-preflight.json').read_text());private=pathlib.Path(tempfile.mkdtemp(prefix='kb-lightweight-ocr-'));private.chmod(0o700)
 cases=pre['testInputs'];gts={}
 for i in cases:
  assert sha(i['imagePrivatePath'])==i['imageSHA256'] and sha(i['GTPrivatePath'])==i['GTSHA256'];gts[i['gameId']]=json.loads(pathlib.Path(i['GTPrivatePath']).read_text())
 c=next(i for i in cases if i['gameId']=='catan');photo=Image.open(c['imagePrivatePath']).convert('RGB');w,h=photo.size;tokens=[t for t in gts['catan']['tiles'] if t['number'] is not None]
 # Crop images and transforms are fixed before ANY OCR; expected values never enter CLI inputs.
 crops=[]
 for j,t in enumerate(tokens):
  cx,cy=t['centerPx'];left,top=int(round(cx))-20,int(round(cy))-20;box=(left,top,left+40,top+40);assert left>=0 and top>=0 and left+40<=w and top+40<=h
  f=private/f'oracle-{j+1:02d}.png';photo.crop(box).save(f);f.chmod(0o600);crops.append({'sequence':j+1,'GTid':t['id'],'file':str(f),'sourceBoxPx':list(box),'rotationDegrees':0,'sha256':sha(f)})
 plan={'scriptSHA256':sha(__file__),'toolSHA256':sha(EXE),'engTrainedDataSHA256':sha('/opt/homebrew/share/tessdata/eng.traineddata'),'wholeCommandShape':[EXE,'<original>','<private-output>','-l','eng','--psm','11','tsv'],'oracleCommandShape':[EXE,'<oracle-crop>','<private-output>','-l','eng','--psm','7','-c','tessedit_char_whitelist=0123456789','tsv'],'order':[i['gameId'] for i in cases],'repeatPerInput':1,'wholeNumericRule':'One TSV word matching ASCII [0-9]+ exactly, no O/0/I/1/leading-zero or punctuation correction; no confidence threshold.','catanSourceMatch':'Center of OCR word lies within exactly one fixed40px GT-center square; target must contain exactly one numeric word. Multiple words/targets ambiguous; no value-based matching.','oracleMatch':'Exactly one numeric TSV word in crop. Source box is word box translated by fixed crop origin, rotation0.','otherGTLimit':'Splendor card centers lack exact prestige-glyph regions and contain cost numbers, Rummikub only group centers lack tile positions; no value-only matching. Sagrada pips are not printed numerals. Mark numeral accuracy UNKNOWN/unsupported unless independently justified; do not invent GT.','crops':crops,'inputs':cases,'cachePolicy':'Every call is a fresh CLI process. First whole Catan is first process; OS/filesystem cache state uncontrolled. No paired cold/warm or tuning sweep.'}
 pf=private/'plan.json';pf.write_text(json.dumps(plan,ensure_ascii=False,indent=2));pf.chmod(0o600);claim=private/'execution.claim';claim.write_text(sha(pf));claim.chmod(0o600)
 whole=[];private_detail={};start=time.perf_counter()
 for i in cases:
  r=infer(i['imagePrivatePath'],private/(i['gameId']+'-whole'),11);private_detail[i['gameId']]=r
  nums=[x for x in r['words'] if re.fullmatch(r'[0-9]+',x['text'].strip())]
  out={'gameId':i['gameId'],'imageSHA256':i['imageSHA256'],'GTSHA256':i['GTSHA256'],'command':r['command'],'exit':r['exit'],'latencyMs':r['latencyMs'],'rawPrivatePath':r['rawTSV'],'rawSHA256':r['rawSHA256'],'stderrSHA256':r['stderrSHA256'],'wordObservations':len(r['words']),'numericWordObservations':len(nums)}
  if i['gameId']=='catan':
   hits=collections.defaultdict(list);unmatched=[];ambiguous=[]
   for n in nums:
    x,y=n['left']+n['width']/2,n['top']+n['height']/2;ids=[j for j,q in enumerate(crops) if q['sourceBoxPx'][0]<=x<=q['sourceBoxPx'][2] and q['sourceBoxPx'][1]<=y<=q['sourceBoxPx'][3]]
    if len(ids)==1:hits[ids[0]].append(n)
    elif not ids:unmatched.append(n)
    else:ambiguous.append(n)
   rows=[];counts=collections.Counter()
   for j,t in enumerate(tokens):
    ns=hits[j];status='missed' if not ns else 'multiple-numeric-words' if len(ns)>1 else 'correct' if ns[0]['text'].strip()==str(t['number']) else 'wrong'
    counts[status]+=1;rows.append({'GTid':t['id'],'expected':t['number'],'words':ns,'status':status})
   private_detail['catanWholeEvaluation']={'rows':rows,'unmatchedNumericWords':unmatched,'ambiguousNumericWords':ambiguous}
   out['printedNumeralEvaluation']={'GT':18,'counts':dict(counts),'unmatchedNumericWords':len(unmatched),'ambiguousNumericWords':len(ambiguous),'unmatchedIsNotAutomaticallyFalsePositive':'May be real printed text outside target, or OCR hallucination; no bag-of-values scoring.','sourceWindow':'fixed40px GT-center square; evaluation only, whole image input is unchanged'}
  else:out['printedNumeralEvaluation']={'status':'UNKNOWN' if i['gameId']!='sagrada' else 'UNSUPPORTED_PIP_COUNTING_NOT_OCR','reason':{'splendor':'Frozen GT has card/noble center and points but no exact printed prestige glyph regions; cost numerals confound whole-card matching. No inferred zero or value-based match.','rummikub':'Frozen GT has group centers/order but no individual tile numeral source positions; no closest-value/bag scoring.','sagrada':'17die pip values are spatial dots, not printed numeric glyphs; OCR numeral text is not dice recognition.'}[i['gameId']]}
  whole.append(out)
 oracle=[];oracle_counts=collections.Counter();oracleStart=time.perf_counter()
 for j,q in enumerate(crops):
  r=infer(q['file'],private/f'oracle-{j+1:02d}-ocr',7,True);nums=[x for x in r['words'] if re.fullmatch(r'[0-9]+',x['text'].strip())];status='missed' if not nums else 'multiple-numeric-words' if len(nums)>1 else 'correct' if nums[0]['text'].strip()==str(tokens[j]['number']) else 'wrong';oracle_counts[status]+=1
  for n in r['words']:n['sourceBoxPx']=[n['left']+q['sourceBoxPx'][0],n['top']+q['sourceBoxPx'][1],n['width'],n['height']]
  private_detail[f'oracle-{j+1:02d}']={**r,'status':status,'expected':tokens[j]['number'],'transform':q};oracle.append({'sequence':j+1,'exit':r['exit'],'latencyMs':r['latencyMs'],'rawPrivatePath':r['rawTSV'],'rawSHA256':r['rawSHA256'],'stderrSHA256':r['stderrSHA256']})
 oracleWall=(time.perf_counter()-oracleStart)*1000
 detail=private/'evaluation-private.json';detail.write_text(json.dumps(private_detail,ensure_ascii=False,indent=2));detail.chmod(0o600)
 for i in cases:assert sha(i['imagePrivatePath'])==i['imageSHA256'] and sha(i['GTPrivatePath'])==i['GTSHA256']
 result={'schema':'keepboard-zero-download-ocr-diagnostic-v1','status':'REAL_OCR_COMPLETED_NOT_PRODUCT_READER','settingsPinnedBeforeInference':True,'privateDirectory':str(private),'planSHA256':sha(pf),'scriptSHA256':sha(__file__),'tool':'Tesseract5.5.0','whole':whole,'oracleCatan':{'label':'ORACLE_ONLY_NOT_AUTOMATIC_DETECTOR_ACCURACY','GT':18,'cropCount':18,'fixedCropSizePx':[40,40],'rotationDegrees':0,'counts':dict(oracle_counts),'runs':oracle,'wallMs':oracleWall,'summedProcessMs':sum(x['latencyMs'] for x in oracle)},'totalWallMs':(time.perf_counter()-start)*1000,'cachePolicy':plan['cachePolicy'],'privateDetailSHA256':sha(detail),'cost':{'paidCalls':0,'newDownloadBytes':0,'dependencyInstalls':0,'currencyCharge':0,'localEnergyAndHardwareCost':'NOT MEASURED'},'limits':['Whole4 + one oracle pass18, no sweeps/repeats/GT updates.','OCR alone has no terrain/color/pip/card-bonus/object detector; no slots/owner/accepted-state inference.','Other games need glyph-level source correspondence or real object extraction; no manufactured GT.'],'checks':{'imageGTUnchanged':True,'allProcessExit0':all(x['exit']==0 for x in whole+oracle),'productEdits':0,'liveAPICalls':0,'privateFilesOnly':True}}
 (H/'ocr-diagnostic.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'report':str(H/'ocr-diagnostic.json'),'whole':[{'gameId':x['gameId'],'exit':x['exit'],'latencyMs':x['latencyMs'],'numericWords':x['numericWordObservations'],'evaluation':x['printedNumeralEvaluation']} for x in whole],'oracleCounts':dict(oracle_counts),'oracleWallMs':oracleWall,'allExit0':result['checks']['allProcessExit0'],'paidCalls':0},ensure_ascii=False))
if __name__=='__main__':main()
