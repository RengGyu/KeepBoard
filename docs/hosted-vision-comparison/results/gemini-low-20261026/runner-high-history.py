"""Standalone hosted OCR/object comparison. Default is offline; no product imports."""
import argparse
import base64
import hashlib
import json
import math
import os
from pathlib import Path
import re
import stat
import struct
import time
import urllib.error
import urllib.request

REPO=Path(__file__).resolve().parents[2]
MODELS={'gemini':'gemini-3.8-flash','florence':'florence-2-base'}
ENDPOINTS={'gemini':'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
           'florence':'https://serverless.roboflow.com/infer/lmm'}
TASKS={'ocr-with-region':'<OCR_WITH_REGION>','component-location':'<OD>'}
KEY_NAMES={'gemini':'GEMINI_API_KEY','florence':'ROBOFLOW_API_KEY'}
KEY_TOKEN=r'[A-Za-z0-9._~-]{1,1024}'
DEFAULT_CREDENTIAL_FILE=Path.home()/'.config/keepboard-hosted-vision/credentials.json'
PROMPTS={
 'ocr-with-region':'Read all separately visible printed text in the TARGET image, including numbers. Return literal text and a quadrilateral for each visible text region. Do not restrict to game tokens or infer missing characters, quantities, owners or game state. Use text:null for a localized but unreadable region. Preserve separate repeated regions and exact digit strings. Only output items from TARGET, not reference images.',
 'component-location':'Locate separately visible physical objects in the TARGET image and give a short literal visual category label for each, or label:null when unknown. Do not infer hidden items, owners, game rules, inventory or state. Do not invent game-specific identities or treat printed digits as quantities. Only output items from TARGET, not reference images.'}
GEOMETRY=' Each quad_1000 is [x1,y1,x2,y2,x3,y3,x4,y4], four boundary vertices in clockwise order, relative TARGET coordinates 0..1000. Return only {"items":[...]}; an empty array is allowed.'


def sha(value):
    return hashlib.sha256(value).hexdigest()


def encoded(value):
    return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False).encode()


def strict_json(data):
    def pairs(values):
        result={}
        for key,value in values:
            if key in result:raise ValueError('Duplicate JSON key')
            result[key]=value
        return result
    return json.loads(data,object_pairs_hook=pairs,parse_constant=lambda _:(_ for _ in ()).throw(ValueError('Non-finite JSON')))


def model_contracts():
    return dict(MODELS)


def fields(value,required,optional=()):
    if not isinstance(value,dict) or set(value)-set(required)-set(optional) or set(required)-set(value):
        raise ValueError('Unsupported manifest/response fields')


def number(value):
    return type(value) in (int,float) and math.isfinite(value)


def private_path(path):
    path=Path(path).expanduser()
    if path.is_symlink() or '.keepboard' in path.parts or path.resolve().is_relative_to(REPO):
        raise ValueError('Private artifacts/credentials must be outside repository and .keepboard')
    return path


def write_private(path,value):
    data=encoded(value) if not isinstance(value,bytes) else value
    fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'wb') as stream:stream.write(data)


def read_asset(base,description):
    path=(base/description['path']).expanduser().resolve()
    if '.keepboard' in path.parts or path.name.startswith('.env'):
        raise ValueError('Private configuration is not benchmark input')
    if path.stat().st_size>10_000_000:raise ValueError('Input exceeds inline benchmark size limit')
    data=path.read_bytes()
    if sha(data)!=description['sha256']:raise ValueError('Input SHA mismatch')
    return data


def image_dimensions(data,mime):
    if mime=='image/png' and data[:8]==b'\x89PNG\r\n\x1a\n' and data[12:16]==b'IHDR' and len(data)>=24:
        return struct.unpack('>II',data[16:24])
    if mime=='image/jpeg' and data[:2]==b'\xff\xd8':
        offset=2
        while offset+4<=len(data):
            if data[offset]!=255:raise ValueError('Malformed JPEG marker')
            while offset<len(data) and data[offset]==255:offset+=1
            marker=data[offset];offset+=1
            if marker in (0xd8,0xd9) or 0xd0<=marker<=0xd7:continue
            size=int.from_bytes(data[offset:offset+2],'big')
            if size<2 or offset+size>len(data):raise ValueError('Malformed JPEG segment')
            if marker in (0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf):
                if size<7:raise ValueError('Malformed JPEG dimensions')
                height,width=struct.unpack('>HH',data[offset+3:offset+7]);return width,height
            if marker==0xda:break
            offset+=size
    raise ValueError('Only intact PNG/JPEG header dimensions are supported; no resizing')


def image_asset(base,description,main=False):
    fields(description,['path','sha256','width','height','mimeType','approvedForHosted'],['id','gameId'] if main else [])
    if type(description['approvedForHosted']) is not bool:raise ValueError('Image approval must be explicit boolean')
    dimensions=(description['width'],description['height'])
    if any(type(x) is not int or x<1 for x in dimensions):raise ValueError('Invalid dimensions')
    data=read_asset(base,description)
    if image_dimensions(data,description['mimeType'])!=dimensions:raise ValueError('Image dimensions mismatch')
    return data


def build_plan(manifest_path):
    manifest_path=Path(manifest_path).resolve();raw=manifest_path.read_bytes();manifest=strict_json(raw)
    fields(manifest,['version','images','runs'],['contexts','maxCalls'])
    if manifest['version']!='hosted-vision-benchmark-v1':raise ValueError('Unsupported manifest version')
    limit=manifest.get('maxCalls',6)
    if type(limit) is not int or not 1<=limit<=6:raise ValueError('Maximum six calls; no silent truncation')
    def indexed(rows):
        if not isinstance(rows,list):raise ValueError('Expected manifest array')
        result={}
        for row in rows:
            if not isinstance(row,dict) or not re.fullmatch(r'[A-Za-z0-9_-]{1,100}',row.get('id','')) or row['id'] in result:raise ValueError('Invalid or duplicate manifest ID')
            result[row['id']]=row
        return result
    images=indexed(manifest['images']);contexts=indexed(manifest.get('contexts',[]));indexed(manifest['runs'])
    base=manifest_path.parent
    # Every declared source is checked offline, even when it is not selected for upload.
    data={key:image_asset(base,value,True) for key,value in images.items()}
    for ctx in contexts.values():fields(ctx,['id','gameId'],['definitions','rules','references'])
    plan={'version':'hosted-vision-plan-v1','manifestPath':str(manifest_path),'manifestSHA256':sha(raw),
          'runnerSHA256':sha(Path(__file__).read_bytes()),'maxCalls':limit,'automaticRetries':0,'concurrency':1,
          'models':model_contracts(),'runs':[],'blockers':[],
          'unsupported':['whole-state reconstruction','owner inference','rule adjudication'],
          'billing':'Provider usage and estimates only; actual charges/account tier UNKNOWN before execution'}
    requests=[]
    for run in manifest['runs']:
        fields(run,['id','imageId','provider','condition'],['contextId','task'])
        provider=run['provider'];task=run.get('task','ocr-with-region');condition=run['condition']
        if provider not in MODELS or task not in TASKS or condition not in ('photos-only','game-context') or run['imageId'] not in images:raise ValueError('Unsupported provider/task/condition/image')
        img=images[run['imageId']];row={'id':run['id'],'imageId':run['imageId'],'gameId':img['gameId'],'provider':provider,'task':task,'condition':condition,'model':MODELS[provider],'inputSHA256':img['sha256']}
        if condition=='photos-only' and run.get('contextId'):raise ValueError('Photos-only cannot silently include context')
        ctx=contexts.get(run.get('contextId')) if condition=='game-context' else None
        if condition=='game-context' and (not ctx or ctx['gameId']!=img['gameId']):raise ValueError('Matching game context required')
        if provider=='florence' and condition=='game-context':
            row.update(status='N/A_UNSUPPORTED_CONTEXT',reason='Florence task tokens do not accept general game rules/references');plan['runs'].append(row);continue
        if not img['approvedForHosted']:plan['blockers'].append(run['id']+': image approvedForHosted=false')
        prompt=PROMPTS[task]+GEOMETRY
        parts=[{'text':prompt+'\nTARGET image follows:'},{'inlineData':{'mimeType':img['mimeType'],'data':base64.b64encode(data[run['imageId']]).decode()}}]
        context_pins=[]
        if ctx:
            for name in ['definitions','rules']:
                if name not in ctx:continue
                fields(ctx[name],['path','sha256']);text=read_asset(base,ctx[name])
                if len(text)>200_000:raise ValueError('Use a selected context excerpt, not a full corpus')
                parts.append({'text':'CONTEXT '+name+' (vocabulary only, never infer unseen state):\n'+text.decode('utf8')})
                context_pins.append({'kind':name,'sha256':sha(text)})
            refs=ctx.get('references',[])
            if not isinstance(refs,list) or len(refs)>4:raise ValueError('Maximum four explicit visual references')
            for i,ref in enumerate(refs):
                pixels=image_asset(base,ref)
                if not ref['approvedForHosted']:plan['blockers'].append(run['id']+': reference '+str(i)+' approvedForHosted=false')
                parts.extend([{'text':'REFERENCE image; not a detection target.'},{'inlineData':{'mimeType':ref['mimeType'],'data':base64.b64encode(pixels).decode()}}])
                context_pins.append({'kind':'reference','sha256':sha(pixels)})
            if not context_pins:raise ValueError('Context condition needs actual selected content')
        field='text' if task=='ocr-with-region' else 'label'
        schema={'type':'object','properties':{'items':{'type':'array','items':{'type':'object','properties':{field:{'type':['string','null']},'quad_1000':{'type':'array','items':{'type':'number','minimum':0,'maximum':1000},'minItems':8,'maxItems':8}},'required':[field,'quad_1000'],'additionalProperties':False}}},'required':['items'],'additionalProperties':False}
        if provider=='gemini':
            body={'contents':[{'role':'user','parts':parts}],'generationConfig':{'candidateCount':1,'maxOutputTokens':8192,'thinkingConfig':{'thinkingLevel':'HIGH'},'mediaResolution':'MEDIA_RESOLUTION_HIGH','responseFormat':{'text':{'mimeType':'APPLICATION_JSON','schema':schema}}}}
        else:body={'image':{'type':'base64','value':base64.b64encode(data[run['imageId']]).decode()},'model_id':MODELS[provider],'prompt':TASKS[task]}
        payload=encoded(body)
        if len(payload)>18_000_000:raise ValueError('Inline request exceeds18MB benchmark limit; no implicit upload API')
        row.update(status='PREPARED',contextSHA256=sha(encoded(context_pins)) if ctx else None,promptSHA256=sha((prompt if provider=='gemini' else TASKS[task]).encode()),bodySHA256=sha(payload),endpoint=ENDPOINTS[provider],width=img['width'],height=img['height'])
        row['requestSHA256']=sha(encoded({'endpoint':row['endpoint'],'model':row['model'],'bodySHA256':row['bodySHA256']}))
        plan['runs'].append(row);requests.append({'row':row,'endpoint':row['endpoint'],'body':body})
    plan['plannedCalls']=len(requests)
    if not requests or len(requests)>limit:raise ValueError('Select1..maxCalls explicit runs; never truncate')
    plan['planSHA256']=sha(encoded(plan))
    return plan,requests


def prepare(manifest_path):
    return build_plan(manifest_path)[0]


def polygon(quad,width,height):
    if not isinstance(quad,list) or len(quad)!=8 or not all(number(x) for x in quad):raise ValueError('Invalid quadrilateral')
    points=[{'x':quad[i]/width,'y':quad[i+1]/height} for i in range(0,8,2)]
    if any(not 0<=p[k]<=1 for p in points for k in ('x','y')):raise ValueError('Out-of-bounds coordinates; no clamping or guessed units')
    cross=[]
    for i in range(4):
        a,c,d=points[i],points[(i+1)%4],points[(i+2)%4]
        cross.append((c['x']-a['x'])*(d['y']-c['y'])-(c['y']-a['y'])*(d['x']-c['x']))
    if not (all(x>0 for x in cross) or all(x<0 for x in cross)):raise ValueError('Degenerate/self-crossing quad')
    x=min(p['x'] for p in points);y=min(p['y'] for p in points)
    return points,{'x':x,'y':y,'width':max(p['x'] for p in points)-x,'height':max(p['y'] for p in points)-y}


def parse_response(provider,task,response,width,height):
    if provider not in MODELS or task not in TASKS or not isinstance(response,dict) or 'error' in response:raise ValueError('Unsupported provider response')
    field='text' if task=='ocr-with-region' else 'label'
    if provider=='gemini':
        candidates=response.get('candidates',[])
        if response.get('promptFeedback',{}).get('blockReason') or len(candidates)!=1 or candidates[0].get('finishReason')!='STOP':raise ValueError('Gemini blocked, truncated, or unsupported completion')
        parts=candidates[0].get('content',{}).get('parts',[])
        if not parts or any('text' not in p or p.get('thought') or set(p)-{'text','thought','thoughtSignature'} for p in parts):raise ValueError('Unsupported Gemini content part')
        body=strict_json(''.join(p['text'] for p in parts));fields(body,['items'])
        if not isinstance(body['items'],list):raise ValueError('Unsupported items')
        items=[]
        for item in body['items']:
            fields(item,[field,'quad_1000']);items.append((item[field],item['quad_1000'],1000,1000))
        completion='STOP'
    else:
        if response.get('truncated') is True or response.get('finish_reason') in ('length','max_tokens','truncated'):raise ValueError('Florence truncated')
        body=response.get('response')
        if not isinstance(body,dict) or set(body)!={TASKS[task]}:raise ValueError('Unsupported Florence response/task; raw preserved')
        body=body[TASKS[task]];key='quad_boxes' if task=='ocr-with-region' else 'bboxes';fields(body,[key,'labels'])
        boxes,labels=body[key],body['labels']
        if not isinstance(boxes,list) or not isinstance(labels,list) or len(boxes)!=len(labels):raise ValueError('Florence box/label mismatch')
        if isinstance(response.get('image'),dict) and any(response['image'].get(k)!=v for k,v in [('width',width),('height',height)]):raise ValueError('Florence reported image dimensions differ from input')
        items=[]
        for label,box in zip(labels,boxes):
            if task=='component-location':
                if not isinstance(box,list) or len(box)!=4 or not all(number(x) for x in box) or box[0]>=box[2] or box[1]>=box[3]:raise ValueError('Invalid Florence xyxy box')
                box=[box[0],box[1],box[2],box[1],box[2],box[3],box[0],box[3]]
            items.append((label,box,width,height))
        # shortcut: native LMM response has no documented finish-token status; never assert completeness.
        completion='UNKNOWN_NATIVE_FINISH_NOT_EXPOSED'
    if len(items)>2000:raise ValueError('Unsupported response item count')
    observations=[]
    for i,(literal,quad,w,h) in enumerate(items):
        if literal is not None and (not isinstance(literal,str) or len(literal)>20000):raise ValueError('Unsupported literal value')
        points,box=polygon(quad,w,h)
        observations.append({'ref':'item-'+str(i+1),'rawIndex':i,'task':task,'text':literal if field=='text' else None,'label':literal if field=='label' else None,'polygon':points,'bbox':box})
    return {'task':task,'observations':observations,'completion':completion,'scope':'literal visible regions; no whole-state/rule claim'}


def usage_and_cost(provider,response,wall_ms):
    out={'billedUSD':None,'billedCredits':None,'estimatedUSD':None,'estimatedCredits':None,'wallMs':wall_ms}
    if provider=='gemini':
        usage=response.get('usageMetadata',{});counts={k:v for k,v in usage.items() if k in ('promptTokenCount','cachedContentTokenCount','candidatesTokenCount','thoughtsTokenCount','totalTokenCount') and type(v) is int and v>=0}
        out['providerUsage']=counts
        if all(k in counts for k in ['promptTokenCount','candidatesTokenCount']):
            out['estimatedUSD']=(counts['promptTokenCount']*.75+(counts['candidatesTokenCount']+counts.get('thoughtsTokenCount',0))*3.75)/1_000_000
        out['estimateBasis']='2026-10-26 standard paid list rates USD0.75/M input,3.75/M output incl thinking; account tier/cache/actual invoice not known'
    else:
        seconds=response.get('time');out['providerProcessingSeconds']=seconds if number(seconds) and seconds>=0 else None
        if out['providerProcessingSeconds'] is not None:out['estimatedCredits']=seconds/500
        out['estimateBasis']='provider processing time/500 only when supplied; billed execution duration and credit dollar value UNKNOWN; wall time is not billing'
    return out


def extract_gemini(text):
    text=text.strip().lstrip('\ufeff');kind='plaintext'
    if text.startswith('{'):
        body=strict_json(text)
        if not isinstance(body,dict) or len(body)!=1 or next(iter(body)) not in ('GEMINI_API_KEY','api_key','apiKey'):raise ValueError('Expected one explicit Gemini credential')
        value=next(iter(body.values()));kind='json-single-key'
    else:
        match=re.fullmatch(r'([^:=\n]+)\s*[:=\n]\s*([^\n]+)',text)
        value=text
        if match:
            label=re.sub(r'[ _-]','',match.group(1)).upper()
            if label not in ('GEMINI','GEMINIKEY','GEMINIAPI','GEMINIAPIKEY','GOOGLEAPIKEY'):raise ValueError('Unsupported explicit credential label')
            value=match.group(2).strip();kind='named-single-key'
        if len(value)>1 and value[:1] in ('\"',"'",'`') and value[-1:]==value[:1]:value=value[1:-1]
    if not isinstance(value,str) or not re.fullmatch(KEY_TOKEN,value):raise ValueError('Unsupported complete credential token; no substring extraction')
    return value,kind


def credential_file(path,restrict=True):
    path=private_path(path)
    info=path.stat()
    if not stat.S_ISREG(info.st_mode) or info.st_uid!=os.getuid() or info.st_size>16384 or restrict and stat.S_IMODE(info.st_mode)&0o077:raise ValueError('Credential file must be owned regular0600/0400 file')
    return path.read_text()


def load_credentials(providers,credential_path=None,gemini_key_file=None,roboflow_key_file=None):
    values={}
    if credential_path:
        body=strict_json(credential_file(credential_path));fields(body,[],list(KEY_NAMES.values()))
        values.update(body)
    if gemini_key_file:
        # Explicit user-supplied attachment may retain normal0644 upload permissions; read only.
        values['GEMINI_API_KEY']=extract_gemini(credential_file(gemini_key_file,restrict=False))[0]
    if roboflow_key_file:
        values['ROBOFLOW_API_KEY']=credential_file(roboflow_key_file,restrict=False).strip()
    result={}
    for provider in providers:
        value=values.get(KEY_NAMES[provider]) or os.environ.get(KEY_NAMES[provider])
        if not isinstance(value,str) or not re.fullmatch(KEY_TOKEN,value):raise ValueError('Missing/invalid '+KEY_NAMES[provider]+'; no request sent')
        result[provider]=value
    return result


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None


def send(provider,endpoint,body,key):
    if endpoint!=ENDPOINTS[provider]:raise ValueError('Unapproved endpoint')
    headers={'Content-Type':'application/json'}
    headers.update({'x-goog-api-key':key} if provider=='gemini' else {'Authorization':'Bearer '+key})
    req=urllib.request.Request(endpoint,data=encoded(body),headers=headers,method='POST')
    opener=urllib.request.build_opener(NoRedirect())
    try:
        with opener.open(req,timeout=120) as response:return response.status,response.read(10_000_001)
    except urllib.error.HTTPError as error:return error.code,error.read(10_000_001)


def execute(manifest_path,pinned_plan,out,approved_sha,credential_path=None,gemini_key_file=None,transport=send,roboflow_key_file=None):
    plan,requests=build_plan(manifest_path)
    if approved_sha!=plan['planSHA256'] or plan!=pinned_plan:raise ValueError('Manifest/input/model/context/request/runner pin changed')
    if plan['blockers']:raise ValueError('Upload eligibility blockers; inspect offline plan')
    keys=load_credentials({r['row']['provider'] for r in requests},credential_path,gemini_key_file,roboflow_key_file)
    out=private_path(out);out.mkdir(mode=0o700,parents=True,exist_ok=True)
    if out.stat().st_mode&0o077:raise ValueError('Result directory must be0700')
    write_private(out/'execute.claim.json',{'planSHA256':approved_sha,'maxCalls':plan['maxCalls'],'retry':0,'startedUnix':time.time()})
    report={'status':'COMPLETED','planSHA256':approved_sha,'attempts':0,'retry':0,'results':[]}
    for request in requests:
        row=request['row'];provider=row['provider'];started=time.monotonic()
        write_private(out/(row['id']+'.attempt.json'),{'requestSHA256':row['requestSHA256'],'bodySHA256':row['bodySHA256'],'inputSHA256':row['inputSHA256'],'startedUnix':time.time()})
        report['attempts']+=1
        result={'id':row['id'],'provider':provider,'task':row['task'],'condition':row['condition']}
        try:
            status,raw=transport(provider,request['endpoint'],request['body'],keys[provider]);wall_ms=(time.monotonic()-started)*1000
            scrubbed=raw
            for secret in keys.values():scrubbed=scrubbed.replace(secret.encode(),b'[REDACTED_CREDENTIAL]')
            write_private(out/(row['id']+'.response.json'),scrubbed)
            result.update(httpStatus=status,rawResponseSHA256=sha(raw),storedResponseSHA256=sha(scrubbed),credentialEchoRedacted=raw!=scrubbed,wallMs=wall_ms)
            if len(raw)>10_000_000:raise ValueError('Response too large; stored prefix is incomplete')
            if status!=200:raise ValueError('Provider HTTP failure; no retry')
            response=strict_json(scrubbed)
            normalized=parse_response(provider,row['task'],response,row['width'],row['height'])
            write_private(out/(row['id']+'.observations.json'),normalized)
            result.update(status='PARSED',observationCount=len(normalized['observations']),completion=normalized['completion'],usageAndCost=usage_and_cost(provider,response,wall_ms),resolvedModel=response.get('modelVersion') if provider=='gemini' else None)
        except Exception as error:
            result.update(status='FAILED',errorType=type(error).__name__,reason='Request/response failed validation; inspect private raw if present. No repair or retry.')
            report['status']='STOPPED'
        report['results'].append(result)
        if result['status']=='FAILED':break
    write_private(out/'result.json',report)
    return report


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest',type=Path,required=True)
    modes=parser.add_mutually_exclusive_group();modes.add_argument('--check',action='store_true');modes.add_argument('--prepare',action='store_true');modes.add_argument('--execute',action='store_true')
    parser.add_argument('--out',type=Path);parser.add_argument('--approved-plan-sha');parser.add_argument('--credentials-file',type=Path);parser.add_argument('--gemini-key-file',type=Path)
    parser.add_argument('--roboflow-key-file',type=Path)
    args=parser.parse_args();plan=prepare(args.manifest)
    if args.execute:
        if not args.out or not args.approved_plan_sha:parser.error('--execute requires --out and --approved-plan-sha')
        pinned=strict_json((args.out/'plan.json').read_bytes())
        report=execute(args.manifest,pinned,args.out,args.approved_plan_sha,args.credentials_file,args.gemini_key_file,roboflow_key_file=args.roboflow_key_file)
        print(json.dumps({'status':report['status'],'attempts':report['attempts'],'resultsDirectory':str(args.out)}));return 0 if report['status']=='COMPLETED' else 1
    if args.prepare:
        if not args.out:parser.error('--prepare requires --out')
        out=private_path(args.out);out.mkdir(mode=0o700,parents=True,exist_ok=False)
        write_private(out/'plan.json',plan)
    print(json.dumps({'status':'OFFLINE_PREPARED','planSHA256':plan['planSHA256'],'plannedCalls':plan['plannedCalls'],'blockers':plan['blockers'],'networkCalls':0,'credentialReads':0}))
    return 0


if __name__=='__main__':
    try:raise SystemExit(main())
    except Exception as error:
        print(json.dumps({'status':'FAILED_NO_AUTOMATIC_RETRY','errorType':type(error).__name__,'reason':str(error) if isinstance(error,ValueError) else 'Inspect local file permissions and offline input metadata.'}));raise SystemExit(1)
