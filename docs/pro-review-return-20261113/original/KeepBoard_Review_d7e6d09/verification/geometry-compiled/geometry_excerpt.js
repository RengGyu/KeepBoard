"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sourceLine = sourceLine;
exports.diceLattice = diceLattice;
const median = (xs) => { const a = [...xs].sort((a, b) => a - b), m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
const dot = (p, a) => p.x * a.x + p.y * a.y;
/** Dominant line in physical source pixels. No axis is invented from an axis-aligned board bbox. */
function sourceLine(points) {
    if (points.length < 2)
        return null;
    const origin = { x: points.reduce((s, p) => s + p.x, 0) / points.length, y: points.reduce((s, p) => s + p.y, 0) / points.length };
    let xx = 0, xy = 0, yy = 0;
    for (const p of points) {
        const x = p.x - origin.x, y = p.y - origin.y;
        xx += x * x;
        xy += x * y;
        yy += y * y;
    }
    const d = Math.hypot(xx - yy, 2 * xy), major = (xx + yy + d) / 2, minor = (xx + yy - d) / 2;
    if (major < 1e-10 || major < minor * 4)
        return null;
    const angle = Math.atan2(2 * xy, xx - yy) / 2;
    return { origin, axis: { x: Math.cos(angle), y: Math.sin(angle) } };
}
/** Fit repeated dice rows and perspective column lines, not equal subdivisions of the whole board.
 * Full visible rows establish column identities; a missing complete row/column is not guessed.
 * Axes use source reading order, not an unobserved printed board orientation.
 */
function diceLattice(footprints, rows, columns) {
    const empty = (reason) => ({ axis: null, cells: new Map(), reason });
    if (footprints.length < columns * 2 + rows - 2)
        return empty('insufficient-repeated-grid-evidence');
    const nodes = footprints.map(p => ({ ...p, key: p.id })), scale = median(nodes.map(p => Math.min(p.width, p.height)));
    if (!(scale > 0))
        return empty('invalid-grid-footprints');
    const angles = [];
    for (let i = 0; i < nodes.length; i++)
        for (let j = i + 1; j < nodes.length; j++) {
            let dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
            if (Math.hypot(dx, dy) < scale * .3)
                continue;
            if (dx < 0 || Math.abs(dx) < 1e-10 && dy < 0) {
                dx = -dx;
                dy = -dy;
            }
            angles.push(Math.atan2(dy, dx));
        }
    const candidates = [];
    for (const angle of angles) {
        const axis = { x: Math.cos(angle), y: Math.sin(angle) }, normal = { x: -axis.y, y: axis.x }, ns = nodes.map(n => ({ ...n, u: dot(n, axis), v: dot(n, normal) })).sort((a, b) => a.v - b.v || a.u - b.u || a.key.localeCompare(b.key));
        const bands = [];
        for (const n of ns) {
            const last = bands.at(-1);
            if (last && Math.abs(n.v - median(last.map(n => n.v))) <= scale * .45)
                last.push(n);
            else
                bands.push([n]);
        }
        if (bands.length !== rows || bands.some(b => b.length > columns))
            continue;
        const ordered = bands.map(b => b.sort((a, b) => a.u - b.u || a.key.localeCompare(b.key))), complete = ordered.map((b, r) => ({ b, r })).filter(({ b }) => b.length === columns);
        if (complete.length < 2)
            continue;
        const vs = ordered.map(b => median(b.map(n => n.v))), rowPitch = median(vs.slice(1).map((v, i) => v - vs[i]));
        if (rowPitch < scale * .4)
            continue;
        const cells = new Map();
        let score = 0, valid = true;
        // Regress each column through full rows; this supports a fan of columns under perspective.
        const lines = Array.from({ length: columns }, (_, c) => { const points = complete.map(({ b }) => b[c]), v = points.reduce((s, n) => s + n.v, 0) / points.length, u = points.reduce((s, n) => s + n.u, 0) / points.length, den = points.reduce((s, n) => s + (n.v - v) ** 2, 0), slope = den ? points.reduce((s, n) => s + (n.v - v) * (n.u - u), 0) / den : 0; return (at) => u + (at - v) * slope; });
        for (let r = 0; r < rows && valid; r++) {
            const predicted = lines.map(f => f(vs[r])), pitch = median(predicted.slice(1).map((u, i) => u - predicted[i]));
            if (pitch < scale * .4) {
                valid = false;
                break;
            }
            const used = new Set();
            for (const n of ordered[r]) {
                const distances = predicted.map((u, c) => ({ c, d: Math.abs(n.u - u) / pitch })).sort((a, b) => a.d - b.d);
                if (distances[0].d > .32 || distances[1].d - distances[0].d < .3 || used.has(distances[0].c)) {
                    valid = false;
                    break;
                }
                used.add(distances[0].c);
                cells.set(n.key, { row: r + 1, column: distances[0].c + 1 });
                score += distances[0].d ** 2 + ((n.v - vs[r]) / rowPitch) ** 2;
            }
        }
        if (valid)
            candidates.push({ axis, cells, score: score / nodes.length });
    }
    if (!candidates.length)
        return empty('grid-offset-or-perspective-ambiguous');
    candidates.sort((a, b) => a.score - b.score || a.axis.y - b.axis.y);
    const best = candidates[0], plausible = candidates.filter(c => c.score <= best.score + .01), cells = new Map(best.cells);
    for (const [id, cell] of cells)
        if (plausible.some(c => JSON.stringify(c.cells.get(id)) !== JSON.stringify(cell)))
            cells.delete(id);
    return { axis: best.axis, cells, reason: cells.size === nodes.length ? null : 'competing-grid-cell-assignment' };
}
