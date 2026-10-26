"""Bounded Catan game-literal comparison; offline unless --execute is explicit."""
import argparse
import base64
import json
import math
import os
from pathlib import Path
import re
import time
import urllib.error
import urllib.request
import runner as common

MODELS={'gemini':'gemini-3.8-flash','deepseek':'deepseek-flash'}
ENDPOINTS={'gemini':common.ENDPOINTS['gemini'],'deepseek':'https://api.deepseek.com/responses'}
TERRAINS=['forest','pasture','fields','hills','mountains','desert']
PROMPT=('Inspect the TARGET Catan game photo. Return each separately visible terrain hex, physical printed number disc, and robber figurine. '
        'Use kind terrain, number-token, or robber. Box the visible physical hex/disc/figurine boundary, NOT just a printed glyph and NOT the whole board. '
        'Read only visible terrain type and literal printed number; keep uncertain attributes null. '
        'Do not infer inventory, hidden contents, expected object counts, board slots, owners, topology, rules or missing values. '
        'Do not report buildings, roads, harbors, cards, players or off-board supplies. '
        'box_1000 is [ymin,xmin,ymax,xmax] in TARGET coordinates 0..1000, or null when localization is unknown. '
        'terrainType uses forest/pasture/fields/hills/mountains/desert, only for terrain; number is the printed integer only for number-token. '
        'All nonapplicable attributes must be null. Return only JSON {"items":[...]}; empty items is valid.')
SCHEMA={'type':'object','properties':{'items':{'type':'array','items':{'type':'object','properties':{
    'kind':{'type':'string','enum':['terrain','number-token','robber']},
    'box_1000':{'type':['array','null'],'items':{'type':'number','minimum':0,'maximum':1000},'minItems':4,'maxItems':4},
    'attributes':{'type':'object','properties':{'terrainType':{'type':['string','null'],'enum':TERRAINS+[None]},
        'number':{'type':['integer','null'],'enum':[2,3,4,5,6,8,9,10,11,12,None]}},'required':['terrainType','number'],'additionalProperties':False}},
    'required':['kind','box_1000','attributes'],'additionalProperties':False}}},'required':['items'],'additionalProperties':False}
ALIASES={'terrain':'terrain','hex':'terrain','terrain-hex':'terrain','tile':'terrain','number':'number-token','number-token':'number-token','number-disc':'number-token','robber':'robber'}
TERRAIN_ALIASES={'wood':'forest','lumber':'forest','forest':'forest','sheep':'pasture','wool':'pasture','pasture':'pasture','grain':'fields','wheat':'fields','field':'fields','fields':'fields','brick':'hills','clay':'hills','hills':'hills','ore':'mountains','rock':'mountains','mountain':'mountains','mountains':'mountains','desert':'desert'}
EVALUATION={'version':'physical-iou-v1','minimumIoU':0.25,'matching':'geometry-only reciprocal unique maximum IoU without kind filtering; ties ambiguous; kind and attributes scored after matching','centerError':'Euclidean pixels between physical bbox centers','notServicePassThreshold':True}


def body(provider,image,mime,context=None):
    text=PROMPT+('\nFIELD CONTEXT (vocabulary only, never fill hidden values):\n'+context if context else '')
    data=base64.b64encode(image).decode()
    if provider=='gemini':
        return {'contents':[{'role':'user','parts':[{'text':text},{'inlineData':{'mimeType':mime,'data':data}}]}],
                'generationConfig':{'candidateCount':1,'maxOutputTokens':32768,'thinkingConfig':{'thinkingLevel':'LOW'},'mediaResolution':'MEDIA_RESOLUTION_HIGH','responseFormat':{'text':{'mimeType':'APPLICATION_JSON','schema':SCHEMA}}}}
    if provider=='deepseek':
        return {'model':MODELS[provider],'input':[{'role':'user','content':[{'type':'input_text','text':text},{'type':'input_image','image_url':'data:'+mime+';base64,'+data,'detail':'original'}]}],
                'reasoning':{'effort':'low'},'max_output_tokens':32768,'text':{'format':{'type':'json_schema','name':'catan_game_literals','strict':True,'schema':SCHEMA}}}
    raise ValueError('Unsupported provider')


def parse(provider,response):
    if 'error' in response and response['error'] is not None:raise ValueError('Provider error')
    if provider=='gemini':
        cs=response.get('candidates',[])
        if len(cs)!=1 or cs[0].get('finishReason')!='STOP' or response.get('promptFeedback',{}).get('blockReason'):raise ValueError('Gemini incomplete/blocked')
        parts=cs[0].get('content',{}).get('parts',[])
        if not parts or any('text' not in p or p.get('thought') for p in parts):raise ValueError('Unsupported content')
        text=''.join(p['text'] for p in parts)
    elif provider=='deepseek':
        if response.get('status')!='completed' or response.get('incomplete_details'):raise ValueError('DeepSeek incomplete/failed')
        texts=[]
        for item in response.get('output',[]):
            if item.get('type')=='reasoning':continue
            if item.get('type')!='message' or item.get('status')!='completed':raise ValueError('Unsupported DeepSeek output item')
            for part in item.get('content',[]):
                if part.get('type')!='output_text' or not isinstance(part.get('text'),str):raise ValueError('DeepSeek refusal/unsupported content')
                texts.append(part['text'])
        if not texts:raise ValueError('Missing DeepSeek output text')
        text=''.join(texts)
    else:raise ValueError('Unsupported provider')
    value=common.strict_json(text);common.fields(value,['items'])
    if not isinstance(value['items'],list) or len(value['items'])>500:raise ValueError('Invalid items envelope')
    out=[]
    for index,item in enumerate(value['items']):
        common.fields(item,['kind','box_1000','attributes']);kind=item['kind'];attrs=item['attributes'];common.fields(attrs,['terrainType','number'])
        if kind not in ('terrain','number-token','robber'):raise ValueError('Unknown component kind')
        terrain=attrs['terrainType'];number=attrs['number']
        if terrain is not None and terrain not in TERRAINS:raise ValueError('Invalid terrain')
        if number is not None and (type(number) is not int or number not in (2,3,4,5,6,8,9,10,11,12)):raise ValueError('Invalid number domain')
        if kind!='terrain' and terrain is not None or kind!='number-token' and number is not None:raise ValueError('Attribute/kind conflict')
        box=item['box_1000'];region=None
        if box is not None:
            if not isinstance(box,list) or len(box)!=4 or not all(common.number(x) and 0<=x<=1000 for x in box):raise ValueError('Invalid box coordinates')
            y,x,b,r=box
            if y>=b or x>=r:raise ValueError('Invalid physical box')
            region={'x':x/1000,'y':y/1000,'width':(r-x)/1000,'height':(b-y)/1000}
        out.append({'ref':'item-'+str(index+1),'rawIndex':index,'kind':kind,'attributes':attrs,'bbox':region})
    return out


def iou(a,b):
    area=lambda q:q['width']*q['height']
    overlap=max(0,min(a['x']+a['width'],b['x']+b['width'])-max(a['x'],b['x']))*max(0,min(a['y']+a['height'],b['y']+b['height'])-max(a['y'],b['y']))
    return overlap/(area(a)+area(b)-overlap) if overlap else 0


def load_targets(gt):
    source=gt.get('source',gt.get('photo'));w,h=source['width'],source['height'];targets=[]
    for obj in gt['objects']:
        kind=ALIASES.get(obj['componentId'])
        if kind is None:raise ValueError('Unmapped GT componentId')
        if obj.get('bboxPx') is not None:
            x,y,r,b=obj['bboxPx']
        else:
            points=obj['polygonPx'];x=min(p[0] for p in points);y=min(p[1] for p in points);r=max(p[0] for p in points);b=max(p[1] for p in points)
        if not (0<=x<r<=w and 0<=y<b<=h):raise ValueError('Invalid physical GT bounds')
        a=obj['attributes'];terrain=a.get('terrainType',a.get('terrain',a.get('variant')));number=a.get('number')
        if terrain is not None:
            if terrain not in TERRAIN_ALIASES:raise ValueError('Unmapped GT terrain')
            terrain=TERRAIN_ALIASES[terrain]
        targets.append({'id':obj['id'],'kind':kind,'bbox':{'x':x/w,'y':y/h,'width':(r-x)/w,'height':(b-y)/h},'attributes':{'terrainType':terrain,'number':number},'readability':obj.get('readability'),'uncertainty':obj.get('uncertainty')})
    return targets


def evaluate(observations,gt):
    source=gt.get('source',gt.get('photo'));targets=load_targets(gt);counts={k:0 for k in ['correct','wrong','unknown','missing','ambiguous']};matches=[]
    matrix=[[iou(t['bbox'],o['bbox']) if o['bbox'] else 0 for o in observations] for t in targets]
    def best(values):
        mx=max(values,default=0)
        return [i for i,v in enumerate(values) if v>=EVALUATION['minimumIoU'] and abs(v-mx)<1e-10]
    tb=[best(row) for row in matrix];ob=[best([row[i] for row in matrix]) for i in range(len(observations))];used=set()
    for j,t in enumerate(targets):
        ids=tb[j];status='missing' if not ids else 'ambiguous';detail={'targetId':t['id'],'kind':t['kind'],'status':status}
        if len(ids)==1 and ob[ids[0]]==[j]:
            i=ids[0];used.add(i);o=observations[i];field='terrainType' if t['kind']=='terrain' else 'number'
            known=t['attributes'][field] is not None if t['kind']!='robber' else True
            kind_correct=t['kind']==o['kind']
            status='wrong' if not kind_correct else ('unknown' if not known or t['kind']!='robber' and o['attributes'][field] is None else ('correct' if t['kind']=='robber' or o['attributes'][field]==t['attributes'][field] else 'wrong'))
            a,b=t['bbox'],o['bbox'];dx=(a['x']+a['width']/2-b['x']-b['width']/2)*source['width'];dy=(a['y']+a['height']/2-b['y']-b['height']/2)*source['height']
            detail.update(observationRef=o['ref'],iou=matrix[j][i],centerErrorPx=math.hypot(dx,dy),status=status,kindCorrect=kind_correct,attributeCorrect=None if not kind_correct or status=='unknown' else status=='correct',GTReadability=t['readability'],GTUncertainty=t['uncertainty'])
        counts[status]+=1;matches.append(detail)
    return {'policy':EVALUATION,'counts':counts,'denominator':len(targets),'matches':matches,'unmatchedObservationRefs':[o['ref'] for i,o in enumerate(observations) if i not in used],'unlocalized':sum(o['bbox'] is None for o in observations),'unmatchedAutomaticallyFalsePositive':False}


def claim_attempt(root,row):
    for i in range(1,7):
        path=Path(root)/('attempt-'+str(i)+'.json')
        try:common.write_private(path,{'row':row,'startedUnix':time.time()});return i
        except FileExistsError:continue
    raise ValueError('Fresh experiment maximum six attempts exhausted')


def build_plan(manifest_path,evaluation_contract=None):
    path=Path(manifest_path).resolve();manifest=common.strict_json(path.read_bytes())
    common.fields(manifest,['version','image','context','runs'])
    if manifest['version']!='game-vision-benchmark-v1':raise ValueError('Unsupported game manifest')
    image=manifest['image'];pixels=common.image_asset(path.parent,image)
    common.fields(manifest['context'],['path','sha256'])
    context_base=common.REPO if manifest['context']['path'].startswith('docs/') else path.parent
    context=common.read_asset(context_base,manifest['context']).decode('utf8')
    if len(context.encode())>12000:raise ValueError('Context must be compact model-safe vocabulary')
    runs=manifest['runs']
    if not isinstance(runs,list) or not 1<=len(runs)<=6:raise ValueError('Select1..6 runs; no truncation')
    requests=[];rows=[];ids=set()
    for run in runs:
        common.fields(run,['id','provider','context'])
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,80}',run['id']) or run['id'] in ids:raise ValueError('Invalid run ID')
        ids.add(run['id']);provider=run['provider']
        if provider not in MODELS or type(run['context']) is not bool:raise ValueError('Invalid provider/context')
        payload=body(provider,pixels,image['mimeType'],context if run['context'] else None)
        semantic=payload['contents'][0]['parts'][0]['text'] if provider=='gemini' else payload['input'][0]['content'][0]['text']
        # Byte-size proxy plus documented image maximum and reserved framing margin.
        # This is conservative planning, NOT a provider tokenizer/countTokens guarantee.
        proxy=len(semantic.encode())+len(common.encoded(SCHEMA))+(1120 if provider=='gemini' else 1024)+4096
        if proxy>32768:raise ValueError('Recalculate input planning envelope before sending')
        row={**run,'model':MODELS[provider],'documentedModelRevision':'DeepSeek-V4.1-Flash-1017' if provider=='deepseek' else 'gemini-3.8-flash stable',
             'endpoint':ENDPOINTS[provider],'sourceSHA256':image['sha256'],'width':image['width'],'height':image['height'],
             'semanticTextSHA256':common.sha(semantic.encode()),'schemaSHA256':common.sha(common.encoded(SCHEMA)),
             'contextSHA256':manifest['context']['sha256'] if run['context'] else None,'bodySHA256':common.sha(common.encoded(payload)),
             'inputPlanningByteProxy':proxy,'outputLimit':32768,'timeoutSeconds':180}
        row['requestSHA256']=common.sha(common.encoded(row));rows.append(row);requests.append({'row':row,'body':payload})
    freeze=None
    if evaluation_contract:
        contract_path=Path(evaluation_contract).resolve();contract=common.strict_json(contract_path.read_bytes());ground=contract['groundTruth'];gt_path=common.private_path(ground['path']);gt_raw=gt_path.read_bytes()
        if common.sha(gt_raw)!=ground['sha256'] or contract['source']['sha256']!=image['sha256']:raise ValueError('Evaluation/source freeze mismatch')
        gt=common.strict_json(gt_raw);source=gt.get('photo',gt.get('source'))
        if source['sha256']!=image['sha256'] or (source['width'],source['height'])!=(image['width'],image['height']):raise ValueError('GT image identity mismatch')
        load_targets(gt)
        freeze={'contractPath':str(contract_path),'contractSHA256':common.sha(contract_path.read_bytes()),'privateGTPath':str(gt_path),'privateGTSHA256':ground['sha256'],
                'policyRuling':'Supervisor finalized geometry-only reciprocal unique maximum IoU >=0.25, no kind filtering; matched kind/attributes scored separately'}
    plan={'version':'game-vision-plan-v1','manifestPath':str(path),'manifestSHA256':common.sha(path.read_bytes()),
          'gameRunnerSHA256':common.sha(Path(__file__).read_bytes()),'baseRunnerSHA256':common.sha(Path(common.__file__).read_bytes()),
          'imageApprovedForHosted':image['approvedForHosted'],'task':'catan-game-literals-v1','runs':rows,'plannedCalls':len(rows),
          'maximumExperimentAttempts':6,'retry':0,'concurrency':1,'evaluationPolicy':EVALUATION,'evaluationFreeze':freeze,
          'planningWorstUSD':sum((32768*.75+32768*3.75)/1e6 if r['provider']=='gemini' else (32768*.3+32768*1.2)/1e6 for r in rows),
          'planningAllSixGeminiUSD':6*(32768*.75+32768*3.75)/1e6,'budgetUSD':1.70,
          'billingCaveat':'32768 input assumption backed by offline byte proxy/media max/margin, not API token count or actual bill; output cap includes reasoning',
          'D4':'NOT_RUN: no independently confirmed frame bound to selected source supplied','holdout':'NOT_RUN: no independent newly authorized photos supplied'}
    plan['planSHA256']=common.sha(common.encoded(plan));return plan,requests


def deepseek_key(path):
    text=common.credential_file(path,restrict=False).strip().lstrip('\ufeff')
    if text.startswith('{'):
        obj=common.strict_json(text);common.fields(obj,['DEEPSEEK_API_KEY']);text=obj['DEEPSEEK_API_KEY']
    elif re.match(r'^DEEPSEEK_API_KEY\s*[:=]',text):text=re.split(r'[:=]',text,maxsplit=1)[1].strip()
    if isinstance(text,str) and len(text)>1 and text[0] in ('"',"'") and text[-1]==text[0]:text=text[1:-1]
    if not isinstance(text,str) or not re.fullmatch(common.KEY_TOKEN,text):raise ValueError('Unsupported complete DeepSeek credential format')
    return text


def send(provider,payload,key):
    headers={'Content-Type':'application/json'}
    headers.update({'x-goog-api-key':key} if provider=='gemini' else {'Authorization':'Bearer '+key})
    request=urllib.request.Request(ENDPOINTS[provider],data=common.encoded(payload),headers=headers,method='POST')
    try:
        with urllib.request.build_opener(common.NoRedirect()).open(request,timeout=180) as response:return response.status,response.read(10_000_001)
    except urllib.error.HTTPError as error:return error.code,error.read(10_000_001)


def usage(provider,response):
    if provider=='gemini':return common.usage_and_cost(provider,response,0)
    u=response.get('usage',{});a=u.get('input_tokens');b=u.get('output_tokens')
    valid=type(a) is int and a>=0 and type(b) is int and b>=0
    return {'providerUsage':u,'estimatedUSD':(a*.3+b*1.2)/1e6 if valid else None,'billedUSD':None,
            'estimateBasis':'Peak cache-miss list rate0.3/M input,1.2/M output; may overestimate offpeak/cache hits; actual bill UNKNOWN'}


def literal_projection(items,source):
    # Only a lossless offline field projection. No ReaderIdentity or product job is fabricated.
    return [{'ref':x['ref'],'componentId':x['kind'],'source':source,'region':x['bbox'],
             'properties':{'variant':x['attributes']['terrainType']} if x['kind']=='terrain' else ({'number':x['attributes']['number']} if x['kind']=='number-token' else {}),
             'rawIndex':x['rawIndex'],'originalAttributes':x['attributes']} for x in items]


def execute(manifest_path,out,experiment,approved_sha,gemini_file=None,deepseek_file=None,evaluation_contract=None):
    plan,requests=build_plan(manifest_path,evaluation_contract);out=common.private_path(out);experiment=common.private_path(experiment)
    pinned=common.strict_json((out/'plan.json').read_bytes())
    if plan!=pinned or approved_sha!=plan['planSHA256'] or not plan['imageApprovedForHosted'] or not plan['evaluationFreeze']:raise ValueError('Plan/input/source/evaluation/eligibility drift')
    if out.stat().st_mode&0o077 or experiment.stat().st_mode&0o077:raise ValueError('Private directories must be0700')
    budget=common.strict_json((experiment/'budget.json').read_bytes())
    if budget!={'version':'game-vision-experiment-v1','maxAttempts':6,'budgetUSD':1.70}:raise ValueError('Experiment budget mismatch')
    providers={r['row']['provider'] for r in requests};keys={}
    if 'gemini' in providers:keys['gemini']=common.extract_gemini(common.credential_file(gemini_file,restrict=False))[0]
    if 'deepseek' in providers:keys['deepseek']=deepseek_key(deepseek_file)
    common.write_private(out/'execute.claim.json',{'planSHA256':approved_sha,'startedUnix':time.time(),'retry':0})
    common.write_private(experiment/'active.claim.json',{'planSHA256':approved_sha})
    report={'status':'COMPLETED','attempts':0,'retry':0,'planSHA256':approved_sha,'results':[]}
    try:
        existing=len(list(experiment.glob('attempt-*.json')))
        if existing+len(requests)>6:raise ValueError('Planned requests exceed remaining experiment budget')
        for request in requests:
            row=request['row'];provider=row['provider'];attempt=claim_attempt(experiment,row);report['attempts']+=1
            common.write_private(out/(row['id']+'.attempt.json'),{'aggregateAttempt':attempt,'row':row})
            result={'id':row['id'],'provider':provider,'aggregateAttempt':attempt};start=time.monotonic()
            try:
                # Rebuild bytes and recheck immediately before network transmission.
                if common.sha(common.encoded(request['body']))!=row['bodySHA256']:raise ValueError('Request body changed')
                status,raw=send(provider,request['body'],keys[provider]);result.update(httpStatus=status,wallMs=(time.monotonic()-start)*1000)
                stored=raw
                for value in keys.values():stored=stored.replace(value.encode(),b'[REDACTED_CREDENTIAL]')
                common.write_private(out/(row['id']+'.response.json'),stored);result.update(rawSHA256=common.sha(raw),storedSHA256=common.sha(stored),credentialEchoRedacted=stored!=raw)
                if len(raw)>10_000_000 or status!=200:raise ValueError('HTTP/response size failure')
                response=common.strict_json(stored);result.update(nativeFinish=[x.get('finishReason') for x in response.get('candidates',[])] if provider=='gemini' else response.get('status'),
                    resolvedModel=response.get('modelVersion') if provider=='gemini' else response.get('model'),usageAndCost=usage(provider,response))
                observations=parse(provider,response)
                common.write_private(out/(row['id']+'.observations.json'),observations)
                common.write_private(out/(row['id']+'.literal-projection.json'),literal_projection(observations,{'imageSHA256':row['sourceSHA256'],'requestSHA256':row['requestSHA256'],'provider':provider}))
                gt=common.strict_json(Path(plan['evaluationFreeze']['privateGTPath']).read_bytes())
                common.write_private(out/(row['id']+'.evaluation.json'),evaluate(observations,gt))
                result.update(status='PARSED',observationCount=len(observations))
            except Exception as error:
                result.update(status='FAILED',errorType=type(error).__name__,reason='HTTP/transport/schema/completion failure; no retry or repair');report['status']='STOPPED'
            report['results'].append(result)
            if report['status']=='STOPPED':break
        report['aggregateAttempts']=len(list(experiment.glob('attempt-*.json')));common.write_private(out/'result.json',report)
    finally:
        (experiment/'active.claim.json').unlink()
    return report


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--manifest',type=Path,required=True)
    modes=parser.add_mutually_exclusive_group();modes.add_argument('--check',action='store_true');modes.add_argument('--prepare',action='store_true');modes.add_argument('--execute',action='store_true')
    parser.add_argument('--out',type=Path);parser.add_argument('--experiment',type=Path);parser.add_argument('--approved-plan-sha');parser.add_argument('--gemini-key-file',type=Path);parser.add_argument('--deepseek-key-file',type=Path);parser.add_argument('--evaluation-contract',type=Path)
    args=parser.parse_args();plan,_=build_plan(args.manifest,args.evaluation_contract)
    if args.execute:
        if not args.out or not args.experiment or not args.approved_plan_sha:parser.error('execute requires out/experiment/approved-plan-sha')
        result=execute(args.manifest,args.out,args.experiment,args.approved_plan_sha,args.gemini_key_file,args.deepseek_key_file,args.evaluation_contract)
        print(json.dumps({'status':result['status'],'attempts':result['attempts'],'aggregateAttempts':result['aggregateAttempts']}));return 0 if result['status']=='COMPLETED' else 1
    if args.prepare:
        if not args.out or not args.experiment:parser.error('prepare requires out/experiment')
        out=common.private_path(args.out);out.mkdir(mode=0o700,parents=True,exist_ok=False);experiment=common.private_path(args.experiment);experiment.mkdir(mode=0o700,parents=True,exist_ok=True)
        budget={'version':'game-vision-experiment-v1','maxAttempts':6,'budgetUSD':1.70}
        if (experiment/'budget.json').exists():
            if common.strict_json((experiment/'budget.json').read_bytes())!=budget:raise ValueError('Existing experiment budget mismatch')
        else:common.write_private(experiment/'budget.json',budget)
        common.write_private(out/'plan.json',plan)
    print(json.dumps({'status':'OFFLINE_PREPARED','planSHA256':plan['planSHA256'],'plannedCalls':plan['plannedCalls'],'planningWorstUSD':plan['planningWorstUSD'],'networkCalls':0,'credentialReads':0}));return 0


if __name__=='__main__':
    try:raise SystemExit(main())
    except Exception as error:
        print(json.dumps({'status':'FAILED_NO_RETRY','errorType':type(error).__name__,'reason':str(error) if isinstance(error,ValueError) else 'Inspect bounded local metadata privately'}));raise SystemExit(1)
