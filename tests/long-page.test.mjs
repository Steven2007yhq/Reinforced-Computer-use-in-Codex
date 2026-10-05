import test from 'node:test';
import assert from 'node:assert/strict';
import pngjs from 'pngjs';
import {captureLongPage, imageSize} from '../scripts/long-page.mjs';

const {PNG} = pngjs;

test('long-page capture stitches viewport observations once in document order', async () => {
  const width = 12;
  const height = 32;
  const viewportHeight = 10;
  let y = 0;
  const writes = new Map();
  const target = {
    playwright: {evaluate: async () => ({y, height, viewportHeight, viewportWidth: width})},
    async screenshot() {
      const data = Buffer.alloc(width * viewportHeight * 4);
      for (let row = 0; row < viewportHeight; row++) {
        for (let column = 0; column < width; column++) {
          const offset = (row * width + column) * 4;
          data[offset] = Math.min(255, y + row); data[offset + 3] = 255;
        }
      }
      return PNG.sync.write({width, height: viewportHeight, data});
    },
    async scroll(_point, direction, pages) {
      y = direction === 'down' ? Math.min(height - viewportHeight, y + Math.round(pages * viewportHeight))
        : Math.max(0, y - Math.round(pages * viewportHeight));
    },
    async pressKey(_index, key) { if (key === 'ctrl+Home') y = 0; },
  };
  const result = await captureLongPage(target, {outputPath: 'capture.png', maxScrolls: 20,
    write: async (path, bytes) => writes.set(path, bytes)});
  assert.equal(result.mode, 'stitched');
  assert.equal(result.coverage, 1);
  assert.equal(y, 0);
  const output = PNG.sync.read(writes.get('capture.png'));
  assert.deepEqual(imageSize(writes.get('capture.png')), {format: 'png', width, height});
  for (let row = 0; row < height; row++) assert.equal(output.data[row * width * 4], row);
});

function scaledFixture({sourceWidth, sourceHeight, cropAfterScroll = false}) {
  const width = 100;
  const innerWidth = 104;
  const viewportHeight = 80;
  const height = 200;
  let y = 0;
  const target = {
    playwright: {evaluate: async () => ({y, height, viewportHeight, viewportWidth: width, viewportInnerWidth: innerWidth})},
    async screenshot() {
      const imageHeight = cropAfterScroll && y > 0 ? sourceHeight - 8 : sourceHeight;
      const data = Buffer.alloc(sourceWidth * imageHeight * 4);
      for (let row = 0; row < imageHeight; row++) {
        for (let column = 0; column < sourceWidth; column++) {
          const offset = (row * sourceWidth + column) * 4;
          // A continuous document ramp sampled at each source pixel's center.
          const cssY = y + (row + 0.5) * viewportHeight / sourceHeight - 0.5;
          data[offset] = Math.round(cssY);
          data[offset + 1] = column >= Math.ceil(width * sourceWidth / innerWidth) ? 250 : 20;
          data[offset + 3] = 255;
        }
      }
      return PNG.sync.write({width: sourceWidth, height: imageHeight, data});
    },
    async scroll(_point, direction, pages) {
      y = direction === 'down' ? Math.min(height - viewportHeight, y + Math.round(pages * viewportHeight))
        : Math.max(0, y - Math.round(pages * viewportHeight));
    },
    async pressKey(_index, key) { if (key === 'ctrl+Home') y = 0; },
  };
  return {target, width, height, y: () => y};
}

test('scaled viewport captures normalize to CSS positions before cropping the scrollbar', async () => {
  // First a substantial resize, then the rounding case where image width equals
  // clientWidth even though the screenshot includes a scaled full viewport.
  for (const [sourceWidth, sourceHeight] of [[52, 40], [100, 77]]) {
    const fixture = scaledFixture({sourceWidth, sourceHeight});
    const writes = new Map();
    const result = await captureLongPage(fixture.target, {outputPath: 'scaled.png', warmLazyContent: false,
      write: async (path, bytes) => writes.set(path, bytes)});
    const output = PNG.sync.read(writes.get('scaled.png'));
    assert.equal(output.width, fixture.width);
    assert.equal(output.height, fixture.height);
    assert.equal(result.coverage, 1);
    assert.equal(result.reachedBottom, true);
    assert.equal(result.screenshotNormalization.sourceWidth, sourceWidth);
    assert.equal(result.screenshotNormalization.sourceHeight, sourceHeight);
    assert.equal(result.screenshotNormalization.cssSourceWidth, 104);
    assert.equal(result.screenshotNormalization.cssSourceHeight, 80);
    assert.equal(result.screenshotNormalization.scrollbarCrop, 4);
    assert.equal(result.screenshotNormalization.normalized, true);
    assert.equal(fixture.y(), 0);
    // Every document row stays at its CSS position, including both tile seams.
    // A one-level error is permitted for integer pixel sampling and resampling.
    for (let row = 0; row < fixture.height; row++) {
      const offset = (row * fixture.width + 40) * 4;
      assert.ok(Math.abs(output.data[offset] - row) <= 1, `row ${row}: ${output.data[offset]}`);
      assert.equal(output.data[offset + 1], 20);
    }
  }
});

test('a genuinely truncated viewport is rejected and the original scroll is restored', async () => {
  const fixture = scaledFixture({sourceWidth: 104, sourceHeight: 80, cropAfterScroll: true});
  const writes = new Map();
  await assert.rejects(captureLongPage(fixture.target, {outputPath: 'truncated.png', warmLazyContent: false,
    write: async (path, bytes) => writes.set(path, bytes)}), /SCREENSHOT_TILE_DIMENSIONS_MISMATCH/);
  assert.equal(writes.size, 0);
  assert.equal(fixture.y(), 0);
});
