# Sky Windows adapter

`scripts/sky-adapter.mjs` adapts the supported `@oai/sky` window2 client to the Reinforced Computer Use target contract. It receives the already initialized client; it adds no npm dependency or helper process. Read the installed Computer Use skill before operating Windows software.

## Select and observe

In `node_repl`, initialize Sky using that skill, enumerate windows, inspect the inventory, and select one exact returned object. Use a fresh inventory after launching an app; a launcher may return before its real window appears.

```js
var matching = windows.filter(w => w.id === observedWindowId && w.app === observedAppId);
if (matching.length !== 1) throw new Error('TARGET_NOT_UNIQUE');
var skyAdapter = await import('file://PLUGIN_ROOT/scripts/sky-adapter.mjs');
var target = skyAdapter.createSkyTarget({sky, window: matching[0]});
nodeRepl.write(await target.getAXState());
```

Inspect the returned tree before allowing controls. Import `runtime.mjs` and pass this target to `createSession({kind:'app',platform:'windows',...})`. Scope checks should use the stable `Window ID` and `App` headers, and any workflow-specific context. Window titles can change during a task. The adapter rejects returned state whose ID or app changes; it does not automatically rebind a modal or a different window.

## State and element numbers

`getAXState()` captures fresh accessibility text and returns the existing tree without renumbering nodes. It includes JSON-escaped `focused_element`, `selected_text`, `selected_elements`, and `document_text` for local verification. These fields do not create synthetic controls. Localized roles such as `按钮`, `编辑`, and `组合框` map to the runtime's existing canonical roles.

Each input consumes its observation. Another indexed click, key, fill, or scroll requires a fresh observation. Failed input also consumes it; an unknown outcome is never retried automatically. `observe({includeScreenshot,includeText})` requests either or both kinds of state. Returned observations and `window()` are defensive copies. `latestState()` returns a copy of the current observation, and `observationId()` is its monotonically increasing generation.

When accessibility is null, `getAXState()` throws `SKY_ACCESSIBILITY_UNAVAILABLE`. Batch runs return `needs_inspection` without input. `getScreenshot()` still works. Screenshot and keyboard actions can then be taken through ordinary Computer Use after visual inspection; the adapter never generates element numbers from a screenshot.

Sky prepared-field filling uses one `set_value({element_index,value,window})`. Add `fieldRole` to a text slot when a combo box and its editor share the same label/ID:

```js
textSlots: [{name:'path', fieldLabel:'1003', fieldRole:'text field', value:'D:\\ReinforcedComputerUse'}]
```

There is no silent fallback if the native field does not support replacement. Inspect its fresh state and choose an ordinary Computer Use action.

## Coordinates

Sky input with `screenshotId` uses logical pixels local to that selected captured region. This behavior was verified on a real 7-Zip popup at high DPI. The adapter retains every screenshot's screen origin and dimensions. The conversion API accepts:

| Point | Meaning |
| --- | --- |
| `[x,y]` or `{x,y,space:'window'}` | Existing logical window coordinates |
| `{x,y,space:'screen',screenScale}` | Physical screen coordinates; subtract the selected screenshot origin and divide by the explicitly known scale |
| `{x,y,space:'screenshot',screenshotId}` | Logical coordinates within the selected captured region |
| `{x,y,space:'image',screenshotId,imageWidth,imageHeight}` | Pixel coordinates in a displayed/exported image; scale using its explicit dimensions |

Screenshot/image points keep the selected region's ID and local coordinates. Window points use `screenshots[0]`. Screen origins can be physical while dimensions are logical; their difference must never be added directly to a logical point. Screen points require a positive `screenScale`, either on the point or in `createSkyTarget({sky,window,screenScale})`; the adapter does not guess a monitor's scale. Missing metadata, unknown screenshot IDs, out-of-bounds coordinates, and an old explicit `observationId` are rejected. The helper may reuse strings such as `screenshot-0`, so an ID alone is not a generation token. Direct screenshot/image inputs must carry the current `observationId`; pure `toSkyPoint` can convert metadata without dispatching input. Do not multiply already logical coordinates by the desktop DPI setting.

```js
await target.getScreenshot();
// Stop and visually inspect the automatically displayed screenshot.
```

In a later cell, use a point selected from that capture, then refresh immediately:

```js
var current = target.latestState();
await target.click({x:observedX, y:observedY, space:'screenshot',
  screenshotId:current.screenshots[0].id, observationId:target.observationId()});
await target.getScreenshot();
```

Batch scroll regions still capture a new screenshot immediately before scrolling. Use stable observed window coordinates (`point:[x,y]` or `space:'window'`) for batch scrolling. Points tied to an old observation fail instead of being silently reused after that refresh. Scroll directions map to signed `scrollX/scrollY`; Sky scrolling never receives `element_index`.

## Keys and outcomes

`toSkyKey()` converts Ctrl/Alt/Shift, Escape/Enter, arrow keys, page keys, common punctuation, and numpad aliases to Sky keysym strings. It preserves existing keysyms and rejects malformed chords and Windows-key aliases. Batch sessions additionally reserve Return/Enter/keypad Enter, Delete, and BackSpace under all modifier spellings for Codex review. The adapter's direct `pressKey` is an ordinary Computer Use primitive; Codex applies the skill's action-time policy.

The runtime checks scope before reporting completion and after every state change. A post-input observation failure returns `needs_inspection` with an executed trace entry; it does not repeat the input. No real Jev service is required for this local adapter.
