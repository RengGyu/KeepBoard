import React, { useId, type ReactNode } from 'react';

export interface CarcassonneTileFeatures {
  road?: 'straight' | 'bend' | 'junction' | 'south';
  city?: 'cap' | 'corner';
  monastery?: boolean;
}

/** Drawing presets, not a catalog of actual printed tiles or a connectivity/rules dictionary. */
export const CARCASSONNE_TILE_PRESETS = {
  field: {},
  'road-straight': { road: 'straight' },
  'road-bend': { road: 'bend' },
  'road-junction': { road: 'junction' },
  'city-cap': { city: 'cap' },
  'city-corner': { city: 'corner' },
  'city-road': { city: 'cap', road: 'south' },
  monastery: { monastery: true },
  'monastery-road': { monastery: true, road: 'south' },
} satisfies Record<string, CarcassonneTileFeatures>;

export interface CarcassonneArtProps {
  kind: 'tile' | 'follower' | 'score-marker' | 'tile-stack';
  variant?: keyof typeof CARCASSONNE_TILE_PRESETS | 'standing' | 'farmer' | 'unknown';
  features?: CarcassonneTileFeatures;
  rotation?: 0 | 90 | 180 | 270;
  color?: string;
  size?: number;
  label?: string;
  className?: string;
}

const ink = 'var(--art-ink, #33483c)';
const cream = 'var(--art-cream, #fff9e9)';
const paper = 'var(--art-paper, #eee1c5)';
const coral = 'var(--art-coral, #bc6048)';
const meadow = 'var(--cc-meadow, #acc085)';
const wall = 'var(--cc-wall, #d5bd89)';
const roof = 'var(--cc-roof, #b96c50)';
const names: Record<string, string> = { field: '들판', 'road-straight': '곧은 길', 'road-bend': '굽은 길', 'road-junction': '갈림길', 'city-cap': '도시 · 성벽', 'city-corner': '연결 도시', 'city-road': '도시와 길', monastery: '수도원', 'monastery-road': '수도원과 길', unknown: '미확인 타일' };
const meeple = 'M48 40C39 35 39 22 45 16 52 8 65 8 73 15 80 23 77 36 68 40L72 47 92 49Q100 50 99 57T90 64L77 63 86 98Q88 105 80 106H66L60 83 54 106H40Q32 105 34 98L43 63 29 64Q21 64 20 57T27 49L47 47Z';

function Meadow() {
  return <g>
    <path d="M8 8h104v104H8Z" fill={meadow}/>
    <path d="M8 74Q31 53 60 68t52-6v50H8Z" fill="#91ad70"/>
    <path d="M8 95q36-25 104-6v23H8Z" fill="#7f9d63" opacity=".55"/>
    <path d="m21 32 3-7m-3 7-5-4m12 64 3-6m-3 6-5-2m66-67 3-7m-3 7-5-3m12 56 3-7m-3 7-5-3" fill="none" stroke="#608050" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="m14 52 11-3m56 50 12-3m-52-79 8-2" stroke="#d2dcaa" strokeWidth="1.6" strokeLinecap="round"/>
    <g fill={cream} opacity=".75"><circle cx="31" cy="28" r="1.1"/><circle cx="86" cy="76" r="1.1"/><circle cx="35" cy="88" r="1"/></g>
  </g>;
}

function Road({ kind }: { kind: NonNullable<CarcassonneTileFeatures['road']> }) {
  const path = kind === 'straight' ? 'M60 5V115' : kind === 'bend' ? 'M60 5V47Q60 60 73 60H115' : kind === 'junction' ? 'M60 5V115M60 60H115' : 'M60 50V115';
  return <g fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} stroke="#8f895e" strokeWidth="17"/>
    <path d={path} stroke="#ebdbaf" strokeWidth="13"/>
    <path d={path} stroke={cream} strokeWidth="2" opacity=".6"/>
    {kind === 'junction' && <circle cx="60" cy="60" r="8" fill="#e8d5a6" stroke="#d4bf91" strokeWidth="1"/>}
    <path d={kind === 'bend' ? 'm57 25 6 1m18 31 1 6' : 'm57 27 6 1m-6 63 6 1'} stroke="#aa9565" strokeWidth="1.3"/>
  </g>;
}

function Roof({ x, y, scale = 1, ochre = false }: { x: number; y: number; scale?: number; ochre?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`} stroke={ink} strokeWidth="1.1" strokeLinejoin="round">
    <path d="M-9 0H9V14H-9Z" fill="#ead7a7"/>
    <path d="m-12 0 12-12L12 0Z" fill={ochre ? '#c6a15d' : roof}/>
    <path d="M0-12 12 0H0Z" fill="#704e39" opacity=".2" stroke="none"/>
    <path d="M-2 14V7q2-3 4 0v7" fill="#6c7050" stroke="none"/>
    <path d="m-5-3 4-4" fill="none" stroke={cream} opacity=".45"/>
  </g>;
}

function City({ kind, gate }: { kind: 'cap' | 'corner'; gate?: boolean }) {
  const cap = kind === 'cap';
  const boundary = cap ? 'M8 38Q60 70 112 38' : 'M8 34Q43 40 65 70T112 105';
  return <g strokeLinejoin="round">
    <path d={cap ? 'M8 8H112V38Q60 70 8 38Z' : 'M8 8H112V105Q88 98 65 70T8 34Z'} fill={wall}/>
    <path d={cap ? 'M8 9h104v9H8Z' : 'M8 9h104v96l-8-4V17H8Z'} fill="#e9d7a8"/>
    <Roof x={32} y={24} scale={.78}/><Roof x={59} y={26} scale={.95} ochre/><Roof x={87} y={23} scale={.72}/>
    {!cap && <><Roof x={91} y={59} scale={.88}/><Roof x={97} y={85} scale={.63} ochre/></>}
    <path d={boundary} fill="none" stroke="#876f4d" strokeWidth="8"/>
    <path d={boundary} fill="none" stroke="#e8d6aa" strokeWidth="5"/>
    <path d={boundary} fill="none" stroke="#6d714e" strokeWidth="1.2" strokeDasharray="1 9"/>
    <g fill="#e5d09c" stroke={ink} strokeWidth="1.1">
      <path d="M14 33v10l9 4V36l-3-2-3 2Z"/>
      {cap ? <path d="M97 35v12l9-4V32l-3 2-3-1Z"/> : <path d="m91 88 8 7 7 2v-8l-4-2-3 1-4-5Z"/>}
    </g>
    {gate && <path d="M54 55V47q6-8 12 0v8" fill="#69704f" stroke="#d1bb8a" strokeWidth="2"/>}
  </g>;
}

function Monastery() {
  return <g stroke={ink} strokeWidth="1.4" strokeLinejoin="round">
    <path d="M29 85V55l22-18 30 7 12 18v23Z" fill="#e9d7ae"/>
    <path d="M65 54v31h28V62L81 44Z" fill="#c1b88b" stroke="none"/>
    <path d="m25 56 25-24 36 10 12 21-33-8-15-15-18 19Z" fill={roof}/>
    <path d="m50 32 15 23 33 8-12-21Z" fill="#94563f" stroke="none"/>
    <path d="M43 55V32l10-9 10 9v26Z" fill="#e4cf9e"/>
    <path d="m39 33 14-16 14 16Z" fill="#bc8d4d"/>
    <path d="M49 49V38q4-6 8 0v11Z" fill="#687354" strokeWidth="1"/>
    <path d="M47 85V71q7-11 14 0v14Z" fill="#687354"/>
    <path d="M77 69v8m8-7v8M35 66v8" stroke="#a29262" strokeWidth="2"/>
    <path d="M32 85h58m-34 4h9" stroke="#677b50"/>
    <path d="M53 16v-6m-3 2h6" fill="none" strokeWidth="1.5" strokeLinecap="round"/>
  </g>;
}

/** Reusable clipped landscape layers. Their geometry is illustrative, never a gameplay feature graph. */
export function CarcassonneTileLayers({ road, city, monastery }: CarcassonneTileFeatures) {
  return <><Meadow/>{road && <Road kind={road}/>} {city && <City kind={city} gate={road === 'south'}/>} {monastery && <Monastery/>}</>;
}

function Follower({ color, farmer }: { color: string; farmer: boolean }) {
  return <g>
    <ellipse cx="61" cy={farmer ? 100 : 110} rx={farmer ? 43 : 31} ry="3.5" fill="#7d7857" opacity=".18"/>
    <g transform={farmer ? 'rotate(90 60 60)' : undefined} strokeLinejoin="round">
      <path d={meeple} transform="translate(3 4)" fill="#53634a" stroke={ink} strokeWidth="1.4"/>
      <path d={meeple} fill={color} stroke={ink} strokeWidth="1.7"/>
      <path d="M68 41 72 48 91 50q7 0 7 7l-23 4 9 39q1 4-4 5H68l-6-24-2-4 10-15Z" fill="#20392c" opacity=".2"/>
      <path d="M49 19q-6 7-1 14m-17 21 17-2m0 14-7 32m15-46h10" fill="none" stroke={cream} strokeWidth="2.4" opacity=".4" strokeLinecap="round"/>
      <path d="m52 59 12 1m-15 8 5 1m8-45 5 1m-15 65 2-8" fill="none" stroke="#20392c" strokeWidth="1" opacity=".2"/>
    </g>
  </g>;
}

export function CarcassonneArt({ kind, variant, features, rotation = 0, color = coral, size = 64, label, className = '' }: CarcassonneArtProps) {
  const clipId = `cc-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  let art: ReactNode;
  if (kind === 'tile') {
    const preset = features ?? CARCASSONNE_TILE_PRESETS[variant as keyof typeof CARCASSONNE_TILE_PRESETS];
    art = <g strokeLinejoin="round">
      <rect x="8" y="12" width="104" height="104" rx="4" fill="#a4936d" stroke="#6c7355" strokeWidth="1.4"/>
      <defs><clipPath id={clipId}><rect x="8" y="8" width="104" height="104" rx="3.5"/></clipPath></defs>
      <g clipPath={`url(#${clipId})`} transform={`rotate(${rotation} 60 60)`}>
        {preset ? <CarcassonneTileLayers {...preset}/> : <><rect x="8" y="8" width="104" height="104" fill={paper}/><rect x="21" y="21" width="78" height="78" rx="2" fill="none" stroke="#9a9b79" strokeWidth="1.4" strokeDasharray="4 4"/><text x="60" y="77" textAnchor="middle" fill={ink} fontFamily="Georgia,serif" fontSize="48">?</text></>}
      </g>
      <rect x="8" y="8" width="104" height="104" rx="3.5" fill="none" stroke={ink} strokeWidth="1.5"/>
      <path d="M14 10h92M10 14v92" fill="none" stroke={cream} strokeWidth="1" opacity=".4"/>
    </g>;
  } else if (kind === 'tile-stack') {
    art = <g stroke={ink} strokeWidth="1.5" strokeLinejoin="round">
      <rect x="24" y="24" width="84" height="84" rx="3.5" fill="#bead86"/>
      <rect x="20" y="19" width="84" height="84" rx="3.5" fill={paper}/>
      <rect x="15" y="14" width="84" height="84" rx="3.5" fill="#617b58"/>
      <rect x="22" y="21" width="70" height="70" rx="1.5" fill="none" stroke="#d3c894"/>
      <path d="m57 31 22 22-22 22-22-22Z" fill="#e0d2aa" stroke="none"/>
      <path d="M47 43h20v20H47Z" fill="#879b6b" strokeWidth="1"/>
      <path d="M104 35v60m-6 9h-61" stroke="#877e5c" strokeWidth=".8"/>
    </g>;
  } else art = <Follower color={color} farmer={kind === 'follower' && variant === 'farmer'}/>;
  const accessible = label || (kind === 'tile' ? features ? '조합 타일' : names[variant || ''] || '미확인 타일' : kind === 'tile-stack' ? '뽑을 타일 · 뒷면' : kind === 'score-marker' ? '점수 말' : variant === 'farmer' ? '누운 농부 미플' : '선 미플');
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={accessible} className={`carcassonne-art ${className}`.trim()} data-cc-kind={kind} data-cc-variant={variant || 'default'} data-cc-rotation={kind === 'tile' ? rotation : undefined}>
    <title>{accessible}</title>{art}
  </svg>;
}
