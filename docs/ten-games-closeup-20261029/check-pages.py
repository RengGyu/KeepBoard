import pathlib,subprocess,json,re,html
D=pathlib.Path('/private/tmp/kb-ten-games-closeup-20261029');rows=[]
for id,url in [('quacks-source','https://www.stivestabletop.uk/2023/07/26/fiftyninth-session.html'),('calico-review','https://blog.boardgamematrix.com/calico-board-game-review/')]:
 try:
  b=subprocess.run(['curl','--fail','--silent','--show-error','--location','--max-time','25',url],check=True,capture_output=True).stdout;(D/(id+'.html')).write_bytes(b);(D/(id+'.html')).chmod(0o600)
  imgs=[html.unescape(x)for x in re.findall(r'<img\b[^>]*>',b.decode(errors='replace'))]
  if id=='quacks-source':imgs=[x for x in imgs if 'quack' in x.lower()]
  else:imgs=[x for x in imgs if 'calico' in x.lower()]
  rows.append({'id':id,'sourceURL':url,'images':imgs[:12]})
 except Exception as e:rows.append({'id':id,'sourceURL':url,'error':type(e).__name__})
(D/'page-images.json').write_text(json.dumps(rows,indent=2));(D/'page-images.json').chmod(0o600)
print(json.dumps(rows))
