# 安装与首次使用

[English](GETTING_STARTED.md) · [简体中文](GETTING_STARTED.zh-CN.md) · [README](../README.zh-CN.md)

第一次使用以合成本地浏览器页面为例，执行已知计划并捕获长网页，不需要 Jev 账户或 API Key。执行任务的 Codex 聊天必须已经有浏览器 Computer Use 接口。

## 1. 检查前提条件

以下安装流程用于 Windows。已验证的开发环境是 Windows 11 x64，其他桌面平台的部署尚未验收。需要 Node.js 22+、npm、Git、PowerShell，以及支持本地插件 marketplace 的 Codex CLI。

在 PowerShell 检查：

```powershell
node --version
npm --version
git --version
codex plugin marketplace list --json
```

最后一条命令应返回 JSON 格式的 marketplace 清单。Node 可用不能证明 Codex 插件命令或 Computer Use 已可用。请让 Codex 按工具文档检查当前 Computer Use 接口；浏览器和原生桌面是分别提供的能力。完整设备、接口条件见[兼容性说明](COMPATIBILITY.md)。

## 2. 从源码安装

```powershell
git clone https://github.com/Steven2007yhq/Reinforced-Computer-use-in-Codex.git
cd Reinforced-Computer-use-in-Codex
npm ci --omit=dev --ignore-scripts
.\scripts\install-windows.ps1
```

`npm ci` 按锁文件安装两个 JavaScript 图像依赖；`--ignore-scripts` 禁止依赖安装生命周期脚本。先完成该步骤，再运行安装器。

安装器修改安装内容前检查 Node 和 Codex。它把白名单包内容及图像依赖复制到当前用户的 `plugins\reinforced-computer-use`，使用同一用户目录下的 `.agents\plugins\marketplace.json`，保留无关条目，并在更新已有 marketplace 文件前备份。若 marketplace 未登记，则登记它，然后调用 `codex plugin add`。

插件目标目录已经存在时，安装器拒绝覆盖。更新前先检查并保留旧安装，再把这个确切目录移开。同名 marketplace 指向其他根目录时，先解决该项冲突，不要删除整个插件或 marketplace 目录树。

安装后重启 Codex，并开启新聊天。若 Windows 阻止脚本执行，先检查仓库中的脚本和设备执行策略；受管理设备应遵循管理员策略。安装器不会启用 Computer Use。

## 3. 检查本地运行条件

在源码目录运行：

```powershell
node scripts/doctor.mjs
npm test
```

检查已安装副本：

```powershell
$pluginRoot = Join-Path $env:USERPROFILE 'plugins\reinforced-computer-use'
node "$pluginRoot\scripts\doctor.mjs"
```

除 `localPlanMode` 提示外，还要检查 `nodeSupported: true`。自适应模式可能提示缺少配置或凭据，这不阻止本地演示。`adaptiveMode: ready` 检查配置与密钥存在条件，不能证明提供商账户有权限或请求成功。两个模式提示都不能证明 CUA 接口已启用。测试使用模拟接口与本地测试材料，范围见[验证记录](VERIFICATION.md)。

## 4. 运行可复现的第一个任务

在源码目录启动，并保留终端：

```powershell
npm run demo
```

默认地址为 `http://127.0.0.1:4318/`。端口被占用时：

```powershell
npm run demo -- --port=4319
```

使用终端打印的地址，同时将任务 URL 和允许来源改为同一端口。在已加载插件且浏览器 Computer Use 可用的新 Codex 聊天中，粘贴：

> 使用 Reinforced Computer Use 的本地 runPlan 模式，不接入 Jev。在 Computer Use 浏览器中打开 http://127.0.0.1:4318/，观察页面后点击确切的“Long page”链接，确认目标页面出现 LONG_01。将该长页面捕获为 PNG，保存到本聊天工作区的输出目录。检查保存的图片中 LONG_01 到 LONG_12 按顺序出现，底部包含 END_OF_LONG_PAGE。报告 helper 返回的文档高度、捕获高度和覆盖率。若缺少所需 Computer Use 接口，请停止并说明。

预期结果是各章节按顺序出现一次，首节和页脚均可见的保存图片。高度与覆盖率以每次捕获结果为准，不能保证其他页面也有相同效果。[演示指南](DEMO.zh-CN.md)提供完整 CUA 操作步骤、API 示例、证据和限制。结束后在终端按 Ctrl+C 停止演示服务器。

## 5. 用于自己的任务

先选范围明确的只读导航任务，确认确切标签页/窗口、当前可见控件标签、浏览器来源和可观察的成功条件。Codex 据此建立[技能文档](../skills/reinforced-computer-use/SKILL.md)中的会话。导入运行时前，按 CUA 文档完成单次初始化，并保留选中的目标。

浏览器会话必须设置确切的 `allowedOrigins`；跨源 iframe 还必须列出确切的 `allowedFrameOrigins`。Windows 原生滚动需要根据新截图选择坐标。不要把密码、验证码、API Key 或支付信息放入文本槽。没有可访问性标签的控件、视觉判断、文件选择器和重要的最终提交步骤，使用普通 Computer Use。

运行时交还控制时，先检查当前界面再决定是否继续。`done` 仅表示本地条件通过，还需要用合适的新状态或截图验收，不能自动重放不确定的动作。

## 可选：Jev 配置

本地计划和演示可跳过本节。自适应模式调用云端提供商，本仓库不在本机加载 Jev 模型，也没有验证当前服务可用性、计费、账户权限或真实提供商端到端调用。

先读[隐私与数据流](PRIVACY.md)。规划目标、目标名称、允许标签、槽名称、观察项名称和近期动作描述可能含私人信息。默认规划 JSON 排除准备文本值与截图，但标签可能已经含有相同内容，目标网站也可能发送填入的文本。

在 Windows 设置中添加对应的**用户环境变量**，随后开启新终端。真实密钥不要放入聊天、仓库文件或命令行参数。

| 源码路由 | 密钥变量 | 默认模型 |
| --- | --- | --- |
| TypeSafe | `TYPESAFE_API_KEY` | `jev-latest` |
| OpenRouter | `OPENROUTER_API_KEY` | `~typesafe/jev-latest` |

使用已安装路径配置一个提供商：

```powershell
$pluginRoot = Join-Path $env:USERPROFILE 'plugins\reinforced-computer-use'
node "$pluginRoot\scripts\setup.mjs" --provider=typesafe --model=jev-latest
node "$pluginRoot\scripts\doctor.mjs"
```

也可以选择 OpenRouter 路由：

```powershell
node "$pluginRoot\scripts\setup.mjs" --provider=openrouter --model=~typesafe/jev-latest
```

配置文件只保存提供商与模型名称，不保存 API Key。在自适应任务期间保留的终端中启动本地桥接：

```powershell
node "$pluginRoot\scripts\bridge-server.mjs" --idle-ms=300000
```

桥接监听随机回环端口，使用临时桥接令牌。提供商通过 HTTPS 认证头接收真实 API Key。结束后按 Ctrl+C 停止桥接；默认空闲超时为五分钟。临时描述文件可能含认证信息，不应上传。

Codex 会话中的自适应执行还需要 `shareWithPlanner: true`、限定范围的 `plannerGoal`、桥接客户端，以及与本地计划相同的控件、范围和验证限制。详见[Jev 参考](../skills/reinforced-computer-use/references/jev-setup.md)，不要仅为强行推进而降低置信度要求或改换提供商。

## 遇到问题

见[常见问题](TROUBLESHOOTING.zh-CN.md)。公开 issue 优先使用合成复现材料，说明 OS、Node 版本、可用 CUA 接口、失败步骤和脱敏错误。不要上传密钥、用户配置、桥接描述、原始界面 trace 或私人截图。安全问题按 [SECURITY.md](../SECURITY.md) 报告。
