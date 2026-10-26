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


if __name__=='__main__':unittest.main()
