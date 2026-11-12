import sys, unittest, importlib.util
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'analysis'))

class MatcherContract(unittest.TestCase):
    def setUp(self):
        spec = importlib.util.find_spec('match_observations')
        self.assertIsNotNone(spec, 'the matcher implementation must exist')
        import match_observations as m
        self.m = m
    def obj(self, i, box, **kw):
        return dict(id=i, bbox=box, **kw)
    def test_ids_colour_and_value_do_not_gate_geometry(self):
        gt=[self.obj('truth-a',[.1,.1,.2,.2],kind='die',values={'color':'purple','value':6})]
        pred=[self.obj('different-id',[.1,.1,.2,.2],kind='token',values={'color':'yellow','value':4})]
        result=self.m.match_objects(gt,pred)
        self.assertEqual([(p['truth_id'],p['prediction_id']) for p in result['matches']],[('truth-a','different-id')])
        self.assertEqual(result['unmatched_truth'],[])
    def test_two_disjoint_objects_match_one_to_one(self):
        gt=[self.obj('a',[.1,.1,.2,.2]),self.obj('b',[.4,.1,.5,.2])]
        pred=[self.obj('p2',[.4,.1,.5,.2]),self.obj('p1',[.1,.1,.2,.2])]
        out=self.m.match_objects(gt,pred)
        self.assertEqual({(p['truth_id'],p['prediction_id']) for p in out['matches']},{('a','p1'),('b','p2')})
    def test_duplicate_detection_is_not_a_second_true_match(self):
        gt=[self.obj('a',[.1,.1,.2,.2])]
        pred=[self.obj('p',[.1,.1,.2,.2]),self.obj('duplicate',[.1,.1,.2,.2])]
        out=self.m.match_objects(gt,pred)
        self.assertEqual(out['matches'],[])
        self.assertEqual(len(out['ambiguous']),2)
    def test_wide_box_covering_two_faces_is_unresolved_merge(self):
        gt=[self.obj('a',[.1,.1,.2,.2]),self.obj('b',[.22,.1,.32,.2])]
        out=self.m.match_objects(gt,[self.obj('both',[.09,.09,.33,.21])])
        self.assertEqual(out['matches'],[])
        self.assertEqual(out['merged_candidates'][0]['prediction_id'],'both')
    def test_far_object_is_not_matched(self):
        out=self.m.match_objects([self.obj('a',[.1,.1,.2,.2])],[self.obj('p',[.8,.8,.9,.9])])
        self.assertEqual(out['matches'],[])
        self.assertEqual(out['unmatched_truth'],['a'])
    def test_missing_geometry_is_unknown_not_value_error(self):
        out=self.m.match_objects([self.obj('a',[.1,.1,.2,.2])],[self.obj('p',None)])
        self.assertEqual(out['invalid_predictions'],['p'])
        self.assertEqual(out['matches'],[])
    def test_stacked_reference_regions_are_not_auto_merged(self):
        gt=[self.obj('a',[.1,.1,.3,.3]),self.obj('b',[.12,.12,.32,.32])]
        out=self.m.match_objects(gt,[self.obj('p',[.1,.1,.32,.32])])
        self.assertEqual(out['merged_candidates'],[])
        self.assertEqual(out['matches'],[])
        self.assertTrue(out['ambiguous'])
    def test_different_source_photos_never_match(self):
        out=self.m.match_objects([self.obj('a',[.1,.1,.2,.2],source_sha='a')],[self.obj('p',[.1,.1,.2,.2],source_sha='b')])
        self.assertEqual(out['matches'],[])
    def test_order_permutation_does_not_change_unique_pairs(self):
        gt=[self.obj('a',[.1,.1,.2,.2]),self.obj('b',[.7,.7,.8,.8])]
        pred=[self.obj('p',[.1,.1,.2,.2]),self.obj('q',[.7,.7,.8,.8])]
        pairs=lambda o:{(p['truth_id'],p['prediction_id']) for p in o['matches']}
        self.assertEqual(pairs(self.m.match_objects(gt,pred)),pairs(self.m.match_objects(gt[::-1],pred[::-1])))
    def test_attribute_unknown_and_zero_are_distinct(self):
        status=self.m.attribute_status
        self.assertEqual(status({'value':0,'status':'readable'},0,True),'match')
        self.assertEqual(status({'value':0,'status':'readable'},None,True),'app_unknown')
        self.assertEqual(status({'value':None,'status':'photo_unjudgeable'},1,True),'photo_unjudgeable')
        self.assertEqual(status({'value':6,'status':'readable'},9,False),'not_requested')


    def audit_fixture(self, field, observed, *, duplicate=False):
        piece={'id':'p','componentId':'token','evidenceId':'e','region':{'x':.1,'y':.1,'width':.1,'height':.1},
               'quantity':0,'face':'front','readout':{'values':{'value':1}}}
        receipt={'request':{'allowedPropertyIds':{'token':[field]}},'componentRefs':{'o':'p'},
                 'result':{'observations':[{'ref':'o','componentId':'token'}]}}
        assertion={'id':'a','value':{'pieces':[piece]},'observationReceiptRefs':[0]}
        case={'caseId':'fixture','sourcePhotoSHA256':'a'*64,'photos':[{'width':100,'height':100}],
              'receipts':[receipt],'assertions':[assertion]}
        if duplicate:
            import copy
            other=copy.deepcopy(assertion);other['id']='b';other['value']['pieces'][0]['readout']['values']['value']=2
            case['assertions'].append(other)
        truth={'sha256':'a'*64,'reviewStatus':'human-verified','exhaustive':False,
               'objects':[{'photoObjectId':'t','bbox':[.1,.1,.2,.2],
                           'attributes':{field:{'status':'readable','value':observed}}}]}
        return case, truth
    def test_quantity_is_read_from_piece_not_only_readout(self):
        case,truth=self.audit_fixture('quantity',0)
        self.assertEqual(self.m.audit_case(case,truth)['attributes'][0]['status'],'match')
    def test_face_falls_back_to_stored_piece_face(self):
        case,truth=self.audit_fixture('face','front')
        self.assertEqual(self.m.audit_case(case,truth)['attributes'][0]['status'],'match')
    def test_unreviewed_truth_is_rejected(self):
        case,truth=self.audit_fixture('quantity',0);truth['reviewStatus']='unverified'
        with self.assertRaises(ValueError):self.m.audit_case(case,truth)
    def test_conflicting_live_values_are_not_scored_using_first_record(self):
        case,truth=self.audit_fixture('value',1,duplicate=True)
        self.assertEqual(self.m.audit_case(case,truth)['attributes'][0]['status'],'stored_record_conflict')

if __name__=='__main__': unittest.main(verbosity=2)
