# AGENTS.md

本文件是「Jiang Hu · 个人作品集」的项目说明与 AI 开发约定。任何 AI 工具（DeepSeek Harness、Cursor、Codex、Copilot 等）在本仓库工作时都应先阅读本文件。

## 1. 项目是什么

一个纯静态的个人作品集网站，包含：

- 首页：Hero、关于、技能、项目、笔记、联系。
- 项目详情：`projects/imagegrab.html`。
- 三篇文章：`posts/*.html`。
- 文档：`PRD.md`、`TECH_DESIGN.md`、本文件。

线上地址：https://hujiang888.github.io/

## 2. 技术栈（硬性约定）

- HTML5 + CSS3 + 原生 JavaScript（ES2020）。
- **不使用** React、Vue、Tailwind、Vite、Webpack 等框架或构建工具。
- **不引入**外部字体、CDN、统计脚本、第三方 UI 库。
- 图片全部存放在 `assets/img/`，使用本地资源。
- 部署：GitHub Pages，仓库 `hujiang888.github.io`，`main` 分支根目录。

## 3. 本地运行

无需安装依赖，直接打开 `index.html`，或在仓库根目录运行：

```bash
python -m http.server 8080
```

访问 http://localhost:8080。

## 4. 目录结构

```text
.
├── index.html                 # 首页
├── posts/                     # 文章页
├── projects/                  # 项目详情页
├── assets/
│   ├── css/style.css          # 全站样式
│   ├── js/main.js             # 首页与全站交互
│   ├── js/post.js             # 文章页交互
│   └── img/                   # 图片、logo、favicon、OG 图
├── PRD.md
├── TECH_DESIGN.md
└── AGENTS.md
```

## 5. 视觉规范

- **只做浅色主题**：暖纸底 `#f6f2e9`、卡片 `#fffdf8`、墨色文字 `#1f211d`、陶土强调 `#b44a2c`、深绿辅助 `#4d6453`。
- 标题使用系统中文字体衬线栈（STZhongsong / Songti SC / SimSun / Georgia）。
- 正文使用系统无衬线栈（PingFang SC / Microsoft YaHei）。
- 大留白、细线分隔、编号章节、克制的圆角（12～20px）。
- 不使用深色星空、霓虹渐变、玻璃拟态等与个人风格不符的效果。
- 所有颜色、间距、字体、圆角优先使用 `:root` 中的 CSS 变量。

## 6. 编码约定

- HTML 语义化：`header`、`nav`、`main`、`section`、`article`、`footer`。
- 每个页面必须有唯一 `h1`，标题层级连续。
- 图片必须有 `alt` 与 `width` / `height`；非首屏图片加 `loading="lazy"`。
- CSS 类名使用小写 + 连字符，采用 BEM 风格（如 `.project-card__title`）。
- JavaScript 使用 IIFE + `'use strict'`，不污染全局；不引入依赖。
- 不使用 `innerHTML` 写入用户输入；复制、菜单等交互必须防重复绑定。
- 所有外链加 `target="_blank" rel="noreferrer"`。
- 新增页面必须补齐 title、description、canonical、OG 标签。

## 7. 内容真实性与边界

- 只写 Jiang Hu 真实做过的项目与学习内容。
- 不虚构公司、实习、奖项、客户、论文或数据。
- 项目指标必须来自实际测试或仓库记录；不确定的数字不要写。
- 不写「精通」「专家」等无法证明的措辞，使用「日常使用」「课程实践」「持续学习」等描述。
- 联系方式只使用公开 GitHub（`hujiang888`），不虚构邮箱或电话。
- 引用他人文章、图片须注明来源；当前项目图片来自本地生成素材或本人项目截图。

## 8. 修改流程

1. 先读 `PRD.md` 与 `TECH_DESIGN.md`，确认改动属于当前范围。
2. 只改必要文件，避免无关格式化。
3. 修改后在本地起服务，用浏览器检查 320 / 390 / 768 / 1024 / 1440 宽度。
4. 检查控制台无报错、所有内部链接可访问。
5. 完成一个功能或一篇文章后提交一次 Git，提交信息写清楚改动。
6. 推送 `main` 后等待 GitHub Pages 更新，并验证线上 URL。

## 9. 验收清单

- [ ] 首屏在桌面与手机均完整，无横向滚动。
- [ ] 移动端菜单可开、可关、点击链接自动收起。
- [ ] 导航高亮、滚动动画、复制按钮正常。
- [ ] 项目详情与三篇文章可打开，阅读进度正常。
- [ ] 所有图片加载成功，alt 完整。
- [ ] 控制台无错误，链接无 404。
- [ ] 修改 HTML 后线上页面已更新。

## 10. 禁止事项

- 不要添加后端、数据库、登录、评论、统计脚本。
- 不要引入框架、构建工具或外部 CDN。
- 不要把站点改成深色主题。
- 不要删除 `PRD.md`、`TECH_DESIGN.md`、`AGENTS.md`。
- 不要提交 `node_modules`、测试截图缓存或临时文件。
- 不要直接在 `main` 上重写历史或强推。
