# API contract

All JSON requests/responses. Errors: HTTP non-2xx `{error:string}`. Shared types in shared/types.ts.

- GET /api/packs → GamePack[]
- POST /api/packs → body GamePack, returns GamePack (import)
- POST /api/packs/generate → {title,edition,sourceText}, returns GamePack. AI calls root-owned generateGamePack.
- GET /api/settings → AIStatus
- PUT /api/settings → AISettings, returns AIStatus. Blank apiKey retains prior key.
- GET /api/sessions → Session[] (summary may keep full data initially)
- POST /api/sessions → {name?,example?:boolean,gamePackId?:string,players?:Player[]}, returns SessionView
- GET /api/sessions/:id → SessionView
- PATCH /api/sessions/:id → {name?,stage?,players?,notes?,assertions?:Partial<Assertion>[],answers?:{field:string,value:Value,ownerId?:string}[]}, returns SessionView. Upsert answers as accepted user assertions; null removes a field.
- POST /api/sessions/:id/evidence → {dataUrl,label?,scope?,ownerId?,width?,height?,sourceEvidenceId?,expectedCaptureEpoch?:string}, returns SessionView plus optional createdEvidenceId (current server always returns the newly saved ID). If expectedCaptureEpoch is provided and differs from current session epoch, reject 409 before saving bytes. Crops without the optional check retain source epoch/kind/owner.
- DELETE /api/sessions/:id/evidence/:evidenceId → SessionView
- POST /api/sessions/:id/analyze → {evidenceIds?:string[],purpose?:'capture'|'restore',instruction?:string,expectedCaptureEpoch?:string}, returns SessionView. Optional epoch mismatch or any selected ID unavailable in this purpose rejects 409 before AI; never silently analyzes a subset. No key: explain manual mode; never invent observations. Example session can use explicit fixture.
- POST /api/sessions/:id/assertions/:assertionId/accept → {}, returns SessionView
- PATCH /api/sessions/:id/preservations/:preservationId → {container?,packed?,restored?}, returns SessionView
- POST /api/sessions/:id/commit → {allowIncomplete?:boolean}, returns SessionView. Persist actual snapshot. Permit explicit incomplete save.
- POST /api/sessions/:id/resume → {}, returns SessionView; keep turnInstanceId and snapshot, set restore stage.
- POST /api/sessions/:id/next-turn → {playerId?:string}, returns SessionView; explicitly start next turn and clear only turn-local fields. Never called on resume.
- GET /api/sessions/:id/export → downloadable JSON including pinned pack, evidence data URLs, snapshots.
- POST /api/sessions/import → exported object, returns SessionView.
- GET /api/health → {ok:true}

Root-owned AI module `server/ai/index.ts` exports async `getAIStatus():Promise<AIStatus>`, `saveAISettings(settings:AISettings):Promise<AIStatus>`, `analyzeEvidence(input:{session:Session,evidence:Evidence[],pack:GamePack,purpose?:string,instruction?:string}):Promise<AnalysisResult>`, `generateGamePack(input:{title:string,edition?:string,sourceText:string}):Promise<GamePack>`. AI reads image bytes by `evidence.url` mapping `/uploads/<file>` to `.keepboard/uploads/<file>`. Root will supply this module. Default no-key mode returns no model assertions.

Luna-owned `gamepacks/catan.ts` exports `catanPack: GamePack` and `createExampleAssertions(players:Player[],turnInstanceId:string,evidenceId:string):Assertion[]`. The explicit example depicts red's build/trade phase after rolling 8, one newly bought knight and no action development card played. Other unknown turn facts must remain questions. `public/demo-board.svg` is schematic example artwork (not claimed photo recognition).

Engine: accepted assertions satisfy requirements. Candidate values are shown for local accept/edit. Derived facts recompute from accepted input. Required observe fields can be manually entered. Preserve acquisition can be satisfied by matching packed preservation; expose meaningful condition list. Question id stable as `${ownerId??'public'}:${field}`. SessionView includes all generated preservations, derived, required questions and briefing. `stage` changes alone do not commit. Pack data, not game-specific UI, determines questions. Owner-scoped conditions resolve `$owner` to each player; public conditions resolve public unless specified. Snapshot contains both user and derived assertions and original pinned pack is attached to Session.

Condition.value="$owner" resolves to the current player-scope owner id. This supports currentPlayer == $owner without asking every player about the active player's private temporal facts. Optional SessionView.actions suggests inspectEvidence/requestView/askFields/proposeAssertions/preparePack/requestCommit based on the actual remaining gap.


## Catan information and scene v2

Bundled Catan pack is now `2.0.0`. New normal sessions record `rulesProfile=base-6e-2025`, `tradeBuildMode=combined`; the declared legacy example records `base-2020`. Imported sessions keep their pinned pack, edition and field meaning. Loading does not upgrade a stored pack.

Field metadata adds optional `visibility: public|owner`, `lifetime: session|turn`, and `ui: {level,order,showWhen?,editor?}`. Scope remains the owning subject. Questions copy UI metadata. Public player-owned fields may be observed from a public photo only with an identified supplied player ID; private card identities and points remain owner-only. `BriefingItem.field` supports shared display filtering. `analysisSummaryOwnerId` marks the summary's visible owner (null=public); unknown mixed-owner summaries are not presented to another owner.

ComponentScene readers accept v1 and v2. v2 adds `kind=harbor`, `ratio:number|null`, optional `coverageByLayer:{terrain?,numbers?,buildings?,roads?,harbors?}` with complete|partial|unknown. Harbor variant is generic|lumber|brick|wool|grain|ore|null, location uses a coastal edge, two endpoints are derived. Missing ratio/variant remains null. Legacy token/harbor is read as an unknown harbor. `coverage=full` never implies complete ports or known ownership. Original invalid ratio/position survives storage with warnings; newly placing an inland port is rejected.

New pack `turn.trade` JSON: `{kind:'bank'|'player',playerId,counterpartyId?,harborId?,give:Counts,receive:Counts,status:'proposed'|'in_progress'|'completed'|'cancelled',given:Counts|null,received:Counts|null}`. Counts map resource names to nonnegative integers or null. PATCH records actual physical progress; it never subtracts hands or bank stock. Saved/resumed trade gives remaining delivery only. New player purchase batches store `{purchasedTurnId,counts:DevelopmentCounts|null,preservationId?}[]` as subsets already included in the unused hand. Next turn expires turn fields, not held counts or purchase identities.

Pure Catan summaries include complete|partial|unknown|conflict, known lower bounds and source assertion IDs. They use accepted board.layout only and are computed views rather than new model assertions. See [implementation and acceptance evidence](catan-information-implementation.md).
