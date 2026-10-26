import assert from 'node:assert/strict';
const base='http://127.0.0.1:4410';
async function view(id){const r=await fetch(`${base}/api/sessions/${id}`);assert.equal(r.status,200);return r.json();}
const v=await view('48b52cad-07ce-4ac9-a041-40d903fa94e5'),[one,two]=v.session.players;
const accepted=(field,owner)=>v.session.assertions.filter(a=>a.status==='accepted'&&a.field===field&&a.ownerId===owner).at(-1)?.value?.pieces??[];
assert.equal(accepted('market.scene').length,10);
assert.equal(accepted('supply.scene').length,2);
assert(accepted('player.scene',one.id).some(p=>p.readout?.points===4&&p.readout.bonus==='green'));
assert.equal(accepted('reserve.scene',one.id).length,1);
const moved=accepted('player.scene',two.id).find(p=>p.readout?.points===6);
assert(moved);assert.equal(moved.placement,undefined);assert(moved.linkOrigin?.previousPlacement);
assert(v.session.assertions.some(a=>a.value?.pieces?.length===5&&a.field==='__photo.public'));
const r=await view('f2463ef4-f273-4866-94b4-edaa024a822b');
const rack=r.session.assertions.filter(a=>a.status==='accepted'&&a.field==='rack.scene'&&a.ownerId===r.session.players[0].id).at(-1).value;
assert.equal(rack.groups.length,2);assert.deepEqual(rack.groups.map(g=>g.tiles.length),[7,7]);
console.log(JSON.stringify({checks:8,passed:8,marketCount:10,supplyCount:2,purchasedCorrectionRetained:true,reserveSeparated:true,movedPlacementHistoryRetained:true,rawTrayRetained:true,rackRows:[7,7],syntheticOnly:true,modelCalls:0},null,2));
