import type {Assertion,GamePack,Session,SessionView} from './types';
import {effectiveProtectedOwners,physicalOnlyField} from './gameEssentials';
export function privateField(pack:GamePack,field:string){const definition=pack.fields.find(f=>f.key===field);return !definition||definition.scope==='player'&&definition.visibility!=='public';}
export function redactSession(source:Session,pack:GamePack,protectedOwners:Set<string>,allowed:Set<string>):Session{
 protectedOwners=effectiveProtectedOwners(pack,source.players,protectedOwners);
 const session=structuredClone(source),locked=(owner?:string)=>!!owner&&protectedOwners.has(owner)&&!allowed.has(owner);
 const visible=(a:Assertion)=>!physicalOnlyField(pack,a.field)&&(!locked(a.ownerId)||!privateField(pack,a.field));
 const notes=(input:Record<string,string>)=>Object.fromEntries(Object.entries(input).filter(([key])=>!locked(key)));
 const blocked=new Set([...source.evidence,...source.snapshots.flatMap(s=>s.evidence)].filter(e=>locked(e.ownerId)).map(e=>e.url));
 const photos=(items:Session['evidence'])=>items.filter(e=>!locked(e.ownerId)&&!blocked.has(e.url));
 if(session.saveIntents)session.saveIntents=session.saveIntents.filter(i=>i.scopeKey==='public'||!locked(i.scopeKey));
 session.assertions=session.assertions.filter(visible);session.notes=notes(session.notes);session.evidence=photos(session.evidence);session.preservations=session.preservations.filter(p=>!locked(p.ownerId));
 session.snapshots=session.snapshots.map(s=>({...s,assertions:s.assertions.filter(visible),notes:notes(s.notes),evidence:photos(s.evidence),preservations:s.preservations.filter(p=>!locked(p.ownerId))}));
 if(locked(session.analysisSummaryOwnerId??undefined)||session.analysisSummaryOwnerId==='_mixed'&&[...protectedOwners].some(o=>!allowed.has(o))){delete session.analysisSummary;delete session.analysisSummaryOwnerId;}
 return session;
}
export function redactView(view:SessionView,protectedOwners:Set<string>,allowed:Set<string>):SessionView{
 protectedOwners=effectiveProtectedOwners(view.pack,view.session.players,protectedOwners);
 const visible=(item:{ownerId?:string;field?:string})=>(!item.field||!physicalOnlyField(view.pack,item.field))&&(!item.ownerId||!protectedOwners.has(item.ownerId)||allowed.has(item.ownerId)||!!item.field&&!privateField(view.pack,item.field));
 const session=redactSession(view.session,view.pack,protectedOwners,allowed),ids=new Set([...session.evidence,...session.snapshots.flatMap(s=>s.evidence)].map(e=>e.id));
 return {...view,session,derived:view.derived.filter(visible),briefing:view.briefing.filter(visible).map(x=>({...x,evidenceIds:x.evidenceIds.filter(id=>ids.has(id))})),questions:view.questions.filter(visible),differences:view.differences.filter(visible),actions:view.actions?.filter(visible),privacy:{protectedOwnerIds:[...protectedOwners],unlockedOwnerIds:[...allowed].filter(o=>protectedOwners.has(o)),setupRequiredOwnerIds:[]}};
}
