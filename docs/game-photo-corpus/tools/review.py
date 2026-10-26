# Apply explicitly authored visual observations; never infer classification from caption alone.
import json,sys
from pathlib import Path
p=Path('docs/game-photo-corpus/manifest.json');m=json.loads(p.read_text());note=Path('docs/game-photo-corpus/reviews-sol.json');notes=json.loads(note.read_text()) if note.exists() else {}
for row in json.load(sys.stdin):
 prefix,shot,usable,areas,limits,edition,language=row
 found=[i for i in m['images'] if i['sha256'].startswith(prefix)]
 assert len(found)==1,prefix
 i=found[0];i.update(shotType=shot,usable=usable,edition=edition,editionCertainty='low',language=language,readLimits=limits,retained=True,visualReview={'reviewer':'Sol1','method':'contact-sheet direct view; original dimensions retained; no AI recognition','reviewedAt':'2026-10-23','areas':areas})
 notes[i['sha256']]={k:i[k] for k in ['shotType','usable','edition','editionCertainty','language','readLimits','retained','visualReview']}
 i['visible']={'publicBoard':'board' in areas,'publicHoldings':'tableau' in areas or 'supply' in areas,'privateHand':'personal-area' in areas,'closeUp':shot=='physical-closeup'}
 notes[i['sha256']]['visible']=i['visible']
note.write_text(json.dumps(notes,ensure_ascii=False,indent=1)+'\n')
