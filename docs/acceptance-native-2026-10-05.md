# Native Windows and live Jev acceptance — 2026-10-05

This is a scoped acceptance record for the 0.3.0 Sky adapter and the Node REPL bridge fix. Native inputs used the supported `@oai/sky` API in Codex `node_repl`. Local screenshots, raw observations, test projects, videos, provider configuration, and bridge descriptors remain outside this repository. This public record summarizes those local checks; it does not provide downloadable evidence attachments.

## Sky adapter: 7-Zip

The first native acceptance used Sky 0.7.5 and 7-Zip 25.01 (x64). The selected window came from the actual window inventory. Each operation used a fresh observation and retained the native control index.

| Check | Independently observed result |
| --- | --- |
| Indexed Help click | Help menu opened; local verifier passed |
| Address field replacement | One indexed `set_value`; readback matched the prepared acceptance directory |
| Legacy `alt+f` shortcut | Converted to `Alt_L+f`; File menu appeared |
| Help → About local plan | Two actions; About reported 7-Zip 25.01; separate screenshot confirmed it |
| Popup screenshot coordinates | Correct popup screenshot identity closed the About dialog |
| Resized image coordinates | A 508×600 image point mapped to its 254×300 logical screenshot and closed the dialog; AX and screenshot confirmed the result |
| Coordinate-based scrolling | Scrolled a long directory by 600 logical pixels; newly visible entries confirmed movement |

Screen coordinates with an explicit scale were covered by contract tests. Actual coordinate clicks covered logical window, popup screenshot, and resized image spaces. Null AX, an indexed dialog operation failure, occlusion, and delayed rendering were retained as failures or handoffs. Calculator and Notepad did not provide usable AX and were not counted as successful indexed-control acceptance.

## Live provider and REPL compatibility

The Windows REPL can omit global `process`. Provider and bridge modules now load in that environment without importing `node:process`. The REPL client uses an explicit, locally observed `descriptorPath`; credentials stay in the terminal-side provider connection. Regression tests simulate this missing-global environment and verify descriptor loading and bridge authentication separately from the live service checks.

The retained loopback bridge made **10 real TypeSafe responses**, all reporting model `jev-1.13.0`. There were **7 runtime-counted Jev inputs and 2 failed indexed input attempts**. Four inputs independently achieved their intended effects: opening the Multisim file picker, starting the initial simulation, playing the Jianying timeline, and starting the modified Multisim simulation. The remaining inputs included ineffective actions and a save warning; these were not counted as successful task completion.

Service-reported latency ranged from 492 to 585 ms, with a median of 509.5 ms. Total usage was 5,272 input tokens and 489 output tokens. These figures describe this run's provider responses, not full workflow time or a general speedup. They do not establish continuing provider availability, account access, or pricing.

## Multisim: component edit and simulation

The test used a local copy of the installed example circuit. Jev opened the file picker; Codex completed file selection with ordinary Sky. An initial F5 while a menu remained open did not start simulation. After Codex closed the menu and observed the window again, a new Jev F5 decision started it. Separate screenshots of the toolbar and oscilloscope confirmed a running circuit with two periodic waveforms.

The resistor property dialog exposed a combo box and nested text editor with the same label. `fieldRole:'text field'` selected the editor, but Jev's indexed `set_value` attempt failed and fresh readback still showed 1k. The runtime returned `needs_inspection` without replay. Codex entered 1.2k with ordinary, screenshot-grounded Sky. Jev's subsequent indexed confirmation click also failed; Codex then confirmed from a fresh screenshot.

**The circuit visibly changed from R3 = 1 kΩ to R3 = 1.2 kΩ.** A new Jev F5 decision completed its input before AX readback failed; the runtime stopped further input. Codex independently confirmed the running state and two periodic waveforms for the edited circuit. It then stopped simulation and verified the stopped toolbar state.

The edit remained in the open test copy and was **not saved to disk**; the original fixture hash remained unchanged. A save attempt produced the application's file-size-limit warning and was canceled. A letter shortcut entered the Chinese input method instead of enabling its intended switch. New component placement, database search, wiring, and quantitative circuit measurements were not covered.

## Jianying: playback and local export

The test used Jianying Professional 11.5.0.14471 and a copy of its bundled example video in a new local test draft. The editor exposed only a window container in AX, so Codex used fresh screenshots and ordinary Sky for importing media, creating the timeline, and setting up export. An unsuccessful drag did not count as creating the timeline; a subsequent observed menu action did.

Jev selected the explicitly allowed Space shortcut. Separate screenshots confirmed the pause icon, advancing time, a changed video frame, and arrival at the end of the approximately five-second clip. The batch's `yielded` status was not treated as a completion verifier.

Codex completed a local MP4 export with cloud backup unchecked. The application showed export success. Independent file checks found H.264 video, **818×432, 30 fps, 154 frames**, a 5.133333-second video stream, and a **5.155011-second container** with AAC stereo audio. A full-file `ffmpeg -v error -xerror` decode exited 0 with no errors. The output's hash and frame rate differed from the source, confirming an actual editor export.

## Scope and data boundary

The run verified a live Jev decision loop with deliberate Codex/Sky handoffs. It did not verify Jev-only autonomous circuit editing or Jev-only video import/export. Indexed inputs can fail in real applications even when their controls appear in AX; an input completion also requires independent outcome verification. Failed input or readback was not automatically retried, and confidence thresholds were not lowered to force progress.

Planner JSON excluded screenshots, the full accessibility tree, media, prepared text values, and coordinates. The provider received its API key in the HTTPS Authorization header and received the explicitly shared planning metadata described in [PRIVACY.md](PRIVACY.md). Temporary bridge tokens and raw traces were not published. This record does not imply support for arbitrary projects, future application versions, new layouts, or other software.
