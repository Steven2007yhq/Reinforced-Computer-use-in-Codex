# Announcement drafts / 宣传文案草稿

These are editable drafts for the maintainer. They have not been sent to any community or person. Pair a post with the actual demo and check the repository/release links before publishing. Do not turn the screenshot sequence duration into an execution-time claim.

以下为维护者可修改的草稿，尚未向任何社区或个人发送。发布时搭配实际演示，并核对仓库与版本链接；不要把截图序列的播放时长写成任务耗时。

## English: Codex / automation community

**Title:** I open-sourced my Windows-first Codex Computer Use helper, with a reproducible no-key demo

I use Codex for tasks that involve several interface steps, so I packaged my local workflow helper as an MIT-licensed plugin.

Reinforced Computer Use follows a scoped plan, reads UI state again before each action, and verifies the destination locally. It also captures long browser pages by scrolling and stitching viewport images. Jev planning is optional; the default local mode needs no API key.

The repository includes a synthetic local page you can run with `npm run demo`. The example opens “Long page,” captures 12 marked sections, and checks the first section and footer. The README's GIF is an edited screenshot sequence, not a real-time speed test.

This is Windows-first and needs an already enabled Codex Computer Use surface. The plugin cannot enable browser/native access. Native application support and real Jev provider access are separate from this local browser example.

- [Repository, installation, and language switch](https://github.com/Steven2007yhq/Reinforced-Computer-use-in-Codex)
- [Reproduce the demo](https://github.com/Steven2007yhq/Reinforced-Computer-use-in-Codex/blob/main/docs/DEMO.md)
- [Release notes](https://github.com/Steven2007yhq/Reinforced-Computer-use-in-Codex/releases)

I'd be interested in feedback from people who already use Codex Computer Use: could you install it and reproduce the same local task? A sanitized issue with your environment and the step that failed would help improve the first-use experience.

## 中文：Codex / Windows 自动化社区

**标题：** 我把 Windows 上使用的 Codex Computer Use 辅助插件开源了，附无需 Key 的本地复现演示

我平时会用 Codex 完成多步界面操作，于是把自己的流程辅助模块整理成了 MIT 开源插件 Reinforced Computer Use。

它可以按限定范围的本地计划执行，每步重新读取界面状态，再用本地条件检查结果；也可以逐屏捕获和拼接长网页。默认本地模式不需要 API Key，Jev 决策是可选项。

仓库提供合成测试页：运行 `npm run demo`，让 Codex 打开“Long page”、捕获 12 个带标记章节，再检查首节和页脚。README 的 GIF 是实际截图的编辑序列，不是实时测速。

当前以 Windows 为主要平台，需要 Codex 已经提供 Computer Use 接口；插件不能启用浏览器或原生权限。本地浏览器演示与原生应用兼容性、真实 Jev 提供商权限是分别验证的事项。

- [仓库、安装说明与语言切换](https://github.com/Steven2007yhq/Reinforced-Computer-use-in-Codex)
- [复现演示](https://github.com/Steven2007yhq/Reinforced-Computer-use-in-Codex/blob/main/docs/DEMO.zh-CN.md)
- [版本说明](https://github.com/Steven2007yhq/Reinforced-Computer-use-in-Codex/releases)

欢迎已经在用 Codex Computer Use 的朋友试一下同一个本地任务。如果安装或执行卡住，可以用脱敏 issue 反馈环境和失败步骤，帮助改善首次使用体验。

## Short post / 短文案

**English**

I open-sourced a Windows-first Codex Computer Use helper: scoped local plans, long-page capture, and optional Jev planning. The no-key local demo includes 12 marked sections to inspect. Requires an already enabled CUA surface. MIT license; EN/中文 README and first-use guides. [Try the demo](https://github.com/Steven2007yhq/Reinforced-Computer-use-in-Codex).

**中文**

开源了一个 Windows 优先的 Codex Computer Use 辅助插件：限定范围的本地计划、长网页截图、可选 Jev 决策。附无需 Key 的本地演示与 12 个章节标记，可自己核对结果。需要现有 CUA 接口，MIT 许可，完整中英文 README。[仓库与演示](https://github.com/Steven2007yhq/Reinforced-Computer-use-in-Codex)。

## Adapt the post to its readers / 按读者调整

| Audience / 读者 | Useful emphasis / 适合展示 |
| --- | --- |
| Codex users / Codex 用户 | Installation, required interfaces, and the same first task / 安装、接口前提、同一个首次任务 |
| Windows automation users / Windows 自动化用户 | Browser versus native conditions and device limits / 浏览器与原生条件、设备限制 |
| AI agent developers / AI agent 开发者 | Scoped actions, fresh state, local verification, and metadata boundary / 动作范围、新状态、本地验证、元数据边界 |
| English-speaking developers / 英语开发者 | English README, reproduction guide, release notes / 英文 README、复现指南、版本说明 |

Choose a small number of relevant communities you already participate in and follow their posting rules. Invite a few users to run the same fixture before a broader post. Use GitHub Traffic and actual installation feedback to decide what to improve; do not imply that stars or successful installation are guaranteed.

先选少量已参与且与项目相关的社区，遵循发帖规则。可以先邀请几位用户运行同一演示，再扩大分享；结合 GitHub Traffic 与实际安装反馈决定后续改进，不承诺 Star 或安装结果。
