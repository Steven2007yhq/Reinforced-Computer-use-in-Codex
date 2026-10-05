import {writeFile} from 'node:fs/promises';
import jpeg from 'jpeg-js';
import pngjs from 'pngjs';

const {PNG} = pngjs;

export function imageSize(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (data.length >= 24 && data.subarray(0, 8).every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index])) {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return {format: 'png', width: view.getUint32(16), height: view.getUint32(20)};
  }
  if (data[0] === 0xff && data[1] === 0xd8) {
    for (let offset = 2; offset + 4 < data.length;) {
      if (data[offset++] !== 0xff) continue;
      let marker = data[offset++];
      while (marker === 0xff) marker = data[offset++];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (marker === 0xd9 || marker === 0xda || offset + 2 > data.length) break;
      const length = (data[offset] << 8) | data[offset + 1];
      if (length < 2 || offset + length > data.length) break;
      if ((marker >= 0xc0 && marker <= 0xcf) && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return {format: 'jpeg', width: (data[offset + 5] << 8) | data[offset + 6],
          height: (data[offset + 3] << 8) | data[offset + 4]};
      }
      offset += length;
    }
  }
  throw new Error('SCREENSHOT_FORMAT_UNSUPPORTED');
}

function decodeImage(bytes, format) {
  return format === 'jpeg' ? jpeg.decode(Buffer.from(bytes), {useTArray: true}) : PNG.sync.read(Buffer.from(bytes));
}

async function metrics(tab) {
  return tab.playwright.evaluate(() => ({
    y: Math.round(window.scrollY),
    height: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0),
    viewportHeight: window.innerHeight,
    viewportWidth: document.documentElement.clientWidth,
  }));
}

async function settledMetrics(tab, previousY, direction, {targetY} = {}) {
  let last = await metrics(tab);
  let stable = 0;
  for (let i = 0; i < 24; i++) {
    await new Promise(resolve => setTimeout(resolve, 50));
    const next = await metrics(tab);
    if (targetY !== undefined && Math.abs(next.y - targetY) <= 2) return next;
    const moved = direction === 'down' ? next.y > previousY + 2 : next.y < previousY - 2;
    stable = moved && Math.abs(next.y - last.y) <= 1 ? stable + 1 : 0;
    if (stable >= 2) return next;
    last = next;
  }
  return last;
}

function scrollPoint(page) {
  return [Math.round(page.viewportWidth / 2), Math.round(page.viewportHeight / 2)];
}

async function returnToTop(tab, initial, maxScrolls) {
  let current = await metrics(tab);
  if (current.y > initial.y + 2 && initial.y === 0 && typeof tab.pressKey === 'function') {
    const previousY = current.y;
    await tab.pressKey(null, 'ctrl+Home');
    current = await settledMetrics(tab, previousY, 'up', {targetY: 0});
  }
  for (let i = 0; current.y > initial.y + 2 && i < maxScrolls + 2; i++) {
    const previousY = current.y;
    await tab.scroll(scrollPoint(current), 'up', 1);
    current = await settledMetrics(tab, previousY, 'up', {targetY: 0});
    if (current.y >= previousY - 2) break;
  }
  if (Math.abs(current.y - initial.y) > 2) throw new Error('PAGE_SCROLL_RESTORE_FAILED');
  return current;
}

/** Capture through the selected Computer Use browser tab; no CDP or separate browser is used. */
export async function captureLongPage(tab, {outputPath, warmLazyContent = true, maxScrolls = 40,
  maxPixels = 60_000_000, write = writeFile} = {}) {
  if (!tab?.screenshot || !tab?.scroll || !tab?.playwright?.evaluate) throw new Error('BROWSER_TAB_REQUIRED');
  if (typeof outputPath !== 'string' || !outputPath.toLowerCase().endsWith('.png') || !Number.isInteger(maxScrolls) || maxScrolls < 1 || maxScrolls > 200
      || !Number.isInteger(maxPixels) || maxPixels < 1_000_000) {
    throw new Error('INVALID_SCREENSHOT_OPTIONS');
  }
  const initial = await metrics(tab);
  if (initial.y > 2) throw new Error('START_AT_PAGE_TOP');
  let current = initial;
  let warmScrolls = 0;
  let captureScrolls = 0;
  let reachedBottom = false;
  try {
    if (warmLazyContent) {
      await tab.screenshot(); // Establish a fresh viewport mapping before coordinate scrolling.
      for (; warmScrolls < maxScrolls; warmScrolls++) {
        if (current.y + current.viewportHeight >= current.height - 2) { reachedBottom = true; break; }
        await tab.scroll(scrollPoint(current), 'down', 1);
        const next = await settledMetrics(tab, current.y, 'down');
        if (next.y <= current.y + 2) { reachedBottom = next.y + next.viewportHeight >= next.height - 2; break; }
        current = next;
      }
      await returnToTop(tab, initial, maxScrolls);
    }
    current = await metrics(tab);
    if (current.height <= current.viewportHeight) {
      const full = await tab.screenshot({fullPage: true});
      const size = imageSize(full);
      if (size.width !== current.viewportWidth || size.height !== current.height) throw new Error('SCREENSHOT_DIMENSIONS_MISMATCH');
      await write(outputPath, PNG.sync.write(decodeImage(full, size.format)));
      return {mode: 'full-page', outputPath, format: 'png', width: size.width, height: size.height,
        documentHeight: current.height, warmScrolls, captureScrolls, reachedBottom};
    }
    // The browser's fullPage and clip paths can scale or repeat rows under Windows DPI.
    // Use viewport screenshots, and position each by the observed document scroll offset.
    const stitch = current.height * current.viewportWidth <= maxPixels;
    const pixels = stitch ? Buffer.alloc(current.height * current.viewportWidth * 4, 255) : null;
    const parts = [];
    let coveredHeight = 0;
    let previousY = -1;
    const expectedHeight = current.height;
    for (let i = 0; i <= maxScrolls; i++) {
      current = await metrics(tab);
      if (current.height !== expectedHeight) throw new Error('PAGE_CHANGED_DURING_CAPTURE');
      if (current.y <= previousY) break;
      const bytes = await tab.screenshot();
      const partSize = imageSize(bytes);
      if (partSize.width !== current.viewportWidth || partSize.height > current.viewportHeight
          || current.y > coveredHeight) throw new Error('SCREENSHOT_TILE_DIMENSIONS_MISMATCH');
      const copyFrom = Math.max(0, coveredHeight - current.y);
      if (stitch) {
        const decoded = decodeImage(bytes, partSize.format);
        pixels.set(decoded.data.subarray(copyFrom * current.viewportWidth * 4),
          (current.y + copyFrom) * current.viewportWidth * 4);
      } else {
        const partPath = outputPath.replace(/\.[^.]+$/, '') + `-part-${String(i + 1).padStart(3, '0')}.${partSize.format === 'jpeg' ? 'jpg' : 'png'}`;
        await write(partPath, bytes);
        parts.push({path: partPath, y: current.y, copyFrom, ...partSize});
      }
      coveredHeight = Math.max(coveredHeight, current.y + partSize.height);
      if (current.y + current.viewportHeight >= current.height - 2) { reachedBottom = true; break; }
      previousY = current.y;
      await tab.scroll(scrollPoint(current), 'down', 0.75);
      await settledMetrics(tab, previousY, 'down');
      captureScrolls++;
    }
    if (coveredHeight < current.height - 16) throw new Error('PAGE_CAPTURE_INCOMPLETE');
    if (stitch) {
      await write(outputPath, PNG.sync.write({width: current.viewportWidth, height: coveredHeight,
        data: pixels.subarray(0, coveredHeight * current.viewportWidth * 4)}));
      return {mode: 'stitched', outputPath, format: 'png', width: current.viewportWidth,
        height: coveredHeight, documentHeight: current.height, warmScrolls, captureScrolls, reachedBottom,
        coverage: coveredHeight / current.height};
    }
    return {mode: 'segments', parts, documentHeight: current.height, coveredHeight, warmScrolls, captureScrolls, reachedBottom};
  } finally {
    await returnToTop(tab, initial, maxScrolls);
  }
}
