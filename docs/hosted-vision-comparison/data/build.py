"""Local read-only source inventory; writes only this new data directory. No network/inference."""
from pathlib import Path
from collections import Counter
import hashlib, json, datetime
from PIL import Image

ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
def load(p): return json.loads(Path(p).read_text())
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def source(rel):
    p=ROOT/rel
    return {'path':rel,'sha256':sha(p),'bytes':p.stat().st_size}
def write(name,obj):
    p=OUT/name;p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
    return {'path':name,'sha256':sha(p)}

defs=load(ROOT/'game-photo-definitions/index.json')['games']
packs=load(ROOT/'gamepacks/generated/game-essentials.json')
corpus=load(ROOT/'docs/game-photo-corpus/manifest.json')
coverage=load(ROOT/'docs/game-photo-corpus/coverage.json')
defs_by={d['gameId']:d for d in defs};packs_by={p['id']:p for p in packs}
assert len(defs)==len(defs_by)==120
assets=load(ROOT/'public/game-art/assets.json')['assets']
source_files=['game-photo-definitions/index.json','game-photo-definitions/manifest.json',
 'gamepacks/generated/game-essentials.json','shared/capture-profiles.json',
 'public/game-art/assets.json','docs/game-photo-corpus/manifest.json',
 'docs/game-photo-corpus/coverage.json','docs/game-photo-corpus/verification.json']
specs={d['gameId']:load(ROOT/f"docs/research/game-specs-120/games/{d['gameId']}.json") for d in defs}
tracked=source_files+[f'docs/research/game-specs-120/games/{g}.json' for g in defs_by]
before={p:sha(ROOT/p) for p in tracked}
retained=[i for i in corpus['images'] if i.get('retained')]
image_checks=[]
for i in retained:
    p=Path(i['localPath']);ok=p.exists() and p.stat().st_size==i['bytes'] and sha(p)==i['sha256']
    image_checks.append({'gameId':i['gameId'],'sha256':i['sha256'],'valid':ok})

contexts=[];context_provenance=[]
rule_indices={'catan':[0],'splendor':[0,2],'sagrada':[0,1,2]}
for game in ['catan','splendor','sagrada']:
    d=defs_by[game];pack=packs_by[d['packId']];spec=specs[game]
    rel=f'docs/research/game-specs-120/games/{game}.json'
    assert sha(ROOT/rel)==d['sourceSHA']
    areas=[a for a in d['areas'] if a['partition']!='owner_private']
    component_ids={cid for a in areas for cid in a['componentIds']}
    names={c['id']:c['name'] for c in pack['runtime']['components']}
    # Do not copy quantity/inventory, expected digits, frame geometry, GT, or previous errors.
    context={'version':'keepboard-visible-reading-context-v1','gameId':game,
      'pack':{'id':d['packId'],'version':d['packVersion'],'editionId':d['editionId'],'sourceSHA':d['sourceSHA']},
      'knowledgeStatus':'Game-definition category lookup, NOT an observation of this photo or verified complete rules.',
      'areas':[{'id':a['id'],'partition':a['partition'],'componentIds':a['componentIds']} for a in areas],
      'components':[{'id':c['id'],'name':names.get(c['id'],c['id']),
         'visibleProperties':[{'id':p['id'],'label':p['label'],'type':p['type']} for p in c['properties']]}
         for c in d['components'] if c['id'] in component_ids],
      'instructions':['Read visible printed information literally; unknown remains null.',
       'Do not complete a standard inventory or infer an unobserved component from game rules.',
       'Game categories are retrieved context, not pixel evidence. Do not infer owner, turn, hidden cards or legal state.',
       'Return source locations from the supplied original image; game-board placement is a separate candidate.']}
    definition_file=write(f'contexts/{game}-definition.json',context)
    rules=[spec['rules'][i] for i in rule_indices[game]]
    rule_text='KeepBoard reading-category context — '+game+'\n'
    rule_text+='Derived from existing project research; source confidence is reported, not a fresh official verification.\n'
    rule_text+='This is category/interpretation context, never a statement about this photo. Do not fill missing objects, values, inventory, ownership or game progress.\n'
    rule_text+='\n'.join(f"- {r['name']}: {r['summary']}" for r in rules)+'\n'
    rule_path=OUT/f'contexts/{game}-reading-categories.txt';rule_path.write_text(rule_text)
    contexts.append({'id':game+'-visible-categories-v1','gameId':game,'definitions':definition_file,
                     'rules':{'path':str(rule_path.relative_to(OUT)),'sha256':sha(rule_path)}})
    used_refs={ref for r in rules for ref in r.get('source_refs',[])}
    context_provenance.append({'contextId':contexts[-1]['id'],'edition':spec['edition'],
      'definition':source('game-photo-definitions/index.json'),'definitionPointer':f"/games/{defs.index(d)}",'definitionSHA':d['definitionSHA'],
      'research':source(rel),'rulePointers':[f'/rules/{i}' for i in rule_indices[game]],
      'ruleSources':[{k:s.get(k) for k in ['id','title','url','kind','access','checked_at']} for s in spec['sources'] if s['id'] in used_refs],
      'permission':{'localUse':'existing project-authored metadata/summary','externalContextUse':'proposed safe excerpt, no original PDF attachment','originalRights':'not newly verified'},
      'officialRuleCompleteness':'UNKNOWN; source access/confidence retained, not certified by this export'})

old_gt_meta=load(ROOT/'docs/recognition-check-4games/manifest.json')['userCatan']
new_gt_meta=load(ROOT/'docs/lightweight-recognition/sol1-independent-number-gt.json')
pilot_specs=[('catan-corpus-development',Path(next(i['localPath'] for i in retained if i['sha256']==new_gt_meta['sourceSHA256'])),new_gt_meta['sourceSHA256']),
 ('catan-user-development',Path('/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-catan-user-diagnosis-t68bb0vj/public-photo.jpeg'),old_gt_meta['photoSHA256'])]
images=[];rich_images=[]
for case_id,p,digest in pilot_specs:
    original_path=str(p);resolution='original_manifest_locator'
    if case_id=='catan-corpus-development' and not p.exists():
        p=Path('/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-local-reader-vyzn4xm9-55c8peu1/number-comparison-product-v1/store/uploads/80f08d20-4b27-4bf3-ba2c-54466fdc85d2.jpeg')
        resolution='Original corpus locator missing; explicitly identified existing N1 evaluation copy with exact same source SHA, no new image/copy/download.'
    assert p.exists() and sha(p)==digest
    with Image.open(p) as im: width,height=im.size;fmt=im.format;im.verify()
    mime='image/jpeg' if fmt=='JPEG' else 'image/png'
    c=next((i for i in retained if i['sha256']==digest),None)
    images.append({'id':case_id,'gameId':'catan','path':str(p),'sha256':digest,'width':width,'height':height,'mimeType':mime,'approvedForHosted':case_id=='catan-user-development'})
    rich_images.append({'caseId':case_id,'split':'development_pilot_previously_evaluated','gameId':'catan','packId':defs_by['catan']['packId'],'editionId':defs_by['catan']['editionId'],
      'image':{'privatePath':str(p),'sha256':digest,'bytes':p.stat().st_size,'width':width,'height':height,'mimeType':mime},
      'provenance':{'originalManifestPath':original_path,'locatorResolution':resolution,'sourcePage':c['pageUrl'] if c else None,'sourceImage':c['imageUrl'] if c else None,
        'sourceType':c['sourceKind'] if c else 'user-supplied prior diagnostic photo; original session not queried',
        'metadataPath':'docs/game-photo-corpus/manifest.json' if c else 'docs/recognition-check-4games/manifest.json',
        'editionObserved':c['edition'] if c else 'See immutable private GT edition metadata; not exact-pinned-edition proof',
        'editionConfidence':c['editionCertainty'] if c else 'unverified'},
      'editionMatch':'UNVERIFIED; current Catan pack is a mixed 2025/2020 implementation profile, photo printing not reconciled',
      'permission':{'localResearchAllowed':True,'externalUploadAllowed':case_id=='catan-user-development','status':'LOCAL_RESEARCH_ONLY' if c else 'AUTHORIZED_BOUNDED_HOSTED_COMPARISON','redistributionAllowed':False,'trainingRightsGranted':False,
        'authority':None if c else 'Current explicit user hosted API comparison request2026-10-26; supervisor65b4a78a scope clarified6f3d474c',
        'reason':c['license'] if c else 'Use this user-provided photo for the bounded Gemini/Roboflow comparison only; no redistribution/training grant.'},
      'taskIds':['printed-text-ocr','visible-component-location','context-assisted-category-interpretation'],
      'contextId':'catan-visible-categories-v1','visualReferenceAssetIds':[],'heldout':False})

runs=[]
for provider in ['gemini','florence']:
    for task in ['ocr-with-region','component-location']:
        runs.append({'id':f'catan-{provider}-{task}-photos','imageId':images[1]['id'],'provider':provider,'condition':'photos-only','task':task})
for task in ['ocr-with-region','component-location']:
    runs.append({'id':f'catan-gemini-{task}-context','imageId':images[1]['id'],'provider':'gemini','condition':'game-context','contextId':'catan-visible-categories-v1','task':task})
assert len(runs)==6
runner={'version':'hosted-vision-benchmark-v1','images':images,'contexts':contexts,'runs':runs,'maxCalls':6}
write('benchmark-manifest.json',runner)
write('input-manifest.json',{'version':'keepboard-hosted-vision-inputs-v1','cases':rich_images,'contextProvenance':context_provenance,
 'executionManifest':'benchmark-manifest.json','liveInferenceExecuted':False,'externalUploadEligibleCases':1,
 'requestBoundary':'Only selected image bytes + selected context exports are request material. This rich inventory and offline evaluator are not model messages.',
 'replaceableFutureInput':'Add an independently authorized case with private path/SHA/dimensions/mime/explicit permission and offline GT sidecar; provider code need not change. No required arbitrary photo quota.'})

gt_cases=[]
for cid,gt_path,digest,schema,selector in [
 (images[0]['id'],new_gt_meta['privateGTPath'],new_gt_meta['privateGTSHA256'],'independent-number-observation-gt','/objects'),
 (images[1]['id'],old_gt_meta['evaluationOnlyGTPath'],old_gt_meta['gtSHA256'],'user-catan-board-gt','/tiles')]:
    assert sha(gt_path)==digest
    gt=load(gt_path);obs=gt['objects'] if selector=='/objects' else [t for t in gt['tiles'] if type(t['number']) is int]
    gt_cases.append({'imageId':cid,'privateGTPath':gt_path,'sha256':digest,'schemaRole':schema,'targetPointer':selector,'annotatedNumeralTargets':len(obs),
      'GTValueAndLocationSource':'Existing immutable manual annotation; no values copied here.',
      'coverage':'Numeral tokens on island only; not exhaustive printed text OCR, not component-label/location GT for this comparison.',
      'componentLocationGT':'UNKNOWN_UNSCORED','heldout':False})
write('offline-evaluation.json',{'version':'keepboard-hosted-vision-offline-evaluation-v1','modelInputAllowed':False,'cases':gt_cases,
 'taskMapping':{'ocr-with-region':'Same all-visible-printed-text task for both providers; evaluate only the pre-annotated digit subset against numeral GT.','component-location':'Preserve labels/locations/native outputs; no new component GT or accuracy score.'},
 'matching':{'coordinateConversion':'Provider-declared source image coordinate system to original image; quad_1000 divided by1000 then width/height, preserving quadrilateral. No inferred boxes, clamping or frame correction.',
  'sourceCorrespondence':'Unique spatial containment of frozen target center in source quadrilateral; ambiguous many-to-one/one-to-many stays ambiguous. No closest-value/label matching.',
  'values':'Compare a uniquely localized observed numeral to the existing GT literal/number. Preserve raw string. Conservative whitespace-only normalization; multi-token/invalid/unreadable stays unknown or ambiguous, not0.',
  'separateCounts':['correct','wrong','unknown','missing_annotated_target','ambiguous','raw_unmatched_text','raw_unmatched_numerals','invalid_or_unlocalized_output'],
  'unmatchedPolicy':'Raw OCR covers unannotated text/card/legend numerals too. Unmatched is NOT automatically a physical false positive. Offline source/scope adjudication required; retain unannotated legitimate, localization miss, ambiguous, or confirmed hallucination separately.',
  'scopeLimit':'Do not force inventory counts, silently split one OCR box into multiple locations, repair6/9 from game balance, or treat saved/native corrected state as raw model accuracy.'},
 'isolation':'Never pass this sidecar, GT paths/values/target counts, previous predictions/errors, or confirmed evaluation frame to provider request construction.'})

reference_candidates=[]
excluded={i['sha256'] for i in images}
for game in ['catan','splendor','sagrada']:
    c=next(i for i in retained if i['gameId']==game and i['sha256'] not in excluded and i.get('usable')=='yes')
    reference_candidates.append({'assetId':game+'-independent-source-candidate','gameId':game,'path':c['localPath'],'sha256':c['sha256'],'width':c['width'],'height':c['height'],'mimeType':c['mime'],
      'sourcePage':c['pageUrl'],'sourceImage':c['imageUrl'],'sourceType':c['sourceKind'],'edition':c['edition'],'editionConfidence':c['editionCertainty'],'readLimits':c['readLimits'],
      'role':'Independently sourced play/setup metadata candidate; not an edition-validated printed identity atlas or benchmark answer.','currentlyExists':Path(c['localPath']).exists(),'currentSHAValidated':False,
      'license':c['license'],'externalUploadAllowed':False,'redistributionAllowed':False,'eligibleForModelReferenceInput':False,'reason':'Original locator currently missing; rights/edition/identity validation pending. Not attached to executable context.'})
display_examples=[]
for game in ['splendor','sagrada']:
    mapping=load(ROOT/f'public/game-art/games/{game}/mapping.json')
    ids={l['asset_id'] for c in mapping['components'] for v in c.get('variants',[]) for l in v.get('layers',[])}
    a=next(a for a in assets if a['asset_id'] in ids and isinstance(a.get('file'),str))
    rel='public/game-art/'+a['file'];display_examples.append({'assetId':a['asset_id'],'gameId':game,**source(rel),'mapping':source(f'public/game-art/games/{game}/mapping.json'),
      'edition':specs[game]['edition'],'viewBox':a.get('viewBox'),'claim':a.get('art_claim'),'role':'Project display SVG; not physical printed-face truth/training/reference data.','eligibleForModelReferenceInput':False,'permission':'Original representative code art according to docs/game-art; original game rights not granted by this inventory.'})
write('reference-assets.json',{'version':'keepboard-hosted-reference-inventory-v1','verifiedLicensedEditionMatchedReferenceSets':0,'candidates':reference_candidates,'displayExamples':display_examples,'runnerReferencesAttached':0})

games=[]
for d in defs:
    game=d['gameId'];spec=specs[game];rel=f'docs/research/game-specs-120/games/{game}.json';p=packs_by[d['packId']]
    assert sha(ROOT/rel)==d['sourceSHA'] and p['runtime']['source']['sha256']==d['sourceSHA']
    mapping=load(ROOT/f'public/game-art/games/{game}/mapping.json')
    games.append({'gameId':game,'packId':d['packId'],'packVersion':d['packVersion'],'editionId':d['editionId'],'sourceSHA':d['sourceSHA'],'definitionSHA':d['definitionSHA'],
      'sourcePath':rel,'nativeBridge':d['nativeBridge'],'readoutSchema':d['readoutSchema'],'areas':[{k:a[k] for k in ['id','partition']} for a in d['areas']],
      'visiblePropertyCount':sum(len(c['properties']) for c in d['components']),'manualPropertyCount':sum(len(c['manualPropertyIds']) for c in d['components']),
      'ruleSummaryCount':len(spec['rules']),'ruleSourceAccess':dict(Counter(s['access'] for s in spec['sources'])),'ruleAuthority':'Project research metadata; not all rules reverified against official editions.',
      'displayComponentClasses':len(mapping['components']),'retainedPhotoCount':sum(i['gameId']==game for i in retained),'currentlySHAValidPhotos':sum(i['gameId']==game and i['valid'] for i in image_checks),
      'validatedRealReferenceSetCount':0,'verifiedWholeStateRecognition':False})
write('game-coverage.json',{'version':'keepboard-hosted-game-coverage-v1','games':games})
inventory={'version':'keepboard-hosted-data-inventory-v1','createdAtUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'summary':{'games':len(games),'sourceSpecFiles':len(specs),'definitionGames':len(defs),'typedReadoutGames':sum(d['nativeBridge'] is None for d in defs),'nativeBridges':dict(Counter(d['nativeBridge'] for d in defs if d['nativeBridge'])),
  'displayComponentClasses':sum(g['displayComponentClasses'] for g in games),'displayAssetRegistryEntries':len(assets),'retainedCorpusImagesMetadata':len(retained),'retainedPhotosCurrentlySHAValid':sum(i['valid'] for i in image_checks),'retainedPhotoBytesPreviouslyReported':sum(i['bytes'] for i in retained),'exactSHADevelopmentCacheResolutions':1,
  'priorCorpusClassificationReportedNotCurrentFileAvailability':coverage['totals'],'validatedLicensedEditionMatchedReferenceSets':0,'currentHeldoutCases':0,'initialPilotImages':2,'plannedRuns':6,'externalUploadEligiblePilotImages':1,'callsExecuted':0},
 'sources':[source(p) for p in source_files],'interpretation':{'definitions':'Observed-field/validation metadata, not model weights or photographic references.','rules':'Existing project summaries/source citations with confidence/access retained; no claim120official rules verified.','displaySVG':'Illustrative representative/component assets, not commercial face IDs or observed quantities.','photos':'Prior physical play/setup metadata with previous visual review. All278 original corpus locators currently missing; one exact-SHA known evaluation cache resolves selected pilot only. Rights/edition remain unresolved.','retrievedContext':'Independent lookup/category facts, never observations of supplied pixels.'},
 'readinessAndLimitations':[{'id':'CORPUS_LOCATORS_MISSING','status':'VERIFIED_MISSING278','nextInput':'Restore original corpus files if wider references are needed; do not silently substitute photos. Initial pilot uses an explicitly traced exact-SHA existing evaluation copy.'},{'id':'HOSTED_UPLOAD_AUTHORITY','status':'RESOLVED_FOR_SELECTED_USER_CASE_ONLY','nextInput':'No new approval needed for selected user-provided82a495 photo under current explicit hosted-comparison request. Corpus/reference candidates remain local-only.'},{'id':'MODEL_CREDENTIALS','status':'SUPERVISOR_SOL2_OWNED','nextInput':'Exact named model/account access handled by runner owner; no keys collected by this data task.'},{'id':'INDEPENDENT_HELDOUT','status':'MISSING','nextInput':'Future independent authorized photo(s), then offline GT frozen before new outputs; no arbitrary sample quota.'},{'id':'COMPONENT_GT','status':'UNKNOWN_UNSCORED','nextInput':'Independent labels/locations if component accuracy is later requested; current numericGT cannot certify it.'}]}
for limitation in inventory['readinessAndLimitations']: limitation['blocksSelectedPilot']=limitation['id']=='MODEL_CREDENTIALS'
write('inventory.json',inventory)
write('task-capabilities.json',{'version':'keepboard-hosted-task-context-roles-v1','status':'Preparation contract; exact deployed model/task availability verified by Sol2 runner, no live call here.',
 'tasks':[{'task':'ocr-with-region','objective':'All visible printed text with original image regions; same task across providers.','gemini':'Text+image task; optional independently sourced category context in separate condition.','florence':'Fixed OCR_WITH_REGION; arbitrary rule prompt is not equivalent/supported context.','evaluation':'Digit subset on annotated numeral tokens only; other legitimate text unannotated.'},
 {'task':'component-location','objective':'Visible physical object/component labels+source locations, uncertainty retained.','gemini':'Label+quad task; category context may help naming, remains inference.','florence':'Fixed OD label+bbox task; exact board-game taxonomy/domain support UNKNOWN until measured.','evaluation':'Label/location GT UNKNOWN; outputs unscored.'},
 {'task':'rule-context-interpretation','objective':'Connect independently sourced categories/rule summaries to observed candidates without claiming legal state.','gemini':'Separate context-assisted condition, never game inventory completion.','florence':'N/A for fixed OCR/OD; external deterministic lookup can annotate recognized literals, not infer hidden state or rules.','evaluation':'Not a six-run accuracy metric; no rule-reasoning GT.'}],
 'references':'No image references attached. Candidate real photos remain blocked pending rights/edition identity; display SVG not photographic truth.',
 'fairness':'Photos-only pair compares common supported tasks. Gemini-context change is within-Gemini, not a matched Florence rule-context condition or a whole-state comparison.'})
assert before=={p:sha(ROOT/p) for p in tracked}
write('verification.json',{'status':'LOCAL_PREPARATION_COMPLETE_WITH_UNSELECTED_CORPUS_LOCATOR_GAPS','uniqueGameIds':len(set(g['gameId'] for g in games)),'sourceDefinitionPackSHAConsistent':True,'sourceFilesUnchanged':True,'retainedImageChecks':len(image_checks),'retainedImageCheckFailures':sum(not i['valid'] for i in image_checks),
 'pilotImageDecodeSHAChecks':2,'offlineGTSHAChecks':2,'runs':len(runs),'maxCalls':6,'selectedRunImageCount':len(set(r['imageId'] for r in runs)),'approvedForHostedTrueCount':1,'executableSchemaAndReferencesChecked':True,'onlySelectedUserPhotoApproved':True,'selectedImageId':'catan-user-development','selectedUploadBlockers':0,'unusedCorpusStillUnapproved':True,'GTAndFrameAbsentFromRequestContext':True,'taskSupportExplicit':True,'componentAccuracyUnscored':True,'sourceImageCopiesCreated':0,'GTAbsentFromExecutableManifest':True,'referencesAttached':0,'networkRequests':0,'modelCalls':0,'copiesOfPhotosRawOrFullGT':0})
print(json.dumps(inventory['summary'],ensure_ascii=False))
