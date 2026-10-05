# 复现无需密钥的演示

[English](DEMO.md) · [简体中文](DEMO.zh-CN.md) · [入门指南](GETTING_STARTED.zh-CN.md)

演示通过当前 Codex Computer Use 浏览器标签页执行已知的本地计划，再捕获长网页。
内容全部为合成材料，无需登录、提供商配置或 Jev API Key。仅启动网页服务器不算
插件验收，还需要实际执行 `runPlan()` 与 `captureLongPage()`。

## 启动测试页

在源码目录安装依赖，并保留服务器所在终端：

```powershell
npm ci --omit=dev --ignore-scripts
npm run demo
```

默认地址为 `http://127.0.0.1:4318/`，以终端打印的地址为准。服务器仅监听 IPv4
回环地址，只提供 `/` 和 `/long`，接受 GET/HEAD，不加载外部资源。端口被占用时
运行 `npm run demo -- --port=4319`，同时修改任务地址和允许的来源。完成后用 Ctrl+C
停止服务器。

## 让 Codex 执行任务

按[入门指南](GETTING_STARTED.zh-CN.md)安装插件，在已有浏览器 Computer Use
能力的新聊天中输入：

> 使用 Reinforced Computer Use 的本地 runPlan 模式，不调用 Jev。通过 Computer Use 浏览器打开 http://127.0.0.1:4318/，先观察页面，使用标签完全匹配的 Long page 链接，检查目标页出现 LONG_01。将长网页捕获为当前聊天工作区输出目录中的 PNG。查看保存的图片，核对 LONG_01 到 LONG_12 按顺序出现，底部包含 END_OF_LONG_PAGE。报告辅助器返回的文档高度、捕获高度和覆盖率。如果所需 Computer Use API 不可用，停止并说明具体缺失能力。

第一次 Computer Use 调用只包含一个文档允许的入口，例如
`cua.createBrowserTab("iab", "http://127.0.0.1:4318/", {visible:false})`。
先阅读返回的文档和页面状态，再继续操作，并保留得到的标签页对象。插件不能启用
尚未开放的 CUA 能力，也不能通过其他自动化浏览器替代它。

完整的会话和捕获代码见[英文演示指南](DEMO.md#ask-codex-to-run-the-task)。初始化并
观察到 `Long page` 后，配置 `kind:'tab'`、确切 `allowedOrigins`、点击标签、当前页面
范围和本地成功谓词，执行一项点击计划。`PLUGIN_ROOT` 必须解析为源码或已安装插件的
绝对目录并转成有效 file URL；输出路径应为现有工作区输出文件夹中的绝对 PNG 路径，
示例占位路径不能原样执行。

本测试页没有懒加载资源，所以捕获示例使用 `warmLazyContent:false`；其他页面按需要
保留默认预热。标签页应从顶部开始。辅助器仅使用文档公开的截图、滚动、键盘操作与
只读页面尺寸测量，不另启自动化浏览器。

## 核对结果

`runPlan()` 应返回 `done`，执行一次点击，Jev 决策次数为零。这个返回值只证明本地
谓词通过；还需要打开保存的 PNG，核对：

- `LONG_01` 到 `LONG_12` 各出现一次，顺序正确。
- 最后一个板块和 `END_OF_LONG_PAGE` 页脚完整可见。
- 拼接处没有重复文字行或缺失文字。
- 返回的捕获高度、文档高度、到底状态和覆盖率符合本次截图，标签页回到起始位置。

公开的[完整长图](assets/demo-full.png)、[顶部](assets/demo-top.png)和
[底部](assets/demo-bottom.png)来自实际执行的本地 CUA 浏览器演示。
[GIF](assets/demo-preview.gif)与[30 秒 MP4](assets/demo-video.mp4)由实际视口截图
剪辑而成，不是实时录像，也不能用来证明运行速度。具体测量与边界见
[验证记录](VERIFICATION.md)，处理方式见[素材来源说明](MEDIA.md)。

0.2.2 会先将等比例缩放的截图归一到 CSS 视口尺寸，裁掉滚动条，再按 CSS 滚动位置
拼接。不符合支持模型的尺寸异常会报错。覆盖率只说明几何高度，固定页头、覆盖层、
动态页面与重复内容仍需人工查看，不能用高度比替代图片验收。

本演示不证明真实 Jev 请求、生产网站、原生桌面应用或其他操作系统已经适配。接口或
输出不符时参照[故障排查](TROUBLESHOOTING.zh-CN.md)，公开反馈仅使用脱敏的合成材料。
