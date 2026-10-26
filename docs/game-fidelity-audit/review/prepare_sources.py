import json
from pathlib import Path
out=Path(__file__).resolve().parent
root=out.parents[2]
aliases={'dune-uprising':'dune-imperium-uprising','seven-wonders-duel':'seven-wonders-duel','quacks':'quacks','res-arcana':'res-arcana','journeys-middle-earth':'journeys-middle-earth','le-havre-2016':'le-havre','seti':'seti','star-wars-rebellion':'star-wars-rebellion','dominant-species':'dominant-species','crew-deep-sea':'crew-deep-sea','arkham-horror-3':'arkham-horror-3','eclipse':'eclipse-second-dawn','agricola':'agricola','machi-koro':'machi-koro','arkham-lcg-2026':'arkham-lcg','imperial-assault':'imperial-assault','voidfall':'voidfall','outer-rim-reference':'star-wars-outer-rim','gloomhaven-2025':'gloomhaven','barrage':'barrage','terra-mystica':'terra-mystica','marvel':'marvel-champions','mansions':'mansions-madness-2','cascadia':'cascadia','anachrony':'anachrony','monopoly':'monopoly','istanbul':'istanbul','power-grid-de':'power-grid','hansa-en':'hansa-teutonica','stone-age':'stone-age','ttr-current':'ticket-to-ride','calico':'calico','jaipur':'jaipur','terraforming-mars':'terraforming-mars','caverna':'caverna'}
references=[]
def walk(obj):
 if isinstance(obj,dict):
  if obj.get('url'):references.append(obj)
  for v in obj.values():walk(v)
 elif isinstance(obj,list):
  for v in obj:walk(v)
for p in ['docs/art-confirmation/source-manifest.json','docs/game-essentials/evidence.json','docs/source-recovery/evidence.json']:
 walk(json.loads((root/p).read_text()))
tasks=[];docs=[]
(out/'pages').mkdir(exist_ok=True)
for folder in ['docs/game-essentials/sources','docs/art-confirmation/sources','docs/source-recovery/sources']:
 for p in sorted((root/folder).glob('*.pdf')):
  name=p.stem.removesuffix('-rules').removesuffix('-primary')
  if name not in aliases:continue
  rel=str(p.relative_to(root));source=next((r for r in references if rel in r.values() or Path(r.get('artifact',{}).get('path','')).name==p.name),{})
  game=aliases[name]
  prefix=str((out/'pages'/game).relative_to(root))
  tasks.append(dict(pdf=rel,prefix=prefix,pages=[1,2,3,4]))
  docs.append(dict(gameId=game,pdf=rel,url=source.get('url'),localText=prefix+'.txt',contact=prefix+'.png',contactPages=[1,2,3,4],sourceAssociation='file+manifest URL only; previous conclusions not reused'))
assert len({t['prefix'] for t in tasks})==len(tasks)
(out/'render-tasks.json').write_text(json.dumps(tasks,indent=2)+'\n')
(out/'local-documents.json').write_text(json.dumps(docs,ensure_ascii=False,indent=2)+'\n')
print(f'{len(docs)} independent render tasks')
