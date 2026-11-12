"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveEstimatedReference = resolveEstimatedReference;
exports.estimatedAttachmentForest = estimatedAttachmentForest;
/** Preserve existing same-field manual links; permit cross-field links only
 * when both endpoints have the same validated source/epoch/owner/definition.
 * Unqualified legacy IDs with multiple eligible targets are not guessed.
 */
function resolveEstimatedReference(source, targetId, live) {
    const candidates = live.filter(target => target.pieceId === targetId &&
        target.evidenceId === source.evidenceId &&
        (target.assertionId === source.assertionId ||
            source.sourceKey !== null && target.sourceKey === source.sourceKey));
    const unique = [...new Map(candidates.map(target => [JSON.stringify([target.assertionId, target.pieceId]), target])).values()];
    return unique.length === 1 ? { status: 'resolved', target: unique[0] } :
        { status: unique.length ? 'ambiguous' : 'unavailable' };
}
/** Every current-field piece stays reachable exactly once. Invalid cycles are
 * broken in the derived display ONLY. Stored overrides are retained for editing.
 * Targets in another assertion remain visible external links, not hidden roots.
 */
function estimatedAttachmentForest(placements) {
    const ids = [...new Set(placements.map(item => item.pieceId))];
    const idSet = new Set(ids), parent = new Map();
    const externalParent = Object.create(null);
    const problems = Object.create(null);
    for (const item of placements) {
        const target = item.attachedToPieceId;
        if (target === null)
            continue;
        if (target === item.pieceId)
            problems[item.pieceId] = 'self-attachment';
        else if (idSet.has(target))
            parent.set(item.pieceId, target);
        else
            externalParent[item.pieceId] = target;
    }
    const done = new Set();
    for (const start of ids) {
        if (done.has(start))
            continue;
        const path = [], at = new Map();
        let cursor = start;
        while (cursor !== undefined && !done.has(cursor)) {
            const previous = at.get(cursor);
            if (previous !== undefined) {
                for (const cyclicId of path.slice(previous)) {
                    parent.delete(cyclicId);
                    problems[cyclicId] = 'attachment-cycle';
                }
                break;
            }
            at.set(cursor, path.length);
            path.push(cursor);
            cursor = parent.get(cursor);
        }
        for (const id of path)
            done.add(id);
    }
    const children = Object.create(null);
    for (const id of ids)
        children[id] = [];
    for (const id of ids) {
        const target = parent.get(id);
        if (target)
            children[target].push(id);
    }
    return { roots: ids.filter(id => !parent.has(id)), children, externalParent, problems };
}
