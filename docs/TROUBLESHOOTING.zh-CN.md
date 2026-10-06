# 常见问题与排障

[English](TROUBLESHOOTING.md) · [简体中文](TROUBLESHOOTING.zh-CN.md) · [首次使用](GETTING_STARTED.zh-CN.md)

先使用[合成本地演示](DEMO.zh-CN.md)，排除登录、提供商权限和生产网页变化对第一次任务的影响。记录任务停止在哪一步，不要反复重试不确定的动作。

## 安装与首次使用

| 现象 | 检查与处理 |
| --- | --- |
| 缺少 Node，或版本低于 22 | 检查 `node --version`，安装 Node.js 22+ 后打开新终端，使 PATH 生效。 |
| 找不到 `codex`，或不支持插件命令 | 检查 `codex plugin marketplace list --json`。终端 PATH 需要有 Codex CLI，且该版本支持本地插件 marketplace；仓库尚未验证最低 Codex 版本。 |
| 提示截图依赖缺失 | 先在源码目录运行 `npm ci --omit=dev --ignore-scripts`，再运行安装器。 |
| PowerShell 阻止脚本执行 | 检查 `scripts/install-windows.ps1` 和设备执行策略，遵循管理员策略；不要为排障而全局关闭脚本保护。 |
| 插件目标目录已存在 | 先检查并保留该确切安装，更新时再移开旧目录。安装器有意拒绝覆盖，不要删除无关插件目录。 |
| 同名 marketplace 指向其他根目录 | 检查 `codex plugin marketplace list --json` 及该具体条目，解决登记冲突后再安装，保留无关内容与已有备份。 |
| 已安装，但 Codex 没使用插件 | 重启 Codex，开启新聊天并明确要求使用 Reinforced Computer Use；安装不会让已有聊天重新加载技能。 |
| `doctor` 提示缺少自适应配置或密钥 | 仅使用本地 `runPlan()` 时属于预期情况，检查 `nodeSupported: true`；本地模式与演示不需要 Jev Key。 |
| `doctor` 显示 `ready`，界面任务却失败 | Doctor 检查本地运行/配置条件，不检查 CUA 可用性，也不请求真实提供商。另行检查当前 Computer Use 接口。 |
| 演示端口已占用 | 使用 `npm run demo -- --port=4319`，任务中使用打印的 URL 与确切来源，并保留服务器终端。 |
| 本地页面打开了，但没有执行插件任务 | `npm run demo` 只启动测试页服务器，还需要执行[演示指南](DEMO.zh-CN.md)的 Codex 提示词，通过 CUA 标签页运行 `runPlan()` 与 `captureLongPage()`。 |

## Computer Use 与执行状态

| 现象 / 状态 | 含义与下一步 |
| --- | --- |
| 没有 Computer Use 工具 | 当前聊天无法执行界面任务，插件不能启用 CUA；检查 Codex 配置与实际提供的工具。 |
| 浏览器可用，但不能绑定原生应用 | 浏览器和原生接口分别提供。Windows 应检查文档规定的 `@oai/sky` 实际窗口清单，选择确切的 `Window` 并通过 [Sky 适配器](../skills/reinforced-computer-use/references/sky-adapter.md)绑定；也可使用已提供的旧原生 CUA 目标。进程运行不能证明接口可用。 |
| `SKY_ACCESSIBILITY_UNAVAILABLE` | 原生服务没有返回 AX，AX 批次在输入前停止。改用新截图下的普通 Computer Use，或通过 [grounded 动作选择](../skills/reinforced-computer-use/references/grounded-actions.md)，由 Codex 重新定位同一个已允许的语义动作；不要虚构编号控件。 |
| 终端桥接已启动，REPL 仍报 `BRIDGE_NOT_RUNNING` | REPL 可能没有全局 `process`，默认描述文件路径因此不同。显式传入由本机终端 `configPath` 得到的 `descriptorPath`，见 [Jev 配置](../skills/reinforced-computer-use/references/jev-setup.md)。 |
| 首次 CUA 调用不接受导入插件 | 首次调用只执行一个文档规定的入口，读完返回文档后再导入运行时，见[技能说明](../skills/reinforced-computer-use/SKILL.md)。 |
| 控件标签缺失或重复 | 用普通 Computer Use 查看新状态。使用已观察到的确切标签与窄范围限制，不要仅为匹配而扩大正则。 |
| `needs_codex_review` / `needs_codex` | 检查当前状态并交还 Codex。控件可能敏感、frame 来源未授权或界面需要直接观察，遵循当前 CUA 权限策略。 |
| `scope_changed` | 检查当前标签页/窗口、页面来源和账户上下文，重新确认正确范围后才继续。 |
| `yielded` | 一轮预算用完，先检查进度；范围仍有效时可继续同一 RCU 会话。对于 `createWorkflow()`，下一轮只从新状态验证已尝试的阶段，不重放该阶段动作。 |
| `stale_state`、`no_progress`、`needs_inspection`、`budget_exceeded` | 停止快速循环，从新状态诊断。未经检查就增大预算或重放步骤，可能重复修改。 |
| `done`，但结果不对 | 本地成功条件通过，条件本身可能不充分。检查真实结果，改进该任务的验证条件。 |
| 跨源 frame 被阻止 | 适合当前任务时，确认确切来源并在 `allowedFrameOrigins` 中明确授权。树中来源缺失或被截断时，回到普通检查，不强行执行。 |
| 模态框中的编号输入失败 | 查看新窗口清单和实际对话框状态，绑定确切返回的模态框/编辑器 Window，再观察该窗口自己的编号。父窗口树中出现控件不足以证明编号可执行；正确绑定可能修复上下文不匹配，但不能证明底层支持该控件。输入结果不确定时先检查，不重放。 |
| 视频/画布变化，AX 却显示无进度 | 查看新截图并使用该软件的阶段验证器。真实视觉效果可能不改变 AX 文本，不放宽成功条件，也不重复输入来制造文本变化。 |
| Workflow 返回 handoff | 在本地保留 `handoff.ticket`/`revision`，检查实际待完成阶段，只执行已允许的接续。`resume()` 读取新结果，不释放旧输入进行重放。见[workflow 规则](../skills/reinforced-computer-use/references/workflow.md)。 |
| `INVALID_WORKFLOW_TICKET` / `WORKFLOW_BUSY` | 使用该 workflow 最新的本地 ticket/revision，并串行调用。JSON 副本、旧票据或另一个 workflow 的票据不能接续；取消后，未结束的回调仍持有锁。 |
| Grounded `expired`、`cancelled`、`busy`、`invalid_ticket`、`ticket_consumed` | 不授权任何额外输入，停止并检查当前状态和原因。不能准备替代票据来重放不确定输入。 |
| Grounded `needs_verification` / `failed_verification` | DONE 只是建议；本地验证为 false 仍属失败。检查实际结果，`executed:true` 只表示调用过本地执行器，不能证明原生输入成功。 |

画布、拖放、文件选择器、图形判断、没有可访问性信息的控件与重要的最终提交步骤使用普通 Computer Use。插件不会取消当前权限要求。

0.4.0 可以把这些接续保留为 workflow 阶段，并让 Jev 选择一个已限定的语义动作；新截图定位、必要检查与独立验收仍由 Codex 完成。模块提供流程组织，不自带具体软件的导入/导出或编辑逻辑。准备文本和坐标留在可信的本地回调中。

## 长网页截图

确认选中的标签页支持截图、滚动、必要快捷键，以及只读 `playwright.evaluate` 尺寸查询，从顶部开始。helper 面向文档滚动；独立滚动面板可能需要其他任务方式。

重复章节、遮挡、内容缺失或页面高度改变时，需要检查新截图和捕获元数据。懒加载、吸顶元素、动态内容、嵌套滚动均可能影响结果。超过像素预算时，输出编号视口图片而不是一张巨大 PNG 属于预期行为；这是拼图分配预算，不是整个进程的内存上限。

演示页需核对 `LONG_01` 到 `LONG_12` 按顺序出现，底部有 `END_OF_LONG_PAGE`。其他页面应选择对应的首尾和内容标记。报告实际运行的文档高度、捕获高度和覆盖率，不能仅凭文件存在或预览 GIF 判断完整。

## 可选 Jev 模式

自适应执行前完成[Jev 配置](GETTING_STARTED.zh-CN.md#可选jev-配置)。配置错误发生在下一次界面修改前，应先解决原因，不自动切换提供商。

- 缺少凭据：检查对应用户环境变量是否存在，修改后开启新终端；不打印变量值，也不粘贴到聊天。
- 桥接不可用或过期：确认上一次任务结束后，重新启动并保留桥接进程，不发布描述文件或临时令牌。
- 提供商错误：向所选提供方核对当前账户、模型和访问条件。源码路由和模拟测试通过不能证明真实服务可用。
- 低置信度或不合适的决策：查看新界面状态，不降低置信度要求来强行执行。

自适应模式发送规划元数据，提供商通过认证头收到 API Key。数据边界见[隐私说明](PRIVACY.md)。

比较速度时，`latencyMs` 是 provider 客户端测量的请求耗时，不是服务端计算字段。workflow 回调尝试、UI 输入和 Jev 决策应分别计数；完整耗时还须包含启动、观察、验证与 Codex 接续，单次请求延迟或模型 DONE 不能证明加速倍率。

## 报告问题

使用最小合成复现，说明：

1. OS 与架构、Node 版本、插件版本或提交。
2. 浏览器或原生 CUA 接口是否确实可用。
3. 复现步骤、预期与实际行为。
4. 脱敏后的状态/错误；截图问题附相关高度与覆盖率元数据。

不要附凭据、私人路径、账户名称、原始 trace、私人截图、用户配置或桥接描述。安全问题按 [SECURITY.md](../SECURITY.md) 报告。本地演示成功只证明该测试页与环境的结果，不代表生产网站、原生应用或真实 Jev 服务已验收。
