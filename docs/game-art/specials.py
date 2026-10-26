"""Game-specific representative geometry; layouts are never canonical printed maps."""
import draw as d

def motif(name,x=29,y=26,scale=.54):return d.group(d.symbol(name),f'translate({x} {y}) scale({scale})')

BOARD_MOTIFS={
 'quilt':('button','cat'),'island':('boat','fish'),'bean-fields':('seed','coin'),'mosaic':('flower','star'),
 'price-row':('coin','hammer'),'village-stickers':('building','scroll'),'mansion':('dagger','gateway'),
 'score-track':('flag','star'),'card-zones':('book','coin'),'leader':('portrait','shield'),
 'world':('planet','moon'),'outpost-calendar':('castle','hourglass'),'scenario-book':('sword','gateway'),
 'trade-network':('building','coin'),'racing-circuit':('car','flag'),'boat-grid':('cat','boat'),
 'hint-slate':('speech','feather'),'monster-panel':('enemy','heart'),'expedition-lanes':('mountain','coin'),
 'perimeter-track':('building','coin'),'camp-night':('tent','moon'),'city-stickers':('building','flask'),
 'wonder-stages':('castle','star'),'duel-mat':('flower','skull'),'atlas-ship':('boat','book'),
 'regions':('helmet','castle'),'capital-grid':('building','castle'),'resource-production':('cube','gear'),
 'rail-network':('train','flag'),'influence-network':('flag','satellite'),'underwater-network':('water','flask'),
 'vineyard':('grape','wine'),'forest-cave':('tree','cave'),'shared-grid':('cube','cube')}

def board(style):
 if style not in BOARD_MOTIFS:raise KeyError(style)
 a,b=BOARD_MOTIFS[style]
 body=d.board_shell()
 if style in ['quilt','shared-grid','capital-grid','boat-grid','mosaic']:
  for x in range(24,102,19):body+=d.path(f'M{x} 30v60','none',stroke='#bec3a3',stroke_width='1')
  for y in range(30,95,20):body+=d.path(f'M22 {y}h76','none',stroke='#bec3a3',stroke_width='1')
  body+=d.rect(25,33,33,18,'#acc085',1)+d.rect(63,55,32,32,'#ceb176',1)
 elif style in ['rail-network','influence-network','trade-network','underwater-network','world','regions','city-stickers']:
  body+=d.path('m24 60 25-28 43 24-26 31-42-27 45-7','none',stroke='#b8a77d',stroke_width='3')
  body+=''.join(d.circle(x,y,6,d.PAPER,stroke=d.INK,stroke_width='1.4') for x,y in [(24,60),(49,32),(92,56),(66,87)])
  if style=='rail-network':body+=d.path('m26 57 4 6m4-16 4 6m34 15 4 6m7-16 4 6','none',stroke=d.INK,stroke_width='1.2')
 elif style in ['price-row','score-track','expedition-lanes','resource-production','wonder-stages']:
  for i in range(4):body+=d.rect(20+i*22,47,18,38,['#c8b079','#a3b88a','#9bb8b8','#be8b71'][i],1,stroke=d.INK,stroke_width='1')
  body+=d.path('M23 88h73','none',stroke=d.INK,stroke_width='2')
 elif style in ['racing-circuit','perimeter-track']:
  body+=d.rect(20,29,80,60,'none',18,stroke='#ac9c77',stroke_width='12')+d.rect(20,29,80,60,'none',18,stroke=d.CREAM,stroke_width='1.4',stroke_dasharray='5 4')
 else:
  body+=d.path('M20 31h36v58H20Zm44 0h36v58H64Z','none',stroke='#b5b99b',stroke_width='1.3')
 if style=='outpost-calendar':
  body+=d.rect(64,31,35,56,d.CREAM,1,stroke=d.INK,stroke_width='1')+d.path('M64 44h35M74 31v56M86 31v56M64 58h35M64 72h35','none',stroke='#b4b496',stroke_width='1')
 body+=motif(a,18,40,.4)+motif(b,66,52,.3)
 return body

def draw(name):
 p=d.path;r=d.rect;c=d.circle;g=d.group
 if name.startswith('truck-'):return d.truck_part(name[6:])
 if name in ['split-tree','split-horizontal','split-vertical','split-winter']:return d.split_card(name[6:])
 if name=='solar-system':return d.solar()
 if name=='oasis-tile':
  return g(r(10,14,100,98,'#b39d70',3)+r(10,10,100,98,'#d9c28e',3)+p('M16 84q30-25 88-4v22H16Z','#c7b382')+p('M59 91 68 42','none',stroke=d.WOOD,stroke_width='5')+p('M68 42Q43 17 26 42q23-6 42 0Q73 13 95 28 77 28 68 42q28-1 34 24-18-19-34-24-21 14-22 34-7-24 22-34Z',d.GREEN))
 if name=='stained-window':return d.cathedral()
 if name.startswith('mars-'):
  b=g(p('M60 9 104 34v50l-44 26-44-26V34Z',{'mars-city':'#a9afa0','mars-greenery':'#98b375','mars-ocean':'#86afb7'}[name]))
  if name=='mars-city':b+=g(p('M30 84q0-42 30-42t30 42Z',d.CREAM)+p('M60 42v42M36 64h48M29 85h63','none',stroke=d.INK,stroke_width='1.5'))
  elif name=='mars-greenery':b+=motif('leaf',20,27,.5)+motif('tree',56,40,.4)
  else:b+=g(p('M28 48q15-10 31 0t33 0M28 65q15-10 31 0t33 0M36 82q12-7 25 0t22 0','none',stroke=d.CREAM,stroke_width='4'))
  return b
 if name in ['planet-system','wormhole-system','wormhole-sector']:
  b=d.terrain('space')
  if name=='planet-system':b+=g(c(61,61,23,'#bea66e')+p('M48 44q21-9 30 10','none',stroke=d.CREAM,stroke_width='3')+d.shade('M68 39q17 22-8 44 30-1 23-26Z'))
  if name!='planet-system':b+=g(c(64,66,23,'none',stroke=d.PAPER,stroke_width='6')+p('M64 40q27 1 28 27','none',stroke=d.INK,stroke_width='2'))
  if name=='wormhole-sector':b+=g(p('M17 35h15m56 51 14 0','none',stroke=d.GOLD,stroke_width='7'))
  return b
 if name=='command-triangle':return g(d.shadow()+p('m60 12 48 84-48 16-48-16Z',d.OWNER)+p('m60 12 48 84-48-12Z',d.CREAM,opacity='.2')+d.shade('m60 84 48 12-48 16Z')+p('m60 38 19 33H41Z',d.PAPER))
 if name=='undersea-dome':return g(d.shadow()+p('M16 90q1-68 44-68t44 68Z',d.BLUE)+p('M60 23v65M27 63h65','none',stroke=d.CREAM,stroke_width='2',opacity='.65')+p('M22 88h76v15H22Z',d.STONE)+motif('building',35,48,.42)+d.shine('M43 38Q25 52 25 74'))
 if name=='sandworm':return g(p('M18 98q-10-41 25-48 30-6 20-26l23-12q35 45-20 65-29 10-19 31Z','#baa173')+p('m28 75 17 6m-15-19 18 8m9-18 10 14m4-26 17 9','none',stroke='#7f7954',stroke_width='3')+f'<ellipse cx="83" cy="22" rx="17" ry="13" fill="{d.INK}"/>'+p('m72 17 7 12 4-15 5 14 5-10',d.PAPER))
 if name in ['goods-polyomino','cloth-polyomino','cat-polyomino']:
  color={'goods-polyomino':'#c58f63','cloth-polyomino':'#97afad','cat-polyomino':'#c6a56c'}[name]
  b=d.polyomino([(0,0),(0,1),(1,1),(1,2)],color,True)
  return b+(motif('cat',42,44,.32) if name=='cat-polyomino' else '')
 if name=='enclosure-polyomino':
  b=''
  for x,y in [(37,42),(72,42),(54,73)]:b+=g(p('M0-20 18-10v20L0 20-18 10v-20Z','#b0bb8c',transform=f'translate({x} {y})'))
  return b+g(p('m18 30 20-12 53 14v21L72 65v22L54 98 18 77Z','none',stroke='#8b7958',stroke_width='3',stroke_dasharray='3 4'))
 if name in ['cloth-hex','split-habitat']:
  b=d.terrain('forest') if name=='split-habitat' else g(p('m60 9 45 26v50l-45 26-45-26V35Z','#a7b6ad'))
  if name=='split-habitat':b+=g(p('M60 10v99l44-25V35Z',d.BLUE)+p('M65 45q12 7 26 0M65 63q12 7 26 0M65 81q12 7 26 0','none',stroke=d.CREAM,stroke_width='2'))
  else:
   b+=g(p('m60 17 38 22v42l-38 22-38-22V39Z','none',stroke=d.CREAM,stroke_width='1.7',stroke_dasharray='3 4')+p('M38 37v47M60 24v73M82 36v50','none',stroke='#7f9393',stroke_width='6'))
  return b
 if name in ['akropolis-cluster','honeycomb']:
  b=''
  for i,(x,y) in enumerate([(38,42),(75,42),(57,74)]):
   b+=g(p('M0-22 20-11v22L0 22-20 11v-22Z',['#92a5aa','#d4b16c','#b1816c'][i],transform=f'translate({x} {y+4})'))
   b+=g(p('M0-22 20-11v22L0 22-20 11v-22Z',['#a6bbc0','#e5ca89','#d1a18b'][i],transform=f'translate({x} {y})'))
  return b+motif('building' if name=='akropolis-cluster' else 'bee',36,26,.45)
 if name in ['room-doors','room-corridor','ship-room','scenario-hex','dungeon-corridors','farm-room']:
  b=d.terrain('dungeon','hex' if name=='scenario-hex' else 'square')
  if name=='room-corridor':b=g(r(12,39,96,44,d.PAPER,2)+p('M16 45h88M16 77h88','none',stroke='#898468',stroke_width='4'))
  elif name=='farm-room':b=d.terrain('city','square')
  elif name=='ship-room':b+=motif('gear',39,34,.38)
  elif name=='room-doors':b+=g(r(29,35,22,17,d.WOOD,1)+c(75,77,12,d.PAPER))
  else:b+=g(p('M58 13v22m46 25H83M58 108V86','none',stroke=d.CREAM,stroke_width='6'))
  return b
 if name=='door':return g(p('M22 110V27q38-29 76 0v83Z',d.STONE)+p('M34 109V35q26-17 52 0v74Z',d.WOOD)+p('M47 34v69m23-69v69','none',stroke=d.CREAM,stroke_width='1.5')+c(75,71,3,d.GOLD))
 if name in ['raised-terrain','stairs']:
  if name=='stairs':return g(p('m15 102 10-15h17V71h17V55h17V39h17V23h17v79Z',d.STONE)+p('m15 102 10-15h17V71h17V55h17V39h17V23','none',stroke=d.CREAM,stroke_width='3')+d.shade('M93 39h17v63H93Z'))
  return g(p('m14 49 55-29 39 25v42l-56 27-38-22Z',d.STONE)+p('m14 49 55-29 39 25-56 29Z',d.PAPER)+d.shade('m52 74 56-29v42l-56 27Z')+p('m26 51 34 15 35-18M52 74v40','none'))
 if name in ['canal-link','rail-link']:
  b=g(p('M13 68 91 22l11 25-91 47Z',d.BLUE if name=='canal-link' else d.WOOD))
  if name=='rail-link':b+=g(p('m20 68 77-38m-73 49 77-38','none',stroke=d.STONE,stroke_width='4')+''.join(p(f'm{x} {88-x//2} 3 8','none',stroke=d.INK,stroke_width='1.2') for x in [31,44,57,70,83]))
  else:b+=g(p('M24 76 92 40','none',stroke=d.CREAM,stroke_width='3'))
  return b
 if name=='dam':return g(p('M15 98V53l24-21 24 19 22-20 22 20v47Z',d.OWNER)+p('M15 53 39 32l24 19 22-20 22 20-25 10-22-19-22 21Z',d.CREAM,opacity='.3')+p('M38 63v35m22-56v56m22-37v37','none')+p('M21 108q19-10 38 0t40 0','none',stroke=d.BLUE,stroke_width='4'))
 if name=='construction-wheel':
  b=d.solar().replace(d.BLUE,'#c8ae7f')
  for angle in range(0,360,60):b+=g(r(48,12,24,21,d.PAPER,2),f'rotate({angle} 60 59)')
  return b+motif('gear',35,33,.43)
 if name in ['ship-blueprint','car-blueprint']:
  return g(r(10,16,100,88,d.BLUE,4)+p('M20 27h80M20 48h80M20 69h80M20 90h80M31 25v68m27-68v68m27-68v68','none',stroke=d.CREAM,opacity='.4',stroke_width='1'))+motif('ship' if name.startswith('ship') else 'car',22,18,.64)
 if name=='hotel-room':return g(r(15,13,90,96,'#a8b99b',4)+r(24,22,72,78,d.PAPER,3)+r(34,42,50,47,d.CREAM,2)+p('M31 52h57M34 39v53m50-53v53','none',stroke=d.WOOD,stroke_width='4')+r(42,47,34,14,'#c8b282',2))
 if name=='factory-dish':return g(c(60,65,46,'#a3aaa0')+c(60,59,46,d.CREAM)+c(60,59,37,'#bed1c4')+motif('flower',26,25,.57))
 if name=='cart':return g(p('m17 39 88 0-10 46H25Z',d.WOOD)+p('M25 86 14 17H6','none',stroke=d.INK,stroke_width='4')+c(36,103,10,d.INK)+c(86,103,10,d.INK)+p('M39 43v36m24-36v36m21-36v36M23 61h77','none',stroke=d.CREAM,stroke_width='2'))
 if name in ['number-tile','joker-tile']:
  return g(r(25,13,73,99,'#bba983',5)+r(21,9,73,99,d.CREAM,5)+d.text('?' if name=='number-tile' else '◡',58,78,58,d.CORAL)+p('M31 95h52','none',stroke='#baad88',stroke_width='1.2'))
 if name=='terrain-domino':
  return g(r(8,36,104,55,'#aa9975',3)+r(8,31,104,55,d.PAPER,3)+r(11,34,48,49,'#a4bd85',1)+r(61,34,48,49,d.BLUE,1)+p('M60 32v53','none'))+motif('tree',14,33,.36)+motif('crown',69,35,.32)
 if name.startswith('root-'):
  kind=name[5:];themes={'sawmill':'wood','workshop':'hammer','roost':'bird','base':'tent'}
  return g(r(17,21,87,89,'#a99772',3)+r(13,17,87,89,d.PAPER,3)+p('m23 53 33-27 34 27v42H23Z','#b8b78c')+p('M27 56h57','none',stroke=d.WOOD,stroke_width='4'))+motif(themes[kind],29,38,.48)
 if name=='island-module':
  return g(p('m23 17 39-4 25 20 24 10-13 26 5 27-32 16-28-16-29-11 3-29Z','#acc085')+p('m23 17 39-4-4 40-41 3Zm35 36 29-20 24 10-13 26-33 11Z','#88a8a6')+p('m17 56 41-3 7 27 6 32-28-16-29-11Z','#b8ae7c')+p('m58 18-5 24 16 26-13 22','none',stroke=d.CREAM,stroke_width='2'))+motif('mountain',34,12,.38)+motif('tree',61,50,.38)
 if name in ['word-card','key-card','dream-card','submarine-card','firework-card','reversible-card','bull-number-card','enemy-grid-card','sector-ship-card','destination-ticket','building-pattern-card','china-card','bean-card']:
  b=d.card_shell()
  if name=='word-card':return b+g(p('M37 39h42M37 50h33M37 73h42','none',stroke=d.INK,stroke_width='2'))
  if name=='key-card':
   for i in range(3):
    for j in range(4):b+=r(35+i*16,29+j*14,13,11,[d.CORAL,'#61879d',d.PAPER,'#596356'][(i+j)%4],1)
   return b
  if name=='reversible-card':return b+g(d.text('?',47,42,25)+d.text('?',74,83,25)+p('M34 58h48','none',stroke=d.INK,stroke_width='1.4')+p('m36 79 0 7 7 0m37-52v-7h-7','none',stroke=d.CORAL,stroke_width='2'))
  if name=='bull-number-card':return b+g(d.text('?',59,58,34))+motif('cattle',43,61,.27)
  if name=='enemy-grid-card':
   b+=motif('enemy',40,20,.32)
   for i in range(3):
    for j in range(2):b+=r(36+i*16,63+j*14,13,11,d.PAPER,1,stroke=d.INK,stroke_width='1')
   return b
  if name=='building-pattern-card':return b+g(p('M34 58h50M34 73h50M50 43v44m17-44v44','none',stroke='#b4bb9d',stroke_width='1.2')+r(36,45,12,11,d.CORAL,1)+r(52,60,12,11,d.STONE,1)+r(69,75,12,11,d.GOLD,1))+motif('building',47,19,.24)
  if name=='firework-card':
   for angle in range(0,360,45):b+=g(p('M60 31v16','none',stroke=[d.GOLD,d.BLUE,d.CORAL,d.GREEN][angle//45%4],stroke_width='3'),f'rotate({angle} 60 58)')
   return b+g(c(60,58,5,d.GOLD)+p('M60 68v16','none',stroke='#7d9466',stroke_width='2'))
  if name=='dream-card':return b+g(c(62,37,18,'#c1b477')+p('m35 86 14-36 14 24 12-31 9 43Z','#8fa395'))+motif('boat',38,49,.36)
  if name=='submarine-card':return b+g(p('M36 56h39q16 0 12 15H36q-10-4 0-15Z',d.GOLD)+p('M58 55V40h13','none',stroke=d.STONE,stroke_width='4')+c(47,63,4,d.CREAM)+c(61,63,4,d.CREAM)+p('M34 81q10 5 21 0t24 0','none',stroke=d.BLUE,stroke_width='2'))
  if name=='sector-ship-card':return b+motif('ship',33,23,.48)+g(r(31,77,54,12,'#b96c50',1)+p('M38 83h39','none',stroke=d.CREAM))
  if name=='destination-ticket':return b+g(c(39,42,5,d.CORAL)+c(78,72,5,d.CORAL)+p('M44 44q1 18 30 26','none',stroke=d.INK,stroke_width='2',stroke_dasharray='3 3'))
  if name=='china-card':return b+motif('building',36,34,.42)+g(p('M32 21h53v8H32Z',d.CORAL))
  if name=='bean-card':return b+g(p('M45 33q33-10 32 20 0 38-27 32-19-8-2-27-19-9-3-25Z','#b7b77d')+p('M51 42q17-5 17 11-2 21-15 22','none',stroke='#74835b',stroke_width='2'))
 if name=='round-symbol-card':return g(c(60,63,48,'#bba986')+c(60,58,48,d.CREAM))+motif('leaf',19,20,.3)+motif('star',61,24,.3)+motif('fish',35,58,.38)
 if name in ['symbol-die','action-die','energy-die','attack-die','mana-die','food-die']:
  b=d.die(1).replace(d.circle(51,68,4,d.INK),'')
  symbol={'symbol-die':'heart','action-die':'shield','energy-die':'bolt','attack-die':'sword','mana-die':'crystal','food-die':'grain'}[name]
  return b+motif(symbol,23,36,.49)
 if name=='office-desk':return g(r(8,20,104,83,d.PAPER,4)+p('M13 35h94','none',stroke=d.WOOD,stroke_width='4')+''.join(r(16+i*19,47,14,45,[d.CREAM,'#e5d1a4','#a2b58d','#98afb4','#b88b73'][i],1) for i in range(5))+''.join(c(23+i*19,84,4,d.INK) for i in range(5)))
 raise KeyError(name)
