# Scoped Office, AI chat and Canva acceptance — 2026-10-05

This record extends the 0.4.0 acceptance scope with four actual UI workflows on
the Windows 11 x64 development environment. Word and Excel used supported native
Computer Use; ChatGPT and Canva used an existing Microsoft Edge CUA tab. Codex
provided inspection, target binding, local prepared values, ordinary UI handoffs
and independent result verification. Jev selected only scoped semantic actions.
These are specific exercised flows, not general application compatibility or
Jev-only visual autonomy.

The plugin core and version were unchanged for this round. The previously
reported **137 passing automated tests** remain historical regression evidence;
they were not rerun or increased by these four live checks. Local documents,
screenshots, private URLs, author metadata, raw traces, provider configuration
and bridge descriptors are excluded from this public record.

## Verified matrix

| Application and tested surface | Actual result | Preserved limits |
| --- | --- | --- |
| Microsoft Word 16.0.20326.20158, new local document | Three paragraphs of Chinese/English text and a bold title were saved in a 13,864-byte DOCX; complete ZIP/XML inspection confirmed the text and `bold:true` | The first indexed click had an unclear outcome and returned `needs_inspection`; coordinate continuation followed fresh inspection |
| Microsoft Excel 16.0.20326.20158, only A1:C3 | A small table, two multiplication formulas and a SUM formula were saved; changing A1 from 2 to 4 produced the actual new cached results 50 and 72.5 | Grid AX was truncated or null; some initial inputs had no effect, and explicit F2/Return editing required ordinary Computer Use continuation |
| ChatGPT web in Microsoft Edge, new synthetic conversation | A synthetic 7 × 8 request received a completed response containing `RCU-AI-PASS` and 56 | Jev selected input filling; Send was an ordinary CUA action. No other AI client was exercised |
| Canva in Microsoft Edge, new private 800 × 600 design | Title text at UI-confirmed size 42, a circle, a caption, movement/resizing and a local PNG download completed; the 18,164-byte PNG decoded successfully | Three text/name operations used local plans; drag/resize used ordinary CUA. The circle's immediate verification failed before later independent confirmation |

## Word: editing and local save

The actual Word version was 16.0.20326.20158. An independent new document received
three Chinese/English paragraphs. Its title was made bold and the document was
saved locally through the UI. Independent read-only inspection of the complete
DOCX ZIP and XML confirmed the intended paragraph text and a persisted title
formatting result of `bold:true`. The final file was 13,864 bytes.

The first attempt to click observed element 24 did not establish a confirmed
effect and returned `needs_inspection`. A fresh observation showed no intended
change. Codex inspected the target again and continued using a grounded
coordinate instead of automatically replaying the indexed input. This failed
attempt remains part of the result; the saved document does not establish that
all Word indexed controls work.

This check covers that new document's text, title formatting and local save.
It does not cover complex page layout, tracked changes, comments, tables, macros,
cloud collaboration or other Word versions.

## Excel: small table, formulas and actual recalculation

The actual Excel version was 16.0.20326.20158. Only the A1:C3 test region was
edited. The final saved workbook contained the following values and formulas:

| Row | Column A | Column B | Column C formula | Saved cached result |
| --- | --- | --- | --- | --- |
| 1 | 4 | 12.5 | `=A1*B1` | 50 |
| 2 | 3 | 7.5 | `=A2*B2` | 22.5 |
| 3 | `Total` | Empty | `=SUM(C1:C2)` | 72.5 |

The initial A1 value was 2, with C1 cached as 25 and the sum as 47.5. After the
actual UI changed A1 to 4, Excel recalculated C1 to 50 and the sum to 72.5 while
C2 remained 22.5. This verifies a real dependency update in this small workbook,
not just the presence of formula text.

Grid accessibility reported `truncated: child_limit, omitted 1025 children` or
was unavailable. This is a child-node limit, not a character limit. An initial
plain-label input and an initial SUM input did not take effect. Fresh inspection
led to explicit F2 edit mode and Return confirmation through ordinary Computer
Use. These handoffs were not an automatic replay of uncertain input. A separate
Jev creation decision returned `low_confidence` with no UI input; the configured
confidence floor was not lowered to force progress.

The saved XLSX was 10,111 bytes. Independent read-only validation parsed all 12
XML parts and compared raw formula/value fields with formula-mode and data-only
reads. All three views agreed on the formulas and cached results above. No
recalculation or write-back was performed by that validator; no formula errors
or macros were present in this fixture. This does not establish support for
large sheets, arbitrary formulas, external data, macros, charts or complex
workbooks.

## ChatGPT web: prepared input and completed reply

An existing Edge CUA surface opened a new ChatGPT conversation. The request used
synthetic content asking for 7 × 8 and the acceptance marker. Jev selected filling
the locally prepared input, with a client-measured request time of 551 ms. Codex
performed Send through ordinary CUA rather than placing a consequential sending
control in the fast path.

Fresh UI inspection confirmed the new response contained `RCU-AI-PASS` and 56
and had finished generating. This proves that conversation's request/reply
result. It does not cover desktop AI clients, Doubao, attachments, other accounts
or arbitrary production chat workflows. Prepared input omitted from the Jev
decision payload is still sent to the chat website when submitted.

## Canva: text, canvas interaction and PNG

An existing Edge CUA surface created a new private 800 × 600 Canva design. The
observed workflow added title text, a circle and a caption, moved/resized canvas
content and downloaded a PNG. The UI controls and screenshots confirmed title
font size 42. Three separate local `runPlan()` operations for the design name,
title and caption each returned verified completion with one mutation.

Jev selected design creation and circle insertion, with client request times of
495 ms and 501 ms. The circle's immediate verifier expected the wrong AX format
and returned `failed_verification`. Later fresh AX, screenshot inspection and
the exported PNG confirmed the circle without replaying its insertion. That
initial failure remains an immediate verification failure.

Movement and resizing used ordinary CUA. The current Sky adapter exposes no drag
method, and grounded candidates accept only `click`, `fill`, `scroll` and `key`;
this record does not describe Jev or the adapter as performing drag. Local
callbacks used the actual bound browser tab; helper target-name metadata did not
automatically bind it or enforce its URL/design scope.

The downloaded PNG was 18,164 bytes and independently decoded successfully.
Its final layout supports the exported result. Movement history, font size and
the private-design state are supported by the UI observations, not inferred from
PNG bytes. Sharing, publication, team collaboration, arbitrary templates,
payments and other Canva workflows were not tested.

## Counts, timing and applicable scope

This round received **12 real Jev responses**: four for Word, five for Excel and
three for the browser workflows. Their client-measured request times were
**495–584 ms**. The Excel low-confidence response produced no input, so 12
responses are not 12 successful UI actions. Provider calls, local-plan mutations,
ordinary CUA actions and independent verification are separate evidence layers.

Request times exclude setup, observation, Codex visual inspection, input,
handoff, save/download and verification. There was no matched official Computer
Use versus Reinforced Computer Use end-to-end A/B baseline; no acceleration
factor is established.

The verified scope is the four fixtures and software/surfaces above, with
explicit handoffs and preserved failures. Other desktop AI applications, Doubao,
WPS, complex Office workflows, macros and PDF workflows remain untested. Device,
runtime, browser-origin and native-service limits remain those in
[COMPATIBILITY.md](COMPATIBILITY.md). Automated, historical and live evidence are
kept separate in [VERIFICATION.md](VERIFICATION.md); the earlier Multisim/Jianying
continuation record is [here](acceptance-fullflow-2026-10-05.md).
