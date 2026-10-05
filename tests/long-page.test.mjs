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
