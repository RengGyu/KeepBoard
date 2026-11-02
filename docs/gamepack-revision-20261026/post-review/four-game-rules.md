# Four game rules and state review

Scope: commit `993bc4461baff9708b92c5a209ee8a7ac957f9cf`; canonical specs, vision profiles and `gamepacks/generated/game-essentials.json` read only. Checked setup, turns, information access and the state needed to resume. Page numbers below are PDF pages (starting at 1). **VERIFIED** means the stated rule fact was read in the linked publisher rulebook or current publisher gameplay page. Storage changes are **RECOMMENDATION**, not rules. This is no claim about full rules or photo recognition.

## Azul — concrete mismatch

**VERIFIED source:** [Next Move English base rulebook](https://cdn.svc.asmodee.net/production-nextmove/uploads/sites/4/2024/06/EN-Azul-Rules-Next-Move-web.pdf), pp. 2–5, “Game Setup,” “Factory offer,” “Wall-tiling,” “Preparing the next round.” Each player has a public board with pattern lines, wall, floor and score track; 5/7/9 factory displays by player count and the central offer are shared. The 100 colored tiles begin in a bag. Tiles removed from full pattern lines, the floor or overflow go to the **box lid**. Only when the bag empties during refilling are lid tiles put back into it. A first-player marker moves from the center to a player's floor line, then sits in front of that player. There is no player hand or owner-only goal in these checked base-game procedures.

**Current links:** `layout.areas.offer → offer.scene` is common public; `pattern`, `wall`, `floor → *.scene` are player public; `bag → bag.scene` is shared hidden. The vision profile partitions match these IDs, and generated pack `spec.bag.preserve` is a sealed hidden bundle. `phase`, `turn` and `pending` are manual facts, appropriately not derived from a photo.

**Mismatch / trigger:** `bag` and `bag.scene` describe the opaque bag **and** discarded lid tiles as one hidden area. A save between wall tiling and factory refill could conflate the two stocks; restoring the lid tiles into the bag early changes the next draw pool.

**RECOMMENDATION:** Add a distinct common discard/lid area and field; record tile counts or faces only when actually observed and otherwise preserve the physical pool. Keep bag contents hidden and its container separate until the rule's refill step. Do not make tile draw order a required digital fact. Link the first-player marker's observed location to `offer` or `floor` as already modeled, while `turn` remains a question.

**UNCLEAR:** No printed tile identity dictionary, full gray-wall variant, or photograph accuracy checked.

## Ticket to Ride — concrete mismatch

**VERIFIED source:** [Days of Wonder North America English rules, ©2025](https://cdn.svc.asmodee.net/production-daysofwonder/uploads/2025/07/7201N_TICKET2RIDEV2_RULES_EN_20250425_WEB.pdf), pp. 2–4, “Setting up the Game,” “The Game Turn,” “Draw Tickets,” “Game End.” The common map carries player-colored trains and score markers; each player starts with 45 trains, four train cards, and four secretly viewed destination tickets (keeping at least two). Five train cards are face up beside the train deck. A turn is one of train-card draw, route claim or ticket draw. Spent train cards go to a face-up discard pile that is reshuffled when the deck empties. Kept destination tickets stay secret until final scoring; returned tickets go under the ticket deck. A stock of 0–2 trains at turn end starts the last-turn cycle.

**Current links:** `map-area → map-area.scene` and `market → market.scene` are common public; `hand → hand.scene` is player owner-visible; `decks → decks.scene` is shared hidden. The generated pack gives `hand.scene` owner scope and `spec.hand.preserve` owner scope; `decks.scene` is physical-only via `spec.decks.preserve`. `remaining-trains`, `final-round`, `turn` and `pending` are manual fields. Owner of a train stock is its player; owner permission for hand contents follows the rule's secret tickets.

**Mismatch / trigger:** No distinct train-card discard area or field is linked. `market.scene` covers the five face-up cards, while `decks.scene` describes the train and ticket draw decks only. A save when the train deck is empty cannot state which used cards must be reshuffled. The profile also lists `player_public: []` even though `remaining-trains` is each player's public stock count; it has no stock scene.

**RECOMMENDATION:** Add a public train-card discard stock, separate from the face-up five and hidden decks. Give each player's remaining trains a player-public stock/field binding, keeping the current scalar if a scene is unnecessary. Record pending draw/claim/ticket choice and final-round trigger by user confirmation; keep ticket identities owner-only and the ticket deck's bottom-return order physically preserved.

**UNCLEAR:** The ©2025 rulebook is the inspected North America printing; older printing differences and a route legality/score engine were not checked.

## Hanabi — category match with preservation mismatch

**VERIFIED source:** [Abacusspiele German base rules](https://abacusspiele.de/wp-content/uploads/2021/01/Hanabi_Regel.pdf), PDF p. 2 (printed pp. 3–4) “Spielvorbereitung,” “Spielablauf,” “Einen Hinweis geben,” “Eine Karte abwerfen”; PDF p. 1 (printed pp. 5–6) “Spielende,” “Wichtige Hinweise.” A player's own cards face away from them: the **other players**, not the holder, see the fronts. A clue publicly identifies all cards of one color or number in one recipient's hand; eight clue tokens and three error tokens are administered in the common area. Discards are face up and may be inspected. The current German rules permit the holder to rearrange and reorient their hand as a memory aid. After the last draw, each player including the drawer gets one more turn.

**Current links:** `hand → hand.scene` is `scope=player, visibility=own-hidden`; `fireworks`, `discard`, `tokens → *.scene` are common public; `deck → deck.scene` is shared hidden. `clues` is a per-recipient public record, `final-turns` and `turn` are manual. The generated pack keeps `hand.scene` physical-only in `spec.hand.preserve`. This correctly separates the hand's physical holder/owner ID from viewing permission; owner-private would expose the card fronts to the wrong person. No separate player-public personal board is applicable.

**Mismatch / trigger:** `resume.preserve_procedures.hand.preserve.order_sensitive` is `false`, although the current hand order and orientation can carry a player's memory of previous clues. Packing or restoring a hand in a different order can change what they know, even if card faces are untouched.

**RECOMMENDATION:** Preserve each player's **current** hand order, orientation and card-instance-to-clue links physically, with backs toward that holder on resume. Mark the hand procedure order-sensitive and make the instruction explicit. This preserves the state the players chose; it does not impose a fixed deal order or digitize hidden faces. Keep shared clue/error token positions and final-turn count separate from card identities.

**UNCLEAR:** The checked German edition explicitly permits zero-match hints and hand reordering; those rules cannot be imposed on other language/printing variants without matching source review. Full variant rules were not checked.

## Codenames — supported category split; exact rulebook gap

**VERIFIED source:** [Czech Games Edition's current Codenames gameplay page](https://www.czechgames.com/games/codenames), “Description” and “Components” (2025 refreshed word edition), and its [official how-to-play overview](https://www.codenamesgame.com/boardgames/codenames), “Prepare the Mission Grid” through “Codenames Complete Overview.” A 25-word common grid is visible to both teams. The two spymasters share a key card mapping words to team agents, bystanders and assassin; field operatives know only the words and revealed results. A spymaster gives a word-and-number clue, then operatives guess one word at a time. The key's physical holder is not its sole authorized viewer: both spymasters may see it. There is no per-player private hand or personal board in these checked base-game procedures.

**Current links:** `words → words.scene` is common public; `key → key.scene` and `key-map` are shared-secret `role-limited`, `visible_to_roles=[spymaster]`; `teams`, `clue`, `revealed`, `turn`, `pending` are public/manual. The profile excludes key photo capture and the generated pack uses `spec.key.preserve` and `spec.keep.key-map` as role-limited physical preservation. This category split is supported; there is no proven category mismatch.

**RECOMMENDATION:** Keep the current public word grid and revealed covers separate from the unrevealed key. Preserve the selected key card and its orientation relative to the grid behind the spymaster role boundary; ask the players about pending clue/guess and whose turn it is. No automatic inference from revealed covers to unexposed key cells.

**UNCLEAR / exact source gap:** The pinned `https://czechgames.com/files/rules/codenames-rules-en.pdf` now redirects to the 2025 product page; the publisher-hosted `https://filemanager.czechgames.com/storage/files/codenames/rules/codenames-rules-en.pdf` returned 404 on opening. Thus detailed 2025 rulebook placement/orientation and clue exceptions were **not** independently checked. The publisher gameplay overview supports only the stated setup, flow and visibility claims.

## File and method boundary

Current JSON links were read from `docs/research/game-specs-120/games/{id}.json`, `docs/vision-research-astra/games/{id}.json`, and the corresponding entries of `gamepacks/generated/game-essentials.json`. No repository file was changed. Existing schema or build results were not treated as factual rule verification.
