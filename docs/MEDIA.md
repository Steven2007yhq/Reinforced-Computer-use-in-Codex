# Public media provenance

The six assets below are intentional exceptions to the repository's default
exclusion of screenshots and recordings. They were reviewed visually for private
information. The release scanner checks exact paths, file signatures, and size
limits; it does not detect secrets inside images.

| Asset | Origin and processing |
| --- | --- |
| `demo-full.png` | Actual synthetic local browser run through Codex CUA and the long-page helper; screenshot dimensions normalized before stitching |
| `demo-top.png`, `demo-bottom.png` | Actual first/last long-page viewport JPEGs, decoded to PNG without adding or removing UI content |
| `demo-preview.gif` | Edited sequence of actual demo viewports; 960 × 620 with explanatory captions, 8 frames/second |
| `demo-video.mp4` | Same sequence, 960 × 620, 10 frames/second, H.264; 30 seconds of presentation time |
| `social-preview.png` | AI-generated project illustration, resized to 1280 × 640 for GitHub sharing; not a screenshot or evidence of functionality |

The screenshot sequence uses the landing page, the long-page top, consecutive
scroll positions, and the bottom. Pauses were edited for readability. Captions
say it is an edited sequence and not real-time. No Jev call, account page,
credential, private file path, or native desktop application appears in it.

The social card is an independent project illustration. Its abstract browser
tiles do not depict a tested application. Its title and feature labels are
descriptive; they do not claim an official endorsement, universal compatibility,
or measured speedup.

## Final social-card generation prompt

The built-in image generation tool produced the illustration using this prompt;
the opaque output was then resized with FFmpeg to GitHub's 1280 × 640 card size.

> Use case: ads-marketing. Asset: GitHub repository social preview card, landscape 2:1, ideally exactly 1280 x 640 pixels, opaque background. Create an original sophisticated minimalist developer-tool editorial graphic for an independent open-source integration. Navy charcoal background, restrained teal accents, crisp large highly legible white typography, generous padding. Exact main title split over two lines: "Reinforced Computer Use" and "for Codex". Exact subtitle: "Bounded UI workflows. Optional Jev planning." Three small feature labels: "Windows-first" / "Local plans: no API key" / "Long-page capture". Right-hand simple symbolic sequence of browser-page tiles connected by observe -> act -> verify arrows; abstract illustration, no fabricated screenshot, no actual app logos, no official OpenAI/Jev endorsement, no performance claim, no badge implying all apps compatible. Flat clean vector-like aesthetic rendered as PNG, no noisy textures so file remains small, title takes clear visual priority, no watermarks, no private information.

## 中文说明

演示图片来自实际运行的本地合成网页，GIF/MP4 是这些视口截图的剪辑，展示时长不等于
执行时间。长图通过截图辅助器归一尺寸后拼接；顶部、底部图片仅做 JPEG 到 PNG 转换。
分享卡片是 AI 生成的项目插图，不属于功能验收证据。公开素材不含私人账户、凭据、
个人目录或真实桌面应用。新增素材仍需人工审阅，发布检查不会识别图像中的敏感内容。
