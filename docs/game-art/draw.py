"""Original SVG geometry. No commercial artwork, image services or network calls."""
from html import escape

INK='#33483c'; CREAM='#fff9e9'; PAPER='#eee1c5'; CORAL='#bc6048'; GOLD='#d5ac54'
GREEN='#7e9b68'; BLUE='#8eb3b8'; STONE='#9ba9a0'; WOOD='#b99a6b'
OWNER='var(--owner,#bc6048)'

def path(d,fill=INK,**attrs): return f'<path d="{d}" fill="{fill}" '+ ' '.join(f'{k.replace("_","-")}="{v}"' for k,v in attrs.items())+'/>'
def circle(x,y,r,fill=CREAM,**attrs): return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" '+ ' '.join(f'{k.replace("_","-")}="{v}"' for k,v in attrs.items())+'/>'
def rect(x,y,w,h,fill=CREAM,rx=3,**attrs): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" '+ ' '.join(f'{k.replace("_","-")}="{v}"' for k,v in attrs.items())+'/>'
def text(value,x=60,y=74,size=38,fill=INK): return f'<text x="{x}" y="{y}" text-anchor="middle" font-family="Georgia,serif" font-size="{size}" fill="{fill}" stroke="none">{escape(str(value))}</text>'
def group(body,transform='',stroke=INK,width=1.7): return f'<g stroke="{stroke}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"'+(f' transform="{transform}"' if transform else '')+'>'+body+'</g>'
def shadow(x=61,y=106,rx=34): return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="4" fill="{INK}" opacity=".13"/>'
def shade(d): return path(d,INK,opacity='.22',stroke='none')
def shine(d): return path(d,'none',stroke=CREAM,stroke_width='2.4',opacity='.45')
def grain(d): return path(d,'none',stroke=INK,stroke_width='1',opacity='.2')

def cube():
 return group(shadow()+path('m23 41 36-20 37 20v41l-37 21-36-21Z',OWNER)+path('m23 41 36 20 37-20-37-20Z',CREAM,opacity='.25',stroke='none')+shade('m59 61 37-20v41l-37 21Z')+path('M23 41 59 61v42m0-42 37-20','none')+shine('m30 45 23 13v34')+grain('m34 65 14 7m-14 6 13 8m20-17 19-11'))
def disk(): return group(shadow()+f'<ellipse cx="60" cy="69" rx="36" ry="28" fill="{WOOD}"/>'+rect(24,51,72,18,OWNER,0)+f'<ellipse cx="60" cy="51" rx="36" ry="27" fill="{OWNER}"/>'+shine('M34 43q17-18 43-3')+grain('M37 55q23-6 43 1m-40 8 25-2'))
def pawn(): return group(shadow()+path('M47 46q-2 25-15 41l-8 13q34 13 72 0L86 84Q74 66 73 46Z',OWNER)+circle(60,30,16,OWNER)+shade('M63 48q4 33 25 51l7 1-9-16Q74 66 73 46Z')+shine('M53 22q-7 7-3 14m2 22q-4 21-13 31')+grain('M39 94h39M44 84h21'))
def worker():
 d='M48 41q-13-7-10-20 3-14 17-14t22 13q4 14-10 21l7 10 23 5q9 2 6 11t-14 6l-12-2 9 32q2 8-7 8H66l-6-22-7 22H37q-9 0-6-8l9-32-13 2q-10 2-13-7t6-11l25-5Z'
 return group(shadow()+path(d,OWNER,transform='translate(2 3)',opacity='.6')+path(d,OWNER)+shade('m66 43 8 9 23 5-21 11 9 34-5 8H68L60 84l4-21Z')+shine('m48 18-3 9m-18 34 20-4m-1 18-8 25')+grain('m52 58 11 1m-12 8 7 1'))
def card_shell(): return group(rect(28,14,69,99,'#b7a584',4)+rect(24,10,69,99,CREAM,4)+rect(30,16,57,76,PAPER,2)+path('M32 98h44m-44 5h32','none',stroke='#b5a480',stroke_width='1.1')+shine('M28 88V15h55'))
def card_back(): return group(rect(31,18,65,91,'#c2b18d',4)+rect(26,13,65,91,CREAM,4)+rect(21,8,65,91,'#617b58',4)+rect(28,15,51,77,'none',2,stroke='#d5c58f',stroke_width='1.4')+path('m53 28 17 20-17 22-17-22Z',PAPER)+path('M53 35v27m-9-14h18','none',stroke='#738864')+grain('m31 21 44 64m0-64L31 85'))
def token_shell(): return group(circle(60,66,37,'#a58c5d')+circle(60,60,37,'var(--material,#d7bd7e)')+circle(60,60,30,'none',stroke=CREAM,stroke_width='1.4',opacity='.7'))
def board_shell(): return group(rect(9,22,102,84,'#b2a184',4)+rect(9,17,102,84,PAPER,4)+rect(15,23,90,72,CREAM,2)+shine('M17 19h86'))
def unknown(): return group(rect(15,15,90,94,PAPER,7,stroke='#89917b',stroke_dasharray='5 4')+rect(24,24,72,72,'none',3,stroke='#b5b497',stroke_width='1.3')+text('?'),width=1.5)
def die(face=4):
 b=group(path('m22 34 17-16h59v68L81 103H22Z','var(--owner,#eee1c5)')+path('m22 34 17-16h59L81 35Z',CREAM,opacity='.45')+shade('m81 35 17-17v68l-17 17Z')+rect(22,34,59,69,'var(--owner,#fff9e9)',5)+shine('M28 86V41h45'))
 coords={1:[(51,68)],2:[(37,49),(67,87)],3:[(37,49),(51,68),(67,87)],4:[(37,49),(67,49),(37,87),(67,87)],5:[(37,49),(67,49),(51,68),(37,87),(67,87)],6:[(37,49),(67,49),(37,68),(67,68),(37,87),(67,87)]}
 return b+''.join(circle(x,y,4,INK) for x,y in coords[face])

def symbol(kind):
 """A meaningful silhouette occupying the full 120 unit art canvas."""
 p=path; c=circle; r=rect
 if kind=='anchor':return group(c(60,22,10,'none',stroke=INK,stroke_width='4')+p('M60 33v67M24 65q0 35 36 35t36-35M20 74l4-12 12 4m48 0 12-4 4 12M43 47h34','none',stroke=WOOD,stroke_width='7'))
 if kind=='compass':return group(c(60,62,43,PAPER)+c(60,62,34,'none',stroke=INK,stroke_width='1.3')+p('m60 20 10 32 32 10-32 10-10 32-10-32-32-10 32-10Z',BLUE)+p('m60 20 10 32-10 10Z',CORAL)+c(60,62,5,CREAM))
 if kind=='box':return cube().replace(OWNER,WOOD)
 if kind=='meat':return group(p('M35 72 18 91q-16-5-10 10 4 12 12 4 10 8 13-4l20-17Z',CREAM)+p('M45 33q29-25 52 1 24 31-11 59-26 20-52-4-15-24 11-56Z','#bc7567')+p('M55 43q22-15 31 3 10 20-12 31-18 7-23-8-4-11 4-26Z','#d9a795')+shine('M48 40q16-16 32-5'))
 if kind=='milk':return group(p('M45 13h30v29l14 16v48H31V58l14-16Z',CREAM)+r(42,12,36,13,WOOD,2)+r(37,65,46,31,PAPER,3)+p('M45 75h30m-24 10h18','none',stroke=BLUE,stroke_width='3')+shine('M37 60v31'))
 if kind=='gold':return group(p('m20 73 17-38h48l17 38-16 20H36Z',GOLD)+p('m37 35 48 0 10 24H27Z','#efdc9b')+shade('m95 59 7 14-16 20-6-20Z')+shine('m39 42 34-1')+p('M44 73h31','none',stroke=CREAM,stroke_width='2'))
 icons={
 'leaf': p('M25 90Q16 20 95 22q7 72-63 72Z',GREEN)+p('M29 94 80 38m-35 38-7-27m18 14 27-8m-18-3-2-17','none',stroke='#4b6d43'),
 'tree': p('M53 75h14v31H53Z','#947247')+p('m60 11-25 35h13L23 80h74L72 46h13Z',GREEN)+shade('M60 18v62h37L72 46h13Z')+shine('m55 30-8 12m-5 18-8 11'),
 'wood': p('m17 45 54-24q20-4 28 13t-8 24L37 87Z','#8b7048')+p('m17 61 54-24 21 15-55 29Z','#738253')+f'<ellipse cx="27" cy="66" rx="15" ry="20" fill="#dfc28c"/>'+f'<ellipse cx="27" cy="66" rx="8" ry="12" fill="none" stroke="#8e744b"/>'+grain('m48 57 30-13m-31 24 35-16'),
 'stone': p('m16 83 14-39 35-24 32 29 8 38-48 14Z',STONE)+p('m30 44 35-24 12 39-42 16Z','#bdc7b8')+shade('m77 59 20-10 8 38-48 14Z')+grain('m30 80 8-19m13-12 15-11'),
 'metal': p('m17 72 21-39h46l20 39-19 18H33Z',STONE)+p('m38 33 46 0 11 26H28Z','#d1d5c6')+shade('m95 59 9 13-19 18-5-20Z')+shine('m37 42 35-1'),
 'coal': p('m19 82 9-35 29-24 32 20 13 38-42 18Z','#526156')+p('m28 47 29-24 3 34-29 18Z','#788576')+grain('m64 73 19-22m-44 30 8-19'),
 'brick': p('m16 56 49-29 40 25v28L57 105 16 83Z','#bd7959')+p('m16 56 49-29 40 25-48 27Z','#dfa17c')+shade('m57 79 48-27v28l-48 25Z')+p('M57 79v26M16 69l41 24 48-27M43 42l40 24','none',stroke='#86513e',stroke_width='1.4'),
 'grain': p('M59 103V33m0 42L35 48m24 14 24-26','none',stroke='#7c7846',stroke_width='3')+''.join(p(f'M{x} {y}q-17-14-15-24 20 0 21 20Z',GOLD) for x,y in [(57,70),(45,55),(57,47),(69,62),(82,47)])+shine('M57 91V75'),
 'water': p('M60 12Q25 57 25 77a35 31 0 0 0 70 0Q95 57 60 12Z',BLUE)+shade('M61 18Q74 59 73 80q0 16-13 27 32 0 35-30Q95 57 61 18Z')+shine('M48 38Q32 61 34 76'),
 'crystal': p('m60 10 33 27-9 50-24 24-25-24-9-50Z',BLUE)+p('m60 10-7 35 7 66 11-66Z','#c3ded2')+shade('m71 45 22-8-9 50-24 24Z')+p('m26 37 27 8 18 0 22-8','none'),
 'gem': p('m35 26 50 0 21 28-46 52-46-52Z','#84a9ac')+p('M35 26 45 54H14m71-28-10 28h31M45 54l15 52 15-52Z','#c4d5c4')+shine('m40 32-15 17'),
 'coin': c(60,66,37,'#9f844d')+c(60,59,37,GOLD)+c(60,59,29,'none',stroke=CREAM,stroke_width='1.6')+p('m60 39 15 11-6 18H51l-6-18Z','#f5df9e')+grain('M36 78q25 15 48-4'),
 'fish': p('M17 60q37-42 72-5l20-18-1 46-20-18Q49 103 17 60Z',BLUE)+p('m43 42 12-17 9 15m-11 38 12 15 5-18',STONE)+c(32,56,3,INK)+p('M57 42q-15 20 0 37','none',stroke='#5f8586')+shine('M46 51q19-7 31 6'),
 'egg': p('M60 13C43 13 27 49 27 76c0 40 66 40 66 0C93 49 77 13 60 13Z','#e4d8b2')+shade('M67 18q23 38 13 66-7 17-27 23 42 2 40-31Q88 38 67 18Z')+shine('M50 30Q36 49 37 71'),
 'berry': p('M60 42V19m0 10q12-17 29-8-8 22-29 8','none',stroke='#5e7948',stroke_width='4')+c(43,70,24,'#ac655b')+c(76,68,24,'#ad705f')+c(60,88,20,'#955346')+shine('m33 58 6-5m31 1 6-2'),
 'flower': ''.join(c(x,y,16,'#d6ad70') for x,y in [(60,27),(82,42),(75,69),(45,69),(38,42)])+c(60,49,13,GOLD)+p('M60 83v28m0-15q-23-19-29-4 13 20 29 11m0-13q22-17 29-5-13 18-29 13',GREEN),
 'seed': p('M31 98q26-35 29-74m-2 31Q26 61 22 36q24-4 36 19m3-11q25 6 34-18-22-11-34 18','none',stroke='#6c874f',stroke_width='6')+p('M28 101q28-12 63-1',WOOD),
 'mushroom': p('M48 61 43 104h36L72 61Z',PAPER)+p('M17 63q4-47 43-47t43 47Z','#b96c50')+c(43,39,7,CREAM)+c(75,40,9,CREAM)+p('M24 64h72','none',stroke='#75543c')+shine('M54 76v19'),
 'honey': p('M37 31h46l9 61q0 14-32 14T28 92Z',GOLD)+r(34,17,52,18,WOOD)+r(36,53,48,29,CREAM)+p('m60 58 13 9v10H47V67Z',GOLD)+shine('M37 42v39'),
 'bee': p('M56 50Q21 17 22 48q4 19 33 15m10-13Q98 16 98 48q-6 20-31 16',CREAM)+f'<ellipse cx="60" cy="74" rx="24" ry="30" fill="{GOLD}"/>'+p('M38 65h44M38 80h44','none',stroke=INK,stroke_width='8')+c(60,43,15,INK)+p('m50 31-7-14m26 14 8-14','none'),
 'bread': p('M20 84V63q0-37 40-37t40 37v21Z','#ceab68')+p('M28 81V64q0-27 32-27t32 27v17Z','#ead29b')+p('m43 41-6 17m23-20-6 17m23-13-6 17','none',stroke='#9e7d45',stroke_width='3'),
 'grape': p('M60 29V12m0 9q20-15 32-1-15 17-32 6',GREEN)+''.join(c(x,y,13,'#8c8096') for x,y in [(42,48),(70,48),(33,69),(58,70),(83,69),(47,91),(70,91),(60,108)]),
 'wine': p('M35 17h50l-4 36q-2 18-21 19-20 0-23-19Z',CREAM)+p('M37 41h46l-2 12q-2 18-21 19-20 0-23-19Z','#aa6861')+p('M60 73v31m-21 4h42','none',stroke_width='3')+shine('M42 23v10'),
 'barrel': p('M32 22q-18 38 0 78 28 12 56 0 18-42 0-78Z',WOOD)+p('M31 44h59M29 78h63','none',stroke='#526456',stroke_width='7')+p('M48 23q-11 38 0 80m22-80q11 40 0 80','none',stroke='#806240',stroke_width='1.2')+shine('M38 27q-5 8-6 15'),
 'cloth': p('m21 24 33 6 35-12 13 75-36 12-34-7Z','#b9b196')+p('m54 30 12 75m-39-58 66-11m-63 37 67-11','none',stroke=CREAM,stroke_width='2')+grain('m35 28 10 68m25-70 11 68'),
 'book': p('M16 26q24-10 44 2 20-12 44-2v69q-24-10-44 2-20-12-44-2Z',PAPER)+p('M60 28v69M24 38q14-5 27 2m-27 9q14-5 27 2m-27 9q14-5 27 2m18-20q13-5 26-2m-26 13 26-2m-26 13 26-2','none',stroke='#8e9172',stroke_width='1.3')+shine('M19 29v58'),
 'scroll': p('M32 20h59q19 2 12 17H50v57q0 20-22 14-17-3-13-17h65V33q0-13-12-13Z',PAPER)+p('M50 37h53m-88 54h65M60 51h27M60 61h23M60 71h27','none',stroke='#8d8d69',stroke_width='1.4'),
 'gear': p('m49 13 22 0 3 13 12 7 13-3 11 19-10 10v14l10 10-11 19-13-4-12 7-3 13H49l-3-13-12-7-13 4-11-19 10-10V59L10 49l11-19 13 3 12-7Z',STONE)+c(60,62,23,PAPER)+c(60,62,10,INK)+shine('m39 42 10-7'),
 'flame': p('M60 10q28 27 15 44 13-1 18-16 25 49-7 65-43 24-62-13-13-25 13-53-1 20 10 21 17-18 13-48Z','#c88964')+p('M60 63q25 31 5 43-22 4-26-16 0-16 21-27Z',GOLD),
 'heart': p('M60 102 19 59Q1 22 32 17q18-3 28 17 10-20 28-17 31 5 13 42Z','#bc7567')+shade('M91 22q22 31-31 80l41-43q13-25-10-37Z')+shine('M29 29q10-3 15 5'),
 'skull': p('M30 71Q8 23 49 14q50-12 52 34 1 14-12 24v31H37V78Z',PAPER)+f'<ellipse cx="43" cy="51" rx="10" ry="13" fill="{INK}"/>'+f'<ellipse cx="77" cy="51" rx="10" ry="13" fill="{INK}"/>'+p('m60 67-7 13h14Z',INK)+p('M47 90v13m13-13v13m13-13v13','none'),
 'brain': p('M59 19q-23-16-30 9-22 3-14 25-11 21 8 31-1 24 22 18 9 12 16-4 17 13 27-7 25-4 17-26 10-19-9-31-4-23-25-17Z','#b89992')+p('M60 23v74M35 31q22 5 9 23m-23 3q27-7 22 18m-15 11q17-10 24 2m25-62q-20 7-9 23m23-5q-23 5-13 22m16 7q-21-9-25 14','none',stroke='#7c6f66',stroke_width='2'),
 'magnify': c(52,49,31,BLUE)+c(52,49,23,CREAM)+p('m74 72 31 31-10 9-28-33Z',WOOD)+shine('M39 35q8-7 20-3'),
 'star': p('m60 10 15 31 35 5-25 25 6 35-31-17-31 17 6-35-25-25 35-5Z',GOLD)+shade('m60 10v79l31 17-6-35 25-25-35-5Z')+shine('m54 29-9 19-17 3'),
 'sword': p('m76 12 24 3 2 24-47 46-20-20Z','#b8c2b5')+p('m91 23-44 54','none',stroke=CREAM,stroke_width='3')+p('m26 63 32 33-8 8-33-33Z',GOLD)+p('m29 79 13 13-17 21-17-17Z',WOOD),
 'shield': p('M60 12 100 27v35q-4 29-40 48-36-19-40-48V27Z',OWNER)+p('M60 22 90 34v27q-4 23-30 39-26-16-30-39V34Z',PAPER)+p('M60 28v63M34 53h52','none',stroke=GOLD,stroke_width='6'),
 'helmet': p('M27 93V49q0-35 33-35t33 35v44Z',STONE)+p('M27 49h66v14H27Z','#596e60')+p('M54 48v45h12V48Z',GOLD)+p('M34 95h52m-19-70 10 15','none',stroke=CREAM,stroke_width='2.2'),
 'crown': p('m20 40 21 16 19-35 19 35 21-16-10 55H30Z',GOLD)+p('M31 79h58','none',stroke=CREAM,stroke_width='3')+c(20,37,4,GOLD)+c(60,18,4,GOLD)+c(100,37,4,GOLD),
 'bolt': p('m62 10-35 57h28l-5 43 44-62H67l16-38Z',GOLD)+shine('m59 30-16 28h19'),
 'moon': p('M85 16Q30 52 85 103 26 111 19 63 15 26 52 14Z','#6f8a87')+c(82,38,3,GOLD)+p('m94 62 4 8 9 1-7 6 2 9-8-4-8 4 2-9-7-6 9-1Z',GOLD),
 'sun': c(60,60,25,GOLD)+''.join(p(f'M60 9v13','none',stroke=GOLD,stroke_width='4',transform=f'rotate({i*45} 60 60)') for i in range(8))+shine('M47 47q8-9 18-4'),
 'planet': c(60,57,31,BLUE)+p('M22 83Q0 53 66 38q62-10 39 23Q84 90 22 83Z','none',stroke=WOOD,stroke_width='7')+p('M36 43q14-17 34-10','none',stroke=CREAM,stroke_width='3')+shade('M78 33q16 36-11 55 29-6 24-31-2-15-13-24Z'),
 'telescope': p('m23 56 63-35 15 29-63 35Z',BLUE)+p('m80 23 9-5 15 30-9 4Z',WOOD)+p('m55 76-20 34m20-34 27 34m-27-34 2 32','none',stroke=WOOD,stroke_width='5')+shine('m39 57 38-19'),
 'satellite': p('m46 49 21-13 14 25-21 13Z',GOLD)+p('m11 57 26-16 15 29-26 15Zm60-29 26-16 15 28-26 16Z',BLUE)+p('m43 56 10-6m20 3 9-5M61 73l8 21m-9 3q14-10 29-3','none',stroke_width='3'),
 'computer': r(15,19,90,65,STONE,5)+r(23,27,74,45,'#496455',2)+p('m34 41 9 7-9 7m20 4h27','none',stroke=CREAM,stroke_width='3')+p('m47 85-6 17h38l-6-17Z',STONE)+p('M31 106h59','none',stroke_width='3'),
 'hourglass': p('M31 15h58v13q-2 20-22 32 22 12 22 32v13H31V92q0-20 22-32-20-12-22-32Z',CREAM)+p('M31 15h58M31 105h58','none',stroke=WOOD,stroke_width='7')+p('M40 34h40L60 55Zm20 33L40 97h40Z',GOLD)+shine('M36 27q3 15 11 20'),
 'flask': p('M48 13h24v30l30 48q10 19-13 19H31q-23 0-13-19l30-48Z',CREAM)+p('M31 72h58l13 19q10 19-13 19H31q-23 0-13-19Z',GREEN)+p('M44 13h32','none',stroke_width='4')+c(58,87,5,CREAM)+c(75,96,3,CREAM),
 'button': c(60,66,38,'#977b58')+c(60,59,38,'#8fa3ad')+c(60,59,29,'none',stroke=CREAM,stroke_width='1.5')+''.join(c(x,y,4,INK) for x,y in [(49,48),(70,48),(49,70),(70,70)]),
 'hammer': p('m47 51 19-5 18 57-18 7Z',WOOD)+p('m16 39 20-20 57-2 9 30-30 10-20-13-18 15Z',STONE)+shine('m38 25 47-1'),
 'wrench': p('M88 12Q60 6 53 32l6 19-43 44q-14 19 5 24l51-51q30 12 37-19L89 62 74 45Z',STONE)+c(26,101,5,CREAM),
 'bell': p('M22 87q16-10 15-37-1-25 23-25t23 25q-1 27 15 37Z',GOLD)+p('M18 89h84','none',stroke_width='4')+c(60,19,7,GOLD)+c(60,99,9,WOOD)+shine('M48 39q-7 14-7 31'),
 'boat': p('M14 80h92l-16 26H30Z',WOOD)+p('M60 13v66M60 22 29 68h31Zm6 7 31 39H66Z',CREAM)+shade('m60 82 46-2-16 26H60Z')+p('M17 112q16-7 30 0t29 0 28 0','none',stroke=BLUE,stroke_width='2'),
 'ship': p('m60 9 22 43 26 26-4 15-30-13-5 30H51l-6-30-30 13-3-15 26-26Z',STONE)+p('m60 12-9 66h18Z',CREAM)+p('m45 80-8 18m38-18 8 18','none',stroke=GOLD,stroke_width='5')+c(60,56,7,BLUE),
 'train': p('M23 36h57v39H23Z',OWNER)+p('M67 21h23v39H67Z',OWNER)+p('M78 21h19v9H78Z',GOLD)+p('m17 75 88 0 10 17H11Z',STONE)+c(34,92,13,INK)+c(77,92,13,INK)+c(34,92,6,STONE)+c(77,92,6,STONE)+r(29,43,20,18,CREAM,1)+p('M56 42v22','none',stroke=CREAM),
 'car': p('m23 46 12-25h45l16 25 11 9v35H13V59Z',OWNER)+p('m38 29-9 20h59L76 29Z',BLUE)+p('M59 29v20','none')+c(30,88,14,INK)+c(91,88,14,INK)+r(18,59,16,10,CREAM,2)+r(89,59,12,10,CREAM,2)+shine('M40 58h37'),
 'mech': p('m42 19 37 0 13 22-9 34H37L25 41Z',OWNER)+r(41,30,37,19,CREAM,2)+p('m37 62-20 17 10 29h22l5-31m27-15 22 17-10 29H71l-5-31','var(--owner,#bc6048)')+p('M26 49 12 63m80-14 15 12','none',stroke=STONE,stroke_width='12')+shade('m71 53 12 2-6 21H66Z'),
 'building': p('M22 51 60 20l39 31v51H22Z',OWNER)+p('m16 53 44-39 45 39H93L60 28 28 53Z',WOOD)+r(49,73,22,29,CREAM,1)+r(32,59,12,16,CREAM,1)+r(77,59,12,16,CREAM,1)+shade('M80 53h19v49H80Z'),
 'castle': p('M16 109V31h10V18h12v13h10v38h24V31h10V18h12v13h10v78Z',WOOD)+r(49,81,22,28,INK,8)+p('M24 46h16m40 0h16M25 62h13m45 0h13','none',stroke=CREAM,stroke_width='3'),
 'factory': p('M15 108V58l25-16v16l24-16v16h35v50Z',STONE)+p('M77 58V16h14v42Z',WOOD)+r(24,76,14,16,CREAM,1)+r(49,76,14,16,CREAM,1)+r(75,76,14,16,CREAM,1)+p('M78 10q10-9 20-4','none',stroke=STONE,stroke_width='4'),
 'bridge': p('M12 103V57q48-62 96 0v46H91V71q-31-43-62 0v32Z',WOOD)+p('M13 63h94','none',stroke=CREAM,stroke_width='3')+p('M37 41v20m24-25v25m22-19v19','none',stroke='#806749')+p('M15 111q20-8 34 0t30 0 28 0','none',stroke=BLUE,stroke_width='3'),
 'fence': p('M18 31h14v78H18Zm35 0h14v78H53Zm35 0h14v78H88Z',WOOD)+p('M15 49h90v12H15Zm0 28h90v12H15Z',WOOD)+shine('M21 38v57m35-57v57m35-57v57'),
 'gateway': p('M24 109V45q0-32 36-32t36 32v64H78V47q0-18-18-18T42 47v62Z',STONE)+p('M28 44h13m38 0h13M26 68h15m38 0h14M45 19l6 14m26-13-7 14','none',stroke=CREAM,stroke_width='2'),
 'tunnel': p('M13 108V63q0-48 47-48t47 48v45Z',STONE)+p('M32 109V65q0-28 28-28t28 28v44Z',INK)+p('M34 110 51 60m34 50L69 60m-29 36h40M45 81h30','none',stroke=WOOD,stroke_width='4'),
 'tent': p('m60 19-49 87h98Z','#c9ad70')+p('m60 19-7 87h56Z','#a78d60')+p('m60 55-18 51h36Z',INK)+p('M60 9v14','none',stroke_width='3')+shine('m54 34-28 55'),
 'cave': p('m15 109 4-48 22-38 34-8 25 27 8 67Z',STONE)+p('M33 109V70q0-30 27-30t28 30v39Z',INK)+p('m40 44 5 19 12-23 10 23 8-18',STONE)+grain('m24 69 8-16m55-20 9 17'),
 'treasure': p('M18 53h85v54H18Z',WOOD)+p('M18 53q0-32 43-32t42 32Z','#c7a974')+p('M36 27v78m50-78v78M18 59h85','none',stroke=GOLD,stroke_width='7')+r(53,61,17,22,GOLD,2)+c(61,70,3,INK),
 'portrait': c(61,35,19,'#cab48b')+p('M21 107V94q0-33 40-33t40 33v13Z',STONE)+p('m46 62 15 28 15-28',CREAM)+p('M42 27q3-23 23-20 20 2 16 26-21-13-39-6Z',WOOD),
 'enemy': p('m25 42 3-28 23 16q9-5 19 0l23-16 2 28q20 40-12 62H37Q5 82 25 42Z','#74806a')+p('m31 56 20 10m38-10-20 10','none',stroke=CREAM,stroke_width='5')+p('m46 87 7-10 7 10 7-10 7 10',PAPER),
 'summon': p('M27 105q-15-30-6-65 4-25 39-25t39 25q8 30-6 65l-14-12-19 12-19-12Z',BLUE)+c(46,52,6,INK)+c(76,52,6,INK)+p('M44 77q15 13 32 0','none')+shine('M36 34q8-10 17-10'),
 'dragon': p('m29 91 9-28-22-23 29 5 12-29 17 24 22-12-6 29 15 17-22 19 3 18-30-8-23 9Z','#78956b')+p('m62 40 19 14-6 29-20-13Z','#d4c69b')+c(75,48,3,INK)+p('m85 61 17 1-14 9',CREAM)+p('m38 63 15 8m-8-20 12 10','none'),
 'bird': p('m24 79q7-45 45-48 15-14 31 5l13 4-14 8q-4 28-30 34l-25 25 2-23-25 12Z','#8da59c')+p('M36 67q14-15 33-10-5 22-28 28Z',CREAM)+c(88,38,3,INK)+p('m66 86-7 20m17-22 2 19','none',stroke=WOOD,stroke_width='3'),
 'cat': p('M29 49 25 18l24 16q12-4 23 0l22-16-3 32q25 55-16 59H43Q4 101 29 49Z','#c7ad7d')+p('m39 60 11 3m23 0 10-3M54 78l6 5 6-5m-6 5v8M19 73l25 3m31 0 25-3','none')+shine('M34 41v11'),
 'bear': c(31,29,16,WOOD)+c(89,29,16,WOOD)+p('M21 51q0-26 39-26t39 26v36q0 23-39 23T21 87Z',WOOD)+f'<ellipse cx="60" cy="79" rx="26" ry="21" fill="{PAPER}"/>'+c(60,73,9,INK)+c(41,54,4,INK)+c(80,54,4,INK)+p('M60 83v8','none'),
 'fox': p('m18 21 34 18 16 0 34-18-9 59-33 30-33-30Z','#bd805f')+p('m24 59 36 45 36-45-9 28-27 23-27-23Z',CREAM)+c(40,60,4,INK)+c(80,60,4,INK)+p('m53 92 7 8 7-8Z',INK),
 'elk': p('M40 109V61q-15-15-6-28 10-13 23-2 17-13 28 2 11 14-5 28v48Z',WOOD)+p('M41 34 24 20V8m0 12L10 15m68 19 17-14V8m0 12 15-5','none',stroke=WOOD,stroke_width='5')+c(48,48,3,INK)+c(74,48,3,INK)+p('m52 67 9 5 9-5',INK),
 'cattle': p('M28 49q-20-1-17-27 17 15 27 7 22-12 44 0 9 8 27-7 3 26-17 27v31q0 29-32 29T28 80Z',WOOD)+f'<ellipse cx="60" cy="88" rx="25" ry="16" fill="{PAPER}"/>'+c(43,58,4,INK)+c(78,58,4,INK)+c(49,88,3,INK)+c(72,88,3,INK),
 'sheep': p('M26 43q-9-15 10-19 6-18 24-9 17-9 25 8 20 1 15 21 16 11 1 26 2 19-19 22-24 12-43 0-20 1-19-19-15-15 6-30Z',CREAM)+p('M44 44q17-13 33 0l-4 44H48Z','#5a6b58')+p('M37 86v24m45-24v24','none',stroke=WOOD,stroke_width='5')+c(55,58,3,CREAM)+c(68,58,3,CREAM),
 'pig': f'<ellipse cx="60" cy="68" rx="42" ry="31" fill="#bd8f7a"/>'+p('m30 47 1-24 21 19m27 0 16-19 3 30','#bd8f7a')+f'<ellipse cx="60" cy="79" rx="23" ry="15" fill="#d9ab94"/>'+c(51,79,3,INK)+c(69,79,3,INK)+c(39,58,3,INK)+c(82,58,3,INK)+p('M33 93v17m51-17v17','none',stroke='#bd8f7a',stroke_width='7'),
 'camel': p('M16 106V66q2-20 17-14 11-41 26-8 17-32 28 2l12-20-9-10 14-5 11 14-10 44-15 8-4 29H75l1-30H35l-6 30Z',WOOD)+c(104,23,2,INK)+shine('m40 57 5-9m19 6 8-6'),
 'beetle': f'<ellipse cx="60" cy="71" rx="27" ry="35" fill="#85945e"/>'+c(60,30,17,INK)+p('M60 43v63M33 53 12 40m21 29L9 65m25 21-20 18m73-51 21-13M88 69l24-4M87 86l20 18m-57-70-9-22m30 22 9-22','none',stroke_width='3'),
 'spider': c(60,76,26,'#6e7d6d')+c(60,34,17,INK)+p('M37 58 18 40 9 50m27 20L9 66v13m29 5-23 13 3 13m65-52 19-18 9 10m-27 20 27-4v13M82 84l23 13-3 13','none',stroke_width='4')+c(54,32,3,CREAM)+c(66,32,3,CREAM),
 'bat': p('M60 47 42 19l-7 22L9 29l9 46 20-8 13 38 9-14 9 14 13-38 20 8 9-46-26 12-7-22Z','#777f79')+p('M60 49v41M38 48 27 61m55-13 11 13','none',stroke=PAPER),
 'toad': c(33,38,16,GREEN)+c(87,38,16,GREEN)+f'<ellipse cx="60" cy="73" rx="43" ry="32" fill="{GREEN}"/>'+c(33,37,7,CREAM)+c(87,37,7,CREAM)+c(33,37,3,INK)+c(87,37,3,INK)+p('M30 76q30 25 61 0M26 97l-13 12m82-12 13 12','none',stroke_width='3'),
 'feather': p('M20 108 77 19q38-20 26 19L41 95Z',PAPER)+p('M20 108 91 25m-43 54-8-22m19 7 26-4m-17-9-3-17','none',stroke='#77866a',stroke_width='2'),
 'speech': p('M15 21h90v61H62l-29 27V82H15Z',CREAM)+p('M31 40h58M31 54h44M31 68h29','none',stroke='#8a9275',stroke_width='3'),
 'target': c(60,60,43,CREAM)+c(60,60,29,'#bc8067')+c(60,60,14,GOLD)+p('m62 58 41-43m-14 0h14v14','none',stroke=INK,stroke_width='4'),
 'flag': p('M32 13v97','none',stroke=WOOD,stroke_width='6')+p('M36 17q22-13 46 0l19 30q-25-14-65 0Z',OWNER)+p('M20 112h27','none',stroke=WOOD,stroke_width='3'),
 'staff': p('M51 109 69 27','none',stroke=WOOD,stroke_width='8')+c(73,21,12,BLUE)+p('m59 27 12 14 14-10','none',stroke=GOLD,stroke_width='4'),
 'dagger': p('m83 12 21 7-50 67-15-13Z',STONE)+p('m28 66 33 23-6 10-33-24Z',GOLD)+p('m32 80 14 10-19 24-15-13Z',WOOD),
 'candlestick': p('M48 48h25v43H48Z',GOLD)+p('M60 76q-34-1-33-26m33 26q34-1 33-26','none',stroke=GOLD,stroke_width='8')+r(20,25,14,28,PAPER,2)+r(86,25,14,28,PAPER,2)+r(53,18,14,34,PAPER,2)+p('m28 9-6 12h12Zm32-8-6 12h12Zm32 8-6 12h12Z','#c88964')+p('M38 105h45','none',stroke=GOLD,stroke_width='9'),
 'rope': p('M29 88C-3 48 26 14 60 19c42 4 47 39 19 57-40 22-57-20-35-28 22-10 29 19 10 31l-16 31','none',stroke=WOOD,stroke_width='11')+p('M29 88C-3 48 26 14 60 19c42 4 47 39 19 57-40 22-57-20-35-28 22-10 29 19 10 31l-16 31','none',stroke=CREAM,stroke_width='2',stroke_dasharray='2 8'),
 'wheel': c(60,60,41,WOOD)+c(60,60,30,CREAM)+c(60,60,10,WOOD)+p('M60 30v60M30 60h60M39 39l42 42m0-42L39 81','none',stroke=WOOD,stroke_width='5'),
 'jester': p('M27 49 12 14l34 17L59 9l15 23 33-18-13 36Z','#8fa395')+p('M27 49h67v27q-2 32-34 32T27 76Z',PAPER)+c(45,66,4,INK)+c(77,66,4,INK)+p('M43 84q18 18 35-1','none',stroke_width='3')+c(12,13,5,GOLD)+c(59,9,5,GOLD)+c(107,14,5,GOLD),
 'helmet-worker': p('M22 57V45q0-31 38-31t38 31v12Z',GOLD)+p('M16 57h88','none',stroke=WOOD,stroke_width='5')+p('M31 61q0 43 29 43t29-43',PAPER)+p('M60 17v31','none',stroke=CREAM,stroke_width='4'),
 'trophy': p('M35 16h50v37q0 25-25 25T35 53Z',GOLD)+p('M35 24H15v17q0 27 25 25m45-42h20v17q0 27-25 25','none',stroke=GOLD,stroke_width='6')+p('M60 78v25M39 109h42','none',stroke=WOOD,stroke_width='7')+shine('M43 24v21'),
 }
 icons.update({
 'eye':p('M10 60q50-63 100 0-50 63-100 0Z',CREAM)+c(60,60,23,BLUE)+c(60,60,10,INK)+c(65,53,4,CREAM),
 'ear':p('M76 106q-30 7-29-23-1-12-15-24-15-22 5-40 29-24 49 4 14 22-6 43-14 11-13 23','none',stroke=WOOD,stroke_width='10')+p('M51 61q-21-23 1-30 22-6 16 15L56 60','none',stroke='#897552',stroke_width='5'),
 'boot':p('M34 12h42v55l27 16q15 15 1 23H16V83l18-17Z',WOOD)+p('M18 97h87','none',stroke=CREAM,stroke_width='3')+p('M40 29h30M40 43h30M40 57h30','none',stroke=INK,stroke_width='2'),
 'bag':p('m41 20 7 19Q21 58 19 90q-2 24 41 24t41-24Q99 58 72 39l8-19Z',WOOD)+p('M44 39h31','none',stroke=CREAM,stroke_width='5')+shine('M41 57Q28 72 30 89'),
 'oil':p('M60 12Q25 57 25 77a35 31 0 0 0 70 0Q95 57 60 12Z','#58665b')+shine('M48 38Q32 61 34 76'),
 'pearl':c(60,67,38,'#a99a7c')+c(60,60,38,CREAM)+c(50,48,21,'#eae3ca')+p('M34 47q8-17 28-15','none',stroke='#ffffff',stroke_width='4'),
 'basket':p('M18 49h84l-12 57H30Z',WOOD)+p('M30 49q0-39 30-39t30 39','none',stroke=WOOD,stroke_width='7')+p('M40 50v51m20-51v54m20-54v51M24 69h72M27 87h66','none',stroke=CREAM,stroke_width='2'),
 'handprint':p('M34 104 20 75q-8-18 3-19l15 16V23q0-15 10-11v42-45q11-11 12 2v42-44q12-6 12 8v39-31q12-7 12 9v38q21-16 23-1l-17 29-8 11Z','#bd8972')+grain('M49 73q13-9 27 0m-25 13 24 1'),
 'handshake':p('m11 50 22-23 24 15 26-16 27 24-40 45-19 4-40-31Z',WOOD)+p('m34 47 17-10 17 12-19 17-10-7m12 10 25 19m-15-26 25 18','none',stroke=CREAM,stroke_width='3'),
 'gift':r(19,49,82,58,'#a7b78b',3)+r(13,34,94,21,'#b8c8a0',3)+p('M53 34h15v73H53Z',GOLD)+p('M58 34Q25 32 32 14q13-15 28 20 18-35 29-20 6 18-29 20Z',GOLD),
 'fruit':p('M60 32Q30 15 20 49q-10 41 21 58 14 7 20-2 13 13 29-4 22-24 10-53-10-25-40-16Z','#bd7d5e')+p('M60 32V11m0 13q14-20 30-9-12 18-30 15',GREEN)+shine('M35 40q-10 13-8 28'),
 'mountain':p('m11 106 32-66 20 23 19-50 30 93Z',STONE)+p('m31 64 12-24 12 24-12-7Zm37-16 14-35 14 35-14-9Z',CREAM)+shade('m82 13-6 93h36Z'),
 })
 if kind=='cube':return cube()
 if kind=='pawn':return pawn()
 if kind not in icons: raise KeyError(kind)
 return group(icons[kind],transform='translate(6 6) scale(.9)')

SYMBOLS=['leaf','tree','wood','stone','metal','coal','brick','grain','water','crystal','gem','coin','fish','egg','berry','flower','seed','mushroom','honey','bee','bread','grape','wine','barrel','cloth','book','scroll','gear','flame','heart','skull','brain','magnify','star','sword','shield','helmet','crown','bolt','moon','sun','planet','telescope','satellite','computer','hourglass','flask','button','hammer','wrench','bell','boat','ship','train','car','mech','building','castle','factory','bridge','fence','gateway','tunnel','tent','cave','treasure','portrait','enemy','summon','dragon','bird','cat','bear','fox','elk','cattle','sheep','pig','camel','beetle','spider','bat','toad','feather','speech','target','flag','staff','dagger','candlestick','rope','wheel','jester','helmet-worker','trophy']

def polyomino(cells,color=OWNER,cloth=False):
 xs=[x for x,y in cells];ys=[y for x,y in cells];s=min(88/(max(xs)+1),88/(max(ys)+1),34)
 ox=(120-(max(xs)+1)*s)/2;oy=(120-(max(ys)+1)*s)/2
 b=shadow()
 for x,y in cells:
  b+=rect(ox+x*s,oy+y*s+3,s,s,'#8d8567',1.5)+rect(ox+x*s,oy+y*s,s,s,color,1.5)
  if cloth:b+=rect(ox+x*s+3,oy+y*s+3,s-6,s-6,'none',1,stroke=CREAM,stroke_width='1',stroke_dasharray='2 3')
 return group(b,width=1.5)

def terrain(theme='forest',shape='hex'):
 boundary='M60 9 104 34v50l-44 26-44-26V34Z' if shape=='hex' else 'M9 9h102v102H9Z'
 palette={'forest':GREEN,'water':BLUE,'desert':'#d6bb82','mountain':STONE,'field':'#c8ac6d','city':'#d5bd89','space':'#6e8783','cave':'#a4a594','dungeon':'#b4aa8e','cloth':'#adaba0'}
 fill=palette.get(theme,GREEN)
 b=path(boundary,'#a79570',transform='translate(0 3)')+path(boundary,fill)
 if theme=='space':
  b+=path('m24 74 63-37m-63 6 53 48','none',stroke=CREAM,opacity='.25')+circle(48,48,18,'#d0b87c')+shade('M51 31q15 18-3 34 23-5 17-23Z')+circle(82,77,11,BLUE)+circle(26,43,2,CREAM)+circle(77,26,2,CREAM)+circle(54,87,1.5,CREAM)
 elif theme in ['forest','field','desert','mountain']:
  b+=path('M20 72q23-28 45-8 20-20 35-3v21l-40 24-40-24Z','#68845b' if theme=='forest' else '#b49c6b')
  if theme=='forest': b+=group(symbol('tree'),transform='translate(13 11) scale(.75)')
  elif theme=='mountain': b+=path('m25 86 24-49 17 24 15-26 20 49-41 22Z','#829489')+path('m39 58 10-21 14 20-14-5Z',CREAM)+path('m72 51 9-16 8 15-8-4Z',CREAM)
  elif theme=='field': b+=path('m24 72 57 24M28 61l64 26M43 59l54 20M29 85l26 14','none',stroke='#ead295',stroke_width='4')
  else:b+=path('M21 78q32-32 78-7L60 106Z','#e4c994')+path('M30 63q22-20 50-9m-35 34 34-8','none',stroke='#a18759',stroke_width='2')+circle(80,35,8,'#f1daa1')
 elif theme=='water':
  b+=path('M17 35q14 12 28 0t28 0 29 0M17 59q14 12 28 0t28 0 29 0M19 82q14 12 28 0t28 0 27 0','none',stroke='#d2e4d4',stroke_width='3')
 elif theme=='city': b+=group(symbol('building'),transform='translate(20 23) scale(.67)')
 elif theme=='cave': b+=group(symbol('cave'),transform='translate(14 11) scale(.78)')
 else:
  b+=path('M20 40h37v22H20m37-22h42v22H57M20 62v25h37V62m0 0h42v25H57','none',stroke='#777e63',stroke_width='3')+path('M60 15v15M60 90v15M15 60h15M90 60h15','none',stroke=CREAM,stroke_width='6')
 return group(b,width=1.6)

def area(topology,theme='forest',seed=0):
 b=board_shell();color=[GREEN,BLUE,'#c2a270','#a2a797'][seed%4]
 if topology=='grid':
  b+=group(''.join(path(f'M{x} 29v60','none',stroke='#c4c4a2',stroke_width='1') for x in [35,60,85])+''.join(path(f'M22 {y}h76','none',stroke='#c4c4a2',stroke_width='1') for y in [48,69]))
  b+=rect(38,50,19,16,color,1)+rect(63,71,19,15,GOLD,1)
 elif topology in ['graph','hex']:
  if topology=='graph': b+=group(path('m27 65 25-28 35 20-25 29-35-21m25-28 10 49','none',stroke='#b6a47c',stroke_width='3')+''.join(circle(x,y,8,color) for x,y in [(27,65),(52,37),(87,57),(62,86)]))
  else:
   for x,y in [(34,48),(69,48),(51,78)]:b+=group(path('M0-19 17-10v20L0 19-17 10v-20Z',color,transform=f'translate({x} {y})'))
 elif topology=='track': b+=group(path('M22 71h75','none',stroke='#b6aa82',stroke_width='4')+''.join(rect(22+i*15,47,12,19,CREAM,2) for i in range(5))+circle(59,72,9,OWNER))
 elif topology=='stack': b+=group(card_back(),transform='translate(27 22) scale(.55)')
 else:b+=group(path('M22 40h76v43H22Z','none',stroke='#b8b89a',stroke_dasharray='4 5')+circle(46,60,9,color)+rect(67,51,18,18,GOLD,2))
 return b

def solar():
 b=shadow(60,109,40)
 for radius,fill in [(49,'#b9c6b6'),(37,PAPER),(24,'#95aaa0')]:b+=circle(60,59,radius,fill,stroke=INK,stroke_width='1.5')
 b+=circle(60,59,8,GOLD)+circle(81,45,5,'#a27158')+circle(25,74,7,BLUE)+circle(94,94,6,'#c5b47a')
 b+=path('M60 9v8m49 42h-8M60 108v-8M11 59h8','none',stroke=CREAM,stroke_width='2')+path('m91 23 10 1-1 10m-4-9-9 9','none',stroke=INK,stroke_width='2')
 return group(b)

def truck_part(kind):
 b=group(rect(11,15,98,94,'#a99d7c',4)+rect(11,11,98,94,PAPER,4)+rect(19,19,82,78,'#8faaa4',2))
 b+=group(rect(51,7,18,17,CREAM,1)+rect(51,94,18,17,CREAM,1)+rect(6,49,18,18,CREAM,1)+rect(96,49,18,18,CREAM,1))
 glyph={'engine':'flame','cannon':'bolt','cabin':'portrait','battery':'bolt','cargo':'cube'}.get(kind,'gear')
 motif=cube() if glyph=='cube' else symbol(glyph)
 b+=group(motif,transform='translate(23 18) scale(.62)')
 if kind in ['engine','cannon']: b+=group(path('m57 26 3-8 3 8M60 18v18','none',stroke=CREAM,stroke_width='2'))
 return b

def split_card(direction):
 b=card_shell()
 if direction=='tree':return b+group(symbol('tree'),transform='translate(26 22) scale(.57)')
 if direction=='winter':return b+group(symbol('moon'),transform='translate(26 22) scale(.57)')
 if direction=='vertical':
  b+=path('M59 20v66','none',stroke='#909a7a',stroke_width='1.5')+group(symbol('bird'),transform='translate(30 35) scale(.28)')+group(symbol('leaf'),transform='translate(59 34) scale(.28)')
 else:b+=path('M32 54h53','none',stroke='#909a7a',stroke_width='1.5')+group(symbol('cat'),transform='translate(43 19) scale(.28)')+group(symbol('mushroom'),transform='translate(43 57) scale(.28)')
 return b

def cathedral():
 b=group(rect(10,13,100,99,WOOD,5)+rect(16,19,88,87,CREAM,3))
 for i in range(4):
  for j in range(4):b+=rect(21+i*20,29+j*17,17,14,[BLUE,'#c6a24f','#bb7f66',GREEN][(i+j)%4],1,stroke=INK,stroke_width='1')
 b+=path('M21 26q39-28 78 0','none',stroke=INK,stroke_width='3')
 return b
