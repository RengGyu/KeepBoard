"""Refresh the atlas/contact sheet and optionally package only this task's folders."""
import argparse, json, pathlib, xml.etree.ElementTree as ET, zipfile
from html import escape
from PIL import Image

ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'public/game-art';DOC=ROOT/'docs/game-art'
ET.register_namespace('','http://www.w3.org/2000/svg')
assets=json.loads((OUT/'assets.json').read_text())['assets'];counts=json.loads((OUT/'coverage.json').read_text())['asset_counts']
defs=ET.tostring(ET.parse(OUT/'representative.svg').getroot().find('{http://www.w3.org/2000/svg}defs'),encoding='unicode')
figures=[]
for asset in assets:
 id='ga--'+asset['asset_id'].replace('.','--')
 figures.append('<figure><svg class="art" data-asset-id="'+asset['asset_id']+'" viewBox="0 0 120 120" width="64" height="64" role="img" aria-label="'+escape(asset['label'],quote=True)+'"><use href="#'+id+'"/></svg><figcaption>'+escape(asset['asset_id'])+'<br>'+escape(asset['label'])+'</figcaption></figure>')
html='<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KeepBoard · 전체 에셋 64px 아틀라스</title><style>body{margin:24px;background:#f8f5eb;color:#33483c;font:12px -apple-system,sans-serif}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:20px}figure{margin:0;min-height:135px;text-align:center;border-bottom:1px solid #dbdfce;padding:15px 0}.art{overflow:visible}figcaption{font-size:10px;line-height:1.5;overflow-wrap:anywhere;padding-top:10px}h1{font-size:24px}a{color:inherit}</style><h1>모든 에셋 · 64px 공통 크기</h1><p>신규 공통 '+str(counts['common'])+' · 신규 전용 '+str(counts['dedicated'])+' · 기존 참조 '+str(counts['existing'])+'. 개별 대표형이며 정확한 실물 종류/수량이나 인식 성능을 보증하지 않습니다. <a href="index.html">게임별 갤러리</a></p><svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">'+defs+'</svg><main>'+''.join(figures)+'</main></html>'
(OUT/'atlas.html').write_text(html)
parser=argparse.ArgumentParser();parser.add_argument('--zip',action='store_true');parser.add_argument('--skip-raster',action='store_true');args=parser.parse_args()
sheet=Image.new('RGB',(2880,4680),'#f8f5eb')
for i,n in enumerate([] if args.skip_raster else [20,40,60,80,100,120]):
 im=Image.open(OUT/'checkpoints'/f'{n:03}-representative.png').convert('RGB');assert im.size==(1440,1560)
 sheet.paste(im,((i%2)*1440,(i//2)*1560))
if not args.skip_raster:sheet.save(OUT/'overview.png',optimize=True)
if args.zip:
 files=[p for folder in [OUT,DOC] for p in folder.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix not in ['.zip','.pyc'] and p.name!='package.json']
 archive=OUT/'keepboard-game-art-120.zip'
 with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for p in sorted(files):z.write(p,str(p.relative_to(ROOT)))
 with zipfile.ZipFile(archive) as z:assert z.testzip() is None
 report={'archive':str(archive.relative_to(ROOT)),'archive_bytes':archive.stat().st_size,'archive_file_count':len(files),'svg_individual_new':sum(a['classification']!='existing' for a in assets),'existing_references_no_new_svg_copy':counts['existing'],'source_files_bytes':sum(p.stat().st_size for p in files),'png_sheets':[{'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size} for p in sorted((OUT/'checkpoints').glob('*.png'))],'overview_dimensions':[2880,4680],'original_assets_copied':False,'portability':'Gallery and atlas embed reference previews. Existing module/file adapters require originals in the KeepBoard workspace; originals are not copied into this ZIP.'}
 report['raster_status']='Public PNG sheets/overview historical pre-F001–F020; corrections/screenshots/contact.png is preliminary for F018/F020 owner-building cells (see corrections/README.md).' if args.skip_raster else 'refreshed from checkpoint PNGs'
 (DOC/'package.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(report,ensure_ascii=False))
else:print('atlas',len(assets),'overview',sheet.size)
