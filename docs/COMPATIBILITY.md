# 兼容性与设备要求

本插件优先适配 Windows。**当前已验证的开发环境为 Windows 11 x64，Node.js v24.14.0；源码声明要求 Node.js 22 或更高版本。** 这里的环境验证不意味着每个 Windows 应用或所有 Codex 版本都经过端到端测试。具体测试结果与限制见 [VERIFICATION.md](VERIFICATION.md)。

## 设备与操作系统

| 环境 | 当前说明 |
| --- | --- |
| Windows 11 x64 桌面或笔记本 | 已验证的开发环境；提供 Windows PowerShell 安装器。实际界面能力取决于启用的浏览器或原生 Computer Use 接口 |
| Windows 10 | 未验证，不能由 Windows 11 的结果推定兼容 |
| Windows on ARM / ARM64 | 未验证，未测试原生或模拟执行 |
| macOS | 未验证；源码中存在平台分支，但没有提供已验收的安装流程 |
| Linux | 未验证；源码中存在平台分支，但没有提供已验收的安装流程 |
| Android / iOS 手机或平板 | 不支持作为本插件的部署目标 |

没有测量 CPU 型号、最低内存、GPU 型号或 VRAM 下限，不应把某台开发设备的规格当成硬件要求。Jev 自适应模式调用云端接口，本插件不进行本地 Jev 模型推理。长网页拼图会使用本机内存；默认 6000 万像素上限控制是否拼接，超过时改为输出分段图片，并不构成全进程内存上限。

## 必须已经可用的 Codex 能力

插件只调用现有 Computer Use 接口，不能安装或启用这些能力，也不能解除当前环境的接口限制。原生 Windows 初始化入口是在 `node_repl` 导入 `@oai/sky`，从 `list_windows()` 或 `list_apps()` 选择唯一返回窗口，再用 `createSkyTarget()` 适配。原有原生 CUA app target 在对应接口可用时仍受支持；浏览器仍使用现有 CUA 标签页。0.4.0 的多阶段与截图接续模块在这些已存在的接口之上组织本地流程，不提供新的桌面权限或视觉模型。

| 工作类型 | 所需条件与边界 |
| --- | --- |
| 浏览器标签页 | 已启用的 Codex Computer Use 浏览器接口，且目标标签页可以通过该接口绑定；浏览器访问范围、账户和来源必须可确认 |
| 原生 Windows 应用 | 已启用的 `@oai/sky` window2 服务及 `node_repl`，能绑定确切的返回窗口并提供所需状态与输入；也保留现有原生 CUA target 的兼容路径 |
| Windows 原生滚动 | 上述原生接口；调用方在新截图上确定坐标。批处理滚动使用已检查的稳定 window 点，截图/image 点必须匹配当前观察编号 |
| 本地 `runPlan()` | 可读取的界面状态、窄范围动作列表、本地验证器；不要求 Jev API 密钥 |
| Jev `runAdaptive()` | 本地模式所需的 Computer Use 能力，以及明确允许分享规划元数据、提供商配置、有效密钥、联网和短期本地桥接进程 |
| 原生截图动作接续 | 支持真实新截图与输入的原生接口、Codex 已观察/允许的语义候选动作、明确的规划分享和本地桥接；Jev 选动作，Codex 重新定位同一动作后单次执行，不要求 AX 编号 |
| `createWorkflow()` 多阶段流程 | 每次返回新真实观察的 `observe`、严格布尔 scope/阶段/最终验证器，以及具体软件的已授权本地执行回调；模块本身不操作 UI、不调用 provider、不保存素材 |
| `waitForVerified()` 延迟反馈 | 已尝试输入后的新鲜只读观察、严格布尔 scope/结果谓词；只轮询，不输入、不重放、不调用 provider，调用方须保持回调只读 |
| 长网页截图 | 已选中的浏览器标签页支持 `screenshot`、`scroll`、必要的 `pressKey`，以及读取页面尺寸/滚动位置的 `playwright.evaluate` |

**只有浏览器 CUA 可用的 Codex 环境，只能使用对应的浏览器功能。** 原生桌面接口缺失或被禁用时，原生操作不可用；插件不会通过操作系统事件注入、私有接口或额外自动化浏览器绕过这个限制。

未指定经验证的最低 Codex 版本。安装前需要确认本机支持 `codex plugin add`、本地 marketplace 注册和当前技能使用的 Computer Use 接口；Node.js 版本满足要求本身无法证明这些能力存在。

provider 与 bridge client 可以在没有全局 `process` 的 REPL 中导入。Windows `%APPDATA%` 不一定在受限 REPL 中可读，因此桥接客户端应传入终端实际报告的 descriptorPath；不能以导入成功推定默认路径就是该机器的配置路径。provider 配置、CLI 和 API 密钥处理仍留在终端，详见 [Jev setup](../skills/reinforced-computer-use/references/jev-setup.md)。

0.4.0 的只读延迟验证 helper 兼容没有全局 `EventTarget` 或 `process` 的 REPL，使用已提供的 `AbortSignal` 完成取消和监听清理。该兼容修复不保证原生读取能被强行中断：`waitForVerified()` 会等待正在执行的只读回调结束，不放弃读取后另开重试；底层不响应取消时可以超过预算。详见[只读验证](../skills/reinforced-computer-use/references/read-only-verification.md)。

## 网页和应用边界

AX 运行时依据可访问性树中的标签和角色建立候选动作。控件没有可访问性标签、标签重复、树被截断或布局发生变化时，必须回到普通 Computer Use 检查。画布、拖放、图形判断及文件选择器不应强行套用编号快速循环。弱 AX 或 AX 为 null 的应用可使用 [grounded `prepare()`/`commit()`](../skills/reinforced-computer-use/references/grounded-actions.md)：Codex 先观察并限定语义动作，Jev 从中选择，Codex 再检查新截图并定位同一个动作。该路径不把截图发送给 Jev，也不从像素生成 AX 编号。

Sky 原生适配保留控件编号；缺少 AX、冲突编号、窗口绑定变化、过期截图或输入结果不确定时，明确交回检查，不从像素生成虚构编号，不自动重放失败输入。物理 screen 坐标需要明确已知的 scale；截图/image 坐标保持所选区域的局部坐标和 ID。适配器没有自动识别所有监视器的 DPI，也不自动重绑不同窗口或模态框。

点点击的 `mouse_button` 支持官方 `left/right/middle/l/r/m` 拼写，`click_count` 接受正安全整数并原样传入 Sky；省略时保留服务默认值，非法值在输入前拒绝。实际 Multisim 右键菜单和 `click_count:2` 重开属性框已验收，不能由此推定任意软件的全部点击行为。

[多阶段 workflow](../skills/reinforced-computer-use/references/workflow.md) 保存阶段进度和本地交接能力。每个阶段的执行回调只尝试一次；`resume()` 重新观察并验证当前阶段，不将交接视为允许重放的标志。菜单、文件选择器、属性框或编辑器若是不同窗口，调用方须重新枚举、确认并绑定其确切 Window。父窗口的 AX 中出现控件不等于该控件编号可对另一窗口执行。视频播放、画布变化或导出结果应使用对应的独立截图/文件验证，不能仅依据 AX 文本变化或模型 DONE。

具体软件的本地导入、路径填写、时间线操作、导出、元件编辑与仿真仍需有范围的业务回调和实际结果检查。敏感/外部动作、Enter/Delete/Windows 键的原有检查保留，两个新模块都不会扩大权限或让 Jev 独立理解视觉界面。0.3.0 的历史验收不能作为新增 0.4.0 接续路径的实机验证。

使用 `createSession()` 的浏览器会话必须配置 `allowedOrigins`。跨源 iframe 还需要在 `allowedFrameOrigins` 列出确切来源；无法确定子框架来源时应交还 Codex。grounded/workflow 回调不会自动绑定标签页或继承这些来源限制，调用方须保留真实 CUA tab 并检查 URL、账户和当前业务范围；`targetName` 只是规划元数据。生产网站的登录状态、A/B 界面、语言、弹窗、虚拟列表和嵌套滚动区域都会影响效果，本地测试页面通过不代表这些情形都已适配。

长网页截图从页面顶部开始，通过视口捕获避免已观察到的 Windows 高 DPI 长截图异常。页面在捕获中增高、出现覆盖层或滚动区域并非文档滚动时，可能失败或需要人工检查。请按返回的高度和覆盖率核对结果，并查看图片顶部和底部。

## 0.3.0 原生样例验收范围

| 软件 / 路径 | 已观察到的行为 | 边界 |
| --- | --- | --- |
| 7-Zip 25.01 (x64) | 原生状态、编号控件、准备字段替换、组合键、选定截图区域与缩放图片坐标操作 | 测试过的本地路径；物理 `screenScale` 由契约测试覆盖；不保证所有对话框或即时 AX 更新 |
| NI Multisim 14.3.3 | 打开独立完整样例，普通 Sky 修改 R3，Jev F5 运行后示波器显示周期波形 | Jev indexed 编辑/点击曾失败；文件选择与电阻修改有普通 Sky 交接，历史元件库问题未由此宣告解决 |
| 剪映专业版 11.5.0.14471 | Jev Space 播放；普通 Sky 导入、放入时间线并导出可完整解码的本地 MP4 | 无整套流程自主执行承诺，不涉及用户既有工程或生产账户流程 |

这些结果通过现有 Computer Use 服务取得，需把 provider 响应、输入成功和独立应用结果分别核对。详细分工、失败和媒体检查见 [原生验收记录](acceptance-native-2026-10-05.md)；最终公开源码检查见 [VERIFICATION.md](VERIFICATION.md)。

## 0.4.0 混合全流程验收范围

本次在上述 Windows 环境中通过两个限定样例的 Jev＋Codex 混合端到端验收，与 0.3.0 的历史动作记录分别保存。Jev 选择有范围的语义动作，Codex 仍负责截图检查、定位、实际输入、必要交接与软件业务逻辑。完整分工和结果见[全流程验收记录](acceptance-fullflow-2026-10-05.md)。

| 软件 / 路径 | 已观察到的结果 | 保留的边界 |
| --- | --- | --- |
| NI Multisim 14.3 | 保存并重开后 R1 属性显示 1.2 kΩ；真实 Run 有波形，SCP 数据支持约 5 kHz / 0.504 Vpp；双击重开属性、右键打开原生菜单 | indexed 操作失败与延迟反馈记录保留；理论比较仅为合理性检查，不证明求解器如何使用内部缓存；未选择右键菜单修改项 |
| 剪映专业版 11.5.0.14471 | 独立样本导入、时间线放置、播放与新导出完成；实际 MP4 为 818 × 432、30 fps、154 帧、5.155011 秒，完整解码退出码 0 | 含 Jev 决策和 Codex 定位/业务回调，不代表 Jev 视觉自主、用户既有项目或生产账户流程均适用 |

验收期间发生过元件选择器无响应并影响原生服务交互，后续验收在恢复后完成。这个卡顿没有由插件解决，也不能以两个样例通过保证其他软件或对话框不会复现。`waitForVerified()` 只等待延迟只读反馈，不修复卡死的窗口或服务；截图-only 结果仍须在独立观察 cell 后由 Codex 检查。

## 0.4.0 Office、AI 聊天与 Canva 扩展验收

同一 0.4.0 核心随后完成下列四项限定实机验收；没有为这些软件新增专用适配器，也未改代码或版本。具体动作分工、首次失败、低置信度和独立成果检查见[扩展验收记录](acceptance-office-ai-canva-2026-10-05.md)。

| 软件 / 已测试范围 | 实际结果 | 保留的边界 |
| --- | --- | --- |
| Microsoft Word 16.0.20326.20158，新本地 DOCX | 三段中英文本、标题粗体及 UI 保存；13,864-byte DOCX 完整 ZIP/XML 验证通过 | 首次 indexed click 返回 `needs_inspection`，fresh 检查后改用坐标接续；该轮未测复杂排版、修订、宏或云协作 |
| Microsoft Excel 16.0.20326.20158，仅 A1:C3 | 两个乘法公式和 SUM；A1 从 2 改为 4 后 C1 实际重算为 50、总计 72.5；10,111-byte XLSX 原始公式/缓存与独立只读视图一致 | Grid AX 截断或 null，部分首次输入无效，F2/Return 普通 Computer Use 接续；一次 low confidence 无输入，未降低阈值；该轮未测复杂工作簿或宏 |
| Microsoft Edge 中的 ChatGPT 新合成会话 | 7 × 8 请求得到含 `RCU-AI-PASS` 和 56 的完整回复 | Jev 选择输入填写，Send 由普通 CUA 完成；未测其他网页/桌面 AI、附件或生产对话流程 |
| Microsoft Edge 中的 Canva 新私有 800 × 600 画布 | 标题字号 42、圆形、caption、移动/缩放和 PNG 下载；18,164-byte PNG 完整解码通过 | name/title/caption 为三次本地单 mutation 计划；拖动为普通 CUA。圆形即时 verifier 的 AX 格式不符保留为失败，后续检查确认且未重放；未测分享/发布或其他设计流程 |

Sky adapter 没有 drag 方法，grounded 候选也只支持 `click/fill/scroll/key`。Canva 的实际拖移与缩放由现有 CUA 完成，不能据此宣称 Jev 或适配器新增了拖动支持。Word 正文和 Excel 网格也不是通用 indexed editable 字段；可使用的编辑入口必须由真实新 AX 或截图检查确认。

2026-10-05 这轮 12 个真实 Jev 响应（Word 4、Excel 5、浏览器 3）的请求耗时为 495–584 ms；其中 Excel 一次 low confidence 没有输入，不计为 UI 成功。未做相同任务的官方 Computer Use 对比基线，不提供加速倍率。已有 137 项自动测试结果保留为此前回归证据，这轮四项实机检查没有重复运行或增加自动测试计数。该日期尚未覆盖其他桌面 AI、豆包、WPS、复杂 Office/宏与 PDF；次日的新增限定范围见下文。

## 2026-10-06 桌面、WPS 与复杂 Office 扩展范围

同一 RCU 0.4.0 核心在 Windows 11 x64 上通过七项限定合成流程，没有为本轮
新增实现。实际使用真实 TypeSafe Jev `jev-1.13.0`、官方 Sky 原生 Windows 和
Edge 官方 CUA；Codex 负责新截图检查、实际定位、普通输入接续及独立成果核对。
详细经过见[桌面、WPS 与复杂 Office 验收](acceptance-desktop-wps-advanced-office-2026-10-06.md)。

| 软件 / 已测试范围 | 实际结果 | 兼容性边界 |
| --- | --- | --- |
| Claude 桌面 2.19675.1，新合成聊天 | 完整回复测试标记及 19 × 23 = 437 | 发送为普通 Sky，陈旧 AX 后以新截图确认；不保证任意会话、其他版本或其他桌面 AI |
| 豆包网页 / Microsoft Edge | 新合成请求完整回复测试标记和 221 | 实际为网页，普通 CUA Send；未建立桌面豆包验收 |
| WPS 教育版 12.1.0.28043，三段 DOCX | UI 修复并另存后的 Title/22pt/加粗、蓝色底边框和两段 Normal/11pt 正文通过独立检查 | 旧中间格式回归保留；无标题弹层受窗口绑定限制，Alt+A 曾被全局热键拦截；缺失字体提示涉及的具体字体和替代未核验 |
| 同版 WPS，小 XLSX | A1 改为 4，三条公式及实际保存缓存 50、22.5、72.5 通过 | 当前 VB 编辑器入口要求加载宏插件；未加载或执行宏，未测 XLSM 宏兼容 |
| Word 16.0.20326.20158，预制复杂 DOCX 与 PDF | UI 改首段标题并居中、保存及真实导出；61 段、5 × 4 表、两节保留；六页 PDF 前三纵向、后三横向，逐页渲染查看通过 | 已有复杂结构被保留；未证明从空白 UI 创建全部版式，未测任意修订或云协作 |
| Excel 16.0.20326.20158，100000 条数据加表头 | UI 修改 B2 后计算保存；全部 300003 个公式与实际缓存通过，汇总 250002.5 / 275002.75 | 源缓存全部空，验证器只读；不保证任意规模、公式类型、外部链接或图表 |
| 同版 Excel / 实际 VBE，41 行合成 VBA | 实际导入、F5 一次执行、新 MacroResult PASS；保存 XLSM 的源码嵌入、全量公式/缓存和结果持久化通过 | 普通 Sky/RCU adapter 执行，非 Jev 自主宏运行；未改安全设置，不保证任意生产宏或 WPS 宏兼容 |

独立检查没有重算、修复或保存最终 Office 文件；输入和检查中的文件哈希保持。
七项工作流通过与七个 provider 响应是不同计数：478–597 ms 的响应包含低置信度
和失败/交接，不等于七次 UI 成功，也不提供端到端加速倍率。本轮没有重跑自动
测试，不把实机项目数加到此前 137 项回归结果。

桌面豆包和 Kimi 只在已查安装记录、开始菜单、AppX 和候选路径中未发现可用
入口，这不是全盘不存在证明。ChatGPT 桌面 UI 因官方 Computer Use 工具规则
排除，属于验收范围限制。上述通过仍要求实际软件版本、对应执行接口和新观察
可用；WPS 宏、字体环境完整性、其他版本与任意生产流程不由这些样例保证。

## 提供商与检查结果

源码包含 TypeSafe 和 OpenRouter 的 Jev 路由。2026-10-05 的 0.3.0 历史限定验收记录了十次真实 TypeSafe 响应，返回模型标识 `jev-1.13.0`；新增 0.4.0 请求和混合流程见独立全流程记录，不能把旧十次作为新路径的全部计数。OpenRouter 尚无本次真实验收。接口存在、账户权限、模型可用性、价格、额度和地区限制依提供商而变化，历史成功请求不保证这些条件持续成立。可查看 [TypeSafe API 文档](https://docs.typesafe.ai/api)、[OpenRouter Jev 说明](https://openrouter.ai/blog/insights/what-is-jev/) 和 [模型页面](https://openrouter.ai/~typesafe/jev-latest)。

`doctor.mjs` 只检查 Node 版本、配置读取和密钥是否达到存在条件，不调用提供商，也不检查 CUA 可用性。模拟决策器测试证明本地协议和控制逻辑的部分行为，不能证明真实云端调用成功。以 [验证记录](VERIFICATION.md) 所列范围判断已覆盖的能力。

`latencyMs` 由 provider 客户端测量请求往返耗时，不是服务端返回的计算时间。它也不等于含启动、界面观察、输入、验证和 Codex 接续的全流程时间。workflow 的 callback 计数、RCU 输入/决策计数和 provider 请求计数应分别报告；这些字段不提供通用加速倍率。
