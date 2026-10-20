import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createExampleAssertions } from '../gamepacks/catan.ts';

test('example public-field regions match the board and robber bounds in demo-board.svg', () => {
  const players = [
    { id: 'red', name: '빨강', color: 'red' },
    { id: 'blue', name: '파랑', color: 'blue' },
    { id: 'white', name: '흰색', color: 'white' },
  ];
  const assertions = createExampleAssertions(players, 'turn-1', 'demo-board');
  const svg = readFileSync(new URL('../public/demo-board.svg', import.meta.url), 'utf8');
  const viewBoxMatch = svg.match(/viewBox="([\d. -]+)"/);
  const boardMatch = svg.match(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="24"/);
  const hexMatch = svg.match(/<polygon id="hex" points="([^"]+)"/);
  const robberTileMatch = svg.match(/<g transform="translate\(([-\d.]+) ([-\d.]+)\)"><use href="#hex" class="desert"/);

  assert.ok(viewBoxMatch && boardMatch && hexMatch && robberTileMatch, 'expected SVG board geometry');
  const viewBox = viewBoxMatch[1].split(/\s+/).map(Number);
  const [viewX, viewY, viewWidth, viewHeight] = viewBox;
  const normalize = (x: number, y: number, width: number, height: number) => ({
    x: (x - viewX) / viewWidth,
    y: (y - viewY) / viewHeight,
    width: width / viewWidth,
    height: height / viewHeight,
  });
  const [, boardX, boardY, boardWidth, boardHeight] = boardMatch.map(Number);
  const boardRegion = normalize(boardX, boardY, boardWidth, boardHeight);

  const points = hexMatch[1].trim().split(/\s+/).map((point) => point.split(',').map(Number));
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const [robberX, robberY] = robberTileMatch.slice(1).map(Number);
  const robberRegion = normalize(
    robberX + Math.min(...xs),
    robberY + Math.min(...ys),
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
  );

  const regions = assertions.filter((assertion) => assertion.region);
  assert.deepEqual(regions.map((assertion) => assertion.field).sort(), ['board.layout', 'robber.hexAnchor']);
  const boardAssertion = assertions.find((assertion) => assertion.field === 'board.layout')!;
  const robberAssertion = assertions.find((assertion) => assertion.field === 'robber.hexAnchor')!;
  assert.deepEqual(boardAssertion.region, boardRegion);
  assert.deepEqual(robberAssertion.region, robberRegion);
  assert.equal(boardAssertion.basis, 'example');
  assert.equal(robberAssertion.basis, 'example');

  for (const { region } of regions) {
    assert.ok(region!.x >= 0 && region!.y >= 0);
    assert.ok(region!.x + region!.width <= 1 && region!.y + region!.height <= 1);
  }
});
