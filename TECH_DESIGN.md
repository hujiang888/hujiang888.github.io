# 胡江 · 个人作品集 技术设计文档

- 文档版本：v1.0
- 更新日期：2026-10-27
- 对应 PRD：`PRD.md`
- 线上地址：https://hujiang888.github.io/

## 1. 设计目标

在满足 PRD 的前提下，用尽可能少的运行依赖交付一个**加载快、可维护、可直接部署**的个人作品集：

- 纯静态：HTML + CSS + 原生 JavaScript，无前端框架、无构建步骤。
- 无后端：项目、文章、个人信息都写在静态页面中。
- 易部署：GitHub 仓库根目录即站点根目录，推送到 `main` 后由 GitHub Pages 发布。
- 易维护：一套 CSS 变量控制全站视觉；新增文章只需复制模板并更新列表。
- 可验证：使用 Playwright 检查响应式、交互、链接与无报错。

## 2. 技术选型

| 层 | 选型 | 理由 |
| --- | --- | --- |
| 页面 | 语义化 HTML5 | SEO 友好、无运行时开销 |
| 样式 | 原生 CSS + CSS 变量 | 设计 Token 集中管理，避免 Tailwind 构建依赖 |
| 交互 | 原生 JavaScript（ES2020） | 导航、滚动动画、复制、阅读进度足够轻量 |
| 字体 | 系统中文字体栈 | 无外部字体请求，首屏更快、离线可用 |
| 图片 | 本地压缩 PNG / SVG | 无 CDN，避免第三方失效 |
| 部署 | GitHub Pages | 免费、HTTPS、与 GitHub 仓库自动联动 |
| 测试 | Playwright（仅本地 QA） | 多视口、交互与链接检查 |

### 2.1 为什么不用 React / Vite

本站页面数量少、内容以静态展示为主，没有登录、后台、复杂状态或数据请求。引入 React + Vite 会增加构建产物、依赖升级与部署配置成本，却不会带来明显收益。

如果后续需要文章搜索、标签筛选、后台编辑或评论，再迁移到 Astro / Next.js 等方案；当前 MVP 选择更简单、更可靠的原生静态栈。

## 3. 项目结构

```text
portfolio/
├── index.html                     # 首页：Hero / 关于 / 技能 / 项目 / 笔记 / 联系
├── posts/
│   ├── imagegrab-retrospective.html
│   ├── git-pages-deploy.html
│   └── llm-training-notes.html
├── projects/
│   └── imagegrab.html             # ImageGrab 项目详情
├── assets/
│   ├── css/style.css              # 全站样式与设计 Token
│   ├── js/main.js                 # 全站交互
│   ├── js/post.js                 # 文章页阅读进度
│   └── img/
│       ├── logo.svg
│       ├── favicon.svg
│       ├── og-cover.png
│       ├── imagegrab-gallery.png
│       └── imagegrab-fab.png
├── PRD.md
├── TECH_DESIGN.md
├── AGENTS.md
├── README.md
├── .nojekyll
└── .gitignore
```

## 4. 页面与路由

站点是「静态多页」而不是单页应用：

| 路径 | 内容 | 渲染方式 |
| --- | --- | --- |
| `/` | 首页全部区块 | 静态 HTML |
| `/projects/imagegrab.html` | 项目详情 | 静态 HTML |
| `/posts/*.html` | 文章详情 | 静态 HTML |
| 不存在路径 | GitHub Pages 默认 404 | 静态 404（可选） |

导航锚点：`#about`、`#skills`、`#work`、`#notes`、`#contact`。首页和文章页共享顶部导航与页脚，但文章页使用阅读版式（更窄的内容列、阅读进度、上下篇）。

## 5. 样式架构

### 5.1 Token

所有颜色、间距、字体、圆角、阴影集中在 `:root`：

```css
:root {
  --paper: #f6f2e9;
  --surface: #fffdf8;
  --ink: #1f211d;
  --muted: #6f6a5f;
  --line: #ddd6c7;
  --accent: #b44a2c;
  --accent-deep: #4d6453;
  --highlight: #eadfc9;
  --serif: "STZhongsong", "Songti SC", "SimSun", Georgia, serif;
  --sans: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
}
```

### 5.2 布局

- `.container`：最大宽度 1180px，左右 `clamp(20px, 4vw, 56px)`。
- 首页区块：编号小标题 + 大字号衬线标题 + 两栏内容。
- 网格：`repeat(12, 1fr)` 的桌面栅格，移动端降为单列。
- 文章页：内容列 `min(760px, 100%)`，行高 1.9，适合长文阅读。

### 5.3 响应式断点

| 断点 | 调整 |
| --- | --- |
| ≤ 1024px | 首屏索引卡缩小，项目网格改为两列 |
| ≤ 768px | 导航折叠为菜单，首屏单列，技能与项目单列 |
| ≤ 480px | 标题字号进一步缩小，按钮全宽，隐藏装饰性元素 |

### 5.4 动效

- 使用 IntersectionObserver 添加 `.is-visible`，CSS 负责淡入上移。
- 仅对 `.reveal` 元素生效，避免全站重排。
- `prefers-reduced-motion: reduce` 时直接显示全部内容。

## 6. JavaScript 设计

`assets/js/main.js`：

1. `initNav()`：移动端菜单开关、点击链接关闭、Esc 关闭、滚动锁定。
2. `initHeader()`：滚动超过 8px 时给导航加 `.is-scrolled`。
3. `initScrollSpy()`：监听首页区块，更新导航当前项。
4. `initReveal()`：IntersectionObserver 控制进入视口动画。
5. `initCopy()`：复制 GitHub 用户名，显示 1.8s 反馈。
6. `initYear()`：页脚年份自动更新。

`assets/js/post.js`（文章页）：

1. 顶部阅读进度条：按 `scrollY / (documentHeight - viewportHeight)` 计算。
2. 如果文章有目录（`.post-toc`），点击目录项平滑滚动并更新高亮。

所有脚本使用 IIFE 与 `'use strict'`，不依赖全局变量；不使用 `innerHTML` 插入用户输入。

## 7. 内容模型

本站不接数据库，内容以静态 HTML 表达。为保持一致性，每个项目 / 文章遵循固定信息：

**项目字段**

- 编号、标题、副标题、年份、类型
- 简介、技术标签、亮点（2～3 条）
- 链接：线上地址、源码、案例页
- 封面图与 alt

**文章字段**

- 编号、标题、摘要、发布日期、阅读时长、标签
- 正文标题层级：h1 → h2 → h3
- 文末：上一篇 / 下一篇 / 返回首页

新增文章流程：

1. 复制 `posts/` 下任意文章作为模板。
2. 修改 title、description、canonical、正文与元信息。
3. 在首页 `#notes` 列表添加一张卡片。
4. 本地打开检查后提交。

## 8. 性能设计

- 无框架、无外部字体、无 CDN；首屏只有 HTML/CSS/JS 与少量图片。
- 首屏图片使用固定宽高，避免 CLS；非首屏图片 `loading="lazy"`。
- 项目截图压缩到 1200px 宽；OG 图 1200×630。
- CSS 单文件，约 30KB；JS 单文件，约 3KB。
- 目标：Lighthouse 移动端 Performance ≥ 90，LCP < 2.5s（GitHub Pages 网络环境下）。

## 9. SEO

- 每页独立 `<title>` 与 `<meta name="description">`。
- `link rel="canonical"` 指向正式域名。
- Open Graph：`og:title`、`og:description`、`og:image`、`og:url`。
- 首页 JSON-LD：`Person` + `WebSite`；文章页 `BlogPosting`。
- 语义化标题层级与图片 alt。
- `robots.txt` + `sitemap.xml`。

## 10. 部署

### 10.1 仓库

- GitHub 用户名：`hujiang888`
- 用户站仓库：`hujiang888.github.io`
- 默认分支：`main`
- 站点根目录：仓库根目录
- 域名：https://hujiang888.github.io/

### 10.2 发布流程

```bash
git add .
git commit -m "content: ..."
git push origin main
```

GitHub Pages 使用 `main` 分支根目录构建；`docs` 不需要。仓库根目录的 `.nojekyll` 防止 Jekyll 忽略以下划线开头的文件。

### 10.3 首次配置

1. 创建公开仓库 `hujiang888.github.io`。
2. 推送站点文件。
3. 在 Settings → Pages 选择 `Deploy from a branch`，分支 `main`，目录 `/ (root)`。
4. 等待 1～3 分钟，访问 https://hujiang888.github.io/ 验证。

### 10.4 验证清单

- [ ] 首页 200，HTTPS 正常
- [ ] 320/390/768/1024/1440 无横向滚动
- [ ] 移动端菜单可操作
- [ ] 所有项目与文章链接 200
- [ ] 控制台无报错
- [ ] OG 图与 favicon 加载

## 11. 测试方案

### 11.1 本地静态服务

```bash
python -m http.server 8080
```

访问 http://localhost:8080。

### 11.2 Playwright 检查

- 5 个视口宽度：320 / 390 / 768 / 1024 / 1440。
- 检查 `scrollWidth <= innerWidth`。
- 点击移动端菜单，验证展开 / 收起与链接跳转。
- 滚动首页，验证导航高亮与 `.reveal.is-visible`。
- 打开项目详情与 3 篇文章，验证标题、阅读进度、返回链接。
- 收集 console error 与 pageerror。
- 检查所有内部 `href` / `src` 文件存在。

### 11.3 视觉检查

- 首页桌面 / 移动端截图。
- 项目详情、文章页截图。
- 检查标题换行、卡片等高、图片裁切、页脚对齐。

## 12. 风险与后续演进

| 风险 | 应对 |
| --- | --- |
| 内容少、显得空 | 用项目详情与真实文章补充信息密度 |
| 图片加载慢 | 压缩、懒加载、限制首屏图片数量 |
| 文章增多后维护困难 | 后续迁移到 Astro / 静态站点生成器 |
| GitHub Pages 缓存 | 修改后强刷；必要时在 URL 加版本参数 |

后续可扩展：文章标签筛选、全文搜索、RSS、深浅色主题切换、404 页面、访问统计（隐私友好）。
