"""Exercise the actual new controlled components with synthetic fixtures.
Not a substitute for full React19 application, auth or API end-to-end checks.
Usage: python tools/readouts/browser-check.py HARNESS_DIR OUTPUT_DIR
Requires playwright and a Chromium executable (CHROMIUM_EXECUTABLE).
"""
import json, os, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
folder, out = map(Path, sys.argv[1:3]); out.mkdir(parents=True, exist_ok=True)
results=[]; errors=[]; started=time.time()
def check(name, condition):
    if not condition: raise AssertionError(name)
    results.append({'name':name,'passed':True})
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':390,'height':844})
    page.on('pageerror',lambda e:errors.append(str(e)))
    # Inline local files: no network, no real service or missing product module mocks.
    page.set_content('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="app"></div></body></html>')
    page.add_style_tag(path=str(folder/'harness.css'))
    for f in ['react.js','react-dom.js','bundle.js']:page.add_script_tag(path=str(folder/f))
    version=page.evaluate('React.version')
    report=page.evaluate('''()=>{const failures=[];let n=0;for(const item of kbHarness.catalog())for(const kind of item.kinds){kbHarness.select(item.gameId,kind,'typed');const before=JSON.stringify(kbHarness.snapshot().piece);kbHarness.rerender();if(before!==JSON.stringify(kbHarness.snapshot().piece)||kbHarness.snapshot().updates!==0)failures.push(item.gameId+'/'+kind);n++;}return {count:n,failures};}''')
    check('408 eligible component kinds render without writing on mount or rerender',report['count']==408 and not report['failures'] and not errors)
    page.evaluate("kbHarness.select('carcassonne','tiles','unknown')")
    face=page.get_by_label('보이는 면',exact=True)
    face.select_option('front')
    number=page.get_by_label('문장 표시 수',exact=True)
    number.fill('0')
    check('explicit zero is stored as number0, never unknown',page.evaluate('kbHarness.snapshot().piece.readout.values.shields')==0)
    number.fill('')
    check('clearing numeric input stores null, not zero',page.evaluate('kbHarness.snapshot().piece.readout.values.shields') is None)
    number.fill('2')
    before=page.evaluate('JSON.stringify(kbHarness.snapshot().piece)')
    number.fill('2.5')
    check('fractional integer rejected without altering last valid record',page.evaluate('JSON.stringify(kbHarness.snapshot().piece)')==before)
    number.fill('2')
    face.select_option('back')
    check('face change clears front-only data and disables front-only inputs',page.evaluate('kbHarness.snapshot().piece.readout.values.shields') is None and number.is_disabled())
    page.evaluate("kbHarness.select('carcassonne','tiles','invalid')")
    check('unknown schema is visibly read-only, no silent replacement',page.get_by_role('alert').count()==1 and page.locator('.gdr-fields input,.gdr-fields select').count()==0)
    page.evaluate("kbHarness.select('carcassonne','followers','typed')")
    owners=page.locator('.gdr-fields select').all_text_contents()
    check('owner selector uses actual fixture players',any('합성 참여자' in s for s in owners) and not any('가짜 플레이어' in s for s in owners))
    page.evaluate("kbHarness.select('scout','cards','typed')")
    page.get_by_label('상단 숫자',exact=True).fill('5')
    page.get_by_label('하단 숫자',exact=True).fill('3')
    page.get_by_label('사용 중인 위아래 방향',exact=True).select_option('bottom')
    scout=page.evaluate('kbHarness.snapshot().piece')
    check('Scout independently edits both numbers and active end, keeps quantity',scout['readout']['values']['topNumber']==5 and scout['readout']['values']['bottomNumber']==3 and scout['readout']['values']['activeEnd']=='bottom' and scout['quantity']==1)
    page.get_by_test_id('fixture-save').click();page.get_by_label('상단 숫자',exact=True).fill('8');page.get_by_test_id('fixture-reload').click()
    check('in-memory synthetic JSON roundtrip restores actual component payload',page.evaluate('kbHarness.snapshot().piece')==scout)
    for width in [320,390,1440]:
        page.set_viewport_size({'width':width,'height':900})
        for game,kind in [('carcassonne','tiles'),('scout','cards'),('terraforming-mars','resources')]:
            # Source component names are exact; select first available if no such kind.
            kind=page.evaluate('(a)=>{let x=kbHarness.catalog().find(x=>x.gameId===a.g);return x.kinds.includes(a.k)?a.k:x.kinds[0]}',{'g':game,'k':kind})
            page.evaluate('(a)=>kbHarness.select(a.g,a.k,"typed")',{'g':game,'k':kind})
            dimensions=page.evaluate('({scroll:document.documentElement.scrollWidth,width:innerWidth})')
            check(f'{game}/{kind} at {width}px no page horizontal overflow',dimensions['scroll']<=dimensions['width'])
            if (game=='carcassonne') or (game=='scout' and width==390):
                page.screenshot(path=str(out/f'{game}-{width}.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':900})
    page.evaluate("kbHarness.select('carcassonne','followers','relations')")
    target=page.get_by_label('놓인 타일·지형 대상',exact=True)
    feature=page.get_by_label('놓인 타일·지형 내부 지형',exact=True)
    check('Carcassonne target and distinct local feature retained in editor',target.input_value()=='tile-a' and feature.input_value()=='field-right')
    feature.select_option('field-left')
    check('explicit attachment change updates local feature only',page.evaluate("kbHarness.snapshot().piece.readout.values.attachedTo.featureId")=='field-left' and page.evaluate("kbHarness.snapshot().piece.readout.values.posture")=='lying')
    check('layout connects the actual follower to its recorded feature', '길 왼쪽 들판' in page.locator('.gdr-layout').inner_text())
    page.screenshot(path=str(out/'carcassonne-relations-390.png'),full_page=True)
    check('no browser runtime errors during all checks',not errors)
    browser.close()
report={'scope':'isolated actual new controlled React components, synthetic data only','react_version':version,'application_react_version':'19.3.1 requested, unavailable here','full_app_e2e':False,'authentication_tested':False,'model_calls':0,'network_requests_to_product':0,'screens':[320,390,1440],'component_kinds_rendered':408,'component_kinds_without_eligible_collection_binding':10,'checks':results,'errors':errors,'seconds':round(time.time()-started,3)}
(out/'browser-result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
