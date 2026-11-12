import test from 'node:test';import assert from 'node:assert/strict';
import {nearAnchor,originalManualReference,originalVisibleAttachmentIds,originalDiscardGroup,imageCentreSide} from '../source-excerpts/original-predicates.mjs';
test('source reproduction: same-source cross-field manual anchor is rejected',()=>{
 const items=[{assertionId:'boards',pieceId:'board',value:{evidenceId:'photo'}}];
 assert.equal(originalManualReference(items,{id:'cards'},{evidenceId:'photo'},'board'),false);
});
test('source reproduction: mutual manual attachment hides both objects',()=>{
 assert.deepEqual(originalVisibleAttachmentIds([{pieceId:'a',attachedToPieceId:'b'},{pieceId:'b',attachedToPieceId:'a'}]),[]);
});
test('source reproduction: nested attachment grandchild not rendered',()=>{
 assert.deepEqual(originalVisibleAttachmentIds([{pieceId:'a',attachedToPieceId:null},{pieceId:'b',attachedToPieceId:'a'},{pieceId:'c',attachedToPieceId:'b'}]),['a','b']);
});
test('source reproduction: nearest center can select non-containing anchor',()=>{
 const node=(id,box)=>({item:{pieceId:id},box,aspect:1});
 const a=node('containing',{x:0,y:.1,width:.6,height:.8}),b=node('near-center',{x:.62,y:.4,width:.1,height:.2});
 assert.equal(nearAnchor(node('piece',{x:.58,y:.49,width:.02,height:.02}),[a,b]).item.pieceId,'near-center');
});
test('source reproduction: LC discard key has no board-instance component',()=>{
 const sources=[{board:'board-A',source:'same-photo',color:'blue'},{board:'board-B',source:'same-photo',color:'blue'}];
 const keys=sources.map(({source,color})=>originalDiscardGroup(source,color));
 assert.equal(new Set(keys).size,1); // Distinct board instances collapse because board is absent from the expression.
});
test('source reproduction: translation changes LC side with same relative geometry',()=>{
 assert.equal(imageCentreSide({x:.5,y:.4},{x:1,y:0},{x:.5,y:.5}),'near');
 assert.equal(imageCentreSide({x:.5,y:.6},{x:1,y:0},{x:.5,y:.7}),'far');
});
