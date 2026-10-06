# 隐私与数据流

默认 `runPlan()` 不使用 Jev 决策接口。`runAdaptive()` 和 grounded `prepare()` 需要调用方明确设置 `shareWithPlanner: true`，并提供单独的 `plannerGoal`。这是发送规划元数据的选择，不是对所有界面信息自动匿名化的保证。0.4.0 的 `createWorkflow()` 只在本地管理阶段；它不自行调用 Jev。

本说明针对本仓库代码的行为。Codex、Computer Use、目标应用/网站以及所选提供商各自的数据处理规则仍然适用。

## 各执行路径的数据边界

| 路径 | 本仓库 helper 自身的行为 |
| --- | --- |
| `runPlan()` | 本地读取和执行已准备的计划，不调用 Jev 决策接口 |
| `runAdaptive()` | 经显式授权发送下文列出的规划元数据；`plannerGoal` 和 `targetName` 原样发送 |
| grounded `prepare()` | 经显式授权发送最小语义候选和布尔观察，部分文本做启发式替换；不发送截图供 Jev 视觉判断 |
| grounded `commit()` | 调用 Codex 提供的本地执行、范围和验证 callbacks，不自行调用提供商或 Computer Use |
| `createWorkflow()` | 本地阶段、验证和交接管理，无提供商请求、UI 客户端、持久化或日志传输 |

最后两项的边界针对 helper 自身，不约束调用方提供的 callbacks。callback 可以调用 `runAdaptive()`、其他网络服务或目标应用；这些调用分别遵循自身的数据边界。两个新 helper 都不提供导入文件、编辑电路、剪辑时间线或导出媒体的业务逻辑，实际输入及结果验证由本地 callbacks 承担。

## `runAdaptive()` 会发给 Jev 的数据

自适应调用通过以下路径发送：

`Computer Use 会话 → 本机回环桥接进程 → 已配置的提供商 HTTPS 决策入口`

提供商请求 JSON 包含模型名称、`state` 和决策问题 `questions`。运行时构造的规划状态如下：

| 信息 | 实际行为 |
| --- | --- |
| `plannerGoal` | 原样进入规划状态。请使用完成决策所需的最小目标描述 |
| `targetName` | 原样进入规划状态，可能包含窗口标题、项目名或其他私人信息 |
| 允许动作的控件 | 包含动作标识、角色、经过有限正则处理的标签、checked/selected 状态和操作类型 |
| 准备文本槽名称 | `preparedSlot` 中可能包含槽名称；名称和文本值是不同信息，名称也可能泄露业务或私人信息 |
| 非元素动作 | 快捷键或滚动等动作的描述，不包含运行时使用的滚动坐标 |
| 观察条件 | 包含观察项名称及真假结果；观察项名称可能带有私人信息 |
| 近期动作 | 最多最近 8 条动作、是否改变状态和原因描述 |
| 决策问题 | 包含候选动作描述，以及 DONE/BLOCKED/WAIT 等选项和选择规则 |

运行时**不把完整可访问性树、截图、`textSlots` 的准备文本值、滚动坐标或本地 `goal` 放入这个规划 JSON**。会话仍会在本地读取可访问性树用于操作和验证；`latestState()` 可以返回最近的原始状态。若调用方把这些内容另行记录、打印、复制进目标名称或规划目标，便不再受到上述 JSON 字段边界保护。

控件标签和动作描述只做有限的正则替换，例如部分密钥格式、Bearer 文本和电子邮箱。`plannerGoal`、`targetName`、观察项名称和准备槽名称没有统一匿名化处理。规则无法可靠识别所有令牌、身份证号、用户名、文件名、业务编号或自然语言中的秘密。控件标签自身也可能已经包含输入内容，因此排除准备文本值并不能保证请求中不存在相同内容。

## grounded `prepare()` 会发给 Jev 的数据

[grounded action helper](../skills/reinforced-computer-use/references/grounded-actions.md) 让 Jev 从 Codex 已观察且允许的候选中选择一个语义动作。Codex 随后检查新的真实截图，在本机重新定位同一动作。Jev 不接收或解释图片；弱 AX 或 AX 为 null 时也不会从截图伪造控件编号。

| 信息 | 实际行为 |
| --- | --- |
| `plannerGoal`、`targetName` | 进入规划状态前做有限正则替换；仍须使用最小目标和非私人目标名称 |
| `observation`、`scope` | 只接受严格布尔值；观察项可以是短 ASCII 名称到布尔值的映射，名称原样发送 |
| 允许候选 | 发送动作 ID、kind、经过有限处理的 description/label，以及 fill 的 `slotName`；动作 ID 原样发送 |
| 决策问题 | 候选 ID 对应的处理后描述，以及 DONE/BLOCKED 和选择规则 |
| 本地操作参数 | 不从候选读取截图、坐标、AX、准备文本值或 Window 对象/ID；key 动作的实际按键字符串也不放入规划 JSON |

这个路径的替换覆盖部分密钥格式、Bearer 文本、电子邮箱、显式写作 `Window ID`/`HWND` 的编号和部分 Windows 绝对路径。它是启发式处理，不是可靠匿名化。裸编号、其他路径格式、用户名、业务编号和自然语言中的秘密仍可能留在目标、描述或标识中。不要把真实界面内容或准备文本复制到这些字段；候选 ID 和观察项名称应使用合成的业务中性名称。旧 `runAdaptive()` 不因此获得相同的目标文本替换。

`shareWithPlanner:true` 仍是必要的显式授权。准备时遇到识别出的敏感字段、外部或其他 consequential 动作，以及 Enter/Delete/Windows-key 等受限按键，会在提供商调用前交回 `needs_codex_review`。这些启发式门禁不证明其他动作安全，也不代替当前 Computer Use 的权限规则。`execute` 必须执行已选且已允许的同一动作，`verify` 必须基于独立证据返回严格布尔值；Jev 的 DONE 或信心分数不能证明成功。

## 两种本地 ticket 和结果元数据

grounded 成功准备的 ticket 只公开 `selectedAction`，其中保留本地候选原有的 ID、kind、description、label，以及相应 key 或 `slotName`。这些本地文本不保证已脱敏。模块在进程内的 `WeakMap` 中保存 ticket 身份、所选动作、过期和消费状态、取消信号，以及经过格式检查的模型名和客户端测得的 `latencyMs`。返回结果省略原始提供商响应、概率分布和 usage；`latencyMs` 不是服务端计算时间或整个 UI 工作流耗时。ticket 不持久化，不能由 JSON 重建，也不能重放已经尝试过的输入。

[workflow helper](../skills/reinforced-computer-use/references/workflow.md) 将 session、callbacks 和真实观察保留在本地。`snapshot()` 和普通结果元数据包含阶段 ID、状态、当前索引、计数和固定原因；它们不包含原始观察或 callback 返回的业务数据。交接结果还包含阶段 ID 和 revision；可执行的 handoff ticket 绑定当前 workflow 和 revision，并且不可枚举，不进入普通 JSON 或对象展开。它与 grounded ticket 是两种不同的本地能力，不能互换。

两个 helper 不自动保存这些数据。阶段 ID、动作标签、槽名称和调用方自己的日志仍可能泄露私人信息；使用合成标识，保留 live ticket 在本机，不发布原始结果对象或自行序列化能力。取消和过期可以阻止后续 callback，但不能撤销已经发给目标应用的输入。未知输入错误需要重新观察，不应新建 ticket 或 workflow 来自动重试。

## 密钥和本地桥接令牌

提供商 API 密钥从环境变量读取：`TYPESAFE_API_KEY` 或 `OPENROUTER_API_KEY`。`setup.mjs` 只保存提供商和模型名称；`doctor.mjs` 报告密钥是否存在，不输出密钥值。

**真实 API 密钥会在 HTTPS 请求的 `Authorization: Bearer …` 认证头中发送给对应提供商。** 它未放进规划状态 JSON，但提供商需要收到认证头才能处理请求。不要把“规划 JSON 不含凭据”理解为“凭据不会发送到提供商”。网络代理和日志系统的可见范围取决于你自己的网络配置。

本地桥接服务使用另一枚随机令牌，写入临时描述文件。客户端通过 `Authorization: Bridge …` 在回环地址认证；这枚令牌不会作为提供商 API 密钥使用。桥接服务限制 `127.0.0.1`、匹配的 Host、JSON 请求和认证，并拒绝带 Origin 的请求，但这些措施不阻止已经能够读取用户配置目录的本地进程获得令牌。

## 本地文件与权限

Windows 配置位于 `%APPDATA%\ReinforcedComputerUse\`：

- `config.json`：提供商和模型名称，不保存 API 密钥。
- `bridge.json`：短期桥接地址、认证令牌和过期时间，是敏感文件，不应上传或共享。

桥接进程默认空闲 5 分钟退出，默认最大寿命 1 小时。正常关闭时会尝试删除属于当前桥接实例的描述文件；进程异常终止可能留下文件，客户端会检查过期时间。任务结束后主动停止桥接服务。

非 Windows 系统的配置写入会尝试设置目录 `0700`、文件 `0600`；这些平台尚未作为完整部署环境验证。Windows 分支不执行等效的 ACL 加固，依赖既有用户配置目录的 Windows 权限。`doctor` 返回 `not_enforced_on_windows` 的含义是本插件没有强制设置 Windows 私有权限，不能声称描述文件已经由插件保护到特定 ACL 等级。

Windows 安装器会备份已有的本地 marketplace 文件；备份属于用户本机配置，可能含其他插件路径。它不是本仓库的公开内容，不应随代码一起上传。

## 填入文本、截图和操作轨迹

准备文本值在本机交给目标应用或网页的输入接口，运行时不会把它们放进 Jev 规划请求。**目标网站或应用仍可能按自己的逻辑同步、自动保存或发送这些文本**，即使尚未点击提交。不要将密码、验证码、API 密钥或支付信息放入快速执行文本槽。

长网页截图 helper 会在本地按指定路径写入完整图片或分段图片。这些图片包含当时可见页面的真实内容，可能包括头像、账户、地址、订单或业务数据。helper 不为图片自动做脱敏，也不将图片发送给 Jev；随后分享图片属于另一次数据披露。

会话结果包含本地执行 trace 和目标名称。trace 省略准备文本值，但可能含控件标签、文本槽名称和动作描述。默认保留在内存，调用方打印或保存后会形成日志。不要把原始 trace、截图、浏览器状态或错误上下文直接提交到公开仓库或 issue。

## 发布问题报告或二次分发

分享前检查规划目标、窗口/标签页名称、允许控件标签、槽名称、观察项名称和动作描述。问题报告应优先使用合成标签和最小复现，删除真实账户、凭据、路径、截图中的私人内容以及桥接描述文件。不要将 `.env`、用户配置、会话日志、安装备份或真实验收截图打包进源码。

提供商的数据留存、训练用途、地区和计费不由本插件控制，也没有在本仓库中实测。启用自适应模式前，请查看所选服务的当前规则及 [TypeSafe API 文档](https://docs.typesafe.ai/api) 或 [OpenRouter Jev 说明](https://openrouter.ai/blog/insights/what-is-jev/)。如果当前任务不需要云端选择动作，可以使用默认本地 `runPlan()`。
