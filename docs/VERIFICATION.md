# 验证记录 / Verification

公开源码版本：**0.4.0**。记录更新日期：**2026-10-06**。环境为 Windows 11 x64、
Node.js v24.14.0。这里区分模拟测试、实际合成网页操作、原生应用中的限定动作与
Codex 交接、历史记录和未验证能力。
设备名、序列号、个人目录和私人界面截图不属于公开材料。

## 2026-10-06 上传前源码检查

在公开发布树、Windows 11 x64 / Node.js v24.14.0 上重新运行 `npm test`：
**137 项通过、0 项失败、0 项跳过**。这是同一 0.4.0 回归套件的本次重新检查，
下文历史计数保留；七项扩展实机流程没有混入自动测试数量。

`npm run check:release` 通过，检查 **70 个公开候选文件**；其中 64 个为 UTF-8
文本，六个为此前已人工审阅且本次未变的合成 demo 媒体。人工复核了新增代码、
公开验收摘要、引用和文件形态，未纳入实机截图、原始日志/trace、Office/PDF
产物、本机配置或桥接描述文件。该 scanner 仍是启发式辅助，不构成完整匿名化保证。
**186 条文档相对文件链接**全部存在，`git diff --check` 无错误。
远程 CI 结果以本次提交对应的 GitHub Actions 为准，不能由本地通过提前推断。

## 0.4.0 流程接续与单次视觉定位

- 新增完全本地的 `createWorkflow()`：按阶段独立验证，接管票据绑定实例、阶段和
  revision；`resume()` 只验证当前结果，不重放已经尝试的动作。
- 新增 grounded `prepare()` / `commit()`：Jev 从允许的语义动作中选择，Codex 在
  新截图上定位，同一票据只调用一次执行回调；AX 缺失不需要伪造控件树。
- 2026-10-05 `npm test`：**137 项通过，0 项失败**，含 workflow 26 项、grounded 23 项、
  Sky 34 项、只读验证 16 项，以及既有运行时、provider、桥接、demo、长网页和
  公开发布回归。只读验证覆盖缺少全局 `EventTarget` / `process` 的 REPL。
- 新增 `waitForVerified()`：有界等待新 AX/窗口/文件反馈，成功前再次读取 scope；
  不接受输入回调，不重放保存动作，不提前返回并遗留正在进行的读取。
- 修复 Sky 点点击未传递 `mouse_button` / `click_count`，合法按钮和次数透传；
  实机双击打开属性、右键打开菜单，非法选项与未知结果不重试由回归覆盖。
- 真实 Multisim 实机完成电阻表达式编辑、确认、保存以及三次独立验证式恢复。
  保存文件已只读解码验证 1k → 1.2k 表达式及显示值持久化；没有以哈希变化
  替代具体参数检查。元件选择器曾未响应，需要用户手动恢复；恢复后重新打开
  副本，实际属性仍为 1.2k，仿真时间前进且示波器显示周期输出，另存实际 SCP
  数据。仿真后保存一次，新只读助手核对新窗口反馈和文件时间。
  最终原生文件 863966 bytes，完整解码的 2394208-byte XML 严格解析通过，
  1.2k 表达式仍在。SCP 的实际时间和 A 列数据测得约 5kHz、0.504042V 峰峰值；
  缓存数值仍为1000，未用理论幅度比较代替求解器内部字段证明。
- 剪映 0.4.0 新草稿完成导入、加入时间线、从起点播放到末尾和本地导出。三阶段
  workflow 验证式恢复后 `done`；新 MP4 818×432、30 fps、154 个实际读取帧、
  容器 5.155011 秒，全片解码退出码 0，首中尾内容与源素材相符。
  Jev 提供语义选择，Codex 提供截图定位及文件选择器操作；未宣称 Jev 自主全流程。

实际分工、延迟更新、失败及恢复边界见
[0.4.0 接续验收记录](acceptance-fullflow-2026-10-05.md)。本地测试通过没有证明
原生服务卡死已修复，也没有为 Jev 增加视觉模型能力。

## 0.4.0 Office、AI 聊天与 Canva 实机扩展

在不改核心代码或版本的情况下，随后通过四项实际 UI 验收。新增记录见
[Office、AI 聊天与 Canva 验收](acceptance-office-ai-canva-2026-10-05.md)，适用范围见
[兼容性矩阵](COMPATIBILITY.md)。本轮没有重复运行 `npm test`；上文 **137 项通过**
属于此前自动回归结果，这四项实机检查不混作新增自动测试。

| 测试路径 | 本轮实际检查 |
| --- | --- |
| Word 16.0.20326.20158 | 新 DOCX 的三段中英文本、标题 `bold:true` 与 UI 本地保存；13,864 bytes，完整 ZIP/XML 通过 |
| Excel 16.0.20326.20158 | 仅 A1:C3；公式 `A1*B1`、`A2*B2`、`SUM(C1:C2)` 与最终缓存 50、22.5、72.5；A1 从 2 改为 4 前为 25、22.5、47.5，证明实际依赖重算 |
| Excel 保存成果 | 10,111-byte XLSX 的 12 个 XML part 完整解析；raw formula/value、formula-mode 和 data-only 三方一致；只读检查未重算写回，fixture 无公式错误或宏 |
| Edge ChatGPT 新会话 | 合成 7 × 8 请求收到含 `RCU-AI-PASS`、56 且生成已结束的回复；Jev fill 请求 551 ms，Send 为普通 CUA |
| Edge Canva 新私有设计 | 800 × 600 画布的标题字号 42、圆形、caption、移动/缩放及下载；18,164-byte PNG 解码通过。字号、移动过程与私有状态由 UI 支持，PNG 支持最终布局 |

Word 首次编号 24 click 的不明结果保留为 `needs_inspection`，fresh 检查未出现预期
变化后才坐标接续。Excel Grid AX 曾因 `child_limit` 遗漏 1025 个子节点或为 null，首次普通标签和 SUM
输入无效，后经 F2 明确进入编辑模式与 Return 普通接续；一次 `low_confidence`
没有 UI 输入且未降低 confidence floor。Canva 圆形操作的即时 verifier 因 AX 格式
预期错误返回 `failed_verification`，后续独立 AX、截图与 PNG 确认，没有重放插入。
这些首次失败没有被后续成功改写。

Canva name/title/caption 的三个本地 `runPlan()` 各 verified、各一 mutation；Jev
creation/circle 请求分别为 495/501 ms。拖移与缩放由普通 CUA 完成，当前 adapter
无 drag，grounded 候选也无 drag。本轮 12 个真实 Jev 响应（Word 4、Excel 5、
浏览器 3）为 495–584 ms，其中 low confidence 不算操作成功。请求耗时不含完整
观察、输入、交接和验证，未建立官方 Computer Use 与插件的同任务 A/B 速度倍率。

2026-10-05 这轮不覆盖其他桌面 AI、豆包、WPS、复杂 Office/宏、PDF、其他账户或
任意生产流程；部分新增限定范围见下文 2026-10-06 记录。私人 URLs、作者 metadata、截图、原始 trace、文档和下载目录未加入
公开材料；公开记录只保留合成内容、软件版本、范围、状态、计数和独立结果。

## 2026-10-06 桌面 AI、WPS 与复杂 Office 实机扩展

在同一 RCU **0.4.0** 核心上完成七项限定合成流程，本轮没有实现或版本改动。
实际后端为真实 TypeSafe Jev（`jev-1.13.0`）、官方 Sky 原生 Windows 与 Edge
官方 CUA；Jev 语义选择、Codex 新截图检查及普通 Sky/CUA 接续共同完成流程。
详细分工、保留的失败和边界见
[桌面、WPS 与复杂 Office 验收](acceptance-desktop-wps-advanced-office-2026-10-06.md)。

| 测试路径 | 实际结果与独立检查 |
| --- | --- |
| Claude 桌面 2.19675.1 | 新合成会话回复标记及 19 × 23 = 437；AX 陈旧时以新截图确认完成，普通 Sky 提交 |
| 豆包网页 / Edge CUA | 新合成请求收到完整回复标记和 221；普通 CUA Send，不能外推桌面豆包 |
| WPS 教育版 12.1.0.28043 文档 | 最终 UI 修复版三段正确；真实 Title、22pt、加粗、原蓝色底边框与两段 Normal/11pt 正文保留；34,466-byte DOCX 严格 ZIP/XML 检查通过 |
| 同版 WPS 表格 | A1 从 2 改为 4 后另存；三条原公式及实际缓存 50、22.5、72.5 通过；9,326-byte XLSX 完整检查，输入哈希保持 |
| Word 16.0.20326.20158 | 预制复杂文档只经 UI 改首段标题并居中、保存和导出 PDF；61 段、5 × 4 表、两节、四次分页、两个 PAGE 域保留；实际六页 PDF 前三页纵向、后三页横向，六页渲染检查通过 |
| Excel 16.0.20326.20158 | 100000 条数据加表头，全部 300003 个公式及真实缓存逐项检查通过；只 B2 改为 4，汇总 250002.5 / 275002.75，公式缓存从源全部空变为输出全部非空，错误数 0 |
| Excel / 实际 VBE | 导入 41 行合成标准模块、F5 一次执行、新 MacroResult 为 100000 / 250002.5 / 275002.75 / PASS；24,576-byte 嵌入 VBA 项目及唯一过程源码一致，XLSM 全量数据/公式/缓存和结果持久化通过 |

复杂 Word 结构与大型 Excel 输入由脚本预制；真实 UI 成果由应用保存。独立检查
只读解析 ZIP/XML、实际缓存、静态 VBA 和 PDF，没有计算、重算、运行宏、修复
或保存最终产物；输入与检查中的文件哈希保持。静态宏源码不单独作为运行证明，
实际 VBE 导入/F5 及新结果的 UI 记录与保存文件核对相互补充。

WPS 首次跨段选择导致段落合并及 Title 退化，旧中间文件不计最终通过。最终从
完整源重新打开，用 Ctrl+H 精确唯一标题替换并另存，真实 UI 和文件检查确认恢复。
无标题样式弹层受 Sky 窗口检查拒绝；Alt+A 被全局截图热键拦截，覆盖层已关闭。
这些限制及调用方 scope/freshness/predicate 错误保留为交接与失败，未写成核心缺陷，
未把后续成功改写为原动作通过。

WPS 文字和表格 VB 编辑器入口实际要求加载宏插件，未加载、未执行宏，也未打开
Excel XLSM，**WPS VBA 与 XLSM 宏兼容仍未验证**。修复文档截图显示缺失字体
提示，具体字体和替代字形未核验。桌面豆包/Kimi 在已查安装、开始菜单、AppX 和
候选路径中未建立可用入口，这不证明全盘不存在。ChatGPT 桌面 UI 由官方
Computer Use 工具规则排除，不能计作插件能力失败。

七个真实 Jev 响应为 **478–597 ms**，包含 low confidence、scope 拒绝和即时
验证失败，不能计为七次 UI 成功。耗时仅为请求，不包含完整流程，也没有同任务
端到端 A/B 倍率。本轮七项实机检查没有重跑自动套件，上文 137 项为此前结果；
实机项目数与自动测试数分别记录。公开文档仅保留脱敏总结，私人截图、日志、trace、
账户/本机路径、窗口 ID、descriptor/key 和实际办公产物均留在本地。

## 0.3.0 源码与原生验收

- 新增 `@oai/sky` window2 适配器，保留返回的窗口绑定、原始控件编号与结构化
  无障碍上下文；截图区域和缩放图像坐标保留区域 ID，物理屏幕坐标要求明确的
  scale。截图/image 输入要求当前 `observationId`，每次输入都消耗旧观察。
- 回归覆盖窗口/AX 返回值防篡改、空无障碍信息、无效/冲突编号、中文角色、
  独立字段替换、keysym、四种坐标空间、高 DPI、缺失尺寸、边界、旧截图、
  并发操作拒绝、scope 检查和输入失败不重放。
- 新增没有全局 `process` 的 REPL 导入与桥接协议回归，核对显式 descriptorPath
  和普通 Node CLI 默认路径。provider 凭据处理仍在终端，REPL 只读取临时桥接
  描述文件并访问本地回环地址。
- 合并公开基线后执行 `npm ci` 成功。
  `npm test`：**69 项通过，0 项失败**，包含原有 demo、发布检查和高 DPI
  回归测试。下文 0.2.2 的 24 项结果保留为历史记录。
- `npm run check:release`：**通过，检查 58 个公开文件**。检查范围仍是常见
  凭据格式、私人目录、配置、桥接描述文件、运行产物和媒体白名单；这是启发式
  检查，不能证明所有敏感内容都已被识别。`git diff --check` 无错误。

真实原生验收通过现有 Computer Use 服务，在实际 Windows 软件中执行。它包含
十次真实 TypeSafe 响应，返回模型标识为 `jev-1.13.0`；provider 响应与应用动作
分别核对，模型给出决策本身不计为操作成功。完整范围见
[原生验收记录](acceptance-native-2026-10-05.md)。

| 路径 | 本次观察结果与分工 |
| --- | --- |
| Multisim 样例打开 | Jev 选择 Ctrl+O；Codex/普通 Sky 完成文件选择器，打开独立入门样例副本 |
| Multisim 电阻修改 | Jev 的 indexed `set_value`/click 未成功；从新状态交接普通 Sky，将 R3 从 1 kΩ 改为 1.2 kΩ |
| 修改后仿真 | Jev 选择 F5 并成功运行；示波器实际显示周期波形。没有用文档预期替代现场结果，也不宣称元件库放置已通过 |
| 剪映播放 | Jev 选择 Space，实际播放到片尾；导入与时间线放置由普通 Sky 完成 |
| 剪映本地导出 | 普通 Sky 完成导出。实际 MP4 为 818 × 432、30 fps、154 帧，容器时长 5.155011 秒；ffmpeg 完整解码退出码 0 |

这是限定动作与普通 Computer Use 交接的验收，没有证明整套流程由 Jev 自主
完成，没有证明任意应用、所有窗口/模态框或所有 indexed 控件都能操作。失败
输入没有自动重放；Jev 的操作失败与后续普通 Sky 成功分别记录。十次响应不构成
提供商持续可用、其他账户、计费或其他路由的保证。OpenRouter 尚无本次真实验收。

## 0.2.2 源码检查

- `npm ci --omit=dev --ignore-scripts`：按锁文件安装两个纯 JavaScript 依赖。
- `npm test`：**24 项通过，0 项失败**。覆盖运行时、提供商协议模拟、回环桥接、
  三项长页面测试、三项合成演示站测试和七项发布检查测试。
- 缩放回归测试核对每一行的文档位置，包含明显等比例缩放，以及图片宽度恰好等于
  `clientWidth` 的整数取整情形；真正截断的视口被拒绝，并验证滚动位置恢复。
- `npm run check:release`：检查 Git 公开文件清单的常见凭据格式、私人用户目录、
  配置、桥接描述文件和运行产物。媒体只允许六个明确路径，并校验格式签名与大小。
  这是启发式检查，配合文本和图片人工审阅，不能证明所有可能的敏感信息已被识别。
- 公开文档相对链接与 `git diff --check` 已检查。

CI 矩阵为 Windows/Ubuntu × Node 22/24。远程实际状态以
[GitHub Actions](https://github.com/Steven2007yhq/Reinforced-Computer-use-in-Codex/actions)
为准。Ubuntu 模拟测试通过不构成 Linux 原生界面兼容证明。

## 实际浏览器演示

这次使用 Codex 已有的 **CUA 浏览器标签页**访问本地回环合成网页，通过插件
`runPlan()` 点击观察到的 `Long page`，再用 `captureLongPage()` 捕获。没有调用
真实 Jev，没有另启自动化浏览器，没有使用原生桌面接口。

| 检查项 | 实际结果 |
| --- | --- |
| 本地计划 | `done`，一次点击，零次 Jev 决策 |
| CSS 完整视口 | 1057 × 660；内容宽度 1042 |
| 原始截图 | 1042 × 651，包含缩小后的滚动条 |
| 归一化 | 恢复 CSS 视口坐标后裁掉 15 CSS px 滚动条区域 |
| 文档高度 / PNG 高度 | 7946 / 7946 |
| PNG 宽度 | 1042 |
| 几何高度覆盖率 | 1，即本次 100% |
| 捕获滚动 / 到底状态 | 15 次 / `reachedBottom:true` |
| 结束位置 | 恢复顶部，`scrollY:0` |
| 图片检查 | `LONG_01` 到 `LONG_12` 按顺序出现，页脚 `END_OF_LONG_PAGE` 可见；未见此前重复文字行 |

本次检查发现旧拼接逻辑把缩小后的图片按原始 CSS 滚动位置拼接，导致接缝重复。
0.2.2 增加 `window.innerWidth` 测量、等比例缩放识别、像素归一化和滚动条裁切，
对无法匹配支持模型或途中尺寸改变的截图报错。`screenshotNormalization` 返回处理
参数。几何覆盖率不等于所有页面的图像质量保证，仍需核对内容、接缝、顶部和底部。
独立核对全部 15 处接缝未见旧的重复文字；相邻截图仍可能有约 1 像素的整数取整和
重采样差异，归一化输出不声称保留原始像素的逐字节一致性。

公开的 [完整 PNG](assets/demo-full.png)、[首个视口](assets/demo-top.png)与
[最后视口](assets/demo-bottom.png)来自实际合成页面捕获。GIF/MP4 使用一个实际首页
截图与这次 16 个长页视口组成 17 张截图序列，经过时长编辑和等比例展示缩放。
MP4 长度 **30.000 秒**，没有音轨。**这不是实时录像或速度基准测试。**
分享卡片是 AI 生成插图；来源和最终提示词见 [MEDIA.md](MEDIA.md)。

## 0.2.1 安装器检查

Windows 安装器在初始公开版本准备期间完成隔离模拟：PowerShell 7.6.5 和 Windows
PowerShell 5.1 各 **10/10 项通过**。覆盖白名单复制、排除 Git/配置/临时文件、
方括号路径、备份字节、保留无关 marketplace 内容、无 BOM、拒绝覆盖目标、
Node/CLI 预检查、根目录冲突与格式解析。使用隔离用户目录与模拟命令，没有调用
真实 Codex 安装命令，也没有修改开发设备的个人 marketplace。

0.2.2 未改变安装器逻辑。此前 v0.2.1 的 Windows/Ubuntu × Node 22/24 四项 CI
均通过，见[初始检查](https://github.com/Steven2007yhq/Reinforced-Computer-use-in-Codex/actions/runs/37288147129)。

## 历史与仍未验证的范围

0.2.0 在 2026-09-24 的本地记录包括合成 frame 路径、上传/下载、模拟登录与验证码
交接，以及 MDN 搜索/导航。自适应路径使用本地模拟决策客户端；旧长图的高度记录
不能证明接缝连续，不能延伸为任意页面的质量或覆盖率保证。

0.2.2 发布时没有真实 Jev 原生验收；0.3.0 增加了上文限定范围的 TypeSafe 请求与
原生操作。**完整生产网站业务流程、OpenRouter 真实调用与原生应用普遍兼容
仍未验证。** 历史 Multisim 元器件选择器曾阻塞；本次使用完整样例副本并修改
已有电阻后运行，不证明元件库搜索、新电路放置或完整自动布线已经通过。
Windows 10、ARM64、macOS/Linux 部署和原生 UI 也未完成设备验收。

Version 0.2.2 passed 24 mock/fixture tests and an actual synthetic local
CUA browser demo. The final stitched PNG is 1042 × 7946 with all twelve markers
and the footer visible. Its 100% geometric height coverage is specific to this
capture; the edited 30-second preview does not measure speed. Version 0.3.0 adds
ten live TypeSafe responses and scoped native Multisim/Jianying Pro actions with
explicit ordinary Codex/Sky handoffs. It does not establish autonomous end-to-end
operation, production workflows, OpenRouter access, arbitrary native application
compatibility, or other desktop deployments. The merged 0.3.0 source passed 69
tests with no failures; the heuristic release check passed for 58 public files.
