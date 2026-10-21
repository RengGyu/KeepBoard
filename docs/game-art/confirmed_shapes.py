"""Original representative geometry for officially identified physical types.
Not printed-face reproductions, canonical maps or observed state values.
"""
import draw as d
p=d.path;r=d.rect;c=d.circle;g=d.group
def icon(kind,x=30,y=25,scale=.5):return g(d.symbol(kind),f'translate({x} {y}) scale({scale})')
def draw(name):
 if name=='voidfall-sector':return g(p('m60 10 46 26v52l-46 24-46-24V36Z',d.STONE)+p('m60 20 36 21v41l-36 18-36-18V41Z',d.PAPER)+r(43,41,34,34,d.CREAM,4)+p('M25 87h23m25 0h23','none',stroke=d.INK,stroke_width='2')+c(60,58,4,d.INK))
 if name=='house-mat':return g(r(9,18,102,88,d.PAPER,4)+r(16,26,32,70,d.CREAM,2)+p('M57 36h44m-44 15h37m-37 18h44m-44 19h29','none',stroke=d.INK,stroke_width='1.4'))+icon('portrait',17,39,.25)
 if name=='neighborhood':return g(p('m20 15 70 0 22 40-25 50H29L8 57Z',d.PAPER)+p('M20 59h80M42 22l15 34m0 0 15 40','none',stroke='#a1ad92',stroke_width='2'))+icon('building',30,27,.46)
 if name=='street-link':return g(p('m10 32 100 0v54H10Z',d.PAPER)+p('M15 45h90M15 73h90','none',stroke=d.STONE,stroke_width='3')+p('M20 59h18m11 0h18m11 0h18','none',stroke=d.CREAM,stroke_width='2'))
 if name=='cylinder':return g(d.shadow()+r(30,37,60,55,d.OWNER,0)+f'<ellipse cx="60" cy="92" rx="30" ry="15" fill="{d.OWNER}"/>'+f'<ellipse cx="60" cy="37" rx="30" ry="15" fill="{d.OWNER}"/>'+d.shade('M69 40q17 0 21-5v57q-7 14-21 15Z')+d.shine('M36 48v39')+d.grain('M45 54v30'))
 if name=='fence':return d.symbol('fence').replace(d.WOOD,d.OWNER)
 if name=='timeline':return g(r(10,30,100,57,d.PAPER,3)+p('M15 72h82m-10-9 10 9-10 9','none',stroke=d.INK,stroke_width='2'))+icon('hourglass',37,26,.43)
 if name=='connector':return g(p('m10 49 19-12 15 12h32l15-12 19 12v22L91 83 76 71H44L29 83 10 71Z',d.PAPER)+p('M35 60h50','none',stroke=d.INK,stroke_width='3'))
 if name=='contract-tile':return g(r(10,27,100,67,d.PAPER,3)+r(17,35,31,48,d.CREAM,2)+p('m56 54 11 9-11 9m14-18 11 9-11 9','none',stroke=d.INK,stroke_width='2'))+icon('bolt',17,36,.28)+icon('coin',83,49,.2)
 if name=='completed-contract':return g(r(10,27,100,67,'#81917b',3)+r(18,35,84,51,'none',2,stroke=d.CREAM)+p('m42 61 12 13 27-30','none',stroke=d.CREAM,stroke_width='4'))
 if name=='pinecone-token':
  return g(p('M60 11q31 20 25 58-7 30-25 40-18-10-25-40-6-38 25-58Z',d.GREEN)+p('M60 21q23 18 18 46-5 24-18 31-13-7-18-31-5-28 18-46Z',d.WOOD)+''.join(p(f'm{x} {y} 9 9 9-9m-18 0 9-8 9 8','none',stroke=d.CREAM,stroke_width='1.4') for x,y in [(51,35),(44,52),(49,70),(51,85)])+d.shade('M60 20v79q15-10 18-32 5-28-18-47Z'))
 if name in ['sonar-token','sonar-spent']:
  return g(c(60,63,40,d.WOOD)+c(60,58,40,d.BLUE if name=='sonar-token' else d.STONE)+c(60,58,30,'none',stroke=d.CREAM,stroke_width='1.2')+p('M60 58 80 38M60 31v54M33 58h54','none',stroke=d.CREAM,stroke_width='1.4')+(p('M39 38 82 80','none',stroke=d.INK,stroke_width='5') if name=='sonar-spent' else c(60,58,5,d.GOLD)))
 if name in ['colony-ready','colony-spent']:
  return g(p('m60 16 46 25v51l-46 25-46-25V41Z',d.BLUE if name=='colony-ready' else d.STONE)+p('m28 65 20-13 20 0 19 13-19 13H48Z',d.CREAM)+p('M60 42v39m-30 7h58','none',stroke=d.INK,stroke_width='2')+(p('m39 33 44 61','none',stroke=d.INK,stroke_width='4') if name=='colony-spent' else p('m43 92 11 9 20-19','none',stroke=d.CREAM,stroke_width='3')))
 if name=='hex-room':
  return g(p('m10 36 20-12 20 12 20-12 20 12 20-12v66L90 103 70 91l-20 12-20-12-20 12Z',d.PAPER)+p('m10 36 20 12 20-12 20 12 20-12 20 12M30 48v24l20 12 20-12V48m-60 12 20 12-20 12m100-24L90 72l20 12M50 84v19M90 72v31','none',stroke='#9ba18c',stroke_width='1.2')+p('M15 47v-5l15-9 20 12 20-12 20 12 15-9v43','none',stroke=d.INK,stroke_width='4'))
 if name=='obstacle-hex':return g(p('m60 10 46 27v51l-46 23-46-23V37Z',d.PAPER))+icon('stone',23,20,.63)
 if name in ['monster-standee','summon-standee']:
  return g(d.shadow()+p('M22 102h76l9 10H13Z',d.STONE)+p('M27 100V46q0-33 33-33t33 33v54Z',d.PAPER))+icon('skull' if name=='monster-standee' else 'star',29,28,.52)
 if name=='initiative-strip':return g(p('M11 37h97l-8 23 8 23H11Z',d.PAPER)+p('M18 46h69m-69 8h47m-47 20h58','none',stroke=d.INK,stroke_width='1.5')+c(91,61,7,d.CORAL))
 if name=='dual-dial':return g(p('M24 27h72l16 19v47l-16 13H24L8 93V46Z',d.PAPER)+c(36,66,23,'#bd7f68')+c(84,66,23,d.BLUE)+c(36,66,14,d.CREAM)+c(84,66,14,d.CREAM)+p('M36 66V45m48 21 12-14','none',stroke=d.INK,stroke_width='2')+c(36,66,3,d.INK)+c(84,66,3,d.INK))
 if name=='triple-dial':return g(r(7,21,106,83,d.PAPER,4)+''.join(c(x,60,16,d.CREAM)+p(f'M{x} 60v-12','none',stroke=d.INK,stroke_width='2')+c(x,60,2,d.INK) for x in [25,60,95])+p('M15 91h90','none',stroke=d.INK,stroke_width='1.2'))
 if name=='element-board':return g(r(7,15,106,94,d.PAPER,3)+p('M16 43h89M16 67h89M16 91h89','none',stroke='#a5ad94',stroke_width='1.2')+''.join(c(22+i*15,30,5,[d.CORAL,d.BLUE,d.GREEN,d.STONE,d.GOLD,'#738578'][i]) for i in range(6))+p('M56 45v39m-5-7 5 7 5-7','none',stroke=d.INK,stroke_width='1.5'))
 if name=='wall-link':return g(p('m9 59 91-33 12 13v43l-91 30L9 99Z',d.STONE)+p('m9 59 91-33 12 13-91 30Z',d.CREAM,opacity='.5')+p('M21 69v43m0-64 11 17m11-29 11 17m11-29 11 17m11-29 11 17','none',stroke='#6c7e71',stroke_width='1.3'))
 if name=='market-place':return g(r(12,16,96,94,d.PAPER,2)+r(19,23,82,22,d.CREAM,1)+p('m20 59 10-12h61l10 12v14H20Z',d.CORAL)+p('M28 74v24m65-24v24M19 98h82','none',stroke=d.WOOD,stroke_width='4')+r(39,81,38,17,d.CREAM,1))
 if name=='mosque-tile':return g(r(14,16,92,93,d.PAPER,3)+p('M27 91V57h67v34ZM42 57q0-33 19-36 20 3 20 36Z',d.BLUE)+p('M19 91V35h10v56m64 0V35h10v56','none',stroke=d.WOOD,stroke_width='4')+p('M53 91V71h16v20',d.CREAM))
 if name=='demand-tile':return g(r(11,25,98,71,d.PAPER,3)+''.join(r(x,39,18,18,color,1) for x,color in [(20,d.BLUE),(50,d.GOLD),(80,d.CORAL)])+p('M22 77h14m16 0h14m16 0h14','none',stroke=d.INK,stroke_width='2'))
 if name=='journey-tile':return g(p('m8 30 27-13 18 13 26-15 30 23-7 42-27 24-24-10-24 12L7 84Z',d.GREEN)+p('M51 30q22 23 11 38t13 36','none',stroke=d.BLUE,stroke_width='9')+p('m20 47 16-6m-12 32 17 9m46-45 10 12','none',stroke=d.CREAM,stroke_width='2'))
 if name=='banner':return g(p('M25 110V14h68l-14 24 14 24H25Z',d.OWNER)+p('M25 14v96','none',stroke=d.WOOD,stroke_width='5')+c(55,37,10,d.CREAM)+d.shine('M35 21h42'))
 if name=='monster-base':return g(d.shadow()+f'<ellipse cx="60" cy="92" rx="44" ry="17" fill="{d.STONE}"/>'+p('M29 82V23h63v59Z',d.PAPER)+p('M37 33h47v40H37Z',d.CREAM)+p('M25 85h70v9H25Z',d.INK))+icon('skull',40,32,.33)
 if name=='id-token':return g(r(22,25,76,76,d.PAPER,5)+p('M39 42h10v44m20-44h10v44','none',stroke=d.INK,stroke_width='6'))
 if name=='hotel-piece':return g(d.shadow()+p('M13 100V50l20-27h54l20 27v50Z',d.CORAL)+p('m13 50 20-27h54l20 27Z',d.WOOD)+''.join(r(x,59,12,15,d.CREAM,1) for x in [25,54,83])+r(51,82,18,18,d.CREAM,1)+d.shade('M89 50h18v50H89Z'))
 if name=='banknote':return g(r(9,30,103,61,'#b5c2a1',3)+r(17,38,87,45,'none',2,stroke=d.CREAM,stroke_width='2')+f'<ellipse cx="61" cy="60" rx="15" ry="18" fill="{d.CREAM}"/>'+p('M26 50h13m-13 9h11m45 12h12','none',stroke=d.INK,stroke_width='1.3'))
 if name=='cauldron-board':return g(r(9,14,103,95,d.PAPER,4)+c(60,62,38,d.WOOD)+c(60,62,31,d.CREAM)+p('M60 62q-17-15-21 0t22 17q27-2 23-23Q73 24 45 36q-34 16-13 47','none',stroke='#7c886c',stroke_width='2')+c(60,62,4,d.BLUE))
 if name=='rat-token':return g(p('M19 89q-11-8-10-21 1-18 12-16m0 37 9 8h52l16-11-8-20-28-14-28 5Z',d.WOOD)+c(57,50,11,d.PAPER)+c(79,64,3,d.INK)+p('m83 82 21 4m-20 2 16 11','none',stroke=d.INK,stroke_width='1.2'))
 if name in ['flask-full','flask-empty']:
  return g(p('M47 16h26v28l29 47q10 18-15 18H33q-25 0-15-18l29-47Z',d.CREAM)+p('M43 16h34','none',stroke=d.WOOD,stroke_width='5')+(p('M31 76h58l13 15q10 18-15 18H33q-25 0-15-18Z',d.GREEN) if name=='flask-full' else p('M42 91h36','none',stroke=d.STONE,stroke_width='2'))+d.shine('M48 49 31 84'))
 if name=='power-place':return g(p('M9 25h102v74H9Z',d.PAPER)+p('m17 82 9-22h16V46h36v14h18l9 22Z',d.STONE)+c(60,31,9,d.GOLD)+p('M51 82V64h18v18',d.CREAM))
 if name=='magic-item':return g(r(23,20,75,86,d.PAPER,3)+p('m38 76 34-38 10 10-34 38Z',d.WOOD)+c(78,36,13,d.BLUE)+p('M32 94h55','none',stroke=d.GOLD,stroke_width='2'))
 if name=='probe-piece':return g(d.shadow()+p('m60 15 11 26 21 10-12 24 11 25-31-10-31 10 11-25-12-24 21-10Z',d.OWNER)+p('m60 29 12 24-12 19-12-19Z',d.CREAM)+d.shade('M60 73v17l31 10-11-25 12-24-21-10 5 14Z')+d.shine('m45 81-8 9'))
 if name=='galaxy-segment':return g(p('M9 26q50-24 102 0v69q-51-25-102 0Z',d.PAPER)+p('M14 55q45-24 91 0','none',stroke='#889981',stroke_width='2')+c(28,48,9,d.BLUE)+c(84,48,9,d.GOLD)+p('M37 47h36','none',stroke=d.INK,stroke_width='1.3',stroke_dasharray='3 3')+c(59,72,5,d.CORAL))
 if name=='map-endcap':return g(p('M21 20q55 2 78 32v51H21Z',d.PAPER)+p('M31 35q29 4 55 23','none',stroke=d.INK,stroke_width='2')+c(49,77,15,d.STONE))
 if name=='contact-back':return g(c(60,65,39,d.WOOD)+c(60,59,39,'#78918b')+c(60,59,28,'none',stroke=d.CREAM,stroke_width='1.3')+c(48,57,4,d.CREAM)+c(72,57,4,d.CREAM)+p('M46 79h28','none',stroke=d.CREAM,stroke_width='2'))
 if name=='track-slider':return g(p('M21 22h78v80H21Z',d.PAPER)+r(32,36,56,41,'none',2,stroke=d.INK,stroke_width='5')+p('M21 91h78','none',stroke=d.CREAM,stroke_width='2'))
 if name=='town-tile':return g(p('m60 11 41 24v58l-41 18-41-18V35Z',d.PAPER)+p('M33 82V48h19V35h17v13h19v34Z',d.STONE)+p('M50 81V61h20v20',d.CREAM)+c(61,26,5,d.GOLD))
 if name=='oval-favor':return g(f'<ellipse cx="60" cy="62" rx="43" ry="48" fill="{d.PAPER}"/>'+c(60,47,17,d.BLUE)+p('M43 83h34m-17-15v29','none',stroke=d.GOLD,stroke_width='4'))
 if name=='bonus-scroll':return g(p('M25 18h65v84H25Z',d.PAPER)+p('M25 18q-14 0-12 13h77q15 0 12-13Zm0 84q-14 0-12-13h77q15 0 12 13Z',d.WOOD)+p('M34 42h43m-43 12h31','none',stroke=d.INK,stroke_width='1.3')+c(60,77,12,d.GOLD))
 raise KeyError(name)
