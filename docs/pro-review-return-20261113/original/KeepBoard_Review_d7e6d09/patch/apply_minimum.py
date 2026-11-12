#!/usr/bin/env python3
"""Deterministic local patch, default dry-run. No network, no git push.
Checks original Git blob IDs before touching existing product files.
Full app tests / browser / persistence integration are NOT run by this script.
"""
import argparse, difflib, hashlib, os
from pathlib import Path
BASE=Path(__file__).resolve().parent
BLOBS={
 'shared/estimatedBoardStructure.ts':'1faaa03e371ef029e9a3ccaa28454785fd4559db',
 'src/EstimatedBoardView.tsx':'9b6a3f21909a4c51bf6b396bd39afb7ccbf4e393',
}
def git_blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def replace_once(text,old,new):
 if text.count(old)!=1:raise ValueError('source anchor is not unique: '+old[:100])
 return text.replace(old,new,1)
def patched_estimator(s):
 s=replace_once(s,"import {sourceLine,expeditionColor,diceLattice} from './estimatedGeometry';", "import {sourceLine,expeditionColor,diceLattice} from './estimatedGeometry';\nimport {resolveEstimatedReference,type EstimatedReferenceRecord} from './estimatedStructureSafety';")
 s=replace_once(s," const unassigned=(i:DrawingItem,reason:string)=>", " const manualChecks:{item:DrawingItem;refs:string[];areaId:string}[]=[];\n const unassigned=(i:DrawingItem,reason:string)=>")
 old="   const refs=[q.anchorPieceId,q.attachedToPieceId].filter((s):s is string=>!!s),same=(id:string)=>items.some(i=>i.pieceId===id&&i.assertionId===a.id&&(i.value as GenericPiece).evidenceId===p.evidenceId);if(refs.some(id=>!same(id)))unassigned(item,'manual-anchor-or-attachment-unavailable');else if(q.areaId!=='unclassified')placed.add(identity(item));"
 new="   manualChecks.push({item,refs:[q.anchorPieceId,q.attachedToPieceId].filter((s):s is string=>!!s),areaId:q.areaId});"
 s=replace_once(s,old,new)
 anchor=" const partitions=new Map<string,Node[]>();for(const n of nodes)partitions.set(n.sourceKey,[...(partitions.get(n.sourceKey)??[]),n]);"
 new=""" // Resolve after all live source-qualified nodes exist. No receipt resurrection.
 const nodeByIdentity=new Map(nodes.map(n=>[identity(n.item),n]));
 const liveReferences:EstimatedReferenceRecord[]=[...new Map([...items,...extra].map(i=>[identity(i),i])).values()].map(i=>({assertionId:i.assertionId,pieceId:i.pieceId,evidenceId:(i.value as GenericPiece).evidenceId,sourceKey:nodeByIdentity.get(identity(i))?.sourceKey??null}));
 for(const check of manualChecks){const source=liveReferences.find(r=>identity(r)===identity(check.item));
  const unresolved=source?check.refs.map(id=>resolveEstimatedReference(source,id,liveReferences)).find(r=>r.status!=='resolved'):{status:'unavailable' as const};
  if(unresolved)unassigned(check.item,unresolved.status==='ambiguous'?'manual-anchor-or-attachment-ambiguous':'manual-anchor-or-attachment-unavailable');
  else if(check.areaId!=='unclassified')placed.add(identity(check.item));
 }
"""+anchor
 return replace_once(s,anchor,new)
def patched_view(s):
 s=replace_once(s,"import {pieceFaceValues} from './pieceFaceValues';", "import {pieceFaceValues} from './pieceFaceValues';\nimport {estimatedAttachmentForest} from '../shared/estimatedStructureSafety';")
 old=""" const children=(id:string)=>placements.filter(p=>p.attachedToPieceId===id&&p.pieceId!==id);
 const renderWithAttachments=(id:string)=><div key={id} className="estimated-piece-group">{render(id)}{children(id).length>0&&<div className="estimated-attachments"><small>부착 · 추정/수동</small>{children(id).map(c=>render(c.pieceId))}</div>}</div>;
 const roots=(g:Structure['groups'][number])=>placements.filter(p=>p.groupId===g.id&&(!p.attachedToPieceId||!ids.has(p.attachedToPieceId))).sort((a,b)=>a.order-b.order||a.pieceId.localeCompare(b.pieceId));"""
 new=""" const attachmentTree=estimatedAttachmentForest(placements),rootIds=new Set(attachmentTree.roots);
 const children=(id:string)=>attachmentTree.children[id]??[];
 const renderWithAttachments=(id:string):ReactNode=><div key={id} className="estimated-piece-group">{render(id)}{attachmentTree.problems[id]&&<small role="status">부착 관계 확인 필요 · 원래 기록은 유지됨</small>}{children(id).length>0&&<div className="estimated-attachments"><small>부착 · 추정/수동</small>{children(id).map(child=>renderWithAttachments(child))}</div>}</div>;
 const roots=(g:Structure['groups'][number])=>placements.filter(p=>p.groupId===g.id&&rootIds.has(p.pieceId)).sort((a,b)=>a.order-b.order||a.pieceId.localeCompare(b.pieceId));"""
 return replace_once(s,old,new)
def changes(repo):
 out={}
 for path,sha in BLOBS.items():
  raw=(repo/path).read_bytes()
  if git_blob(raw)!=sha:raise ValueError(f'{path}: not the reviewed source; merge manually, do not force')
  s=raw.decode('utf-8');out[path]=(s,patched_estimator(s) if path.startswith('shared/') else patched_view(s))
 for path in ['shared/estimatedStructureSafety.ts','tests/estimated-structure-safety.test.ts']:
  content=(BASE/'files'/path).read_text(encoding='utf-8');target=repo/path
  if target.exists() and target.read_text()!=content:raise ValueError(f'{path}: would overwrite another file')
  out[path]=('',content)
 return out

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--repo',type=Path,required=True);p.add_argument('--apply',action='store_true');p.add_argument('--diff',type=Path)
 args=p.parse_args();out=changes(args.repo.resolve());diff=''
 for path,(old,new) in out.items():
  diff+=''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='a/'+path if old else '/dev/null',tofile='b/'+path))
 if args.diff:args.diff.write_text(diff,encoding='utf-8')
 if args.apply:
  for path,(_,new) in out.items():
   target=args.repo/path;target.parent.mkdir(parents=True,exist_ok=True)
   temp=target.with_name(target.name+'.keepboard-review.tmp');temp.write_text(new,encoding='utf-8');os.replace(temp,target)
 print(('APPLIED' if args.apply else 'DRY-RUN OK')+f': {len(out)} files; reviewed blob hashes match. No full-app verification implied.')
if __name__=='__main__':main()
