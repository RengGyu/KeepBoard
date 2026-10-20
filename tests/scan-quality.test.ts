import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptScanFrame, analyzeScanFrame, emptyScanSelector, frameMotion, resetScanDwell, sameScanView, SCAN_LIMIT, stepScanSelector } from '../src/scanQuality.ts';

function frame(kind: 'detail' | 'other' | 'blur' | 'dark' | 'bright' | 'flat', width = 96, height = 72) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const value = kind === 'dark' ? 5 : kind === 'bright' ? 250 : kind === 'flat' ? 128 : kind === 'blur' ? 60 + x * 1.2 : 60 + (((x >> 3) * (kind === 'other' ? 53 : 29) + (y >> 3) * (kind === 'other' ? 19 : 47)) % 120) + ((x + y) % 2) * 25;
    const index = (y * width + x) * 4;
    pixels[index] = pixels[index + 1] = pixels[index + 2] = value;
    pixels[index + 3] = 255;
  }
  return analyzeScanFrame(pixels, width, height);
}

test('local selection separates readable detail from dark, clipped, uniform and blurred samples', () => {
  const good = frame('detail');
  assert(good.laplacianVariance > 80);
  for (const [kind, reason] of [['dark', 'dark'], ['bright', 'bright'], ['flat', 'flat'], ['blur', 'blur']] as const) {
    assert.equal(stepScanSelector(emptyScanSelector(), frame(kind), 0).reason, reason);
  }
  assert.equal(stepScanSelector(emptyScanSelector(), good, 0).reason, 'settling');
});

test('motion resets stable dwell and only a stationary new view becomes ready', () => {
  let step = stepScanSelector(emptyScanSelector(), frame('detail'), 0);
  step = stepScanSelector(step.state, frame('other'), 500);
  assert.equal(step.reason, 'motion');
  assert(step.motion! > 5.5);
  step = stepScanSelector(step.state, frame('other'), 750);
  assert.equal(step.reason, 'settling');
  step = stepScanSelector(step.state, frame('other'), 1749);
  assert.equal(step.reason, 'settling');
  assert.equal(stepScanSelector(step.state, frame('other'), 1750).reason, 'ready');
  assert.equal(frameMotion(frame('detail', 10, 10), frame('detail')), null);
});

test('near duplicate and revisit checks use every accepted view, while another region is eligible', () => {
  const first = frame('detail'), other = frame('other');
  assert.equal(sameScanView(first.fingerprint, first.fingerprint), true);
  assert.equal(sameScanView(first.fingerprint, other.fingerprint), false);
  let state = acceptScanFrame(emptyScanSelector(), first, 1000);
  state = resetScanDwell(state);
  assert.equal(stepScanSelector(state, other, 2000).reason, 'cooldown');
  state = acceptScanFrame(state, other, 3000);
  state = resetScanDwell(state);
  assert.equal(stepScanSelector(state, first, 6000).reason, 'duplicate', 'revisit is not only compared with the last photo');
});

test('selection itself consumes no budget, failure can retry, and only persisted frames reach six', () => {
  const sample = frame('detail');
  let step = stepScanSelector(emptyScanSelector(), sample, 0);
  step = stepScanSelector(step.state, sample, 1000);
  assert.equal(step.reason, 'ready');
  assert.equal(step.state.accepted.length, 0);
  const retry = stepScanSelector(resetScanDwell(step.state), sample, 2000);
  assert.equal(stepScanSelector(retry.state, sample, 3000).reason, 'ready');
  let state = retry.state;
  for (let i = 0; i < SCAN_LIMIT; i++) state = acceptScanFrame(state, sample, 3000 + i * 2000);
  assert.equal(stepScanSelector(state, sample, 20000).reason, 'budget');
  assert.throws(() => acceptScanFrame(state, sample, 21000), /6장/);
});

test('small samples have finite fingerprints and malformed sizes/pixels are rejected', () => {
  const small = frame('detail', 3, 3);
  assert(small.fingerprint.cells.every(Number.isFinite));
  assert(Number.isFinite(small.laplacianVariance));
  assert.throws(() => analyzeScanFrame([], 0, 0));
  assert.throws(() => analyzeScanFrame(new Uint8Array(36), 3.5, 3));
  assert.throws(() => analyzeScanFrame(new Uint8Array(35), 3, 3));
  const invalid = Array(36).fill(0); invalid[0] = NaN;
  assert.throws(() => analyzeScanFrame(invalid, 3, 3));
  assert.throws(() => stepScanSelector(emptyScanSelector(), small, NaN));
});
