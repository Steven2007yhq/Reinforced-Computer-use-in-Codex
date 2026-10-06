# Scoped desktop, WPS and advanced Office acceptance — 2026-10-06

Seven bounded synthetic workflows passed on Windows 11 x64 with RCU **0.4.0**:
Claude desktop chat, Doubao web chat, WPS document editing, WPS spreadsheet
calculation, editing and exporting a prepared complex Word document, large Excel
recalculation, and one synthetic Excel VBA import/run/save flow. This round added
acceptance evidence without changing the plugin implementation or version.

The execution used real TypeSafe Jev responses identifying `jev-1.13.0`, the
official Sky native Windows service, and the official CUA browser interface in
Microsoft Edge. Jev selected scoped semantic actions; Codex inspected fresh
screenshots, bound targets, supplied local input, and completed ordinary Sky/CUA
handoffs. These are mixed workflows, not Jev-only autonomous operation.

Scripts prepared synthetic input fixtures and independently inspected saved
results. They did not replace native UI editing, calculate final workbook caches,
repair final documents, or save the accepted Office outputs. All input fixture
hashes remained unchanged; independent validation also left source, intermediate
and final artifacts unchanged.

## Verified matrix

| Application and tested surface | Actual final result | Limits of this pass |
| --- | --- | --- |
| Claude desktop 2.19675.1, new synthetic conversation | Completed reply containing `RCU-DESKTOP-AI-PASS` and 19 × 23 = **437** | Jev selected prompt filling; ordinary Sky submitted it. Fresh screenshot inspection confirmed the reply because AX remained stale |
| Doubao web in Microsoft Edge, new synthetic request | Completed reply containing `RCU-DOUBAO-PASS` and **221** | Jev selected prompt filling; ordinary CUA sent it. This exercises the web client, not Doubao desktop |
| WPS Office Education 12.1.0.28043, document | Final UI-repaired DOCX has exactly three paragraphs, the new title `RCU WPS PASS`, real Title style, 22pt bold text and the source blue bottom border `4F81BD` | An earlier saved intermediate lost the Title style and is excluded from final acceptance; two body paragraphs and their Normal/11pt formatting were preserved |
| WPS Office Education 12.1.0.28043, spreadsheet | Changing A1 from 2 to 4 and saving preserved three formulas with actual caches **50 / 22.5 / 72.5** | Small local workbook only; WPS VBA execution and XLSM macro compatibility were not tested |
| Microsoft Word 16.0.20326.20158, prepared complex DOCX | UI changed and centered the first title, saved the DOCX, and exported a real **six-page PDF**; 61 paragraphs, a 5 × 4 table and two sections were preserved | Complex layout was prepared in the input, not authored from a blank document through UI; the first three PDF pages are portrait and the last three landscape |
| Microsoft Excel 16.0.20326.20158, prepared large workbook | **100000 data records plus one header row**, all **300003 formulas** and every actual saved cache passed full validation; totals are **250002.5 / 275002.75** | UI changed Data!B2 from 2 to 4 and Excel calculated/saved the result; this is not 100000 records entered through UI or arbitrary workbook compatibility |
| Microsoft Excel 16.0.20326.20158 / actual VBE | Imported a **41-line synthetic VBA module**, ran F5 **once**, and saved XLSM; new MacroResult contains **100000 / 250002.5 / 275002.75 / PASS** | Ordinary Sky/RCU adapter execution; static embedded-source validation supplements the actual UI run and does not by itself prove execution |

The seven passes are workflow outcomes, not seven successful Jev inputs and not
seven additions to the automated test suite. The earlier 2026-10-05 basic Office,
ChatGPT web and Canva checks remain a separate
[historical record](acceptance-office-ai-canva-2026-10-05.md).

## Word: preserve a complex input and export through UI

The prepared synthetic DOCX already contained headings, lists, Chinese/English
body text, a 5 × 4 table, two sections, headers/footers and explicit page breaks.
The actual Word UI changed the first paragraph to `RCU ADVANCED WORD PASS`,
centered it while preserving its 22pt bold Title style, saved the document and
exported the PDF.

Independent read-only ZIP CRC and strict XML checks confirmed 61 paragraphs;
every paragraph after the title, every table cell, heading/list sequence, both
sections, Letter page dimensions, 0.75-inch margins, four explicit page breaks
and two PAGE fields were preserved. Internal style IDs normalized by Word were
compared through semantic style names and properties. Final DOCX size was
36,139 bytes.

The actual UI-exported PDF was 256,674 bytes and contained six pages. Pages 1–3
were 612 × 792 pt portrait; pages 4–6 were 792 × 612 pt landscape. Page numbers
1–6 and synthetic page markers matched their pages. All six pages were rendered
and independently viewed; text, table, headers and footers were readable, with
no missing glyphs, overlap or boundary clipping observed in those pages. This
pass covers preservation and export of this fixture, not general tracked changes,
collaboration, arbitrary layouts or creating its full design from scratch.

## Excel: full-record calculation and persisted caches

The prepared Data range was `A1:F100001`: one header and 100000 records. Its
300000 row formulas and three Summary formulas had **no nonempty input caches**.
After a real UI edit changed `Data!B2` from 2 to 4, Excel calculated and saved the
new XLSX. Independent validation read the actual saved values and resolved Excel
shared formulas from their anchors; it did not recalculate or write the workbook.

Every ID, quantity, price, D/E/F formula and saved formula cache was checked.
Only B2 changed; D2 became 5 and F2 became 5.5. All 300003 formula caches were
nonempty and there were zero error cells. Summary contained record count
100000, amount total 250002.5 and adjusted total 275002.75. The sums of all saved
D and F caches matched those totals, and the saved parity results contained
50000 Even and 50000 Odd records. The 3,657,621-byte XLSX passed ZIP CRC and
strict streaming XML checks and contained no macro parts.

## Excel VBA: actual import, one execution and saved source

The actual VBE imported the prepared 41-line synthetic standard module and
received one F5 execution through ordinary Sky and the RCU adapter. A new
MacroResult sheet appeared, and the application saved an XLSM. The synthetic
procedure reads this workbook's Data and Summary sheets, creates MacroResult
only when it does not already exist, and writes the four expected result values.
It has no automatic event routines, file or network I/O, system calls, security
changes, or automatic file saving. Trust Center settings were unchanged.

Independent checks confirmed the macro-enabled content type, VBA relationship
and a valid 24,576-byte embedded VBA project. Static extraction found one
procedure, `RcuSyntheticMacro`, whose statement body matched the supplied source
after ignoring generated Attribute metadata, blank lines and outer indentation.
MacroResult had exactly two populated rows, eight cells and no formulas; its
persisted result row was 100000 / 250002.5 / 275002.75 / PASS. All 100000 data
records, 300003 formulas and their actual caches were rechecked in the
3,666,611-byte XLSM. The validator did not execute the macro or manufacture these
values. The native import/run observation and saved-file checks are complementary
evidence; this pass does not cover arbitrary production macros.

## WPS: final repair, calculation and feature prerequisites

The first document edit dragged across a paragraph boundary and merged title
and body text. Return restored the three paragraphs, but the title remained in
Normal style. That saved intermediate is a retained failure, not the accepted
final document. Codex reopened the unchanged source, used Ctrl+H to replace its
unique title without replacing the paragraph mark, and saved a new repaired
DOCX through the real UI. Independent inspection confirmed three correct
paragraphs, Title/22pt/bold, the original `4F81BD` blue bottom border and both
Normal/11pt body paragraphs. The repaired DOCX was 34,466 bytes.

The WPS spreadsheet UI changed A1 to 4 and displayed C1=50, C2=22.5 and C3=72.5.
The new 9,326-byte XLSX preserved `A1*B1`, `A2*B2` and `SUM(C1:C2)` and their
actual caches. ZIP CRC and all XML/relationship parts passed strict parsing;
source caches had been empty. The final document and spreadsheet passed without
validator repair, recalculation or save.

Both WPS document and spreadsheet clients exposed the VB editor entry, but
opening it showed a requirement to load a macro plugin. The plugin was not
loaded, macros were not run, and the accepted Excel XLSM was not opened in WPS.
**WPS VBA execution and XLSM macro compatibility remain unverified.**

The final repaired-document screenshot showed a missing-fonts warning. Stored
font properties matched the input and the inspected text was readable, but the
specific missing fonts and rendered substitutions were not identified or tested.
This warning remains a WPS font-environment limit.

## Retained failures and ordinary handoffs

- Word's first title choice returned `low_confidence` with no input; the
  confidence threshold was not lowered. A centering callback then missed its
  required fresh target observation and hit the freshness guard. Callback
  invocation does not establish native dispatch; ordinary Sky completed the
  centering only after fresh inspection.
- Excel's first scope predicate referenced the wrong state field and refused
  input. A new ticket followed the corrected `state.window` check. After the
  actual B2 edit, AX was unavailable and the caller deliberately returned a
  false verifier to hand off for screenshot and saved-artifact checks. The
  original `failed_verification` remains recorded; the input was not replayed.
- Doubao's sidebar predicate expected one label while the actual UI used
  another. Immediate verification failed after one mutation; independent
  inspection confirmed the hidden sidebar without replay. Chat completion had
  its own evidence.
- WPS's one Jev-selected Open click executed and opened a file selector, but
  the immediate predicate expected an independently listed titled window. The
  actual transient child region required fresh visual inspection, so the
  original `failed_verification` remains. Subsequent editing, repair and saves
  used Codex/ordinary Sky handoffs.
- Sky rejected a click on an untitled WPS style popup under its window-binding
  checks. No fabricated handle bypassed it. An Alt+A attempt was intercepted
  by a global screenshot hotkey; the overlay was closed. The final flow used
  the observed unique-title replacement. A spreadsheet launch initially
  returned no bindable window; read-only enumeration later found the actual
  window, without launching it again.

These records distinguish caller integration mistakes, limited AX, service
window checks and desktop hotkeys from implementation defects. Later final
passes do not rewrite failed decisions as successful native inputs or guarantee
that every indexed control or popup works.

## Counts, timing and untested scope

Seven real Jev responses had client-measured request latencies of **478–597 ms**.
The count includes low confidence, scope refusal, a guard failure and failed
immediate verification. It is not a count of seven successful UI actions. Request
latency excludes application startup, observations, grounding, input, handoffs,
saving and independent validation. There was no matched official Computer Use
versus RCU end-to-end A/B benchmark, so no acceleration factor is claimed.

No automated regression suite was rerun as part of this live-acceptance round.
The previously reported 137 automated passes are earlier evidence; any fresh
publication checks are recorded separately in [VERIFICATION.md](VERIFICATION.md).

Doubao desktop and Kimi desktop had no usable entry in the checked installation,
Start menu, AppX and candidate-path discovery sources. This limited discovery
does not prove absence across the machine. The Doubao web pass does not imply
desktop support. ChatGPT desktop UI was excluded by the official Computer Use
tool rules; that exclusion is an acceptance-scope restriction, not a plugin
failure or an installation finding. Other versions, accounts, operating systems,
arbitrary formulas, external links, production macros and general application
compatibility remain outside this record.

## Public evidence boundary / 公开范围

This public summary retains synthetic results, software versions, bounded
actions, counts, failures and independent validation conclusions. Private
screenshots, traces, logs, machine/user paths, window IDs, account URLs, author
metadata, bridge descriptors, credentials and actual DOCX/XLSX/XLSM/PDF files
remain local and are not published with this record.

本轮七项限定合成流程通过，实际执行为 RCU 0.4.0、真实 Jev 与 Codex/Sky/CUA
混合接续。复杂 Word 结构来自预制输入，Excel 的全部 300003 条公式缓存由真实
应用计算保存；VBA 有真实导入与单次运行，再以只读检查确认源码及结果持久化。
WPS 最终文档以真实 UI 修复版为准，旧格式回归保留；WPS 宏插件门槛、缺失字体
提示、桌面豆包/Kimi 的有限发现范围及 ChatGPT 桌面工具规则排除均未扩写为通过。
