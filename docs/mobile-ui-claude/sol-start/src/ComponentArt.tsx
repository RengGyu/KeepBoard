import type { ReactNode } from 'react';
import './component-art.css';

export interface ComponentArtProps {
  kind: string;
  variant?: string;
  color?: string;
  label?: string;
  number?: number | null;
  size?: number;
  className?: string;
}

const ink = 'var(--art-ink, #33483c)';
const cream = 'var(--art-cream, #fff9e9)';
const paper = 'var(--art-paper, #eee1c5)';
const coral = 'var(--art-coral, #bc6048)';
const gold = 'var(--art-grain, #d5ac54)';
const hex = 'M63 11.7 99 32.5Q102 34.3 102 38V80Q102 83.7 99 85.5L63 106.3Q60 108 57 106.3L21 85.5Q18 83.7 18 80V38Q18 34.3 21 32.5L57 11.7Q60 10 63 11.7Z';
const materialColors: Record<string, string> = {
  forest: 'var(--art-forest, #7e9b68)', pasture: 'var(--art-pasture, #b7c882)',
  hills: 'var(--art-clay, #c88964)', fields: 'var(--art-field, #e0c276)',
  mountains: 'var(--art-stone, #9ba9a0)', desert: 'var(--art-sand, #e0c89a)',
};
const resourceTerrain: Record<string, string> = { lumber: 'forest', wool: 'pasture', brick: 'hills', grain: 'fields', ore: 'mountains' };
const names: Record<string, string> = {
  harbor: '항구', terrain: '지형 타일', 'number-token': '숫자 토큰', road: '도로', settlement: '마을', city: '도시', robber: '도둑',
  'resource-card': '자원 카드', 'development-card': '개발 카드', token: '표식', deck: '카드 더미', container: '보관함', unknown: '미확인 구성물',
};
const variants: Record<string, string> = {
  forest: '숲', pasture: '목초지', hills: '구릉지', fields: '농경지', mountains: '산', desert: '사막',
  lumber: '목재', wool: '양털', brick: '벽돌', grain: '곡물', ore: '광석', knight: '기사', 'road-building': '도로 건설',
  'year-of-plenty': '풍년', monopoly: '독점', 'victory-point': '승점', unknown: '미확인',
};

function Pine({ x, y, scale = 1, light = false }: { x: number; y: number; scale?: number; light?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`} strokeLinejoin="round">
    <path d="M-2 21h4v13h-4Z" fill="#806241"/>
    <path d="M0-15-12 3h6l-13 20H19L6 3h6Z" fill={light ? '#64854d' : '#375e40'} stroke="#36573b" strokeWidth="1"/>
    <path d="M0-11-1 4l-9 15H2L7 6H3Z" fill={light ? '#86a261' : '#567d4a'}/>
  </g>;
}

/** Landscape art stays inside the hex; resource cards use their own material silhouettes. */
function Landscape({ kind }: { kind: string }) {
  switch (kind) {
    case 'forest': return <g>
      <path d="M23 63q18-21 36-11 21-16 38-3v30L60 101 23 79Z" fill="#6f8a53"/>
      <path d="M24 78q25-19 71-13L60 99Z" fill="#577443"/>
      <path d="M65 51q-14 15-2 25l13 11-13 11" fill="none" stroke="#b3ac73" strokeWidth="5"/>
      <Pine x={42} y={42} scale={.66} light/><Pine x={78} y={43} scale={.65}/>
      <Pine x={31} y={57} scale={.68}/><Pine x={57} y={42} scale={.9}/><Pine x={79} y={65} scale={.76} light/>
      <path d="m38 82 5-3m6 12 5-3m28-13 5-2" stroke="#a3b27a" strokeWidth="1.4"/>
    </g>;
    case 'pasture': return <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 59q17-24 37-11 20-22 37-1v32L60 101 23 79Z" fill="#91af69"/>
      <path d="M23 76q34-26 74-11v14L60 101Z" fill="#6f934e"/>
      <path d="M31 80q32-12 55-7" fill="none" stroke="#c3d28c" strokeWidth="2"/>
      <g transform="translate(39 49)" stroke={ink} strokeWidth="1.4">
        <path d="M2 15v10m17-10v10" strokeWidth="2.6"/>
        <path d="M-4 4q0-6 6-6 4-6 9-2 8-3 10 4 7 2 5 8-1 7-9 8H4Q-7 17-4 4Z" fill={cream}/>
        <path d="M-6 2q-7-3-8 3v7q0 5 6 5h5V5Z" fill="#52604a"/>
        <path d="m-9 2 3-5 4 5" fill="#52604a"/><circle cx="-9" cy="7" r="1" fill={cream} stroke="none"/>
      </g>
      <path d="m78 50 2-5m-2 5-4-3m9 32 2-6m-2 6-4-3m-48-7 2-5" fill="none" stroke="#526f3e" strokeWidth="1.8"/>
      <circle cx="74" cy="85" r="1.4" fill="#e5d190"/><circle cx="37" cy="43" r="1.2" fill={cream}/>
    </g>;
    case 'hills': return <g strokeLinejoin="round">
      <path d="m23 70 14-30 13 9 14-20 17 12 16 34-37 26Z" fill="#b87754"/>
      <path d="m40 57 24-28 17 12 10 23-24-13Z" fill="#dda477"/>
      <path d="m23 70 17-13 27-6-7 16 33 11-33 23Z" fill="#a76145"/>
      <path d="m28 72 31 8 29-7m-49-9 24 7 15-4m-26 23 15-5" fill="none" stroke="#e2b185" strokeWidth="2"/>
      <path d="m39 43 7 7m20-15 8 9m-4 15 12 4" stroke="#8b513c" strokeWidth="1.2"/>
      <g transform="translate(39 60) scale(.48)"><ResourceSymbol variant="brick"/></g>
    </g>;
    case 'fields': return <g strokeLinejoin="round">
      <path d="M23 54q39-12 74 4v21L60 101 23 79Z" fill="#c29b49"/>
      <path d="m26 60 58 26m-51-31 60 24m-66-9 45 21m-35-8 23 12" stroke="#eed290" strokeWidth="4"/>
      <path d="m30 62 52 23m-48-29 55 23m-59-8 40 19" stroke="#a8823d" strokeWidth="1"/>
      <g transform="translate(39 28) scale(.58)"><ResourceSymbol variant="grain"/></g>
      <path d="M28 49q14-8 24-7m24 9 15 4" stroke="#f3dca3" strokeWidth="1.5" fill="none"/>
    </g>;
    case 'mountains': return <g strokeLinejoin="round">
      <path d="m23 78 22-43 16 18 18-27 18 53-37 22Z" fill="#75897f"/>
      <path d="m37 81 24-49 29 52-30 17Z" fill="#aeb9ab"/>
      <path d="m61 32-1 69 30-17Z" fill="#7d9187"/>
      <path d="m49 56 12-24 14 25-10-5-6 8-4-6Zm21-14 9-16 8 23-8-6-4 4Z" fill="#edf0db"/>
      <path d="m37 51 8-16 8 17-9-4-4 5Z" fill="#d9dfca"/>
      <path d="m36 79 8-13m31 19 5-12" stroke="#526c60" strokeWidth="1.7"/>
      <path d="m27 83 17-7 8 10-10 7Z" fill="#586f66"/><path d="m28 83 11-3 5 9" fill="none" stroke="#94a697"/>
    </g>;
    default: return <g strokeLinecap="round">
      <circle cx="78" cy="35" r="7" fill="#f4dda3"/>
      <path d="M23 65q17-18 41-8 18-15 33-7v29L60 101 23 79Z" fill="#cbaa74"/>
      <path d="M23 80q36-29 74-12v11L60 101Z" fill="#e9cc92"/>
      <path d="M26 66q20-17 42-7m-32 24q24-15 53-10m-35 18 13-5" fill="none" stroke="#aa8959" strokeWidth="1.7"/>
      <path d="M41 66V42q0-4 3-4t3 4v13h7V44m-12 7h-8V40" fill="none" stroke="#7b8860" strokeWidth="4" strokeLinejoin="round"/>
      <path d="m74 59 3-1m-5 27 4-1" stroke="#95784f" strokeWidth="1.5"/>
    </g>;
  }
}

/** 72 × 72 material silhouettes, readable independently of the landscape. */
function ResourceSymbol({ variant }: { variant: string }) {
  switch (variant) {
    case 'lumber': return <g stroke="#4c583e" strokeWidth="1.7" strokeLinejoin="round">
      <path d="m8 30 38-19q12-3 17 8t-3 15L22 53Z" fill="#6f8050"/>
      <path d="m8 45 35-18q11-3 16 7t-3 16L22 68Z" fill="#526e44"/>
      <path d="m13 30 34-17m-29 34 29-15m-19 23 25-12" fill="none" stroke="#97a36e" strokeWidth="2"/>
      <ellipse cx="17" cy="41" rx="11" ry="14" transform="rotate(-25 17 41)" fill="#d6b47c"/>
      <ellipse cx="21" cy="55" rx="11" ry="14" transform="rotate(-25 21 55)" fill="#e1c38e"/>
      <ellipse cx="21" cy="55" rx="5.5" ry="7.5" transform="rotate(-25 21 55)" fill="none" stroke="#a38351"/>
      <path d="m16 39 3 5m0 9 4 5" stroke="#a38351"/>
    </g>;
    case 'brick': return <g stroke="#784d38" strokeWidth="1.7" strokeLinejoin="round">
      <path d="m6 48 25-12 35 10-25 13Z" fill="#dfaa7e"/>
      <path d="M6 48v13l35 10V59Z" fill="#b77150"/><path d="m41 59 25-13v13L41 71Z" fill="#97583f"/>
      <path d="m13 29 26-12 29 10-26 13Z" fill="#e1ae84"/>
      <path d="M13 29v14l29 10V40Z" fill="#c4815c"/><path d="m42 40 26-13v14L42 53Z" fill="#a66547"/>
      <path d="m18 33 18 6m-23 15 22 7m14-18 12-6" stroke="#ebbd94" fill="none"/>
    </g>;
    case 'wool': return <g stroke="#7f8966" strokeWidth="1.6" strokeLinecap="round">
      <path d="M10 39q-2-10 6-13-1-10 10-11 7-9 16-3 10-4 15 5 12 1 11 12 8 10 0 19-1 11-13 11-8 8-18 3-13 4-19-5Q5 55 10 39Z" fill={cream}/>
      <path d="M23 27q12-13 23-4m-29 14q16-17 35-9m-35 18q19-18 40-9m-33 16q18-16 36-9m-23 16 22-11M24 18q-3 22 23 41M38 15q-6 16 22 38" fill="none"/>
      <path d="m18 54-6 9h16" fill="none"/>
    </g>;
    case 'grain': return <g strokeLinecap="round" strokeLinejoin="round">
      {[20, 36, 52].map((x, index) => <g key={x} transform={`translate(${x} ${index === 1 ? 0 : 6})`}>
        <path d="M0 62V9" stroke="#8b7138" strokeWidth="2.2"/>
        <path d="M0 17Q-10 16-9 7q9 0 9 10Zm0 12Q-12 27-11 18 0 18 0 29Zm0 12Q-12 39-11 30 0 30 0 41Zm0-24Q10 16 9 7 0 7 0 17Zm0 12Q12 27 11 18 0 18 0 29Zm0 12Q12 39 11 30 0 30 0 41Z" fill="#ebc56e" stroke="#a4833c" strokeWidth="1.2"/>
      </g>)}
      <path d="m20 51 32 5m-32 1 32-2" stroke="#997144" strokeWidth="3"/>
    </g>;
    case 'ore': return <g stroke="#51685f" strokeWidth="1.7" strokeLinejoin="round">
      <path d="m7 49 9-23 21-5 15 19-10 26-24 2Z" fill="#81978b"/>
      <path d="m16 26 15 14 21 0-15-19Zm15 14-13 28 24-2 10-26Z" fill="#a9b8a7"/>
      <path d="m40 28 8-15 16 3 6 20-10 17-17-5Z" fill="#71877f"/>
      <path d="m48 13 6 20 16 3-6-20Z" fill="#c0c8b4"/>
      <path d="m9 50 22-10m23-7 6 20" fill="none"/>
      <path d="m24 30 6 6m25-17 4 6" stroke="#d2d9c1"/>
    </g>;
    default: return <UnknownSymbol/>;
  }
}

function UnknownSymbol() {
  return <g><path d="m36 8 25 14v29L36 65 11 51V22Z" fill="#e6dec9" stroke="#89917a" strokeWidth="1.5" strokeDasharray="4 3"/><text x="36" y="49" textAnchor="middle" fill="#6b7864" fontSize="33" fontWeight="600" fontFamily="Georgia,serif">?</text></g>;
}

function NumberFace({ number, small = false }: { number?: number | null; small?: boolean }) {
  const finite = typeof number === 'number' && Number.isFinite(number);
  const red = number === 6 || number === 8;
  const pips = finite && number >= 2 && number <= 12 && number !== 7 ? Math.max(0, 6 - Math.abs(7 - number)) : 0;
  const textColor = red ? 'var(--art-red-number, #a84632)' : ink;
  return <g>
    <circle cx="60" cy="64" r="37" fill="#bba579" stroke="#877652" strokeWidth="1.6"/>
    <circle cx="60" cy="59" r="37" fill={cream} stroke="#8e805e" strokeWidth="1.6"/>
    <circle cx="60" cy="59" r="32" fill="none" stroke="#decca1" strokeWidth="1.1"/>
    <path d="M34 42q18-19 42-9" fill="none" stroke="#fffdf5" strokeWidth="2" strokeLinecap="round"/>
    <text data-art-number="" x="60" y={small ? '72' : '66'} textAnchor="middle" fill={textColor} fontSize={small ? '43' : '38'} fontWeight="700" fontFamily="Georgia,'Times New Roman',serif">{finite ? number : '–'}</text>
    {!small && Array.from({ length: pips }, (_, index) => <circle key={index} cx={60 + (index - (pips - 1) / 2) * 7} cy="80" r="2.2" fill={textColor}/>)}
  </g>;
}

function DevelopmentSymbol({ variant }: { variant: string }) {
  switch (variant) {
    case 'knight': return <g stroke={ink} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
      <path d="m29 15 6-11 14 4-3 11" fill="#b7674b"/>
      <path d="M17 34q-1-22 20-22 18 0 19 19v24H21Z" fill="#aeb9a8"/>
      <path d="M36 14v39h19V31q-1-14-19-17Z" fill="#7b9185" stroke="none"/>
      <path d="m15 31 38-4 4 12-36 7Z" fill="#e7e6ce"/>
      <path d="m23 35 8-1m7-1 10-1" strokeWidth="2.3"/>
      <path d="m17 51 9 13h26l7-14-19 7Z" fill="#657c69"/>
      <path d="m60 57 7-37m-11 27 13 3" stroke="#b49859" strokeWidth="3"/>
    </g>;
    case 'road-building': return <g stroke={ink} strokeWidth="1.6" strokeLinejoin="round">
      <path d="m6 49 33-30 10 2v11L16 62 6 59Z" fill="#b87150"/><path d="m6 49 33-30 10 2-33 30Z" fill="#dfad7f"/>
      <path d="m31 52 25-25 10 2v10L41 64 31 62Z" fill="#9f6245"/><path d="m31 52 25-25 10 2-25 25Z" fill="#d49a6b"/>
      <path d="m10 15 7-8 8 8v10H10Z" fill="#91a374"/><path d="M20 41 33 29m12 18 9-9" stroke="#f5d5a4"/>
    </g>;
    case 'year-of-plenty': return <g stroke={ink} strokeWidth="1.6" strokeLinejoin="round">
      <path d="M13 53q-10-21 8-30l19 10q-17 22-10 31Z" fill="#ba8d51"/>
      <path d="M21 26q-5 15 7 28m-12-15 15 7m-13 3 12 4" fill="none" stroke="#e4bf7c"/>
      <ellipse cx="40" cy="29" rx="21" ry="12" transform="rotate(25 40 29)" fill="#765d36"/>
      <path d="m26 25 4-13 10 4 3 13Z" fill="#769052"/><path d="m43 30 2-21 7 3 1 21" fill="#ebc36b"/>
      <path d="m54 35 7-17 7 7-7 16Z" fill="#a3b4a2"/>
      <circle cx="48" cy="36" r="8" fill="#cb855d"/><path d="m50 28 4-5" stroke="#769052" strokeWidth="3"/>
    </g>;
    case 'monopoly': return <g stroke={ink} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
      <path d="m26 13 9 8 10-8 5 3-7 13q13 11 13 25 0 10-20 10T16 54q0-14 14-25l-8-13Z" fill="#b9a16b"/>
      <path d="M27 29h17m-14 8q-9 13-7 18" fill="none" stroke="#e2c58a" strokeWidth="2.5"/>
      <circle cx="36" cy="47" r="9" fill={gold}/><path d="m36 41 5 3v6l-5 3-5-3v-6Z" fill={cream} stroke="none"/>
      <path d="M3 33h11m-4-4 4 4-4 4m59-4H58m4-4-4 4 4 4" fill="none" stroke="#788e5e" strokeWidth="2.4"/>
    </g>;
    case 'victory-point': return <g stroke={ink} strokeWidth="1.7" strokeLinejoin="round">
      <path d="M11 62V39l25-18 25 18v23Z" fill="#b4ba96"/>
      <path d="m7 39 29-22 29 22H7Z" fill="#71866a"/>
      <path d="M19 43v17m12-17v17m12-17v17m12-17v17" stroke={cream} strokeWidth="4"/>
      <path d="M9 63h54" strokeWidth="3"/>
      <path d="m24 14 3-10 9 6 9-6 3 10-12 5Z" fill={gold}/>
    </g>;
    default: return <UnknownSymbol/>;
  }
}

function Card({ development, variant, color }: { development?: boolean; variant: string; color?: string }) {
  const material = resourceTerrain[variant];
  const accent = color || (development ? 'var(--art-deck, #536e53)' : materialColors[material] || '#b4b8a0');
  return <g strokeLinejoin="round">
    <rect x="26" y="13" width="72" height="98" rx="5" fill="#b4a58a" opacity=".35"/>
    <rect x="22" y="9" width="72" height="98" rx="5" fill={cream} stroke={ink} strokeWidth="1.7"/>
    <rect x="27" y="14" width="62" height="88" rx="2" fill="none" stroke="#b8a373" strokeWidth="1"/>
    <path d="M28 10h60q5 0 5 5v15H23V15q0-5 5-5Z" fill={accent}/>
    <path d="M28 31h60v51H28Z" fill={development ? '#e2e5cf' : materialColors[material] || '#e6e4d6'} opacity=".65"/>
    <path d="m29 78 29-44 29 44Z" fill={cream} opacity=".2"/>
    <g transform="translate(29 29) scale(.8)">{development ? <DevelopmentSymbol variant={variant}/> : <ResourceSymbol variant={variant}/>}</g>
    <path d="M33 89h50m-41 6h32" stroke="#c1ad81" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="m58 16 6 4-6 4-6-4Z" fill={cream}/>
    <circle cx="33" cy="95" r="1.3" fill={accent}/><circle cx="83" cy="95" r="1.3" fill={accent}/>
  </g>;
}

function CountBadge({ number }: { number: number }) {
  return <g><rect x="70" y="77" width="36" height="27" rx="4" fill={cream} stroke={ink} strokeWidth="1.6"/><text data-art-number="" x="88" y="96" textAnchor="middle" fill={ink} fontSize="18" fontWeight="700" fontFamily="Georgia,serif">{number}</text></g>;
}

/** Illustrated UI artwork only. Source photographs are always separate evidence. */
export function ComponentArt({ kind, variant, color, label, number, size = 64, className = '' }: ComponentArtProps) {
  const knownKind = Object.hasOwn(names, kind) ? kind : 'unknown';
  const resolvedVariant = variant || (knownKind === 'terrain' ? 'forest' : knownKind === 'resource-card' ? 'lumber' : knownKind === 'development-card' ? 'unknown' : 'default');
  const owner = color || coral;
  const finiteNumber = typeof number === 'number' && Number.isFinite(number);
  let art: ReactNode;
  switch (knownKind) {
    case 'terrain': {
      const terrain = Object.hasOwn(materialColors, resolvedVariant) ? resolvedVariant : 'desert';
      art = <g strokeLinejoin="round"><path d={hex} transform="translate(0 4)" fill="#9e8d63" stroke="#786e50" strokeWidth="1.5"/><path d={hex} fill={color || materialColors[terrain]} stroke={ink} strokeWidth="1.5"/><path d="m24 37 34-20q2-1 4 0l34 20" fill="none" stroke={cream} strokeWidth="1.7" opacity=".5"/><Landscape kind={terrain}/><path d="m24 81 34 20q2 1 4 0l34-20" fill="none" stroke={cream} strokeWidth="1.1" opacity=".35"/>{finiteNumber && <g transform="translate(37 61) scale(.39)"><NumberFace number={number} small/></g>}</g>;
      break;
    }
    case 'harbor': art = <g strokeLinejoin="round"><circle cx="60" cy="60" r="43" fill={cream} stroke="#527e85" strokeWidth="2"/><circle cx="60" cy="60" r="37" fill="#e3efeb" stroke="#a7c6bf"/>{resourceTerrain[resolvedVariant] ? <g transform="translate(40 17) scale(.56)"><ResourceSymbol variant={resolvedVariant}/></g> : resolvedVariant === 'generic' ? <g fill="none" stroke="#527e85" strokeWidth="3" strokeLinecap="round"><circle cx="60" cy="31" r="5"/><path d="M60 36v32m-18-14q0 14 18 14t18-14M50 44h20m-8 21-2 4-2-4"/></g> : <text x="60" y="61" textAnchor="middle" fontSize="32" fill={ink}>?</text>}<text data-art-number="" x="60" y="88" textAnchor="middle" fontSize="24" fontWeight="700" fill={ink}>{finiteNumber ? number : '?'}:1</text></g>; break;
    case 'number-token': art = <NumberFace number={number}/>; break;
    case 'road': art = <g stroke={ink} strokeWidth="1.7" strokeLinejoin="round"><path d="m15 54 12-10h77v21L92 76H15Z" fill={owner}/><path d="m15 54 12-10h77L92 55Z" fill={cream} opacity=".28" stroke="none"/><path d="m92 55 12-11v21L92 76Z" fill="#203529" opacity=".22" stroke="none"/><path d="M15 55h77v21M92 55l12-11" fill="none"/><path d="M23 61h51m-40 8h49" stroke="#22392d" opacity=".23" strokeWidth="1.1"/><path d="m26 49 61-1" stroke={cream} opacity=".5"/></g>; break;
    case 'settlement': art = <g stroke={ink} strokeWidth="1.7" strokeLinejoin="round"><path d="m20 57 26-29 24-12 26 29v39L72 97H20Z" fill={owner}/><path d="m46 28 24-12 26 29-24 13Z" fill={cream} opacity=".2" stroke="none"/><path d="m72 58 24-13v39L72 97Z" fill="#1d3529" opacity=".21" stroke="none"/><path d="m20 57 26-29 26 30v39m0-39 24-13M46 28l24-12" fill="none"/><path d="m25 57 21-23 19 21M26 66v24h37" fill="none" stroke={cream} opacity=".38" strokeWidth="1.5"/><path d="M33 72h21m-20 8h15m29-15 11-6m-10 17 10-6" stroke="#20392d" opacity=".2" strokeWidth="1"/></g>; break;
    case 'city': art = <g stroke={ink} strokeWidth="1.7" strokeLinejoin="round"><path d="M15 96V62l19-19 19 18V35l18-19 14-7 23 23v55L91 97Z" fill={owner}/><path d="m15 62 19-19 14-7 19 18-14 7-19-18Zm38-27 18-19 14-7 23 23-17 9-20-25Z" fill={cream} opacity=".24" stroke="none"/><path d="m91 41 17-9v55L91 97Z" fill="#20372b" opacity=".23" stroke="none"/><path d="m15 62 19-19 19 18V35l18-19 20 25v56m0-56 17-9M71 16l14-7" fill="none"/><path d="M22 68v21h24m14-49v49h24" stroke={cream} fill="none" opacity=".4" strokeWidth="1.5"/><path d="M28 75h15m23-27h16m-16 13h12m-12 13h16" stroke="#22392d" strokeWidth="1" opacity=".23"/></g>; break;
    case 'robber': art = <g stroke={ink} strokeWidth="1.7" strokeLinejoin="round"><path d="M47 39q-1 21-10 36L26 94q-2 7 6 9h56q8-2 6-9L83 75q-9-15-10-36Z" fill={color || '#596356'}/><circle cx="60" cy="27" r="14" fill={color || '#596356'}/><path d="M61 42q0 31 23 55h7L81 76q-8-15-8-35Z" fill="#172e25" opacity=".24" stroke="none"/><path d="M53 20q-5 2-5 8m4 21q-3 24-15 41" fill="none" stroke={cream} strokeWidth="3.2" opacity=".28" strokeLinecap="round"/><path d="M43 44h34M35 88h50M29 97h62" fill="none" stroke="#253d30" opacity=".6"/><path d="M40 90h37" stroke={cream} opacity=".2"/></g>; break;
    case 'resource-card': art = <Card variant={resolvedVariant} color={color}/>; break;
    case 'development-card': art = <Card development variant={resolvedVariant} color={color}/>; break;
    case 'token': art = <g><circle cx="60" cy="65" r="35" fill="#9f885b" stroke={ink} strokeWidth="1.5"/><circle cx="60" cy="59" r="35" fill={color || '#d7bd7e'} stroke={ink} strokeWidth="1.7"/><circle cx="60" cy="59" r="28" fill="none" stroke={cream} strokeWidth="1.4" opacity=".75"/>{finiteNumber ? <text data-art-number="" x="60" y="70" textAnchor="middle" fill={ink} fontSize="33" fontWeight="700" fontFamily="Georgia,serif">{number}</text> : <path d="m60 42 14 8v17l-14 8-14-8V50Z" fill={cream} stroke={ink} strokeWidth="1.5"/>}</g>; break;
    case 'deck': art = <g stroke={ink} strokeWidth="1.6" strokeLinejoin="round"><rect x="30" y="22" width="66" height="86" rx="4" fill="#d2c4a5"/><rect x="25" y="16" width="66" height="86" rx="4" fill={cream}/><path d="M92 33v63m-3-58v55" stroke="#a99b7d" strokeWidth=".8"/><rect x="20" y="10" width="66" height="86" rx="4" fill={color || '#607957'}/><rect x="26" y="16" width="54" height="74" rx="1" fill="none" stroke="#d5c58f" strokeWidth="1.4"/><path d="m31 21 43 64m0-64L31 85" stroke={cream} opacity=".15"/><path d="m53 26 20 12v28L53 78 33 66V38Z" fill="#e6d9ad"/>{variant === 'development' ? <g transform="translate(30 28) scale(.64)"><DevelopmentSymbol variant="knight"/></g> : <g transform="translate(32 29) scale(.58)"><ResourceSymbol variant="grain"/></g>}{finiteNumber && <CountBadge number={number}/>}</g>; break;
    case 'container': art = <g stroke={ink} strokeWidth="1.6" strokeLinejoin="round"><path d="m16 43 24-22h43l22 22v47l-22 12H27l-11-9Z" fill={color || '#b99a6b'}/><path d="m16 43 24-22h43l22 22-22 12H27Z" fill={cream} opacity=".22" stroke="none"/><path d="m83 55 22-12v47l-22 12Z" fill="#584d32" opacity=".2" stroke="none"/><path d="m16 43 11 12h56l22-12M27 55v47m56-47v47" fill="none"/><path d="m29 42 19-16m-7 21 22-21m5 21 16-12M33 91h42m-38-8h35" stroke="#705b38" opacity=".45" strokeWidth="1"/><path d="M49 52h15v17H49Z" fill="#ad9254"/><path d="M53 57h7v7h-7Z" fill="#55664c" stroke="none"/><rect x="39" y="74" width="32" height="14" rx="1.5" fill={cream} stroke="none"/><path d="M46 81h17" stroke="#a7956f"/>{finiteNumber && <CountBadge number={number}/>}</g>; break;
    default: art = <g><path d={hex} transform="translate(0 3)" fill="#c5bba0" opacity=".5"/><path d={hex} fill={paper} stroke="#89917b" strokeWidth="1.5" strokeLinejoin="round" strokeDasharray="5 4"/><g transform="translate(24 23)"><UnknownSymbol/></g></g>;
  }
  const accessibleLabel = label || [variants[resolvedVariant], names[knownKind], finiteNumber ? String(number) : ''].filter(Boolean).join(' ');
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={accessibleLabel} className={`component-art component-art--${knownKind} ${className}`.trim()} data-art-kind={knownKind} data-art-variant={resolvedVariant}>
    <title>{accessibleLabel}</title>{art}
  </svg>;
}
