"""Explicit nine-photo Gemini D1 batch. Reuses frozen game task, no product imports."""
import argparse
import json
from pathlib import Path
import time
import game_runner as game

common=game.common
MAX_ATTEMPTS=9


def claim_attempt(root,row):
    for i in range(1,MAX_ATTEMPTS+1):
        try:
            common.write_private(Path(root)/('attempt-'+str(i)+'.json'),{'row':row,'startedUnix':time.time()})
            return i
        except FileExistsError:continue
    raise ValueError('Nine-photo experiment hardcap reached; no tenth attempt')


def observable_value(obj):
    if 'valueScorable' in obj:
        if type(obj['valueScorable']) is not bool:raise ValueError('GT valueScorable must be boolean')
        return obj['valueScorable']
    # No guessed GT values: a frozen non-null value and an explicitly readable label are required.
    readable=obj.get('readability')
    if readable not in ('readable','legible','clear'):return False
    kind=game.ALIASES[obj['componentId']];attrs=obj['attributes']
    if kind=='robber':return attrs.get('kind')=='robber'
    if kind=='number-token':return attrs.get('number') is not None
    return attrs.get('terrainType',attrs.get('terrain',attrs.get('variant'))) is not None


def score(observations,gt):
    physical=game.evaluate(observations,gt);objects={x['id']:x for x in gt['objects']};groups={}
    for match in physical['matches']:
        obj=objects[match['targetId']];scorable=observable_value(obj)
        group=groups.setdefault(match['kind'],{'locationDenominator':0,'locationMatched':0,'kindCorrect':0,'valueDenominator':0,'valueCorrect':0,'valueWrong':0,'valueUnknown':0,'valueMissing':0,'valueAmbiguous':0,'GTUnobservableValues':0})
        group['locationDenominator']+=1;group['locationMatched']+='iou' in match;group['kindCorrect']+=match.get('kindCorrect') is True
        if scorable:
            group['valueDenominator']+=1;group[{'correct':'valueCorrect','wrong':'valueWrong','unknown':'valueUnknown','missing':'valueMissing','ambiguous':'valueAmbiguous'}[match['status']]]+=1
        else:group['GTUnobservableValues']+=1
        match['valueScorable']=scorable
        if not scorable:match['status']='GT_UNOBSERVABLE_VALUE_EXCLUDED'
    # The old helper's combined correctness count is intentionally not reused for unreadable GT.
    physical.pop('counts');physical['perKind']=groups
    physical['GTValuePolicy']='Frozen valueScorable; unobservable values excluded from value denominator only, retained for location; unknown is never correct'
    return physical


def build_plan(index_path,inventory_path):
    index_path=Path(index_path).resolve();index=common.strict_json(index_path.read_bytes());inventory_path=Path(inventory_path).resolve();inventory=common.strict_json(inventory_path.read_bytes())
    photos=index['images']
    if len(photos)!=9 or len(inventory)!=9:raise ValueError('Exactly nine frozen input rows required')
    requests=[];rows=[]
    for order,(entry,expected) in enumerate(zip(photos,inventory),1):
        if entry['order']!=order or expected['order']!=order:raise ValueError('Photo order changed')
        image=entry['image'];ground=entry['groundTruth']
        if image['sha256']!=expected['sha256']:raise ValueError('Approved source identity/order mismatch')
        image_path=(index_path.parent/image['path']).resolve();pixels=common.image_asset(index_path.parent,image)
        if not image['approvedForHosted']:raise ValueError('Upload not approved for selected photo')
        gt_path=common.private_path(ground['path']);gt_raw=gt_path.read_bytes()
        if common.sha(gt_raw)!=ground['sha256']:raise ValueError('Frozen per-photo GT mismatch')
        gt=common.strict_json(gt_raw);source=gt.get('photo',gt.get('source'))
        if source['sha256']!=image['sha256'] or (source['width'],source['height'])!=(image['width'],image['height']):raise ValueError('GT photo dimensions/identity mismatch')
        game.load_targets(gt)
        for obj in gt['objects']:observable_value(obj)
        payload=game.body('gemini',pixels,image['mimeType'],None)
        text=payload['contents'][0]['parts'][0]['text'];proxy=len(text.encode())+len(common.encoded(game.SCHEMA))+1120+4096
        if proxy>32768:raise ValueError('Input planning envelope requires review')
        row={'id':'photo-'+str(order).zfill(2),'order':order,'sourcePath':str(image_path),'sourceSHA256':image['sha256'],'width':image['width'],'height':image['height'],
             'GTPath':str(gt_path),'GTSHA256':ground['sha256'],'bodySHA256':common.sha(common.encoded(payload)),
             'semanticTextSHA256':common.sha(text.encode()),'schemaSHA256':common.sha(common.encoded(game.SCHEMA)),
             'model':game.MODELS['gemini'],'context':False,'inputPlanningByteProxy':proxy,'timeoutSeconds':180,'outputLimit':32768}
        row['requestSHA256']=common.sha(common.encoded(row));rows.append(row);requests.append({'row':row,'body':payload})
    plan={'version':'gemini-nine-d1-plan-v1','indexPath':str(index_path),'indexSHA256':common.sha(index_path.read_bytes()),'inventoryPath':str(inventory_path),'inventorySHA256':common.sha(inventory_path.read_bytes()),
          'nineRunnerSHA256':common.sha(Path(__file__).read_bytes()),'gameRunnerSHA256':common.sha(Path(game.__file__).read_bytes()),'baseRunnerSHA256':common.sha(Path(common.__file__).read_bytes()),
          'maximumAttempts':9,'plannedCalls':9,'retry':0,'concurrency':1,'runs':rows,'evaluationPolicy':game.EVALUATION,
          'valuePolicy':'per-object frozen valueScorable; unreadable/unknown excluded only from observable-value denominator; all visible targets retained for location',
          'planningWorstUSD':9*(32768*.75+32768*3.75)/1e6,'budgetUSD':1.70,'billingCaveat':'Input32768 planning assumption backed by text/schema byte proxy+documented media max+margin; not provider token-count or billing guarantee',
          'dependence':'Nine photos from same board/session sequence; not nine independent scenes'}
    plan['planSHA256']=common.sha(common.encoded(plan));return plan,requests


def prepare(index,inventory,out):
    plan,_=build_plan(index,inventory);out=common.private_path(out);out.mkdir(mode=0o700,parents=True,exist_ok=False)
    common.write_private(out/'plan.json',plan);common.write_private(out/'budget.json',{'maxAttempts':9,'budgetUSD':1.70,'retry':0})
    return plan


def execute(index,inventory,out,approved_sha,key_file):
    plan,requests=build_plan(index,inventory);out=common.private_path(out)
    if out.stat().st_mode&0o077 or plan!=common.strict_json((out/'plan.json').read_bytes()) or approved_sha!=plan['planSHA256']:raise ValueError('Plan/source/GT/code pin mismatch')
    if common.strict_json((out/'budget.json').read_bytes())!={'maxAttempts':9,'budgetUSD':1.70,'retry':0}:raise ValueError('Nine-photo budget mismatch')
    if list(out.glob('attempt-*.json')):raise ValueError('Batch already has attempted inference; no rerun')
    key=common.extract_gemini(common.credential_file(key_file,restrict=False))[0]
    common.write_private(out/'execute.claim.json',{'planSHA256':approved_sha,'startedUnix':time.time()})
    report={'status':'COMPLETED','attempts':0,'retry':0,'planSHA256':approved_sha,'results':[]}
    for request in requests:
        row=request['row'];result={'id':row['id'],'order':row['order']};start=time.monotonic()
        try:
            if common.sha(Path(row['sourcePath']).read_bytes())!=row['sourceSHA256'] or common.sha(Path(row['GTPath']).read_bytes())!=row['GTSHA256'] or common.sha(common.encoded(request['body']))!=row['bodySHA256']:raise ValueError('Pre-send source/GT/body drift')
            attempt=claim_attempt(out,row);report['attempts']+=1;result['attempt']=attempt
            status,raw=game.send('gemini',request['body'],key);elapsed=(time.monotonic()-start)*1000;stored=raw.replace(key.encode(),b'[REDACTED_CREDENTIAL]')
            common.write_private(out/(row['id']+'.response.json'),stored);result.update(httpStatus=status,wallMs=elapsed,rawSHA256=common.sha(raw),storedSHA256=common.sha(stored),credentialEchoRedacted=stored!=raw)
            if status!=200 or len(raw)>10_000_000:raise ValueError('HTTP/response-size failure')
            response=common.strict_json(stored);cost=game.usage('gemini',response);cost['wallMs']=elapsed
            result.update(nativeFinish=[x.get('finishReason') for x in response.get('candidates',[])],resolvedModel=response.get('modelVersion'),usageAndCost=cost)
            observations=game.parse('gemini',response);projection=game.literal_projection(observations,{'imageSHA256':row['sourceSHA256'],'requestSHA256':row['requestSHA256'],'provider':'gemini'})
            common.write_private(out/(row['id']+'.observations.json'),observations);common.write_private(out/(row['id']+'.projection.json'),projection)
            evaluation=score(observations,common.strict_json(Path(row['GTPath']).read_bytes()));common.write_private(out/(row['id']+'.evaluation.json'),evaluation)
            result.update(status='PARSED',observationCount=len(observations),perKind=evaluation['perKind'],unmatchedObservations=len(evaluation['unmatchedObservationRefs']),unlocalized=evaluation['unlocalized'])
        except Exception as error:
            result.update(status='FAILED',errorType=type(error).__name__,reason='Transport/HTTP/completion/schema/pin failure; no retry');report['status']='STOPPED'
        report['results'].append(result);common.write_private(out/(row['id']+'.result.json'),result)
        if report['status']=='STOPPED':break
    common.write_private(out/'result.json',report);return report


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--index',type=Path,required=True);parser.add_argument('--inventory',type=Path,required=True);parser.add_argument('--out',type=Path)
    modes=parser.add_mutually_exclusive_group();modes.add_argument('--check',action='store_true');modes.add_argument('--prepare',action='store_true');modes.add_argument('--execute',action='store_true')
    parser.add_argument('--approved-plan-sha');parser.add_argument('--gemini-key-file',type=Path);args=parser.parse_args()
    if args.execute:
        if not args.out or not args.approved_plan_sha or not args.gemini_key_file:parser.error('execute requires out/approved SHA/key file path')
        result=execute(args.index,args.inventory,args.out,args.approved_plan_sha,args.gemini_key_file);print(json.dumps({'status':result['status'],'attempts':result['attempts'],'privateResults':str(args.out)}));return 0 if result['status']=='COMPLETED' else 1
    if args.prepare:
        if not args.out:parser.error('prepare requires out')
        plan=prepare(args.index,args.inventory,args.out)
    else:plan,_=build_plan(args.index,args.inventory)
    print(json.dumps({'status':'OFFLINE_PREPARED','planSHA256':plan['planSHA256'],'plannedCalls':9,'networkCalls':0,'credentialReads':0,'planningWorstUSD':plan['planningWorstUSD']}));return 0


if __name__=='__main__':
    try:raise SystemExit(main())
    except Exception as error:
        print(json.dumps({'status':'FAILED_NO_RETRY','errorType':type(error).__name__,'reason':str(error) if isinstance(error,ValueError) else 'Inspect frozen local metadata privately'}));raise SystemExit(1)
