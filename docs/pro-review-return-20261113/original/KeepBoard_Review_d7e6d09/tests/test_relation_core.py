import unittest, importlib.util, pathlib, sys
P=pathlib.Path(__file__).parents[1]/'analysis'/'relation_core.py'
class RelationCore(unittest.TestCase):
 def setUp(self):
  self.assertTrue(P.exists(), 'relation core not implemented')
  s=importlib.util.spec_from_file_location('relation_core',P);self.m=importlib.util.module_from_spec(s);sys.modules[s.name]=self.m;s.loader.exec_module(self.m)
 def test_frame_maps_corner_correspondence(self):
  f=self.m.frame_from_corners([(0,0),(2,0),(2,1),(0,1)])
  self.assertAlmostEqual(self.m.project(f,(1,.5))[0],.5)
  self.assertAlmostEqual(self.m.project(f,(1,.5))[1],.5)
 def test_frame_rejects_collinear(self):
  with self.assertRaises(ValueError):self.m.frame_from_corners([(0,0),(1,0),(2,0),(3,0)])
 def test_frame_rejects_crossed_corner_order(self):
  with self.assertRaises(ValueError):self.m.frame_from_corners([(0,0),(1,1),(1,0),(0,1)])
 def test_side_translation_does_not_flip(self):
  a=self.m.side_of_line((.5,.8),(.2,.4),(.8,.4),(.5,.6),.01)
  b=self.m.side_of_line((.5,1.0),(.2,.6),(.8,.6),(.5,.8),.01)
  self.assertEqual((a,b),('side-B','side-B'))
 def test_side_rotation_does_not_flip(self):
  rot=lambda p:(-p[1],p[0])
  args=((.5,.8),(.2,.4),(.8,.4),(.5,.6))
  self.assertEqual(self.m.side_of_line(*args,.01),self.m.side_of_line(*(rot(p) for p in args),.01))
 def test_side_boundary_unknown(self):
  self.assertIsNone(self.m.side_of_line((.5,.405),(.2,.4),(.8,.4),(.5,.6),.02))
 def test_side_reference_on_line_is_unknown(self):
  self.assertIsNone(self.m.side_of_line((.5,.8),(.2,.4),(.8,.4),(.5,.4),.01))
 def test_group_key_requires_and_separates_board(self):
  x=self.m.group_key('photo:epoch:owner:definition','A','discard','blue')
  y=self.m.group_key('photo:epoch:owner:definition','B','discard','blue')
  self.assertNotEqual(x,y)
  with self.assertRaises(ValueError):self.m.group_key('scope',None,'discard','blue')
 def test_partial_order_preserves_unknown(self):
  r=self.m.partial_order(['a','b','c'],[('a','b')])
  self.assertEqual(r['levels'],[['a','c'],['b']]);self.assertFalse(r['total_order_known'])
 def test_cycle_preserved_unresolved(self):
  r=self.m.partial_order(['a','b','c'],[('a','b'),('b','a')])
  self.assertEqual(r['levels'],[['c']]);self.assertEqual(r['unresolved'],['a','b'])
 def test_bad_edge_does_not_create_piece(self):
  r=self.m.partial_order(['a'],[('a','ghost')]);self.assertEqual(r['levels'],[['a']]);self.assertEqual(r['rejected_edges'],[['a','ghost']])
if __name__=='__main__':unittest.main()
