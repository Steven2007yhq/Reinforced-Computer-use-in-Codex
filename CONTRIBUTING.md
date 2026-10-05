# Contributing / 参与贡献

English and Chinese issues and pull requests are welcome. Useful contributions include reproducible installation fixes, clearer examples, compatibility reports, and improvements to bounded UI workflows.

欢迎用中文或英文提交 Issue 和 Pull Request。优先欢迎可复现的安装修复、示例与文档改进、设备兼容性反馈，以及有明确操作范围的界面流程改进。

## Before opening an issue / 提交问题前

- Try the documented local demo and check [compatibility](docs/COMPATIBILITY.md). Browser and native desktop interfaces depend on what your Codex environment exposes.
- Include the plugin version, OS family/version and architecture, Node version, Codex version, and whether a browser/native desktop interface is available. “Unknown” is fine; device names, serial numbers, account names, and private profile paths are unnecessary.
- Give a minimal reproduction and expected/actual results. Prefer synthetic pages and placeholder values. State whether you used the default local plan or optional Jev planning.
- Read [privacy guidance](docs/PRIVACY.md). Remove API keys, authorization headers, bridge tokens, personal content, and private paths from excerpts. Do not upload `.env`, `config.json`, `bridge.json`, raw logs, traces, or screenshots of private apps/accounts.

请先运行文档中的本地演示并阅读兼容性说明。问题报告只需公开的环境信息和最小复现步骤，不需要设备名称、序列号、账号或个人目录。请说明使用本地计划还是可选 Jev 计划，并删除摘录中的密钥、认证头、桥接令牌、个人内容和私人路径。不要上传个人配置、原始日志、运行轨迹或私人应用截图。

## Changing code / 修改代码

Use Node 22 or newer, then run:

```sh
npm ci
npm test
npm run check:release
```

Keep changes focused and describe the user-visible behavior and validation in your pull request. Add a meaningful regression test when changing behavior. Offline fixtures and mocked provider responses are preferred for reproducible tests; live Jev checks are optional and must be clearly identified. Report OS/feature-surface validation only when you actually performed it.

保持修改集中，在 PR 中说明用户可见行为与验证结果。行为变更应补充有意义的回归测试。优先使用离线数据和模拟响应；真实 Jev 验证为可选项，并应明确标注。只报告实际完成的操作系统与接口验证。

## Public demo media / 公开演示素材

The release checker excludes runtime screenshots and recordings. Only these exact filenames are allowed after manual visual and privacy review of synthetic public-demo content:

```text
docs/assets/demo-top.png
docs/assets/demo-bottom.png
docs/assets/demo-full.png
docs/assets/social-preview.png
docs/assets/demo-preview.gif
docs/assets/demo-video.mp4
```

The checker verifies format signatures and file-size limits. It cannot detect private information inside pixels or video frames. Inspect every frame before publication; a passing check does not replace visual review. New media names require an explicit allowlist change and review.

发布检查只允许以上经过人工核对的公开合成演示素材。格式与大小检查不能识别像素或视频帧中的私人信息；发布前必须人工核对所有画面。其他运行截图与录屏仍被排除，新增素材名称必须修改白名单并经过审阅。
