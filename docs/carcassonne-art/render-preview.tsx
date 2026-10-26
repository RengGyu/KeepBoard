// Original vector art exports. Run: node --import tsx docs/carcassonne-art/render-preview.tsx
import React from 'react';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { renderToStaticMarkup } from 'react-dom/server';
import { CarcassonneArt, CARCASSONNE_TILE_PRESETS, type CarcassonneArtProps } from '../../src/CarcassonneArt';

const sourcePath = 'docs/research/game-specs-120/games/carcassonne.json';
const sourceBytes = await readFile(sourcePath);
const spec = JSON.parse(sourceBytes.toString());
for (const id of ['tiles','followers','score']) if (!spec.components.some((c: {id:string}) => c.id === id)) throw new Error(`Required source component missing: ${id}`);
const colors = { red:'#bc6048', blue:'#61879d', green:'#63825c', gold:'#c6a24f' };
const tiles = [
  ['field','들판'],['road-straight','곧은 길'],['road-bend','굽은 길'],['road-junction','갈림길'],
  ['city-cap','도시 · 성벽'],['city-corner','연결 도시'],['city-road','도시와 길'],['monastery','수도원'],['monastery-road','수도원과 길'],
] as const;
const font = "'Apple SD Gothic Neo','Noto Sans KR',Arial,sans-serif";
const Text = ({x,y,children,size=18,color='#33483c',weight=400,anchor='start'}:{x:number;y:number;children:React.ReactNode;size?:number;color?:string;weight?:number;anchor?:'start'|'middle'|'end'}) => <text x={x} y={y} fontSize={size} fill={color} fontWeight={weight} textAnchor={anchor}>{children}</text>;
const Art = ({x,y,...props}:CarcassonneArtProps & {x:number;y:number}) => <g transform={`translate(${x} ${y})`}><CarcassonneArt {...props}/></g>;

function Sheet() {
  const patch = [
    ['city-cap',270],['road-straight',0],['city-cap',0],
    ['monastery',0],['road-junction',0],['road-bend',180],
    ['field',0],['road-bend',0],['road-bend',270],
  ] as const;
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 1560" width="1440" height="1560" role="img" aria-label="KeepBoard 카르카손 구성물 아트 시제품 전체 시트" fontFamily={font}>
    <title>KeepBoard · 카르카손 구성물 아트 시제품</title>
    <rect width="1440" height="1560" fill="#f8f5eb"/>
    <Text x={88} y={80} size={15} weight={700}>KEEPBOARD / CARCASSONNE</Text>
    <Text x={88} y={151} size={58} weight={700}>카르카손</Text>
    <Text x={90} y={192} size={20} color="#737b66">타일을 잇고, 나무 미플을 놓는 구성물 아트.</Text>
    <Text x={1352} y={149} size={15} color="#737b66" anchor="end">ART PROTOTYPE 01</Text>
    <path d="M88 223H1352" stroke="#d9d8c7"/>
    <g>{patch.map(([variant,rotation],i)=><Art key={i} kind="tile" variant={variant} rotation={rotation} size={180} x={100+i%3*156} y={261+Math.floor(i/3)*156}/>)}</g>
    <Art kind="follower" color={colors.red} size={60} x={119} y={299}/>
    <Art kind="follower" color={colors.blue} size={57} x={358} y={479}/>
    <Art kind="follower" variant="farmer" color={colors.gold} size={67} x={153} y={611}/>
    <Art kind="follower" color={colors.green} size={58} x={162} y={499}/>
    <Text x={113} y={780} size={15} color="#737b66">대표 도형 조합 · 실제 타일 목록이나 저장된 판이 아닙니다.</Text>
    <Text x={735} y={305} size={27} weight={700}>선 미플과 누운 농부</Text>
    <Text x={737} y={340} size={18} color="#737b66">같은 나무 조각, 다른 자세와 소유색.</Text>
    <Art kind="follower" color={colors.red} size={180} x={748} y={382}/>
    <Art kind="follower" variant="farmer" color={colors.blue} size={180} x={1010} y={382}/>
    <Text x={838} y={603} size={19} anchor="middle">선 미플</Text><Text x={1100} y={603} size={19} anchor="middle">누운 농부</Text>
    <Art kind="tile-stack" size={88} x={750} y={663}/><Text x={860} y={706} size={19}>뽑을 타일</Text><Text x={860} y={736} size={16} color="#737b66">보이지 않는 앞면은 만들지 않습니다.</Text>
    <path d="M88 821H1352" stroke="#d9d8c7"/>
    <Text x={88} y={866} size={25} weight={700}>대표 타일</Text><Text x={1352} y={865} size={16} color="#737b66" anchor="end">들판 + 길 + 성벽 + 수도원</Text>
    {tiles.map(([variant,label],i)=><g key={variant}><Art kind="tile" variant={variant} size={118} x={80+i*140} y={892}/><Text x={139+i*140} y={1038} size={16} anchor="middle">{label}</Text></g>)}
    <path d="M88 1076H1352" stroke="#d9d8c7"/>
    <Text x={88} y={1124} size={24} weight={700}>같은 도형, 네 방향</Text>
    {([0,90,180,270] as const).map((rotation,i)=><g key={rotation}><Art kind="tile" variant="road-bend" rotation={rotation} size={70} x={97+i*120} y={1152}/><Text x={132+i*120} y={1251} size={16} anchor="middle" color="#737b66">{rotation}°</Text></g>)}
    <Text x={735} y={1124} size={24} weight={700}>소유색 재사용</Text>
    {Object.entries(colors).map(([name,color],i)=><g key={name}><Art kind="follower" color={color} size={70} x={746+i*126} y={1152}/><circle cx={781+i*126} cy={1242} r="6" fill={color} stroke="#33483c" strokeWidth="1"/></g>)}
    <path d="M88 1300H1352" stroke="#d9d8c7"/>
    <Text x={88} y={1348} size={24} weight={700}>작은 크기에서도</Text>
    {([24,32,48,64] as const).map((size,i)=><g key={size}><Art kind="tile" variant="city-road" size={size} x={105+i*236} y={1440-size}/><Art kind="follower" color={colors.blue} size={size} x={105+i*236+size+12} y={1440-size}/><Text x={105+i*236} y={1470} size={15} color="#737b66">{size} px</Text></g>)}
    <Art kind="score-marker" color={colors.green} size={64} x={1168} y={1379}/><Text x={1200} y={1470} size={15} color="#737b66" anchor="middle">점수 말</Text>
    <Text x={88} y={1521} size={14} color="#737b66">독자 벡터 도형 · 핵심 대표형만 제작 · 확장 모듈과 정확한 실물 수량은 포함하지 않음</Text>
  </svg>;
}

await mkdir('public/carcassonne-art',{recursive:true});
const assets:{file:string;component_id:string;props:CarcassonneArtProps}[]=[];
async function asset(name:string,component_id:string,props:CarcassonneArtProps) {
  const file=`public/carcassonne-art/${name}.svg`;
  await writeFile(file,renderToStaticMarkup(<CarcassonneArt {...props} size={120}/>)+'\n');assets.push({file,component_id,props});
}
for(const [variant] of tiles) await asset(`tile-${variant}`,'tiles',{kind:'tile',variant});
await asset('tile-unknown','tiles',{kind:'tile',variant:'unknown'});
for(const [name,color] of Object.entries(colors))for(const variant of ['standing','farmer'] as const) await asset(`follower-${variant}-${name}`,'followers',{kind:'follower',variant,color});
await asset('score-marker','score',{kind:'score-marker',color:colors.green});
await asset('tile-stack','tiles',{kind:'tile-stack'});
await writeFile('public/carcassonne-art-preview.svg',renderToStaticMarkup(<Sheet/>)+'\n');
await writeFile('public/carcassonne-art-preview.html',`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KeepBoard · 카르카손 아트</title><style>html,body{margin:0;background:#f8f5eb;color:#33483c;font-family:-apple-system,sans-serif}main{max-width:1440px;margin:auto}img{display:block;width:100%;height:auto}nav{padding:18px 6.1%;display:flex;gap:24px;font-size:14px}a{color:inherit}footer{padding:0 6.1% 30px;color:#737b66;font-size:13px}</style><main><img id="art-sheet" src="/carcassonne-art-preview.svg" width="1440" height="1560" alt="카르카손 구성물 아트 시제품: 대표 타일과 선 미플·누운 농부, 네 방향과 소유색, 작은 크기 비교"><nav><a href="/carcassonne-art-preview.svg">SVG 원본</a><a href="/carcassonne-art-preview.png">PNG 이미지</a></nav><footer>연구명세의 핵심 부품으로 그린 아트 시제품입니다. 게임 전체 지원이나 상업 원화 복제가 아닙니다.</footer></main></html>\n`);
await writeFile('docs/carcassonne-art-mapping.json',JSON.stringify({game_id:'carcassonne',source:sourcePath,source_sha256:createHash('sha256').update(sourceBytes).digest('hex'),source_confidence:spec.confidence,art_status:'original-vector-prototype',viewBox:'0 0 120 120',palette:{ink:'#33483c',cream:'#fff9e9',paper:'#eee1c5',meadow:'#acc085',city_wall:'#d5bd89',roof:'#b96c50',owner_colors:colors},layers:{road:['straight','bend','junction','south'],city:['cap','corner'],monastery:true},presets:CARCASSONNE_TILE_PRESETS,assets,not_implemented:['전체 실물 타일 조합/타일별 정확한 지형 연결 사전','강·수도원장·여관·성당 등 확장 모듈','실물 수량/타일 더미 내부/미확인 타일 앞면 추정','점수 계산·배치 규칙·제품 장면 실행기'],limits:['대표형은 아트 도형 조합이며 실물 판본별 타일 ID가 아니다.','미플의 들판 내부 실제 feature ID와 원본 evidence/crop은 상위 장면 데이터가 별도로 보존해야 한다.','더미 그림의 종이 층은 두께 표현이며 장수 데이터가 아니다.','점수 말은 같은 미플 도형을 재사용하며 점수값이나 순환 횟수를 그림에서 만들지 않는다.']},null,2)+'\n');
console.log(JSON.stringify({assets:assets.length,preview:'public/carcassonne-art-preview.svg',source_components:spec.components.map((c:{id:string})=>c.id)}));
