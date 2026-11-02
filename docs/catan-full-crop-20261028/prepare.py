import base64, hashlib, json, pathlib, os
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent
PRIVATE = pathlib.Path('/private/tmp/kb-catan-full-crop-20261028')
SOURCE = pathlib.Path('/private/tmp/kb-photo-flow-ui-data/uploads/430efca5-a94c-49f2-9b20-303e0e65e54d.jpeg')
EXPECTED = '29f02bc870a2ef7cd4ec8425d50f4f6d552288564306c04c42664ae7bb6a3dee'
PROMPT = '''Inspect this crop of a Catan photograph. Report all distinguishable visible board objects: terrain hex tiles, whole physical number discs, robber, road pieces, settlements, cities, and printed coastal harbor trading symbols. Report physical pieces separately from printed tile artwork. Ignore off-board cards, people, furniture and decorative boats/piers without a trading symbol. One row per distinguishable object; do not infer expected inventory, hidden values, owners, rules or canonical board slots. If a whole object is clipped at the crop boundary, report its visible envelope and say clipped. Keep uncertain road/building subtypes as kind="piece-uncertain" and describe candidate types in uncertainty. Read terrain, numeral, color, harbor ratio and resource only when directly visible; otherwise use null. A number disc is the whole disc, not just its printed digit. box_1000 is [ymin,xmin,ymax,xmax] relative to THIS crop, 0..1000. All boxes must follow the actual visible object. Return JSON only.'''
KINDS = ['terrain', 'number-token', 'robber', 'road', 'settlement', 'city', 'harbor', 'piece-uncertain']
BOXES = [('upper-left',[0,300,680,900]), ('upper-right',[500,300,1040,900]), ('lower-left',[0,760,680,1280]), ('lower-right',[500,760,1040,1280])]
sha = lambda b: hashlib.sha256(b).hexdigest()
def save(p, d):
    p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n'); os.chmod(p,0o600)
def main():
    PRIVATE.mkdir(exist_ok=True); os.chmod(PRIVATE,0o700)
    assert not (PRIVATE/'plan.json').exists(), 'Frozen plan already exists'
    raw=SOURCE.read_bytes(); assert sha(raw)==EXPECTED
    im=Image.open(SOURCE); assert im.size==(1170,1560)
    props={k:{'type':['string','null']} for k in ['terrainType','color','ratio','resource','uncertainty']}
    props.update(kind={'type':'string','enum':KINDS},number={'type':['integer','null']},box_1000={'type':'array','items':{'type':'number'},'minItems':4,'maxItems':4})
    schema={'type':'object','properties':{'items':{'type':'array','items':{'type':'object','properties':props,'required':list(props),'additionalProperties':False}},'notes':{'type':'array','items':{'type':'string'}}},'required':['items','notes'],'additionalProperties':False}
    config={'candidateCount':1,'maxOutputTokens':32768,'thinkingConfig':{'thinkingLevel':'LOW'},'mediaResolution':'MEDIA_RESOLUTION_HIGH','responseFormat':{'text':{'mimeType':'APPLICATION_JSON','schema':schema}}}
    rows=[]
    for ident,box in BOXES:
        p=PRIVATE/(ident+'.jpg'); im.crop(box).save(p,quality=95,subsampling=0); os.chmod(p,0o600)
        crop=p.read_bytes(); request={'contents':[{'role':'user','parts':[{'text':PROMPT},{'inlineData':{'mimeType':'image/jpeg','data':base64.b64encode(crop).decode()}}]}],'generationConfig':config}
        wire=json.dumps(request,ensure_ascii=False,separators=(',',':')).encode(); q=PRIVATE/(ident+'.request.json');q.write_bytes(wire);os.chmod(q,0o600)
        rows.append({'id':ident,'sourceBoxPx':box,'width':box[2]-box[0],'height':box[3]-box[1],'cropSHA':sha(crop),'requestSHA':sha(wire),'requestPath':str(q)})
    plan={'version':'catan-full-crop-v1','source':{'path':str(SOURCE),'sha256':EXPECTED,'width':1170,'height':1560},'model':'gemini-3.8-flash','prompt':PROMPT,'promptSHA':sha(PROMPT.encode()),'generationConfig':config,'crops':rows,'maxCalls':4,'concurrency':4,'retries':0,'coverage':'Full visible board envelope x0..1040,y300..1280; original left board edge is outside photograph. 180px horizontal/140px vertical overlap. No resizing; JPEG encoding quality95.','coordinateMapping':'original x=left+cropX*width/1000; y=top+cropY*height/1000','dedupPolicy':'After responses, same-kind seam candidates only are grouped by source-box IoU>=0.25 with direct visual adjudication; raw records and cross-kind conflicts remain. No count or value-based identity completion.'}
    save(PRIVATE/'plan.json',plan)
    save(ROOT/'plan.json',plan)
    print(json.dumps({'prepared':4,'planSHA':sha((PRIVATE/'plan.json').read_bytes()),'promptSHA':plan['promptSHA']}))
if __name__=='__main__': main()
