#!/usr/bin/env python3
"""Reproduce pairwise correspondence of 18 foreground candidates per response.
Transcribed from the pinned case JSONs, NOT ground truth. This script never
loads a photograph and must not be presented as visual regrading.
"""
from pathlib import Path
import json,csv
from match_observations import match_objects
ROOT=Path(__file__).resolve().parents[1]
SHA='94368d0c2f995914b9e857ceafa04afbfaff112c2b309ee082a4d2d4ac7a4feb'
# x,y,width,height,reported colour,reported value. Order is deliberately NOT used for matching.
high=[
('b8d64b819e56be48824401d58a9f',.237,.608,.065,.073,'yellow',4),
('3ffbc63cb53473752a8ab589d003',.322,.608,.061,.093,'blue',5),
('a3b935cbf70241fb67d13c115a0f',.402,.598,.062,.076,'red',None),
('75d1efcfe9f2a231bd47dca12f67',.482,.592,.066,.083,'green',1),
('b2c8e18ceba667ff54b7489b461c',.557,.587,.067,.097,'yellow',None),
('685b70ef04ddda389227b5b79aab',.237,.666,.067,.097,'yellow',4),
('f9b6a1b4e3d87df72f9e94fd47a3',.410,.657,.070,.103,'green',1),
('1681c7b33be7015aaa2e47214719',.497,.650,.066,.094,'blue',2),
('dafad913946b77da75d2ea80fe31',.235,.743,.072,.090,'blue',3),
('9d3805444bf8fe8472d31be042e2',.329,.733,.070,.102,'green',5),
('b7b39540a01d37f3f85e08486980',.422,.724,.071,.108,'purple',4),
('282c96a1c2859320f50ad315dbbf',.512,.712,.074,.119,'red',1),
('b9f1095040d841cbf3ff68ff6fdd',.598,.709,.078,.115,'yellow',5),
('9d370d455a30792dbb320d78660a',.235,.818,.074,.134,'purple',6),
('601bc99730b5ad7bec27dc46bb60',.332,.810,.080,.132,'yellow',3),
('6cc3fdc40be216dac868d17b5191',.433,.803,.082,.137,'red',1),
('97f1092c7fd3f5e4707d6d8cc6e4',.527,.793,.085,.131,'blue',3),
('1b4a694c1da6dffcf8d6b4f7704c',.623,.785,.088,.131,'green',2)]
medium=[
('caa6409acaa2315bc495a11e02a8',.234,.740,.073,.078,'파란색',3),
('a9b1248167460d8391b1aab8d441',.328,.729,.073,.096,'초록색',5),
('d8d8d2e508bb8e9bee384203a9b6',.422,.723,.070,.108,'보라색',4),
('fb14250b2f07c9691f6d48b1a194',.511,.709,.075,.121,'빨간색',1),
('70eb42f73a31ae4c8cc6fe806921',.598,.709,.080,.120,'노란색',5),
('69a2052357566a60034dfd2669d2',.233,.819,.078,.136,'보라색',6),
('a4d02964a2b188d109d3491e1ebc',.332,.807,.083,.135,'노란색',3),
('36235b13dfa2cdb913bf528323e3',.432,.801,.082,.132,'빨간색',1),
('3777acbe4f90a4e43c366235953c',.526,.790,.090,.134,'파란색',3),
('99c5e08bc7c1893d0189015230ef',.622,.784,.091,.134,'초록색',2),
('9741391040075f8ef25673ed3b45',.237,.607,.062,.075,'보라색',6),
('6475444de7241e27c980ab169ed2',.319,.603,.063,.097,'파란색',5),
('be6a0f6cd50c600ad990527515cc',.400,.594,.064,.080,'빨간색',3),
('79c9e82369a35b4d3e4f12d82942',.480,.591,.065,.091,'초록색',1),
('471f39e4f3e235999df534cfb6b0',.557,.588,.071,.096,'노란색',None),
('a677779c82679f5df2c694fa1dc1',.235,.670,.067,.088,'노란색',4),
('609cee6b426e68c7a574024aeb6d',.411,.659,.067,.096,'초록색',1),
('a6643aea717d556a6d68bd4d8388',.497,.652,.068,.088,'파란색',2)]
low=[
('4283709ab676b647b50aa2ab3f42',.236,.604,.064,.072,'purple',6),
('6a8f33db43f4cb3d1fdcda69a01f',.330,.732,.073,.097,'green',5),
('84f97efe7377ac2442168bcbf93e',.423,.723,.069,.101,'purple',4),
('69846823277407a5b1a22b62770a',.511,.710,.075,.120,'red',1),
('48ccb3dbb8223e9688b20bfb09d9',.599,.709,.078,.112,'yellow',5),
('d29159ef5daa9a9ff9cbcb56b3f0',.233,.820,.077,.130,'purple',6),
('e1308e00425b6aacb7a65043b3ea',.334,.809,.080,.131,'yellow',3),
('410cfe08d09bcbeb446e8587500d',.435,.802,.078,.131,'red',1),
('c959ffd8369b094149a6007aaf67',.528,.790,.083,.133,'blue',3),
('eca3f75be3a8310eb2df6ae91e00',.624,.784,.087,.134,'green',2),
('f031f97bc5576ce15971174ebb99',.319,.600,.063,.103,'blue',5),
('c2459a59292e6e3afac5d8c7c237',.400,.593,.066,.097,'red',3),
('96bc4dc4f3a4d1c867dd91bceaf2',.481,.590,.064,.088,'green',2),
('510b0443ad71227ef271f20118c2',.556,.584,.071,.096,'yellow',2),
('5b0be47e5fd1f0eda569db5e93aa',.234,.662,.069,.095,'yellow',4),
('169618b513c4e47f27a5a5033689',.410,.660,.068,.098,'green',1),
('3199a768812e118618a5c87fa8d8',.496,.653,.068,.092,'blue',2),
('f1d821e8b6b035009ccae42d515f',.233,.743,.076,.090,'blue',3)]
alias={'파란색':'blue','초록색':'green','보라색':'purple','빨간색':'red','노란색':'yellow'}

def convert(rows):
 return [dict(id='scan-'+i,bbox=[x,y,round(x+w,6),round(y+h,6)],source_sha=SHA,kind='dice',values={'dieColor':c,'dieValue':v}) for i,x,y,w,h,c,v in rows]

def main():
 data={n:convert(r) for n,r in [('high',high),('medium',medium),('low',low)]}
 (ROOT/'data/sagrada-response-extract.json').write_text(json.dumps(dict(sourceCommit='d7e6d098116659b727dae50a8ae204b1ab566aae',sourceSHA=SHA,
   provenance='manual transcription of stored case JSON; no direct photograph inspection; foreground candidate subset only',responses=data),ensure_ascii=False,indent=2))
 rows=[];summaries=[]
 for a,b in [('high','medium'),('high','low'),('medium','low')]:
  match=match_objects(data[a],data[b],aspect=1200/900);left={p['id']:p for p in data[a]};right={p['id']:p for p in data[b]}
  counts={'agrees':0,'disagrees':0,'one_unknown':0,'both_unknown':0}
  for pair in match['matches']:
   x,y=left[pair['truth_id']],right[pair['prediction_id']]
   for field in ('dieColor','dieValue'):
    vx,vy=x['values'][field],y['values'][field];nx,ny=alias.get(vx,vx),alias.get(vy,vy)
    state='both_unknown' if vx is None and vy is None else 'one_unknown' if vx is None or vy is None else 'agrees' if nx==ny else 'disagrees'
    counts[state]+=1
    rows.append(dict(left_case='sagrada-'+a,right_case='sagrada-'+b,left_piece_id=x['id'],right_piece_id=y['id'],
      iou=round(pair['iou'],6),field=field,left_value=vx,right_value=vy,comparison=state,
      adjudication='not_photo_verified; neither response is ground truth'))
  summaries.append(dict(pair=[a,b],geometric_pairs=len(match['matches']),ambiguous=len(match['ambiguous']),left_unmatched=match['unmatched_truth'],right_unmatched=match['unmatched_predictions'],attribute_comparison=counts))
 with (ROOT/'response-pair-correspondence.csv').open('w',encoding='utf-8-sig',newline='') as f:
  writer=csv.DictWriter(f,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
 report=dict(scope='18 foreground returned dice per response, one exact photograph; output-output comparison, NOT photo ground truth',pairs=summaries)
 (ROOT/'verification/sagrada-pair-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
