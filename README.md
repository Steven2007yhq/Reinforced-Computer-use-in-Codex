# Reinforced Computer Use for Codex

在 Codex 已启用的 Computer Use 能力上，把多步界面操作组织成有步骤上限、时间上限和结果验证的执行循环。默认使用本地 `runPlan()`；需要根据当前界面选择下一步时，可以配置可选的 Jev 云端决策器。

**这是 Windows 优先的 Codex 插件。已验证的开发环境是 Windows 11 x64 / Node.js v24.14.0。** 浏览器操作需要 Codex 已提供并启用的 Computer Use 浏览器接口；原生桌面操作还需要单独启用的原生 CUA 接口。安装本插件不会启用这些接口。完整设备说明见 [兼容性与设备要求](docs/COMPATIBILITY.md)。

## 能做什么

- **已知流程：** `runPlan()` 按事先准备的步骤点击、填入非敏感文本、滚动或执行允许的快捷键，每次操作前后重新读取界面状态。这个模式不需要 Jev 账户或 API 密钥。
- **界面有分支的流程：** `runAdaptive()` 把经过限定的界面元数据交给 Jev，从允许的动作中选择下一步。调用方必须设置 `shareWithPlanner: true` 和独立的 `plannerGoal`。
- **长网页截图：** 通过已选中的 Computer Use 浏览器标签页滚动、捕获视口并拼接 PNG；超过像素预算时保存分段图片。结果仍需检查顶部、底部和覆盖范围。
- **明确交还控制：** 发布、发送、删除、付款、登录、上传、安装、权限等被识别的控件，以及低置信度、界面变化、范围变化或验证失败，会结束快速循环，交还 Codex 检查。

Codex 负责目标、授权、准备文本、视觉判断和最终验收。运行时的标签规则和敏感控件识别属于辅助检查，无法识别所有可能的界面行为，也不替代当前 Computer Use 的权限策略。没有测量可推广到所有任务的加速倍数。

## Windows 安装

准备以下条件：

- Node.js **22 或更高版本**，以及 npm、Git、PowerShell。
- 可以运行 `codex plugin add` 的 Codex 安装。
- 已可用的 Computer Use 接口；要操作原生应用，还必须能使用原生 CUA 接口。

在 PowerShell 中执行：

```powershell
git clone https://github.com/Steven2007yhq/Reinforced-Computer-use-in-Codex.git
cd Reinforced-Computer-use-in-Codex
npm ci --omit=dev --ignore-scripts
.\scripts\install-windows.ps1
```

先安装依赖再运行安装器。截图辅助模块使用 `jpeg-js` 和 `pngjs`；`--ignore-scripts` 禁止 npm 安装生命周期脚本。

安装器先检查 Node 与 Codex CLI，再按包内容白名单复制到当前用户的 `plugins\reinforced-computer-use`，排除 Git 历史、临时输出和无关依赖。在当前用户的 `.agents\plugins\marketplace.json` 注册本地插件；若该 marketplace 尚未登记，则登记它，最后运行 `codex plugin add`。已有 marketplace 文件会先备份；同名 marketplace 指向其他位置或目标插件目录已经存在时，安装器会停止。更新时请先检查并保留旧目录，再处理这个明确的目标目录。

安装完成后重新启动 Codex，并开启新聊天以加载插件。如果 PowerShell 阻止脚本执行，请按你所在设备的脚本执行策略处理，不要把下载来源不明的脚本直接放行。

可以运行本地检查：

```powershell
node scripts/doctor.mjs
npm test
```

`doctor` 的 `localPlanMode: ready` 表示 Node/本地运行条件检查通过；`adaptiveMode: ready` 只表示配置与凭据存在条件通过。它们都不能证明 Computer Use 已启用、提供商账户有权限或真实 API 调用成功。测试与验收范围见 [验证记录](docs/VERIFICATION.md)。

## 在 Codex 中使用

可以在已安装插件的新聊天里提出明确的界面任务，例如：

> 使用 Reinforced Computer Use，在当前已打开的页面依次打开 Settings 和 Notifications，确认通知设置页面已显示。

插件技能文件 [SKILL.md](skills/reinforced-computer-use/SKILL.md) 包含完整的会话示例。关键设置如下：

| 设置 | 用途 |
| --- | --- |
| `target` / `targetName` | 绑定已选中的确切应用窗口或浏览器标签页 |
| `clickLabels` | 只允许已经观察到的确切标签或窄范围正则 |
| `textSlots` | 在本地准备要填入的非敏感文本和对应字段标签 |
| `allowedOrigins` / `allowedFrameOrigins` | 限定浏览器页面及跨源子框架来源 |
| `scopeCheck(raw)` | 每轮确认仍处在正确的页面、窗口和账户上下文 |
| `verify(raw)` | 使用本地结果条件决定任务是否完成 |
| `maxSteps` / `maxTotalMs` | 限定操作次数和总执行时间 |

首次调用 CUA 时应先按工具文档进行单次初始化，读取返回的接口说明，再导入插件。原生 Windows 滚动需要调用方根据新截图提供坐标；运行时不会猜测坐标。遇到文件选择器、拖放、画布、图形判断或重要的最终提交步骤，交由普通 Computer Use 处理。

`done` 表示调用方定义的本地验证条件通过，还应使用适合任务的最新状态或截图验收。`yielded` 表示本轮预算用完，可在检查范围后继续同一会话。其他状态需要检查当前界面，不能把不确定的操作直接重放。

## 可选：接入 Jev

Jev 是此插件的**可选云端决策服务**，不在本地加载模型；无需为 Jev 在本机配置推理 GPU。接口可用性、账户权限、模型和计费由提供商决定，本仓库不承诺它们，也没有把真实付费提供商的端到端调用列为已验证。

目前源码包含两条提供商路由：

| 配置 | 源码请求入口 | 默认模型 | 环境变量 |
| --- | --- | --- | --- |
| `typesafe` | `https://api.typesafe.ai/v1/systemone` | `jev-latest` | `TYPESAFE_API_KEY` |
| `openrouter` | `https://openrouter.ai/api/alpha/decisions` | `~typesafe/jev-latest` | `OPENROUTER_API_KEY` |

可参考 [TypeSafe API 文档](https://docs.typesafe.ai/api)、[OpenRouter 的 Jev 说明](https://openrouter.ai/blog/insights/what-is-jev/) 和 [OpenRouter 模型页面](https://openrouter.ai/~typesafe/jev-latest)。这些链接帮助了解提供商接口，不能代替当前账户的实际调用验证。

在 Windows 设置界面中添加对应的**用户环境变量**，再开启新终端。不要把密钥放进聊天、命令行参数或仓库文件。配置脚本只写入提供商名称和模型名称：

```powershell
$pluginRoot = Join-Path $env:USERPROFILE 'plugins\reinforced-computer-use'
node "$pluginRoot\scripts\setup.mjs" --provider=typesafe --model=jev-latest
node "$pluginRoot\scripts\doctor.mjs"
```

也可以选择 OpenRouter：

```powershell
node "$pluginRoot\scripts\setup.mjs" --provider=openrouter --model=~typesafe/jev-latest
```

在需要自适应模式的任务期间，保留运行以下命令的终端：

```powershell
node "$pluginRoot\scripts\bridge-server.mjs" --idle-ms=300000
```

本地桥接进程监听随机的 `127.0.0.1` 端口，使用临时桥接令牌认证，再向已配置的云端入口发送决策请求。任务结束后用 Ctrl+C 停止；默认空闲 5 分钟自动退出。详细步骤见 [Jev 配置说明](skills/reinforced-computer-use/references/jev-setup.md)。

启用自适应模式前，阅读 [隐私与数据流](docs/PRIVACY.md)：目标名称、规划目标、允许控件的标签和近期动作描述可能包含私人信息。运行时不把准备的文本值或完整截图放进规划请求，但这不等于输入文本不会通过目标网站或应用发送出去。API 密钥会通过认证请求头发送给对应提供商。

## 开发与许可证

```powershell
npm ci --omit=dev --ignore-scripts
npm test
npm run check:release
```

主要模块位于 `scripts/`，Codex 技能位于 `skills/reinforced-computer-use/`，本地测试与测试页面位于 `tests/`。运行时测试、模拟决策器和本地测试网页验收都不能证明生产网站兼容性或真实 Jev 服务可用性。最新验证记录见 [VERIFICATION.md](docs/VERIFICATION.md)。

代码按 [MIT 许可证](LICENSE) 发布。第三方来源及依赖说明见 [NOTICE](NOTICE)。

## English summary

A Windows-first Codex plugin for bounded Computer Use workflows. The default `runPlan()` executor follows an explicitly scoped local plan without an API key. Optional `runAdaptive()` asks a Jev cloud provider to choose among allowlisted actions; a local verifier decides whether the task is complete. A browser helper captures long pages through the selected Computer Use tab.

Verified development environment: Windows 11 x64 with Node.js v24.14.0; source requirement: Node.js 22+. Browser control requires an enabled Codex Computer Use browser surface. Native desktop control requires a separately enabled native CUA surface, which this plugin cannot enable. Other desktop platforms are unverified, and mobile devices are not supported deployment targets. No GPU, VRAM, or universal performance minimum has been measured. Review [compatibility](docs/COMPATIBILITY.md), [privacy](docs/PRIVACY.md), and [verification](docs/VERIFICATION.md) before use.
