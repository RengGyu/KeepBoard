import json,hashlib,subprocess,datetime
from pathlib import Path
R=Path(__file__).resolve().parent;P=Path('/private/tmp/kb-ten-games-closeup-video-20261030')
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
spec=[
 ('blokus','INPUT_INSUFFICIENT','pod5SDaaXyI',[('blokus-play-low.mp4',[0,45])],'Fixed overhead, object manipulation/edits; no verified stationary camera-approach pair'),
 ('bohnanza','INPUT_INSUFFICIENT','yqX_sPko8nk',[('bohnanza-setup-low.mp4',[0,45])],'Presenter/rules graphics; no assessable real stationary-board pair in inspected section'),
 ('calico','INPUT_INSUFFICIENT','oRmSY9jZ5fk',[('calico-broll-low.mp4',[0,30]),('calico-tail-decoded.mp4',[30,48.7])],'People/box/piece manipulation; no stable whole/independent closeup pair'),
 ('carcassonne','INPUT_UNCERTAIN','Pt8GPr_sgYA',[('carcassonne-intro-low.mp4',[0,45]),('carcassonne-later-low.mp4',[90,120]),('carcassonne-board-low.mp4',[120,199])],'Cuts among package/rules/map; maximum original320x240; same-state whole/closeup relationship not established; no API'),
 ('cascadia','INPUT_INSUFFICIENT','w-r_TekunQI',[('cascadia-intro-low.mp4',[0,35]),('cascadia-setup-decoded.mp4',[73,103])],'Presenter/logo and setup tile moves/flips; no stationary pair'),
 ('quacks','MEASURED','sKChFf4i8JA',[('quacks-focus-low.mp4',[0,45]),('quacks-later-low.mp4',[90,120]),('quacks-supply-1080.mp4',[109,114])],'Static eight exposed target chips during continuous real camera pan; D earlier than W explicitly recorded'),
 ('sagrada','INPUT_INSUFFICIENT','3BSonqR6RX0',[('sagrada-rahdo-intro-low.mp4',[0,45])],'Prototype rules/empty boards/fixed camera; no readable dice-state pair'),
 ('splendor','MEASURED','HlOxEk3_yuc',[('splendor-rahdo-intro-low.mp4',[0,45]),('splendor-rahdo-market-1080.mp4',[28,45])],'Twelve market cards remain fixed during camera approach; handled nobles excluded'),
 ('splendor-duel','INPUT_INSUFFICIENT','h8dhfJGspJI',[('duel-intro-low.mp4',[0,20]),('duel-setup-low.mp4',[36,70])],'Pieces placed during setup; enlargement through edit, actual camera approach not verified'),
 ('ticket-to-ride','INPUT_INSUFFICIENT','WQRNJIsSrZo',[('ticket-family-low.mp4',[0,24])],'Low people/hand-card view with active manipulation; no readable stable board pair')]
cases=[]
for game,status,vid,clips,reason in spec:
 evidence=[]
 for name,times in clips:
  p=P/name;assert p.is_file();meta=json.loads(subprocess.check_output(['/opt/homebrew/bin/ffprobe','-v','error','-show_entries','format=duration:stream=width,height','-of','json',str(p)]))
  evidence.append(dict(path=str(p),sha256=sha(p),bytes=p.stat().st_size,sourceSectionSeconds=times,durationSeconds=float(meta['format']['duration']),width=meta['streams'][0]['width'],height=meta['streams'][0]['height'],directFrameSampleInspection=True))
 row=dict(gameId=game,status=status,sourceURL=f'https://www.youtube.com/watch?v={vid}',evidence=evidence,reason=reason,scopeLimit='Only inspected candidate sections; not a claim about all public videos or entire uninspected video')
 if status=='MEASURED':
  prefix='pilot' if game=='splendor' else 'quacks';plan=json.loads((R/f'{prefix}-inputs.json').read_text())
  row.update(inputs=f'{prefix}-inputs.json',reference=plan['reference'],results=f'{prefix}-results.json',ledger=f'{prefix}-ledger.json',projection=f'{prefix}-projection.json')
 cases.append(row)
assert len(cases)==len({x['gameId'] for x in cases})==10
availability=dict(version='independent-closeup-video-availability-v1',status='PARTIAL_MEASUREMENT_2_OF_10_INPUT_GAP_8',cases=cases,measuredGames=2,inputGapGames=8,models={'current':'gemini-3.8-flash','futureTerra':'NOT_RUN; provider/model/API/auth mapping deferred to separate supervisor task'},allModelCalls=6,retries=0,remainingAuthorizedCalls=24,
 gain=dict(criterion='Additional correct target information in oracle W+D union beyond W+C union, not standalone D vs C and not automatic registration',yes=0,no=2,unknownUnmeasured=8),
 lastAlternativesChecked='Supervisor-authorized one additional real video candidate each for Blokus/Bohnanza/Ticket, frame samples directly inspected; no valid pairs found in those sections',
 missingInput='For each remaining game: a visually verifiable stationary target area captured in a wide frame and independent closer camera frame with readable corresponding physical objects; no substitute crops/different states',
 constraints=dict(productChanges=0,boardWrites=0,appSessionWrites=0,GTChangesAfterOutputs=0,providerRetries=0,agents=0,downloadsPrivate=True,sourceRedistribution=False,credentials='provided-upload accessor memory only; no path/content retained in repository'),
 limitations=['AI partial visual reference, not certified human truth','One run per condition, no generalization or significance','No free camera cross-view automatic registration','No original photos/raw/GT embedded in repo','Thought usage missing=null; actual billing unknown'])
(R/'availability.json').write_text(json.dumps(availability,ensure_ascii=False,indent=2)+'\n')
assert sha(R.parent/'manifest.json')=='1db69b40a75fb69ebb0a732b38edf86ea238bc5bf3022354e9294ee6fc2f71b0'
assert sha(R.parent/'README.md')=='b169bdc7c5c56775fa6474eb0864dd8e412a87c19cb9f946da61daac37480306'
ledgers=[]
for pre in ['pilot','quacks']:
 plan=json.loads((R/f'{pre}-inputs.json').read_text());assert sha(plan['reference']['path'])==plan['reference']['sha256']
 prepared=json.loads((R/f'{pre}-preflight.json').read_text());assert len({x['promptSHA'] for x in prepared['tasks']})==1 and len({x['configSHA'] for x in prepared['tasks']})==1
 for p,h in prepared['sourceHashes'].items():assert sha(p)==h, f'Product input drift: {p}'
 ledger=json.loads((R/f'{pre}-ledger.json').read_text());assert len(ledger)==3
 for row in ledger:
  t=next(x for x in prepared['tasks'] if x['variant']==row['variant']);assert sha(t['prefix']+'.native.json')==row['rawSHA']
  assert sha(t['prefix']+'.decoded.json')==row['decodedSHA'];assert sha(t['prefix']+'.request.json')==row['bodySHA']
  body=json.loads(Path(t['prefix']+'.request.json').read_text());assert set(body)=={'contents','generationConfig'}
  assert row['state']=='decoded' and row['http']==200 and row['finish']=='STOP'
 ledgers+=ledger
assert len(ledgers)==6
for p in P.rglob('*'):
 if 'venv' in p.relative_to(P).parts:continue
 if p.is_file():p.chmod(0o600)
 elif p.is_dir():p.chmod(0o700)
for p in R.glob('*.json'):json.loads(p.read_text())
checkpoint=json.loads((R/'checkpoint.json').read_text());checkpoint.update(stage='FROZEN_PARTIAL_MEASUREMENT_2_INPUT_GAP_8',modelCalls=6,remainingCallCap=24,eligiblePairs=2,nextAlternative='Verified same-state independent closeups for remaining8 are missing; no additional unvalidated calls',finalAvailability='availability.json');(R/'checkpoint.json').write_text(json.dumps(checkpoint,ensure_ascii=False,indent=2)+'\n')
files={p.name:dict(sha256=sha(p),bytes=p.stat().st_size) for p in sorted(R.iterdir()) if p.is_file() and p.name!='verification.json'}
verification=dict(status='PASS_FOR_RECORDED_PARTIAL_SCOPE',verifiedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),measuredGames=2,inputGapGames=8,actualModelCalls=6,http200=6,retries=0,privateReferenceHashesUnchanged=True,allRequestNativeDecodedHashesVerified=True,samePromptConfigPerGame=True,originalProductInputHashesUnchanged=True,priorPhotoAttemptManifestReadmeUnchanged=True,allTenGamesAccounted=True,GTNeverLoadedIntoProviderPayload=True,privateArtifactsMode='0700 directories/0600 media-data files',repositoryArtifacts=files,unverified=['Full-photo/game accuracy','Uninspected footage','Actual billed dollar amount','Phone camera/retake/time-to-save UX','Terra provider/API/model mapping or requests'])
(R/'verification.json').write_text(json.dumps(verification,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in verification.items() if k!='repositoryArtifacts'},ensure_ascii=False,indent=2))
