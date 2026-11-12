const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const file=path.join(__dirname,'../verification/compiled/estimatedStructureSafety.js');
const h=fs.existsSync(file)?require(file):{};
const source={assertionId:'cards',pieceId:'card',evidenceId:'photo',sourceKey:'verified-source-key'};
const anchor={assertionId:'boards',pieceId:'board',evidenceId:'photo',sourceKey:'verified-source-key'};
function resolve(s,id,all){assert.equal(typeof h.resolveEstimatedReference,'function','scoped reference resolver missing');return h.resolveEstimatedReference(s,id,all);}
function forest(all){assert.equal(typeof h.estimatedAttachmentForest,'function','attachment forest missing');return h.estimatedAttachmentForest(all);}
test('valid cross-field anchor uses same validated source, not same assertion only',()=>assert.equal(resolve(source,'board',[anchor]).status,'resolved'));
test('foreign owner/epoch/definition source key cannot be borrowed',()=>assert.equal(resolve(source,'board',[{...anchor,sourceKey:'different-scope'}]).status,'unavailable'));
test('same field explicit manual reference remains usable without receipt geometry',()=>assert.equal(resolve({...source,sourceKey:null},'board',[{...anchor,assertionId:'cards',sourceKey:null}]).status,'resolved'));
test('different field without validated source is unavailable',()=>assert.equal(resolve({...source,sourceKey:null},'board',[{...anchor,sourceKey:null}]).status,'unavailable'));
test('same piece ID with competing eligible records remains ambiguous',()=>assert.equal(resolve(source,'board',[anchor,{...anchor,assertionId:'other-board-field'}]).status,'ambiguous'));
test('deleted target is unavailable',()=>assert.equal(resolve(source,'board',[]).status,'unavailable'));
test('same source key cannot bypass different evidence id',()=>assert.equal(resolve(source,'board',[{...anchor,evidenceId:'other-photo'}]).status,'unavailable'));
test('flat items all remain roots',()=>assert.deepEqual(forest([{pieceId:'a',attachedToPieceId:null},{pieceId:'b',attachedToPieceId:null}]).roots,['a','b']));
test('nested attachments retain every depth',()=>{const r=forest([{pieceId:'card',attachedToPieceId:null},{pieceId:'overlay',attachedToPieceId:'card'},{pieceId:'token',attachedToPieceId:'overlay'}]);assert.deepEqual(r.roots,['card']);assert.deepEqual(r.children.card,['overlay']);assert.deepEqual(r.children.overlay,['token']);});
test('mutual attachment cycle becomes visible roots instead of vanishing',()=>{const r=forest([{pieceId:'a',attachedToPieceId:'b'},{pieceId:'b',attachedToPieceId:'a'}]);assert.deepEqual(r.roots,['a','b']);assert.equal(r.problems.a,'attachment-cycle');assert.equal(r.problems.b,'attachment-cycle');});
test('self attachment stays visible',()=>{const r=forest([{pieceId:'a',attachedToPieceId:'a'}]);assert.deepEqual(r.roots,['a']);assert.equal(r.problems.a,'self-attachment');});
test('valid children of a cycle member do not vanish',()=>{const r=forest([{pieceId:'a',attachedToPieceId:'b'},{pieceId:'b',attachedToPieceId:'a'},{pieceId:'c',attachedToPieceId:'b'}]);assert.deepEqual(r.roots,['a','b']);assert.deepEqual(r.children.b,['c']);});
test('cross-field attachment remains a visible external link',()=>{const r=forest([{pieceId:'token',attachedToPieceId:'tool-other-field'}]);assert.deepEqual(r.roots,['token']);assert.equal(r.externalParent.token,'tool-other-field');});
test('forest derivation never mutates input',()=>{const a=[{pieceId:'a',attachedToPieceId:'b'},{pieceId:'b',attachedToPieceId:'a'}],before=JSON.stringify(a);forest(a);assert.equal(JSON.stringify(a),before);});
test('resolver does not change source records',()=>{const before=JSON.stringify([source,anchor]);resolve(source,'board',[anchor]);assert.equal(JSON.stringify([source,anchor]),before);});
