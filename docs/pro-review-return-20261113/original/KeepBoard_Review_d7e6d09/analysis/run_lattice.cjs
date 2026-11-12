const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');const {diceLattice}=require('../verification/geometry-compiled/geometry_excerpt.js');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/sagrada-response-extract.json'),'utf8'));
const rows=[];
for(const [effort,objects]of Object.entries(data.responses)){
 const footprints=objects.map(p=>({id:p.id,x:(p.bbox[0]+p.bbox[2])/2*1200/900,y:(p.bbox[1]+p.bbox[3])/2,width:(p.bbox[2]-p.bbox[0])*1200/900,height:p.bbox[3]-p.bbox[1]}));
 const result=diceLattice(footprints,4,5);
 rows.push({effort,inputCount:objects.length,assignedCells:result.cells.size,axis:result.axis,reason:result.reason,cells:Object.fromEntries(result.cells),
   warning:'Geometry-only diagnostic on returned foreground candidates; bypasses role/anchor eligibility for diagnosis, NOT product placements or ground truth.'});
}
fs.writeFileSync(path.join(root,'verification/lattice-excerpt-results.json'),JSON.stringify(rows,null,2));
console.log(JSON.stringify(rows.map(({effort,inputCount,assignedCells,reason})=>({effort,inputCount,assignedCells,reason})),null,2));
