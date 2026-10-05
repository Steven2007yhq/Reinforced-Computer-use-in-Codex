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

插件只调用现有 Computer Use 接口，不能安装或启用这些能力，也不能解除当前环境的接口限制。0.3.0 的原生 Windows 初始化入口是在 `node_repl` 导入 `@oai/sky`，从 `list_windows()` 或 `list_apps()` 选择唯一返回窗口，再用 `createSkyTarget()` 适配。原有原生 CUA app target 在对应接口可用时仍受支持；浏览器仍使用现有 CUA 标签页。

| 工作类型 | 所需条件与边界 |
| --- | --- |
| 浏览器标签页 | 已启用的 Codex Computer Use 浏览器接口，且目标标签页可以通过该接口绑定；浏览器访问范围、账户和来源必须可确认 |
| 原生 Windows 应用 | 已启用的 `@oai/sky` window2 服务及 `node_repl`，能绑定确切的返回窗口并提供所需状态与输入；也保留现有原生 CUA target 的兼容路径 |
| Windows 原生滚动 | 上述原生接口；调用方在新截图上确定坐标。批处理滚动使用已检查的稳定 window 点，截图/image 点必须匹配当前观察编号 |
| 本地 `runPlan()` | 可读取的界面状态、窄范围动作列表、本地验证器；不要求 Jev API 密钥 |
| Jev `runAdaptive()` | 本地模式所需的 Computer Use 能力，以及明确允许分享规划元数据、提供商配置、有效密钥、联网和短期本地桥接进程 |
| 长网页截图 | 已选中的浏览器标签页支持 `screenshot`、`scroll`、必要的 `pressKey`，以及读取页面尺寸/滚动位置的 `playwright.evaluate` |

**只有浏览器 CUA 可用的 Codex 环境，只能使用对应的浏览器功能。** 原生桌面接口缺失或被禁用时，原生操作不可用；插件不会通过操作系统事件注入、私有接口或额外自动化浏览器绕过这个限制。

未指定经验证的最低 Codex 版本。安装前需要确认本机支持 `codex plugin add`、本地 marketplace 注册和当前技能使用的 Computer Use 接口；Node.js 版本满足要求本身无法证明这些能力存在。

provider 与 bridge client 可以在没有全局 `process` 的 REPL 中导入。Windows `%APPDATA%` 不一定在受限 REPL 中可读，因此桥接客户端应传入终端实际报告的 descriptorPath；不能以导入成功推定默认路径就是该机器的配置路径。provider 配置、CLI 和 API 密钥处理仍留在终端，详见 [Jev setup](../skills/reinforced-computer-use/references/jev-setup.md)。

## 网页和应用边界

运行时依据可访问性树中的标签和角色建立候选动作。控件没有可访问性标签、标签重复、树被截断或布局发生变化时，必须回到普通 Computer Use 检查。画布、拖放、图形判断及文件选择器不应强行套用快速循环。

Sky 原生适配保留控件编号；缺少 AX、冲突编号、窗口绑定变化、过期截图或输入结果不确定时，明确交回检查，不从像素生成虚构编号，不自动重放失败输入。物理 screen 坐标需要明确已知的 scale；截图/image 坐标保持所选区域的局部坐标和 ID。适配器没有自动识别所有监视器的 DPI，也不自动重绑不同窗口或模态框。

浏览器会话必须配置 `allowedOrigins`。跨源 iframe 还需要在 `allowedFrameOrigins` 列出确切来源；无法确定子框架来源时应交还 Codex。生产网站的登录状态、A/B 界面、语言、弹窗、虚拟列表和嵌套滚动区域都会影响效果，本地测试页面通过不代表这些情形都已适配。

长网页截图从页面顶部开始，通过视口捕获避免已观察到的 Windows 高 DPI 长截图异常。页面在捕获中增高、出现覆盖层或滚动区域并非文档滚动时，可能失败或需要人工检查。请按返回的高度和覆盖率核对结果，并查看图片顶部和底部。

## 0.3.0 原生样例验收范围

| 软件 / 路径 | 已观察到的行为 | 边界 |
| --- | --- | --- |
| 7-Zip 25.01 (x64) | 原生状态、编号控件、准备字段替换、组合键、选定截图区域与缩放图片坐标操作 | 测试过的本地路径；物理 `screenScale` 由契约测试覆盖；不保证所有对话框或即时 AX 更新 |
| NI Multisim 14.3.3 | 打开独立完整样例，普通 Sky 修改 R3，Jev F5 运行后示波器显示周期波形 | Jev indexed 编辑/点击曾失败；文件选择与电阻修改有普通 Sky 交接，历史元件库问题未由此宣告解决 |
| 剪映专业版 11.5.0.14471 | Jev Space 播放；普通 Sky 导入、放入时间线并导出可完整解码的本地 MP4 | 无整套流程自主执行承诺，不涉及用户既有工程或生产账户流程 |

这些结果通过现有 Computer Use 服务取得，需把 provider 响应、输入成功和独立应用结果分别核对。详细分工、失败和媒体检查见 [原生验收记录](acceptance-native-2026-10-05.md)；最终公开源码检查见 [VERIFICATION.md](VERIFICATION.md)。

## 提供商与检查结果

源码包含 TypeSafe 和 OpenRouter 的 Jev 路由。2026-10-05 的限定验收记录了十次真实 TypeSafe 响应，返回模型标识 `jev-1.13.0`；OpenRouter 尚无本次真实验收。接口存在、账户权限、模型可用性、价格、额度和地区限制依提供商而变化，历史成功请求不保证这些条件持续成立。可查看 [TypeSafe API 文档](https://docs.typesafe.ai/api)、[OpenRouter Jev 说明](https://openrouter.ai/blog/insights/what-is-jev/) 和 [模型页面](https://openrouter.ai/~typesafe/jev-latest)。

`doctor.mjs` 只检查 Node 版本、配置读取和密钥是否达到存在条件，不调用提供商，也不检查 CUA 可用性。模拟决策器测试证明本地协议和控制逻辑的部分行为，不能证明真实云端调用成功。以 [验证记录](VERIFICATION.md) 所列范围判断已覆盖的能力。
