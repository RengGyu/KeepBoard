import json,glob,sys
V={'public':'P','owner':'O','hidden':'H','own-hidden':'X','role-limited':'R'}
idx=open('docs/research/game-specs-120/INDEX.md').read()
files=sorted(glob.glob('docs/research/game-specs-120/games/*.json'))
a,b=int(sys.argv[1]),int(sys.argv[2])
for f in files[a:b]:
    d=json.load(open(f)); g=d['game_id']
    lvl=next((l for l in idx.splitlines() if f'`{g}`' in l or f'({g}' in l or f'/{g}.json' in l),'')
    print(f"### {g} | {d['name_ko']} | {d['edition']['name']} | {lvl[-60:]}")
    for x in d['state_fields']:
        if x['id'] in ('note','turn'): continue
        desc=x['description'].split(' 각 실물 인스턴스')[0]
        print(f"  F {x['id']}[{V[x['visibility']]}/{x['scope'][0]}/{','.join(a[0] for a in x['acquisition'])}] {desc[:110]}")
    for p in d['resume'].get('preserve_procedures',[]):
        print(f"  K {p['id']} {p['method']}{' ORD' if p['order_sensitive'] else ''}")
    print('  G '+' / '.join(x[:100] for x in d['gaps'][:2]))
