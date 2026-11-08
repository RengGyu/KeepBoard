"""Reporting-only equivalence, applied identically to every arm AFTER the frozen scorer. The frozen scorer and references are not changed.
Written after seeing the false-wrong examples, so it is a correction of wording noise, not a blind pre-registration.
Reclassifies only 'wrong' facts:
- colour fields: both sides name the same set of colours from the fixed word list. Pattern and material words are ignored.
- marks fields: every expected {symbol,value} matches, and any other symbol the model listed is null (not read)."""
import re
COLOURS={'red':'red','blue':'blue','yellow':'yellow','green':'green','black':'black','white':'white','gray':'gray','grey':'gray','brown':'brown','orange':'orange','purple':'purple','pink':'pink','gold':'gold','silver':'silver','cyan':'cyan','turquoise':'cyan','teal':'cyan'}
def colours(v):
 return {COLOURS[w] for w in re.findall(r'[a-z]+',str(v).lower()) if w in COLOURS}
def marks(v):
 if isinstance(v,dict):return dict(v)
 if isinstance(v,list) and all(isinstance(x,dict) and 'symbol' in x for x in v):return {x['symbol']:x.get('value') for x in v}
 return None
def equivalent(f):
 if f['status']!='wrong':return False
 e,a=f.get('expected'),f.get('actual')
 if f.get('fieldCategory')=='color' or 'color' in str(f.get('property','')).lower():
  x,y=colours(e),colours(a);return bool(x) and x==y
 me,ma=marks(e),marks(a)
 if me is not None and ma is not None:return all(ma.get(k)==v for k,v in me.items()) and all(v is None for k,v in ma.items() if k not in me)
 return False
