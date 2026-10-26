"""Original representative geometry for F001–F020; no copied printed faces."""
import draw as d

def draw(shape, value=None, motif=None):
 p,c,r,g=d.path,d.circle,d.rect,d.group
 if shape=='cube':return d.cube()
 if shape=='worker':return d.worker()
 if shape=='disk':return d.disk()
 if shape=='pawn':return d.pawn()
 if shape=='bridge':return d.symbol('bridge').replace(d.WOOD,d.OWNER)
 if shape=='building':return d.symbol('building').replace(d.WOOD,d.OWNER,1)
 if shape=='drop':return g(d.shadow()+p('M60 12C48 37 25 54 25 76a35 35 0 0 0 70 0C95 54 72 37 60 12Z',d.OWNER)+d.shine('M49 42Q28 68 39 83'))
 if shape in ['coin','hex','counter','military','bill','worker-tile','trade']:
  if shape=='coin':body=c(60,65,39,d.STONE)+c(60,59,39,d.OWNER)+c(60,59,31,'none',stroke=d.CREAM,stroke_width='1.5')
  elif shape=='hex':body=p('m60 13 42 24v48l-42 24-42-24V37Z',d.OWNER)+d.shine('m27 41 33-19 30 17')
  elif shape=='worker-tile':body=p('M35 15h50l15 23v66H20V38Z',d.OWNER)+c(60,46,12,d.CREAM)+p('M39 91V77q0-17 21-17t21 17v14Z',d.CREAM)
  elif shape=='bill':body=r(12,32,98,63,d.WOOD,3)+r(9,26,98,63,d.OWNER,3)+r(15,32,86,51,'none',2,stroke=d.CREAM)+c(58,58,20,d.CREAM)
  elif shape=='trade':body=p('M26 19h68l14 20-8 61H20l-8-61Z',d.OWNER)+r(28,31,64,55,d.CREAM,3)
  else:body=r(18,25,84,78,d.WOOD,8)+r(18,19,84,78,d.OWNER,8)+r(25,26,70,64,'none',5,stroke=d.CREAM,stroke_width='1.3')
  if motif:body+=g(d.cube() if motif=='cube' else d.worker() if motif=='worker' else d.symbol(motif),'translate(37 34) scale(.38)')
  if value is not None:body+=d.text(value,60,76 if not motif else 91,31 if not motif else 23)
  return g(body)
 if shape=='priest':return g(d.shadow()+p('M50 12h20l7 19-9 16 17 56H35l17-56-9-16Z',d.OWNER)+d.shine('m54 22-3 9m1 30-8 32'))
 if shape=='power':return g(d.disk().replace(d.OWNER,'#826393')+c(60,50,14,'none',stroke=d.CREAM,stroke_width='2'))
 if shape=='ship-tile':
  hull=p('m20 74 19 24h49l16-24Z','#b99a6b')
  sail=p('M59 29v48m0-43H31l8 30h20Z',d.CREAM)
  if value=='longship':sail+=p('M66 29v48m0-43h23l-6 30H66Z',d.CREAM)
  if value=='whaling':sail=p('M32 60 82 41m-2-3 7 3-4 7','none',stroke=d.WOOD,stroke_width='4')
  return g(r(8,16,104,91,d.PAPER,3)+r(13,21,94,81,'#8eb3b8',2)+hull+sail)
 if shape=='animal-tile':
  animal='sheep' if motif=='sheep' else 'cattle'
  body=g(r(12,19,96,87,d.PAPER,3)+r(17,24,86,77,'#b95749',2))+g(d.symbol(animal),'translate(12 21) scale(.78)')
  if value=='pregnant':body+=g(d.symbol(animal),'translate(69 65) scale(.28)')
  return body
 if shape.startswith('tiny-'):
  k=shape[5:]
  forms={
   'cottage':'M25 57 60 26l35 31v48H25Z',
   'chapel':'M24 63h40V27h18v36h15v42H24Z M64 27l9-17 9 17Z',
   'farm':'M18 61 41 39l22 22 19-21 21 21v44H18Z',
   'tavern':'M27 31h65v74H27Z M22 31l38-17 38 17Z',
   'theater':'M20 69q40-64 80 0v36H20Z',
   'factory':'M19 57 40 40v17l20-17v17l20-17v17h9V21h13v84H19Z',
   'monument':'M36 99V82h13V25h22v57h13v17Z M43 15h34v12H43Z',
  }
  if k=='well':body=p('M23 67q37-35 74 0v30q-37 22-74 0Z',d.OWNER)+p('M23 67q37 20 74 0m-60 7v25m24-23v27m22-30v25','none')+p('M37 63q23-10 47 0-24 14-47 0Z',d.INK)
  else:body=p(forms[k],d.OWNER)+d.shine('M35 78v19')
  return g(d.shadow()+body)
 if shape=='die':
  # Large front face; unlike a numbered die Tokyo has exactly 1/2/3/energy/claw/heart.
  body=g(p('m18 31 17-14h66v72l-17 17H18Z',d.OWNER)+p('m18 31 17-14h66L84 34Z',d.CREAM,opacity='.3')+d.shade('M84 34l17-17v72l-17 17Z')+r(18,31,66,75,d.OWNER,6)+d.shine('M25 89V40h48'))
  if value is None:return body
  if isinstance(value,int):
   coords={1:[(51,68)],2:[(36,49),(67,88)],3:[(36,49),(51,68),(67,88)],4:[(36,49),(67,49),(36,88),(67,88)],5:[(36,49),(67,49),(51,68),(36,88),(67,88)],6:[(36,49),(67,49),(36,68),(67,68),(36,88),(67,88)]}
   return body+''.join(c(x,y,4,d.INK) for x,y in coords[value])
  mark='#c0d76c'
  icon=p('M37 15 18 82l13-5 16-62m14 0L43 90l13-8 15-67m15 0L68 82l13-5 15-62','none',stroke=mark,stroke_width='7') if value=='claw' else p('M65 8 28 61h27l-4 46 42-64H65Z',mark) if value=='energy' else p('M60 99 20 59Q0 28 24 15q23-12 36 13Q73 3 96 15q24 13 4 44Z',mark)
  return body+g(icon,'translate(24 40) scale(.45)')
 if shape=='tokyo-number':
  return draw('die',None)+d.text(value,51,85,46,'#c0d76c')
 if shape=='terrain':
  return g(c(60,65,44,d.WOOD)+c(60,59,44,d.OWNER)+g(d.symbol(motif or 'tree'),'translate(26 23) scale(.58)'))
 if shape=='first':return g(r(29,13,62,97,d.PAPER,5)+r(36,20,48,82,d.CREAM,3)+d.text('1',60,79,54,'#2b6477'))
 raise KeyError(shape)
