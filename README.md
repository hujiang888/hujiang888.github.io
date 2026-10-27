# Jiang Hu · 个人作品集

一个浅色、暖纸感、可持续更新的个人作品集。纯静态 HTML / CSS / JavaScript，无框架、无构建步骤，部署在 GitHub Pages。

![Jiang Hu · 个人作品集](assets/img/og-cover.png?v=2)

- **线上地址**：https://hujiang888.github.io/
- **GitHub**：https://github.com/hujiang888
- **代表项目**：https://hujiang888.github.io/imagegrab/

## 页面

- 首页：Hero、关于、技能、项目、笔记、联系
- 项目详情：`projects/imagegrab.html`
- 三篇笔记：`posts/*.html`
- 文档：`PRD.md`、`TECH_DESIGN.md`、`AGENTS.md`

## 本地预览

无需安装依赖，直接双击 `index.html` 即可；或在本目录运行：

```bash
python -m http.server 8080
```

然后访问 <http://localhost:8080>。

## 目录

```text
.
├── index.html
├── posts/
├── projects/
├── assets/
│   ├── css/style.css
│   ├── js/main.js
│   ├── js/post.js
│   └── img/
├── PRD.md
├── TECH_DESIGN.md
├── AGENTS.md
├── robots.txt
├── sitemap.xml
├── 404.html
└── .nojekyll
```

## 设计说明

- 浅色主题：米白纸面、陶土色强调、深绿辅助。
- 标题使用系统中文字体衬线栈，正文使用系统无衬线栈。
- 不使用外部字体、CDN、统计脚本或第三方 UI。
- 响应式断点：1024 / 921 / 640 / 380px。
- 支持键盘导航、skip link、`prefers-reduced-motion`。

## 部署

仓库名：`hujiang888.github.io`，默认分支 `main`，站点根目录为仓库根目录。

```bash
git add .
git commit -m "content: 更新文章"
git push origin main
```

在 GitHub 仓库的 **Settings → Pages** 中选择 `Deploy from a branch`，分支 `main`，目录 `/ (root)`。等待构建后访问 https://hujiang888.github.io/。

`.nojekyll` 用于关闭 Jekyll 处理，保证静态资源按原样发布。

## 内容更新

新增文章：

1. 复制 `posts/` 下任意文章作为模板。
2. 修改 title、description、canonical、正文与日期。
3. 在 `index.html` 的 `#notes` 列表添加卡片。
4. 更新 `sitemap.xml`。
5. 推送并验证线上页面。

## 说明

站内所有项目与时间线均来自本人课程实践与个人项目；ImageGrab 的测试数据来自本地模拟详情页，不代表真实平台的全量表现。引用或转载请联系作者。
