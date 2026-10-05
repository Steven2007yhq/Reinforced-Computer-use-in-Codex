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
    viewportInnerWidth: window.innerWidth,
  }));
}

function normalizeScreenshot(bytes, page, cssHeight = page.viewportHeight) {
  const source = imageSize(bytes);
  const cssWidth = page.viewportInnerWidth ?? page.viewportWidth;
  if (![cssWidth, cssHeight, page.viewportWidth].every(value => Number.isInteger(value) && value > 0)
      || page.viewportWidth > cssWidth) throw new Error('SCREENSHOT_TILE_DIMENSIONS_MISMATCH');
  // Some interfaces already remove the scrollbar without scaling the content.
  const exactContent = source.width === page.viewportWidth && source.height === cssHeight;
  const referenceWidth = exactContent ? page.viewportWidth : cssWidth;
  const scaleX = source.width / referenceWidth;
  const scaleY = source.height / cssHeight;
  // A full-viewport resize may round its final dimensions to integer pixels.
  // A truncated viewport, or a nonuniform resize, cannot safely be positioned.
  if (!exactContent && Math.abs(source.height - cssHeight * scaleX) > 1) {
    throw new Error('SCREENSHOT_TILE_DIMENSIONS_MISMATCH');
  }
  const decoded = decodeImage(bytes, source.format);
  const width = page.viewportWidth;
  const height = cssHeight;
  let image = decoded;
  if (source.width !== width || source.height !== height) {
    const data = Buffer.alloc(width * height * 4);
    if (scaleX === 1 && scaleY === 1) {
      for (let row = 0; row < height; row++) {
        data.set(decoded.data.subarray(row * source.width * 4, (row * source.width + width) * 4), row * width * 4);
      }
    } else {
      // Normalize into CSS viewport coordinates before removing its scrollbar.
      // Pixel-center bilinear sampling keeps text edges smoother than duplication.
      const columns = Array.from({length: width}, (_, column) => {
        const x = Math.max(0, Math.min(source.width - 1, (column + 0.5) * scaleX - 0.5));
        const left = Math.floor(x);
        return {left, right: Math.min(source.width - 1, left + 1), weight: x - left};
      });
      for (let row = 0; row < height; row++) {
        const y = Math.max(0, Math.min(source.height - 1, (row + 0.5) * scaleY - 0.5));
        const top = Math.floor(y);
        const bottom = Math.min(source.height - 1, top + 1);
        const weightY = y - top;
        for (let column = 0; column < width; column++) {
          const {left, right, weight: weightX} = columns[column];
          const topLeft = (top * source.width + left) * 4;
          const topRight = (top * source.width + right) * 4;
          const bottomLeft = (bottom * source.width + left) * 4;
          const bottomRight = (bottom * source.width + right) * 4;
          const destination = (row * width + column) * 4;
          for (let channel = 0; channel < 4; channel++) {
            const above = decoded.data[topLeft + channel] * (1 - weightX) + decoded.data[topRight + channel] * weightX;
            const below = decoded.data[bottomLeft + channel] * (1 - weightX) + decoded.data[bottomRight + channel] * weightX;
            data[destination + channel] = Math.round(above * (1 - weightY) + below * weightY);
          }
        }
      }
    }
    image = {width, height, data};
  }
  return {image, source, metadata: {
    sourceWidth: source.width, sourceHeight: source.height,
    cssSourceWidth: referenceWidth, cssSourceHeight: cssHeight,
    outputWidth: width, outputHeight: height, scaleX, scaleY,
    scrollbarCrop: referenceWidth - width,
    normalized: source.width !== width || source.height !== height,
  }};
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
      const normalized = normalizeScreenshot(full, current, current.height);
      await write(outputPath, PNG.sync.write(normalized.image));
      return {mode: 'full-page', outputPath, format: 'png', width: normalized.image.width, height: normalized.image.height,
        documentHeight: current.height, warmScrolls, captureScrolls, reachedBottom,
        screenshotNormalization: normalized.metadata};
    }
    // The browser's fullPage and clip paths can scale or repeat rows under Windows DPI.
    // Use viewport screenshots, and position each by the observed document scroll offset.
    const stitch = current.height * current.viewportWidth <= maxPixels;
    const pixels = stitch ? Buffer.alloc(current.height * current.viewportWidth * 4, 255) : null;
    const parts = [];
    let coveredHeight = 0;
    let previousY = -1;
    const expectedHeight = current.height;
    const expectedViewport = {width: current.viewportWidth, height: current.viewportHeight,
      innerWidth: current.viewportInnerWidth ?? current.viewportWidth};
    let screenshotNormalization;
    for (let i = 0; i <= maxScrolls; i++) {
      current = await metrics(tab);
      if (current.height !== expectedHeight) throw new Error('PAGE_CHANGED_DURING_CAPTURE');
      if (current.viewportWidth !== expectedViewport.width || current.viewportHeight !== expectedViewport.height
          || (current.viewportInnerWidth ?? current.viewportWidth) !== expectedViewport.innerWidth) {
        throw new Error('PAGE_VIEWPORT_CHANGED_DURING_CAPTURE');
      }
      if (current.y <= previousY) break;
      const bytes = await tab.screenshot();
      const normalized = normalizeScreenshot(bytes, current);
      if (current.y > coveredHeight || (screenshotNormalization
          && (normalized.source.width !== screenshotNormalization.sourceWidth
            || normalized.source.height !== screenshotNormalization.sourceHeight))) {
        throw new Error('SCREENSHOT_TILE_DIMENSIONS_MISMATCH');
      }
      screenshotNormalization ??= normalized.metadata;
      const rows = Math.min(normalized.image.height, expectedHeight - current.y);
      const copyFrom = Math.max(0, coveredHeight - current.y);
      if (stitch) {
        pixels.set(normalized.image.data.subarray(copyFrom * current.viewportWidth * 4, rows * current.viewportWidth * 4),
          (current.y + copyFrom) * current.viewportWidth * 4);
      } else {
        const partPath = outputPath.replace(/\.[^.]+$/, '') + `-part-${String(i + 1).padStart(3, '0')}.png`;
        await write(partPath, PNG.sync.write(normalized.image));
        parts.push({path: partPath, y: current.y, copyFrom, format: 'png', width: normalized.image.width,
          height: normalized.image.height});
      }
      coveredHeight = Math.max(coveredHeight, current.y + rows);
      if (current.y + current.viewportHeight >= current.height - 2) { reachedBottom = true; break; }
      previousY = current.y;
      await tab.scroll(scrollPoint(current), 'down', 0.75);
      await settledMetrics(tab, previousY, 'down');
      captureScrolls++;
    }
    if (coveredHeight < current.height) throw new Error('PAGE_CAPTURE_INCOMPLETE');
    if (stitch) {
      await write(outputPath, PNG.sync.write({width: current.viewportWidth, height: coveredHeight,
        data: pixels.subarray(0, coveredHeight * current.viewportWidth * 4)}));
      return {mode: 'stitched', outputPath, format: 'png', width: current.viewportWidth,
        height: coveredHeight, documentHeight: current.height, warmScrolls, captureScrolls, reachedBottom,
        coverage: coveredHeight / current.height, screenshotNormalization};
    }
    return {mode: 'segments', parts, documentHeight: current.height, coveredHeight, warmScrolls, captureScrolls, reachedBottom,
      screenshotNormalization};
  } finally {
    await returnToTop(tab, initial, maxScrolls);
  }
}
