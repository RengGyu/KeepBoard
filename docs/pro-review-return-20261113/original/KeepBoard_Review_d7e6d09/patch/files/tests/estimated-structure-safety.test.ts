import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveEstimatedReference,estimatedAttachmentForest} from '../shared/estimatedStructureSafety';
const source={assertionId:'cards',pieceId:'card',evidenceId:'photo',sourceKey:'verified'};
const target={assertionId:'boards',pieceId:'board',evidenceId:'photo',sourceKey:'verified'};
test('manual references resolve across fields only in the same qualified source',()=>{
 assert.equal(resolveEstimatedReference(source,'board',[target]).status,'resolved');
 assert.equal(resolveEstimatedReference(source,'board',[{...target,sourceKey:'foreign'}]).status,'unavailable');
 assert.equal(resolveEstimatedReference({...source,sourceKey:null},'board',[{...target,sourceKey:null}]).status,'unavailable');
 assert.equal(resolveEstimatedReference(source,'board',[target,{...target,assertionId:'other'}]).status,'ambiguous');
});
test('cycles keep all pieces visible and do not mutate saved data',()=>{
 const rows=[{pieceId:'a',attachedToPieceId:'b'},{pieceId:'b',attachedToPieceId:'a'},{pieceId:'c',attachedToPieceId:'b'}];const before=JSON.stringify(rows);
 const result=estimatedAttachmentForest(rows);
 assert.deepEqual(result.roots,['a','b']);assert.deepEqual(result.children.b,['c']);assert.equal(result.problems.a,'attachment-cycle');assert.equal(JSON.stringify(rows),before);
});
test('nested and cross-field attachments remain reachable',()=>{
 const result=estimatedAttachmentForest([{pieceId:'a',attachedToPieceId:null},{pieceId:'b',attachedToPieceId:'a'},{pieceId:'c',attachedToPieceId:'b'},{pieceId:'d',attachedToPieceId:'other-field-card'}]);
 assert.deepEqual(result.roots,['a','d']);assert.deepEqual(result.children.b,['c']);assert.equal(result.externalParent.d,'other-field-card');
});
