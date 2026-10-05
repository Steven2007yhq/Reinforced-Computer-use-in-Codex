# 验证记录 / Verification

公开源码版本：**0.3.0**。检查日期：**2026-10-05**。环境为 Windows 11 x64、
Node.js v24.14.0。这里区分模拟测试、实际合成网页操作、原生应用中的限定动作与
Codex 交接、历史记录和未验证能力。
设备名、序列号、个人目录和私人界面截图不属于公开材料。

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
