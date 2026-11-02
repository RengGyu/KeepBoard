import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent
private=Path.home()/'Library/Application Support/KeepBoard/research/multiview-followup-20261029'
selected={c['gameId']:c for c in json.load(open('docs/twenty-games-pack-study-20261029/selection-preflight.json'))['cases']}
# Frozen region targets, before fresh provider outputs. No synthetic viewpoint or new pixel detail.
regions={'cascadia':[65,565,700,950],'sagrada':[430,355,735,765],'splendor-duel':[580,145,1024,430]}
rows=[]
for g,b in regions.items():
 c=selected[g];im=Image.open(c['path']);assert im.size==(c['width'],c['height']);assert hashlib.sha256(Path(c['path']).read_bytes()).hexdigest()==c['sourceSHA']
 f=private/(g+'-crop.png');im.crop(tuple(b)).save(f);f.chmod(0o600)
 rows.append({**c,'cropPath':str(f),'cropSHA':hashlib.sha256(f.read_bytes()).hexdigest(),'cropDimensions':{'width':b[2]-b[0],'height':b[3]-b[1]},'sourceRegion':{'x':b[0]/im.width,'y':b[1]/im.height,'width':(b[2]-b[0])/im.width,'height':(b[3]-b[1])/im.height},'cropPx':b})
(root/'plan.json').write_text(json.dumps({'cases':rows,'modelCalls':6,'retries':0,'settings':'current Gemini 3.8 Flash/LOW/HIGH/32768 unchanged','conditions':'3 fresh whole originals + 3 one-region crops; no upscaling or added image detail; same source coordinates','alternativePhotoFinding':'Cascadia 9812767/9812768 same setting but changed layout; NOT combined or scored as same-state views. No verified alternate-angle pair found in bounded existing-corpus+web search.','productChanges':0},indent=2)+'\n')
print('3 same-source crops prepared; plan6 calls frozen')
