# Reproduce the no-key demo

[English](DEMO.md) · [简体中文](DEMO.zh-CN.md) · [Getting started](GETTING_STARTED.md)

This demo exercises a known local plan and long-page capture through the selected
Codex Computer Use browser tab. It uses synthetic content, no login, no provider
configuration, and no Jev API key. Starting the fixture alone does not test the plugin.

## Start the fixture

From the source checkout, install dependencies and retain the server terminal:

```powershell
npm ci --omit=dev --ignore-scripts
npm run demo
```

The printed default URL is `http://127.0.0.1:4318/`. The server binds only IPv4
loopback, serves `/` and `/long`, accepts GET/HEAD, and loads no external resources.
For an occupied port, use `npm run demo -- --port=4319` and change the task URL and
allowed origin together. Stop the server with Ctrl+C when finished.

## Ask Codex to run the task

Install the plugin as described in [Getting started](GETTING_STARTED.md), then
use a chat with browser Computer Use available:

> Use Reinforced Computer Use in local runPlan mode, without Jev. Open http://127.0.0.1:4318/ in the Computer Use browser. Observe the page, use the exact “Long page” link, and verify LONG_01 on the destination. Capture that long page as a PNG in this chat's workspace output directory. Inspect the saved image for LONG_01 through LONG_12 in order and END_OF_LONG_PAGE at the bottom. Report the document height, captured height, and coverage from the helper. Stop and explain if the required Computer Use APIs are unavailable.

The first Computer Use call must contain exactly one documented entry call, such
as `cua.createBrowserTab("iab", "http://127.0.0.1:4318/", {visible:false})`.
Read its returned documentation and initial state before continuing. Keep the
returned tab, here called `target`. Other enabled browser surfaces may be used
according to their documentation; the plugin cannot enable an unavailable surface.

The following is the relevant plugin code **after** initialization and after
observing the exact `Long page` label. Resolve `PLUGIN_ROOT` to the absolute source
or installed plugin directory, convert it to a valid file URL, and choose an
absolute PNG path in an existing workspace output folder. Placeholders are not
literal executable paths.

```javascript
var reinforced = await import('file://PLUGIN_ROOT/scripts/runtime.mjs');
var session = reinforced.createSession({
  target,
  kind: 'tab',
  platform: 'windows',
  targetName: 'Synthetic local demo',
  goal: 'Open the synthetic long page',
  clickLabels: ['Long page'],
  allowedOrigins: ['http://127.0.0.1:4318'],
  scopeCheck: raw => raw.includes('Reinforced Computer Use demo'),
  verify: raw => raw.includes('LONG_01') && raw.includes('END_OF_LONG_PAGE'),
  maxSteps: 4,
  maxTotalMs: 60000
});
nodeRepl.write(await session.runPlan([{kind:'click', label:'Long page'}]));

var longPage = await import('file://PLUGIN_ROOT/scripts/long-page.mjs');
nodeRepl.write(await longPage.captureLongPage(target, {
  outputPath: 'C:/absolute/workspace/output/demo.png',
  warmLazyContent: false,
  maxScrolls: 60
}));
```

`warmLazyContent:false` is appropriate here because this fixture has no lazy
resources. Keep the default warm-up for pages that need it. The tab must start at
the top. The helper uses documented screenshot/scroll/keyboard operations and
read-only DOM measurements; it does not launch a second automation browser.

## Inspect the evidence

`runPlan()` should report `done` with one click and zero Jev decisions. That result
only proves the local predicate passed. Inspect the saved image separately:

- `LONG_01` through `LONG_12` appear once in ascending order.
- The last section and `END_OF_LONG_PAGE` footer are visible.
- There are no repeated glyph rows or missing text at screenshot seams.
- The returned height, document height, bottom status, and coverage agree with
  this particular capture, and the tab returns to its starting position.

The public [full image](assets/demo-full.png), [top](assets/demo-top.png), and
[bottom](assets/demo-bottom.png) come from an actual local CUA browser run.
The [GIF](assets/demo-preview.gif) and [30-second MP4](assets/demo-video.mp4) are
edited sequences of those actual viewport screenshots. They are not real-time
recordings and cannot establish execution speed. See [verification](VERIFICATION.md)
for the recorded measurements and [media provenance](MEDIA.md) for how the assets
were prepared.

Version 0.2.2 normalizes uniformly resized screenshots to the CSS viewport before
cropping the scrollbar and placing tiles at CSS scroll offsets. Dimension
mismatches that do not fit a supported model are rejected. Coverage describes
geometric height; visual inspection remains necessary for overlays, fixed
headers, dynamic pages, or repeated content.

The local demo does not verify a real Jev request, production-site automation,
native desktop applications, or other operating systems. Use [Troubleshooting](TROUBLESHOOTING.md)
if an API or output differs, and report only sanitized synthetic evidence.
