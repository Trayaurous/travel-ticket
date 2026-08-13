# Web fonts

本目录包含 Travel Ticket 在 macOS、iOS、Android 与 Windows 浏览器中使用的本地 WOFF2 字体。字体文件按 Unicode 范围分段，浏览器只会下载当前文字所需的分段。

| 界面选项 | Web 字体 | 版本 | 授权 |
| --- | --- | --- | --- |
| System Sans | Noto Sans SC Variable | 5.3.0 | SIL Open Font License 1.1 |
| Caveat Script | Caveat Variable | 5.3.0 | SIL Open Font License 1.1 |
| Ticket Mono | JetBrains Mono Variable | 5.3.0 | SIL Open Font License 1.1 |
| Editorial Serif | Noto Serif SC Variable | 5.3.0 | SIL Open Font License 1.1 |
| 马善政体 | Ma Shan Zheng | 5.3.0 | SIL Open Font License 1.1 |
| 龙藏体 | Long Cang | 5.3.0 | SIL Open Font License 1.1 |

字体由 Fontsource 的 npm 发布包获取。每个字体子目录均保留其原始 `LICENSE` 文件。项目运行时不依赖 npm，也不需要访问外部字体 CDN。

这里只保留网页所需的 WOFF2；TTF/OTF 桌面字体未加入，以减少仓库与移动端传输体积。

界面中的四种通用字体应用于全部字符；选择“毛笔手写”或“行草艺术”时，仅汉字分别改用 Ma Shan Zheng 或 Long Cang，英文字母、数字和标点继续使用当前通用字体。
