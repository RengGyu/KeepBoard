"""Offline stdlib tests only; no provider or product imports."""
import base64
import copy
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
import sys
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('hosted_benchmark',ROOT/'tools/hosted-vision-benchmark/runner.py')
b=importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=')


def gemini(items,finish='STOP'):
    return {'candidates':[{'finishReason':finish,'content':{'parts':[{'text':json.dumps({'items':items})}]}}],
            'usageMetadata':{'promptTokenCount':10,'candidatesTokenCount':8,'thoughtsTokenCount':2,'totalTokenCount':20}}


class Contracts(unittest.TestCase):
    def test_real_transport_contract_uses_header_auth_and120s_timeout_without_network(self):
        for provider in ['gemini','florence']:
            with patch('urllib.request.build_opener') as build:
                response=build.return_value.open.return_value.__enter__.return_value
                response.status=200;response.read.return_value=b'{}'
                b.send(provider,b.ENDPOINTS[provider],{},'fake-key')
                call=build.return_value.open.call_args
                self.assertEqual(call.kwargs['timeout'],120)
                request=call.args[0]
                self.assertNotIn('fake-key',request.full_url)
                self.assertNotIn(b'fake-key',request.data)
                self.assertIn('fake-key',' '.join(request.headers.values()))

    def test_existing_named_key_formats_extract_one_value_only(self):
        for text in ['Gemini API : fake-existing','GEMINI_API\nfake-existing','{"api_key":"fake-existing"}']:
            self.assertEqual(b.extract_gemini(text)[0],'fake-existing')
        with self.assertRaises(ValueError):b.extract_gemini('Gemini access token '+('x'*30))
        with self.assertRaises(ValueError):b.extract_gemini('GEMINI_API_KEY=one\nGEMINI_API_KEY=two')

    def test_complete_period_containing_credentials_are_never_substring_extracted(self):
        value='AQ.synthetic.complete-token_segment.with-periods'
        for text in [value,'GEMINI_API_KEY='+value,json.dumps({'GEMINI_API_KEY':value}),"'"+value+"'"]:
            self.assertEqual(b.extract_gemini(text)[0],value)
        with self.assertRaises(ValueError):b.extract_gemini('unrecognized-label: '+value)

    def test_models_are_exact_and_no_unrequested_fallback(self):
        self.assertEqual(b.model_contracts(),{'gemini':'gemini-3.8-flash','florence':'florence-2-base'})

    def test_gemini_literal_and_null_normalize_without_game_inference(self):
        out=b.parse_response('gemini','ocr-with-region',gemini([{'text':'09','quad_1000':[0,0,500,0,500,500,0,500]},{'text':None,'quad_1000':[500,500,1000,500,1000,1000,500,1000]}]),1,1)
        self.assertEqual(out['observations'][0]['text'],'09')
        self.assertIsNone(out['observations'][1]['text'])
        self.assertEqual(out['observations'][0]['bbox'],{'x':0,'y':0,'width':.5,'height':.5})

    def test_gemini_rejects_truncated_blocked_and_unstructured_responses(self):
        for response in [gemini([], 'MAX_TOKENS'),{'promptFeedback':{'blockReason':'SAFETY'}},gemini([])]:
            if response.get('candidates',[{}])[0].get('finishReason')=='STOP':
                response['candidates'][0]['content']['parts'][0]['text']='```json\n{"items":[]}\n```'
            with self.assertRaises(ValueError):b.parse_response('gemini','ocr-with-region',response,1,1)

    def test_florence_native_quadrilateral_is_preserved(self):
        out=b.parse_response('florence','ocr-with-region',{'response':{'<OCR_WITH_REGION>':{'quad_boxes':[[10,20,40,20,40,50,10,50]],'labels':['6']}}},100,100)
        self.assertEqual(out['observations'][0]['polygon'],[{'x':.1,'y':.2},{'x':.4,'y':.2},{'x':.4,'y':.5},{'x':.1,'y':.5}])
        self.assertEqual(out['completion'],'UNKNOWN_NATIVE_FINISH_NOT_EXPOSED')

    def test_objects_remain_labels_and_are_not_ocr_or_game_state(self):
        native={'response':{'<OD>':{'bboxes':[[10,20,40,50]],'labels':['card']}}}
        out=b.parse_response('florence','component-location',native,100,100)
        self.assertEqual(out['observations'][0]['label'],'card')
        self.assertIsNone(out['observations'][0]['text'])
        out=b.parse_response('gemini','component-location',gemini([{'label':None,'quad_1000':[0,0,1000,0,1000,1000,0,1000]}]),1,1)
        self.assertIsNone(out['observations'][0]['label'])

    def test_florence_rejects_wrong_task_mismatched_arrays_and_truncation(self):
        cases=[{'response':{'<OCR>':'abc'}},{'response':{'<OCR_WITH_REGION>':{'quad_boxes':[],'labels':['a']}}},
               {'truncated':True,'response':{'<OCR_WITH_REGION>':{'quad_boxes':[],'labels':[]}}}]
        for response in cases:
            with self.assertRaises(ValueError):b.parse_response('florence','ocr-with-region',response,1,1)

    def test_geometry_rejects_invalid_units_and_does_not_clamp(self):
        for quad in [[0,0,1001,0,1001,1000,0,1000],[0,0,0,0,0,0,0,0],[0,0,float('nan'),0,500,500,0,500]]:
            with self.assertRaises(ValueError):b.parse_response('gemini','ocr-with-region',gemini([{'text':'a','quad_1000':quad}]),1,1)

    def test_cost_estimate_is_not_billing_and_counts_thinking(self):
        c=b.usage_and_cost('gemini',gemini([]),100)
        self.assertAlmostEqual(c['estimatedUSD'],(10*.75+10*3.75)/1_000_000)
        self.assertIsNone(c['billedUSD'])
        c=b.usage_and_cost('florence',{'time':2.0},9000)
        self.assertEqual(c['estimatedCredits'],.004)
        self.assertIsNone(c['billedCredits'])
        self.assertIsNone(b.usage_and_cost('florence',{},9000)['estimatedCredits'])


class Harness(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix='hosted-benchmark-test-')
        self.root=Path(self.temp.name);os.chmod(self.root,0o700)
        (self.root/'photo.png').write_bytes(PNG)
        self.manifest={'version':'hosted-vision-benchmark-v1','images':[{'id':'img','gameId':'catan','path':'photo.png','sha256':b.sha(PNG),'width':1,'height':1,'mimeType':'image/png','approvedForHosted':False}],
                       'contexts':[],'runs':[{'id':'g','imageId':'img','provider':'gemini','condition':'photos-only'},{'id':'f','imageId':'img','provider':'florence','condition':'photos-only'}]}

    def tearDown(self):self.temp.cleanup()

    def prepare(self):
        path=self.root/'manifest.json';path.write_text(json.dumps(self.manifest))
        return b.prepare(path)

    def test_offline_prepare_needs_no_keys_network_and_lists_permission_blocker(self):
        with patch.dict(os.environ,{},clear=True),patch('urllib.request.OpenerDirector.open',side_effect=AssertionError('network')):
            plan=self.prepare()
        self.assertEqual(plan['plannedCalls'],2)
        self.assertTrue(any('approvedForHosted' in x for x in plan['blockers']))
        with self.assertRaises(ValueError):b.execute(self.root/'manifest.json',plan,self.root/'out',plan['planSHA256'])

    def test_context_references_need_separate_permission_and_florence_is_na(self):
        (self.root/'rules.txt').write_text('visible categories only')
        ref=copy.deepcopy(self.manifest['images'][0]);ref.pop('id');ref.pop('gameId')
        self.manifest['contexts']=[{'id':'ctx','gameId':'catan','rules':{'path':'rules.txt','sha256':b.sha((self.root/'rules.txt').read_bytes())},'references':[ref]}]
        self.manifest['images'][0]['approvedForHosted']=True
        self.manifest['runs']=[{'id':'g','imageId':'img','provider':'gemini','condition':'game-context','contextId':'ctx'},{'id':'f','imageId':'img','provider':'florence','condition':'game-context','contextId':'ctx'}]
        plan=self.prepare()
        self.assertEqual(plan['plannedCalls'],1)
        self.assertEqual(plan['runs'][1]['status'],'N/A_UNSUPPORTED_CONTEXT')
        self.assertTrue(any('reference' in x for x in plan['blockers']))

    def test_requests_have_fixed_models_tasks_no_secrets_or_gt_and_context_is_separate(self):
        path=self.root/'manifest.json';self.prepare()
        _,requests=b.build_plan(path)
        g,f=requests
        self.assertNotIn('key=',g['endpoint']);self.assertNotIn('api_key',json.dumps(f['body']))
        self.assertEqual(f['body']['prompt'],'<OCR_WITH_REGION>')
        self.assertEqual(f['body']['model_id'],'florence-2-base')
        self.assertEqual(g['body']['generationConfig']['thinkingConfig']['thinkingLevel'],'LOW')
        self.assertEqual(g['body']['generationConfig']['responseFormat']['text']['mimeType'],'APPLICATION_JSON')
        self.assertNotIn('temperature',g['body']['generationConfig'])

    def test_budget_drift_and_undeclared_gt_fail_without_send(self):
        self.manifest['runs']=[{'id':str(i),'imageId':'img','provider':'gemini','condition':'photos-only'} for i in range(7)]
        with self.assertRaises(ValueError):self.prepare()
        self.manifest['runs']=self.manifest['runs'][:1];plan=self.prepare()
        (self.root/'photo.png').write_bytes(PNG+b'changed')
        with self.assertRaises(ValueError):b.execute(self.root/'manifest.json',plan,self.root/'out',plan['planSHA256'])
        self.manifest['GT']='forbidden'
        with self.assertRaises(ValueError):self.prepare()

    def test_execute_mock_uses_header_auth_once_and_ledger_blocks_repeat(self):
        self.manifest['images'][0]['approvedForHosted']=True
        plan=self.prepare();out=self.root/'out'
        seen=[]
        def transport(provider,endpoint,body,key):
            seen.append((provider,endpoint,key))
            return (200,json.dumps(gemini([]) if provider=='gemini' else {'response':{'<OCR_WITH_REGION>':{'quad_boxes':[],'labels':[]}}}).encode())
        with patch.dict(os.environ,{'GEMINI_API_KEY':'fake-g','ROBOFLOW_API_KEY':'fake-r'}):
            result=b.execute(self.root/'manifest.json',plan,out,plan['planSHA256'],transport=transport)
            with self.assertRaises(FileExistsError):b.execute(self.root/'manifest.json',plan,out,plan['planSHA256'],transport=transport)
        self.assertEqual(len(seen),2);self.assertEqual(result['attempts'],2)
        for file in out.rglob('*'):
            if file.is_file():
                self.assertEqual(file.stat().st_mode&0o077,0)
                self.assertNotIn('fake-g',file.read_text());self.assertNotIn('fake-r',file.read_text())

    def test_error_body_echoing_key_is_redacted_and_never_retried(self):
        self.manifest['images'][0]['approvedForHosted']=True
        plan=self.prepare();calls=[]
        def transport(*args):calls.append(1);return 401,b'{"error":"fake-secret"}'
        with patch.dict(os.environ,{'GEMINI_API_KEY':'fake-secret','ROBOFLOW_API_KEY':'another'}):
            result=b.execute(self.root/'manifest.json',plan,self.root/'failed',plan['planSHA256'],transport=transport)
        self.assertEqual(len(calls),1);self.assertEqual(result['attempts'],1)
        self.assertEqual(result['status'],'STOPPED')
        self.assertNotIn('fake-secret',''.join(p.read_text() for p in (self.root/'failed').rglob('*') if p.is_file()))

    def test_explicit_existing_key_file_may_be_uploaded0644_but_generated_json_is_private(self):
        p=self.root/'existing-key';p.write_text('GEMINI_API_KEY=fake-existing\n');os.chmod(p,0o600)
        self.assertEqual(b.load_credentials({'gemini'},gemini_key_file=p)['gemini'],'fake-existing')
        os.chmod(p,0o644)
        self.assertEqual(b.load_credentials({'gemini'},gemini_key_file=p)['gemini'],'fake-existing')
        p.write_text('{"GEMINI_API_KEY":"fake-existing"}')
        with self.assertRaises(ValueError):b.load_credentials({'gemini'},credential_path=p)

    def test_explicit_roboflow_raw_upload_is_read_only_and_not_persisted(self):
        p=self.root/'roboflow-upload';before=b'fake-roboflow-key\n';p.write_bytes(before);os.chmod(p,0o644)
        self.assertEqual(b.load_credentials({'florence'},roboflow_key_file=p),{'florence':'fake-roboflow-key'})
        self.assertEqual(p.read_bytes(),before);self.assertEqual(p.stat().st_mode&0o777,0o644)
        p.write_text('ambiguous key with spaces')
        with self.assertRaises(ValueError):b.load_credentials({'florence'},roboflow_key_file=p)

    def test_roboflow_only_setup_preserves_existing_gemini_and_private_permissions(self):
        old=sys.modules.get('runner');sys.modules['runner']=b
        try:
            spec=importlib.util.spec_from_file_location('hosted_credentials',ROOT/'tools/hosted-vision-benchmark/credentials.py')
            helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
            p=self.root/'credentials.json';p.write_text('{"GEMINI_API_KEY":"existing-gemini"}');os.chmod(p,0o600)
            helper.store_roboflow(p,'new-roboflow')
            self.assertEqual(json.loads(p.read_text()),{'GEMINI_API_KEY':'existing-gemini','ROBOFLOW_API_KEY':'new-roboflow'})
            self.assertEqual(p.stat().st_mode&0o077,0)
        finally:
            if old is None:sys.modules.pop('runner',None)
            else:sys.modules['runner']=old


class GameContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.saved=sys.modules.get('runner');sys.modules['runner']=b
        spec=importlib.util.spec_from_file_location('game_benchmark',ROOT/'tools/hosted-vision-benchmark/game_runner.py')
        cls.g=importlib.util.module_from_spec(spec);spec.loader.exec_module(cls.g)

    @classmethod
    def tearDownClass(cls):
        if cls.saved is None:sys.modules.pop('runner',None)
        else:sys.modules['runner']=cls.saved

    def item(self,kind='number-token',box=None,number=6):
        return {'kind':kind,'box_1000':box or [100,200,300,400],'attributes':{'terrainType':None,'number':number}}

    def response(self,provider,items):
        text=json.dumps({'items':items})
        if provider=='gemini':return {'candidates':[{'finishReason':'STOP','content':{'parts':[{'text':text}]}}]}
        return {'status':'completed','output':[{'type':'reasoning','content':[]},{'type':'message','status':'completed','content':[{'type':'output_text','text':text}]}]}

    def test_native_requests_share_task_schema_context_and_source_without_gt(self):
        g=self.g.body('gemini',PNG,'image/png','safe category context')
        d=self.g.body('deepseek',PNG,'image/png','safe category context')
        self.assertEqual(g['generationConfig']['maxOutputTokens'],32768)
        self.assertEqual(g['generationConfig']['thinkingConfig'],{'thinkingLevel':'LOW'})
        self.assertEqual(d['reasoning'],{'effort':'low'})
        self.assertEqual(d['max_output_tokens'],32768)
        self.assertEqual(d['input'][0]['content'][0]['text'],g['contents'][0]['parts'][0]['text'])
        self.assertEqual(d['input'][0]['content'][1]['detail'],'original')
        native=copy.deepcopy(d['text']['format']['schema']);box=native['properties']['items']['items']['properties']['box_1000']
        self.assertIn('anyOf',box)
        self.assertEqual(box['anyOf'][1],{'type':'null'})
        restored=copy.deepcopy(box['anyOf'][0]);restored['type']=['array','null']
        native['properties']['items']['items']['properties']['box_1000']=restored
        self.assertEqual(native,g['generationConfig']['responseFormat']['text']['schema'])
        self.assertNotIn('groundTruth',json.dumps(d))

    def test_native_completion_and_yxyx_axes_no_clamp(self):
        for provider in ['gemini','deepseek']:
            out=self.g.parse(provider,self.response(provider,[self.item()]))
            self.assertEqual(out[0]['bbox'],{'x':.2,'y':.1,'width':.2,'height':.2})
        d=self.response('deepseek',[]);d['status']='incomplete'
        with self.assertRaises(ValueError):self.g.parse('deepseek',d)
        d=self.response('gemini',[]);d['candidates'][0]['finishReason']='MAX_TOKENS'
        with self.assertRaises(ValueError):self.g.parse('gemini',d)
        with self.assertRaises(ValueError):self.g.parse('gemini',self.response('gemini',[self.item(box=[-1,0,20,20])]))

    def test_empty_unknown_unlocalized_and_invalid_domain_remain_distinct(self):
        self.assertEqual(self.g.parse('deepseek',self.response('deepseek',[])),[])
        i=self.item(number=None);i['box_1000']=None
        self.assertIsNone(self.g.parse('deepseek',self.response('deepseek',[i]))[0]['bbox'])
        for n in [0,7,13,True]:
            with self.assertRaises(ValueError):self.g.parse('deepseek',self.response('deepseek',[self.item(number=n)]))
        i=self.item(kind='robber',number=6)
        with self.assertRaises(ValueError):self.g.parse('deepseek',self.response('deepseek',[i]))

    def test_physical_gt_matching_is_value_independent_and_duplicate_is_ambiguous(self):
        gt={'source':{'width':100,'height':100},'objects':[{'id':'disc','componentId':'number-token','bboxPx':[20,10,40,30],'attributes':{'number':9},'readability':'readable','uncertainty':None}]}
        obs=self.g.parse('gemini',self.response('gemini',[self.item(number=6)]))
        score=self.g.evaluate(obs,gt)
        self.assertEqual(score['counts']['wrong'],1)
        self.assertAlmostEqual(score['matches'][0]['iou'],1)
        score=self.g.evaluate(obs+obs,gt)
        self.assertEqual(score['counts']['ambiguous'],1)
        self.assertEqual(score['counts']['correct'],0)

    def test_experiment_attempt_cap_persists_across_batches(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            for i in range(6):self.assertEqual(self.g.claim_attempt(root,{'id':str(i)}),i+1)
            with self.assertRaises(ValueError):self.g.claim_attempt(root,{'id':'seventh'})

    def test_kind_is_scored_after_geometry_and_gt_aliases_are_fixed(self):
        gt={'photo':{'width':100,'height':100},'objects':[{'id':'hex','componentId':'terrain','polygonPx':[[20,10],[40,10],[40,30],[20,30]],'attributes':{'terrain':'brick'},'readability':'readable','uncertainty':None}]}
        obs=self.g.parse('gemini',self.response('gemini',[self.item(number=6)]))
        score=self.g.evaluate(obs,gt)
        self.assertEqual(score['counts']['wrong'],1)
        self.assertFalse(score['matches'][0]['kindCorrect'])
        self.assertEqual(self.g.load_targets(gt)[0]['attributes']['terrainType'],'hills')

    def test_offline_literal_projection_preserves_unknown_and_source_not_fake_reader(self):
        observations=self.g.parse('deepseek',self.response('deepseek',[self.item(number=None)]))
        projected=self.g.literal_projection(observations,{'imageSHA256':'synthetic'})
        self.assertIsNone(projected[0]['properties']['number'])
        self.assertEqual(projected[0]['region'],observations[0]['bbox'])
        self.assertEqual(projected[0]['source']['imageSHA256'],'synthetic')
        self.assertNotIn('readerIdentity',projected[0])

    def test_game_plan_is_offline_context_separated_and_rejects_gt_fields(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'image.png').write_bytes(PNG);(root/'context.txt').write_text('Visible categories only')
            m={'version':'game-vision-benchmark-v1','image':{'path':'image.png','sha256':b.sha(PNG),'width':1,'height':1,'mimeType':'image/png','approvedForHosted':True},'context':{'path':'context.txt','sha256':b.sha((root/'context.txt').read_bytes())},'runs':[{'id':'D1','provider':'gemini','context':False},{'id':'D2','provider':'gemini','context':True},{'id':'D3','provider':'deepseek','context':True}]}
            path=root/'manifest.json';path.write_text(json.dumps(m))
            with patch('urllib.request.OpenerDirector.open',side_effect=AssertionError('network')):
                plan,requests=self.g.build_plan(path)
            self.assertEqual(plan['plannedCalls'],3)
            self.assertEqual(plan['runs'][1]['semanticTextSHA256'],plan['runs'][2]['semanticTextSHA256'])
            self.assertNotEqual(plan['runs'][0]['semanticTextSHA256'],plan['runs'][1]['semanticTextSHA256'])
            self.assertLess(plan['planningWorstUSD'],1.70)
            m['GT']={};path.write_text(json.dumps(m))
            with self.assertRaises(ValueError):self.g.build_plan(path)

    def test_deepseek_file_preserves_complete_token_and_transport_auth_is_header_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'provided';p.write_text('DEEPSEEK_API_KEY=synthetic.complete-key');os.chmod(p,0o644)
            before=p.read_bytes();self.assertEqual(self.g.deepseek_key(p),'synthetic.complete-key');self.assertEqual(p.read_bytes(),before)
            with patch('urllib.request.build_opener') as build:
                response=build.return_value.open.return_value.__enter__.return_value;response.status=200;response.read.return_value=b'{}'
                self.g.send('deepseek',{},'fake.key')
                request=build.return_value.open.call_args.args[0]
                self.assertEqual(build.return_value.open.call_args.kwargs['timeout'],180)
                self.assertNotIn('fake.key',request.full_url);self.assertNotIn(b'fake.key',request.data)

    def test_fresh_prepare_creates_experiment_before_nested_out_both_private(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/'new-experiment';out=root/'batch'
            self.g.prepare_run(out,root,{'fake':'offline-only'})
            self.assertEqual(root.stat().st_mode&0o777,0o700)
            self.assertEqual(out.stat().st_mode&0o777,0o700)
            self.assertEqual(json.loads((out/'plan.json').read_text()),{'fake':'offline-only'})

    def test_nine_photo_ledger_hardcap_is_nine_and_old_six_is_unchanged(self):
        with patch.dict(sys.modules,{'game_runner':self.g}):
            spec=importlib.util.spec_from_file_location('nine_benchmark',ROOT/'tools/hosted-vision-benchmark/nine_runner.py')
            nine=importlib.util.module_from_spec(spec);spec.loader.exec_module(nine)
            with tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp)
                for i in range(9):self.assertEqual(nine.claim_attempt(root,{'order':i+1}),i+1)
                with self.assertRaises(ValueError):nine.claim_attempt(root,{'order':10})
                self.assertEqual(len(list(root.glob('attempt-*.json'))),9)
            with tempfile.TemporaryDirectory() as tmp:
                for i in range(6):self.g.claim_attempt(Path(tmp),{'order':i+1})
                with self.assertRaises(ValueError):self.g.claim_attempt(Path(tmp),{'order':7})

    def test_nine_unobservable_gt_keeps_location_but_is_never_value_correct(self):
        with patch.dict(sys.modules,{'game_runner':self.g}):
            spec=importlib.util.spec_from_file_location('nine_benchmark',ROOT/'tools/hosted-vision-benchmark/nine_runner.py')
            nine=importlib.util.module_from_spec(spec);spec.loader.exec_module(nine)
            gt={'photo':{'width':100,'height':100},'objects':[{'id':'hidden-number','componentId':'number-token','bboxPx':[20,10,40,30],'attributes':{'number':None},'readability':'occluded','uncertainty':None,'valueScorable':False}]}
            observations=self.g.parse('gemini',self.response('gemini',[self.item(number=6)]))
            result=nine.score(observations,gt);group=result['perKind']['number-token']
            self.assertEqual(group['locationMatched'],1)
            self.assertEqual(group['locationDenominator'],1)
            self.assertEqual(group['valueDenominator'],0)
            self.assertEqual(group['valueCorrect'],0)
            self.assertEqual(group['GTUnobservableValues'],1)


if __name__=='__main__':unittest.main()
