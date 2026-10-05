# Reinforced Computer Use for Codex

[English](README.md) · [简体中文](README.zh-CN.md)

**让 Codex 连续完成多步界面操作和长网页截图，每步重新观察界面，最后验证结果。** 这是 Windows 优先的 Codex 插件，默认执行限定范围的本地计划，**无需 API Key**；需要按当前界面选择下一步时，可选接入 Jev。

[![版本](https://img.shields.io/badge/version-0.3.0-blue)](package.json)
[![CI](https://github.com/Steven2007yhq/Reinforced-Computer-use-in-Codex/actions/workflows/ci.yml/badge.svg)](https://github.com/Steven2007yhq/Reinforced-Computer-use-in-Codex/actions)
[![Node](https://img.shields.io/badge/Node.js-22%2B-43853d)](package.json)
[![MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

![本地演示：打开合成长页面，捕获并检查首尾章节](docs/assets/demo-preview.gif)

*这是本地合成测试页的截图编辑序列，不是实时录屏，也不用于证明执行速度；演示不调用 Jev。见[复现步骤和验证记录](docs/DEMO.zh-CN.md)，以及捕获的[首个](docs/assets/demo-top.png)和[最后一个](docs/assets/demo-bottom.png)视口。*

**从这里开始：** [安装与首次使用](docs/GETTING_STARTED.zh-CN.md) · [复现演示](docs/DEMO.zh-CN.md) · [常见问题](docs/TROUBLESHOOTING.zh-CN.md) · [版本发布](https://github.com/Steven2007yhq/Reinforced-Computer-use-in-Codex/releases)

## 可以做什么

| 功能 | 示例 | 所需条件 |
| --- | --- | --- |
| **限定范围的本地流程** | 根据已观察到的控件标签依次打开页面，再检查目标页面 | 已启用的 Computer Use 接口；不需要 Jev 账户或密钥 |
| **Sky 原生 Windows 适配** | 绑定确切的返回窗口，转换窗口状态、控件编号、截图坐标和按键格式 | `node_repl` 已提供 `@oai/sky` window2 服务；编号流程需要可用的无障碍文本 |
| **长网页截图** | 滚动已选中的标签页，拼接视口截图，检查首尾章节 | 浏览器接口支持截图、滚动、键盘及只读页面尺寸查询 |
| **可选 Jev 决策** | 界面出现分支时，从限定动作中选择下一步 | 提供商配置、有效密钥、本地桥接进程，以及明确允许分享规划元数据 |

Codex 负责目标、授权、准备文本、视觉判断和最终验收。插件限制操作次数与时间，并检查任务范围。识别到敏感控件、状态不确定或验证失败时，会交还 Codex 检查。标签规则只是辅助检查，无法识别所有重要行为，也不替代当前 Computer Use 的权限策略。

“Reinforced” 是项目名称。本仓库提供执行辅助模块，不训练或分发强化学习模型；没有测量可推广到所有任务的加速倍数。

## 先确认设备条件

已验证的开发环境为 **Windows 11 x64 / Node.js 24.14.0**，源码要求 **Node.js 22 或更高版本**。还需要 Git、npm、PowerShell，以及支持本地插件 marketplace 和 `codex plugin add` 的 Codex 安装。

**当前 Codex 聊天必须已经提供 Computer Use。安装插件不会启用这些接口。** 浏览器流程需要已启用的浏览器接口；新增的原生 Windows 路径通过 `node_repl` 中的 `@oai/sky` window2 客户端绑定一个确切的返回 `Window`。原有原生 CUA app target 在对应接口可用时仍受支持。

| 设备 / 平台 | 当前情况 |
| --- | --- |
| Windows 11 x64 桌面、笔记本 | 主要开发平台；实际操作能力取决于可用的浏览器或原生 Computer Use 接口 |
| Windows 10、Windows ARM64、macOS、Linux | 尚未完成部署与原生界面验收 |
| Android / iOS 手机、平板 | 不支持作为部署目标 |

Jev 通过云端提供商运行，本插件不需要用于本地 Jev 推理的 GPU。CPU、内存、GPU、VRAM 最低要求没有实测。完整条件见[兼容性与设备要求](docs/COMPATIBILITY.md)。

## Windows 安装

在 PowerShell 中执行：

```powershell
git clone https://github.com/Steven2007yhq/Reinforced-Computer-use-in-Codex.git
cd Reinforced-Computer-use-in-Codex
npm ci --omit=dev --ignore-scripts
.\scripts\install-windows.ps1
```

先安装依赖，再运行安装器。安装器将公开包内容及两个截图依赖复制到当前用户的插件目录，登记本地 marketplace，然后调用 Codex 插件安装命令。已有 marketplace 内容会保留并备份；目标目录已存在或 marketplace 根目录冲突时会停止，便于先检查冲突。

完成后重启 Codex，并开启新聊天。逐步检查和安装细节见[安装与首次使用](docs/GETTING_STARTED.zh-CN.md)。

## 试用无需 Key 的演示

在源码目录启动演示页，并保留该终端：

```powershell
npm run demo
```

在已加载插件且浏览器 Computer Use 可用的新 Codex 聊天中，粘贴：

> 使用 Reinforced Computer Use 的本地 runPlan 模式，不接入 Jev。在 Computer Use 浏览器中打开 http://127.0.0.1:4318/，观察页面后点击确切的“Long page”链接，确认目标页面出现 LONG_01。将该长页面捕获为 PNG，保存到本聊天工作区的输出目录。检查保存的图片中 LONG_01 到 LONG_12 按顺序出现，底部包含 END_OF_LONG_PAGE。报告 helper 返回的文档高度、捕获高度和覆盖率。若缺少所需 Computer Use 接口，请停止并说明。

页面使用合成内容，不要求登录或提供商密钥。仅启动本地服务器还没有运行插件：Codex 任务需要通过已选中的 CUA 标签页使用 `runPlan()` 和 `captureLongPage()`。[演示说明](docs/DEMO.zh-CN.md)提供完整提示词、端口调整、预期标记和验证范围。

## 选择执行方式

允许步骤已知时使用 **`runPlan()`**；需要 Jev 在当前允许动作中选择下一步时使用 **`runAdaptive()`**。单次操作、视觉判断、画布、拖放、文件选择器、没有可访问性信息的控件和重要的最终提交步骤，交给普通 Computer Use。

会话绑定确切标签页或窗口，限定已观察到的标签与浏览器来源，设置本地 `verify()` 及步骤、时间预算。`done` 表示该验证条件通过，报告成功前仍应检查最终状态或截图。范围改变或动作不确定时，从新状态检查，不应直接重放。完整会话 API 与初始化示例见[Codex 技能](skills/reinforced-computer-use/SKILL.md)。

原生 Windows 应用先读取已安装的 Computer Use 技能，在 `node_repl` 中通过 `await import('@oai/sky')` 初始化 `sky`，再检查 `sky.list_windows()` 或 `sky.list_apps()` 的结果。选定唯一返回窗口后，从 `scripts/sky-adapter.mjs` 创建 `createSkyTarget({sky, window: selectedWindow})`，先观察无障碍树，再允许动作。适配器保留原生控件编号，用一次 `set_value` 替换准备字段，保留选中截图区域的局部坐标，并把组合键转换为 Sky keysym。详见[原生适配说明](skills/reinforced-computer-use/references/sky-adapter.md)。

截图/image 输入必须带当前观察编号（`observationId`）；物理屏幕坐标必须提供明确已知的缩放比例。无障碍信息缺失、窗口绑定变化、输入结果不确定或验证失败时，会交回检查，这些规则不保证任意软件都兼容。0.3.0 也支持在没有全局 `process` 的 REPL 中导入 provider 与 bridge client；桥接描述文件路径应使用终端实际报告的路径，凭据处理保留在终端。

## 可选：接入 Jev

本地模式与演示均不需要 Jev。自适应模式需要配置 TypeSafe 或 OpenRouter、对应用户环境变量、持续运行的回环桥接进程，并设置 `shareWithPlanner: true` 与限定范围的 `plannerGoal`。按照[首次使用指南](docs/GETTING_STARTED.zh-CN.md#可选jev-配置)或[详细 Jev 参考](skills/reinforced-computer-use/references/jev-setup.md)配置。

规划请求可能披露目标名称、目标描述、允许控件标签、观察项名称、准备槽名称和近期动作描述。默认规划 JSON 不含准备文本值或截图，但填入的文本仍可能由目标网站或应用发送。API 密钥通过 HTTPS 认证头发送给所选提供商。[2026-10-05 原生验收](docs/acceptance-native-2026-10-05.md)记录了十次真实 TypeSafe 响应，返回模型标识为 `jev-1.13.0`，包含 Multisim 和剪映专业版中的限定动作决策。这些流程仍由 Codex/普通 Sky 完成文件选择、编辑、素材导入、时间线放置与导出等交接，不代表整套流程自主执行。该记录不保证提供商当前可用性、其他账户、计费、OpenRouter 权限或其他应用。启用分享前请读[隐私与数据流](docs/PRIVACY.md)。

## 开发与验证

```powershell
npm ci --omit=dev --ignore-scripts
npm test
npm run check:release
```

运行时和截图模块在 `scripts/`；Codex 技能在 `skills/reinforced-computer-use/`；测试在 `tests/`。[验证记录](docs/VERIFICATION.md)区分模拟测试、本地浏览器演示、含 Codex 交接的已验收原生/提供商动作、历史记录，以及尚未验证的生产网站路径。CI 使用 Windows/Ubuntu 与 Node 22/24 运行模拟测试，Ubuntu CI 通过不代表 Linux 桌面已兼容。

欢迎试用演示并反馈 OS、Node 版本、可用 CUA 接口、复现步骤、预期与实际结果。发布 issue 前请删除私人标签、凭据、本机路径、截图中的私人内容、桥接描述文件和原始 trace。见[常见问题](docs/TROUBLESHOOTING.zh-CN.md)与[安全问题报告方式](SECURITY.md)。

如果项目帮助你完成了 Codex 工作流，可以点 Star 方便以后查找，也可以订阅 Release 接收版本更新。

## 许可证与归属

本插件与文档采用 [MIT 许可证](LICENSE)。依赖与参考来源见 [NOTICE](NOTICE)。Codex、Computer Use 运行时和 Jev 模型/服务由各自提供方提供，不随本仓库分发。
