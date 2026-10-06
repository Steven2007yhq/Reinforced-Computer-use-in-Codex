# 0.4.0 native continuation acceptance — 2026-10-05

This record covers the new local workflow orchestrator and grounded Jev decisions on Windows 11 x64 with Node 24.14.0. Both tested application workflows completed after manual application recovery. Native inputs used the supported Sky API. Local projects, screenshots, provider configuration, and bridge descriptors are not public release files.

## Verified continuation in Multisim

NI Multisim 14.3 opened an independent copy of the installed active low-pass filter sample. The UI input resistor displayed 1 kΩ initially. An indexed field replacement chosen by Jev failed and returned `needs_inspection`; it was not automatically retried. Fresh inspection confirmed that the original field value remained.

The grounded path sent only minimal semantic descriptions and boolean observations to Jev. Codex inspected fresh screenshots and supplied local input callbacks. A locally prepared 1.2k value replaced the selected resistance. The exact field value was read back through fresh accessibility state. Confirmation used the explicitly selected modal screenshot region through the Sky adapter.

The three-stage edit / apply / save workflow reached `done` after three verification-only resumes. Each stage run callback was attempted once. The resumes never replayed input. There were 14 fresh local observations and scope checks, three stage verifications, and one final verifier. These are orchestration counts, not successful UI action counts. The first stage also exposed a caller fixture configuration error before its session started; the fixture was corrected outside the pending workflow, then its actual result was verified by resume.

Immediate verification after opening the properties, applying the edit, and saving sometimes failed because the returned AX or window title had not yet updated. Later independent observations proved the properties, edited canvas, and saved file. Those initial failures remain failures in the local action record rather than being rewritten as successful immediate verifications.

The native file saved successfully at 138,252 bytes. An independent read-only decoder fully decompressed and strictly parsed the original and saved native XML. The matching component's parameter expression changed from 1k to 1.2k, with the corresponding string and graphical value also saved as 1.2kΩ. Only that component's parameter expression list changed among 18 matched components. The UI displayed R1, while the internal component name was R11 with hierarchical IRNumber 1. A numeric cached field remained 1000, so this verifies the persisted expression and display value, not a numerical solver result.

Five grounded requests returned model identifier `jev-1.13.0`; their client-measured request times were 481–572 ms. One additional adaptive decision preceded the indexed operation failure. Provider responses, attempted inputs, immediate verifications, and independently completed stages are counted separately. This is not a speed comparison.

## Observed blocker and manual recovery

During an additional persistence check, Ctrl+W was incorrectly assumed to close the document. Multisim used it to open its component selector instead. The selector became unresponsive, and a screenshot explicitly displayed the Windows unresponsive title. Escape and a subsequent close-window input timed out. No unknown input was automatically replayed.

Fresh screenshot-only reads, exact binding refresh, and a supported REPL reset did not restore native interaction. Activating Jianying also failed, and its supported app launch reported that the accessibility window-opened handler did not become ready. Manual application recovery was requested. This reproduces an application / Computer Use interoperability boundary; the plugin does not claim to repair the underlying native service or component database.

The user manually recovered the desktop. New inventories identified the current editor and a newly launched Multisim window; old process bindings and lost tickets were not reconstructed. The following results were then obtained from new actual UI actions and artifacts.

## Reopened Multisim circuit and actual simulation

The saved acceptance copy reopened successfully. Its canvas displayed R1 as 1.2kΩ; a double-click through the repaired adapter opened the actual resistor properties with value 1.2k. The value was inspected without retyping it. Jev selected the permitted simulation action, Codex grounded the Run control, and the application actually ran: transient time advanced and XSC1 displayed a sinusoidal output. The simulation was stopped through its observed Stop control. Actual scope data was saved separately for independent numerical inspection.

The exported SCP text contains 48,295 rows with finite, strictly increasing time
and channel-A data. The disconnected channel B has 253 NaNs and was excluded
from measurement without discarding A samples. In the final 20 ms, sine fitting
gave 5,000 Hz and 0.504042 V peak-to-peak; sampled extrema gave 0.503810 V.
Under the ideal inverting one-pole low-pass assumption, R1 = 1.2kΩ, R2 = 1kΩ,
C1 = 100 nF and a 1 V peak / 5 kHz source predict about 0.505524 V
peak-to-peak. The fit differs by about -0.293%. This is a numerical sanity
comparison, not direct proof of a solver's internal parameter cache. The SCP
header's time-base value differed from the last visible scope control; the
measurement uses the actual timestamp column rather than either display setting.

The patched adapter now preserves the documented `mouse_button` and `click_count` options. A real repeated click opened the properties; a real right click opened a native context menu, which was dismissed without selecting a mutation. The original defect was found in Jianying: a requested right click had selected the thumbnail rather than opening its menu. That attempt remains in the record. A separately inspected visible Add button was used to finish timeline placement.

After simulation, the local circuit copy was saved once. The new `waitForVerified()` imported in the real Codex REPL and read fresh window/file evidence. It returned `verified` after two observations, two scope checks, and one predicate check, with no poll needed in this save (about 107 ms). The title's modification mark cleared and the file timestamp changed. Final native XML inspection is separate from that save receipt. A pre-simulation copy was preserved before saving.

The final native file is 863,966 bytes. Its 2,394,208-byte decoded XML passed
all compressed-block lengths, total-length checks and strict XML parsing.
The same component's 1.2k parameter expression and 1.2kΩ graphical value remain
saved. Its numeric cached field still reads 1000; it is not relabeled as 1200.
The original installed NI sample and the earlier saved evidence were preserved.

The helper's initial REPL import exposed a missing `EventTarget` global, despite ordinary Node tests passing. It was repaired to use inherited `AbortSignal` methods. A regression now imports and exercises polling, cancellation and a gated timeout read without global `EventTarget` or `process`. Deadline/cancellation never abandons an in-flight read, and the helper accepts no input callback.

## New Jianying import / timeline / playback / export

Jianying Pro 11.5.0.14471 resumed in the independent empty acceptance draft. The new 0.4.0 grounded path selected opening the local import picker, clip actions, the freshly observed Add button, Space playback, opening export settings, and rendering the local MP4. Codex supplied screenshot coordinates and handled the ordinary file/directory pickers and prepared output name. No actionable editor AX controls were fabricated from its window-only tree.

The media bin contained the supplied test clip, one clip appeared on the timeline, and playback advanced from zero to the visible end time before returning to pause. The import / timeline / export workflow completed after three verification-only resumes: each stage's run callback was attempted once, with 14 fresh local observations and scope checks, three stage checks and one final check. Intermediate screenshot-only callbacks deliberately returned false and handed off so Codex could inspect their effects in a later cell. Their immediate `failed_verification` statuses are not rewritten as successful immediate checks. Final verification freshly checked the exact independently validated export hash.

The new MP4 is 1,983,716 bytes, H.264 video at 818 × 432 and 30 fps. `ffprobe -count_frames` actually read 154 frames. Video duration is 5.133333 seconds; container duration is 5.155011 seconds. A complete `ffmpeg -v error -xerror` decode finished with exit code 0. Independently inspected first/middle/last output frames had visible motion and corresponded to the supplied source frames. The source is 818 × 432 at 16 fps, 82 frames and 5.125 seconds; the small duration difference accompanies the chosen export frame rate. The output adds an AAC track; audio quality was not evaluated. Local export succeeded with cloud backup off; publishing controls were not used.

After recovery, eight additional grounded responses identified `jev-1.13.0`, with client request elapsed times of 490–564 ms. They are semantic decisions, not eight verified UI successes or a whole-task speed benchmark. The initial five grounded responses and one adaptive response above remain separate historical attempts within this acceptance run.

## Scope of the result

Automated tests total 137 passing checks, including 26 workflow, 23 grounded, 34 Sky adapter and 16 read-only verification tests. These regressions do not replace native artifacts or prove every application is compatible. Previous 0.3.0 exports are not counted as this new path's evidence.

The new modules provide task continuation with Codex visual grounding. Jev still receives structured text rather than screenshots. They do not provide unrestricted Jev-only visual autonomy or guarantee every application can finish while its native UI service is unresponsive.
