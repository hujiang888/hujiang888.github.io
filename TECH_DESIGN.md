# Jiang Hu · 个人作品集 技术设计文档

- 文档版本：v2.0
- 更新日期：2026-10-29
- 对应 PRD：`PRD.md`
- 线上地址：https://hujiang888.github.io/
- 后台地址：https://hujiang888.github.io/admin/

## 1. 设计目标

在 GitHub Pages 的静态托管约束下，交付一个**有后台、可改数据、可发布、可追溯**的个人作品集：

- 内容与展示分离：内容存 `data/content.json`，前台读取后渲染。
- 后台可视化编辑：无需改 HTML，登录后修改站点信息、技能、项目、文章。
- 无独立服务器：用 GitHub 仓库作为内容库，用 Contents API 作为写入接口。
- 版本可追溯：每次后台保存生成一个 Git commit，可回滚。
- 保持性能与视觉：不引入框架、构建工具、外部字体与 CDN。
- 可验证：本地 mock API + 真实 Token 两条链路。

## 2. 架构

```text
┌──────────────────────────────┐
│ 访客浏览器                    │
│ index.html / post.html        │
│  ├─ fetch data/content.json   │
│  └─ content.js / post-page.js │
└──────────────┬───────────────┘
               │ HTTPS
┌──────────────▼───────────────┐
│ GitHub Pages（静态托管）       │
│ HTML / CSS / JS / JSON / 图片 │
└──────────────▲───────────────┘
               │ 构建
┌──────────────┴───────────────┐
│ GitHub 仓库 main 分支          │
│ data/content.json + 页面文件   │
└──────────────▲───────────────┘
               │ Contents API（读 / 写）
┌──────────────┴───────────────┐
│ admin/ 内容后台               │
│  ├─ GitHub Token 登录         │
│  ├─ 表单 / JSON 编辑          │
│  └─ PUT + sha 并发校验        │
└──────────────────────────────┘
```

### 2.1 为什么是 Git CMS

GitHub Pages 只提供静态文件，不能运行 Node / PHP / 数据库。可选的路线有三种：

| 路线 | 问题 |
| --- | --- |
| 继续纯静态 | 不满足“后台改数据” |
| 另租服务器 + 数据库 | 需要额外账号、费用、运维；当前没有可用凭据 |
| Git CMS | 无需服务器，GitHub 即内容库；有登录、CRUD、版本与发布 |

选择 Git CMS 的取舍：

- 优点：零服务器、免费、HTTPS、版本历史、后台改动可审计。
- 代价：每次保存是一个 commit，发布有 1–2 分钟延迟；写入依赖 GitHub Token；不适合多用户协作编辑。
- 边界：如果课程硬性要求 Node/Express + MySQL，需要另配服务器与数据库；当前版本不伪装。

### 2.2 技术选型

| 层 | 选型 | 理由 |
| --- | --- | --- |
| 页面 | 语义化 HTML5 | SEO 与首屏稳定 |
| 样式 | 原生 CSS + CSS 变量 | 设计 Token 集中管理 |
| 前台交互 | 原生 JavaScript（ES2020） | 轻量、无构建 |
| 内容数据 | JSON | 结构清晰，前后台共用 |
| 后台 | 原生 JS + Fetch | 直接调用 GitHub Contents API |
| 认证 | GitHub Fine-grained PAT | 最小权限，不新增账号体系 |
| 富文本 | HTML + DOMParser 白名单清洗 | 保留排版，控制 XSS |
| 部署 | GitHub Pages | 与仓库自动联动 |
| 测试 | Playwright（本地 QA） | 多视口、后台 mock、交互检查 |

## 3. 项目结构

```text
portfolio/
├── index.html                     # 首页：静态 fallback + content.js 数据渲染
├── post.html                      # 动态文章页：?slug=...
├── projects/
│   └── imagegrab.html             # ImageGrab 项目详情（静态案例页）
├── posts/                         # 旧版静态文章，noindex，保留兼容
├── admin/
│   ├── index.html                 # 后台登录 / 工作台
│   └── admin.css                  # 后台样式
├── data/
│   └── content.json               # 唯一内容源
├── assets/
│   ├── css/style.css              # 全站样式与设计 Token
│   ├── js/main.js                 # 导航、滚动、复制、年份
│   ├── js/content.js              # 首页读取 JSON 并渲染
│   ├── js/post-page.js            # 动态文章页 + 清洗 + 目录
│   ├── js/post.js                 # 旧静态文章页交互
│   ├── js/admin.js                # 后台登录、表单、保存
│   └── img/
├── PRD.md
├── TECH_DESIGN.md
├── AGENTS.md
├── README.md
├── robots.txt
├── sitemap.xml
├── 404.html
└── .nojekyll
```

## 4. 页面与路由

| 路径 | 内容 | 渲染 |
| --- | --- | --- |
| `/` | 首页全部区块 | 静态 HTML 首屏 + `content.js` 按 JSON 更新 |
| `/post.html?slug=...` | 文章详情 | `post-page.js` 读取 JSON 渲染 |
| `/projects/imagegrab.html` | 项目详情 | 静态 HTML |
| `/admin/` | 内容后台 | 登录后由 `admin.js` 渲染表单 |
| 不存在路径 | 404 | 静态 `404.html` |

首页保留完整静态内容作为 **fallback**：`fetch` 失败、JS 关闭或本地 `file://` 打开时，页面仍然可读。JSON 加载成功后，`content.js` 更新首屏、关于、技能、项目、笔记与联系文案。

## 5. 数据模型

`data/content.json`：

```json
{
  "meta": { "version": 2, "updatedAt": "2026-10-29" },
  "profile": {
    "name": "Jiang Hu",
    "en": "JIANG HU",
    "role": "物联网工程学生",
    "focus": "前端与 AI 应用",
    "lead": "……",
    "school": "物联网工程 · 2024 级",
    "status": "开放课程项目与合作",
    "location": "大连 · 中国",
    "doing": "ImageGrab v1.1",
    "updated": "2026.10.27",
    "github": "https://github.com/hujiang888",
    "githubName": "hujiang888"
  },
  "about": {
    "intro": "……",
    "paragraphs": ["……"],
    "values": ["先跑通，再打磨"],
    "now": ["……"],
    "timeline": [{ "date": "2024.09", "title": "……", "desc": "……" }]
  },
  "skills": [
    { "title": "前端", "level": "日常使用", "desc": "……", "tags": ["HTML"] }
  ],
  "projects": [
    {
      "slug": "imagegrab",
      "title": "图提取",
      "subtitle": "ImageGrab",
      "kicker": "2026 · BROWSER EXTENSION",
      "desc": "……",
      "tags": ["Manifest V3"],
      "facts": [{ "label": "版本", "value": "v1.1.0" }],
      "links": { "live": "……", "repo": "……", "detail": "……" },
      "featured": true,
      "cover": "assets/img/imagegrab-feature.png",
      "coverAlt": "……",
      "coverClass": "project-cover--site",
      "coverWord": "HJ.",
      "coverNote": "HTML / CSS / JS"
    }
  ],
  "posts": [
    {
      "slug": "imagegrab-retrospective",
      "title": "……",
      "date": "2026.10.26",
      "readTime": "7 MIN",
      "category": "工程复盘",
      "excerpt": "……",
      "content": "<h2 id=\"problem\">……</h2><p>……</p>"
    }
  ],
  "contact": { "intro": "……", "note": "……" }
}
```

### 5.1 字段约定

- `profile.school` 实际承载首屏元信息，不一定真的是学校。
- `projects` 中第一个 `featured: true` 渲染为首屏精选大卡；其余渲染为卡片。
- `projects[].links.detail` 可为站内相对路径，也可为空。
- `posts[].slug` 只允许字母、数字、连字符；后台保存前会校验唯一性。
- `posts[].content` 是 HTML 字符串，动态页清洗后插入。
- `about.timeline` 最后一条自动加 `timeline__now` 样式。
- 所有数组顺序即展示顺序。

## 6. 前台渲染

### 6.1 首页 `content.js`

1. `fetch('data/content.json?t=...', { cache: 'no-store' })`。
2. 失败：`console.warn`，保留静态 DOM，不阻塞页面。
3. 成功：
   - `renderProfile()`：首屏、索引卡、页脚、页面 title / meta。
   - `renderAbout()`：段落、原则、NOW、时间线。
   - `renderSkills()`：按数组重建技能卡。
   - `renderProjects()`：`featured` 渲染大卡，其余渲染 `project-card`。
   - `renderNotes()`：文章行，链接到 `post.html?slug=...`。
   - `renderContact()`：联系文案。
4. 所有文本经 `esc()` 转义；项目卡片封面字允许 `<br>` 作为设计数据。

### 6.2 动态文章 `post-page.js`

1. 读取 `?slug=`，加载 JSON，找不到则显示 404 文案。
2. 更新 `document.title`、description、canonical、OG、BlogPosting JSON-LD。
3. 正文经过 `sanitize()`：
   - 允许标签：`h2 h3 p ul ol li strong em blockquote pre code a figure figcaption img br hr`。
   - 移除 `script/style/iframe/object/embed/form/input/button/...`。
   - 只保留 `a[href]`、`img[src alt width height loading]`、`h2/h3[id]`。
   - `href/src` 只允许 http(s)、mailto、相对路径、锚点；拒绝 `javascript:` / `data:`。
   - 外链自动加 `target="_blank" rel="noreferrer"`。
4. 从 `h2` 生成目录；缺失 id 自动补 `section-N`。
5. 阅读进度条 + 目录 IntersectionObserver 高亮。
6. 上下篇根据数组顺序生成。

### 6.3 旧静态文章

`posts/*.html` 保留兼容，但：

- `<meta name="robots" content="noindex, follow">`。
- canonical 指向 `post.html?slug=...`。
- 首页不再链接旧页面。

## 7. 后台 `admin.js`

### 7.1 登录

```text
输入 Token
  → GET https://api.github.com/user       验证身份
  → GET /repos/{owner}/{repo}/contents/data/content.json
  → Base64 解码 → JSON.parse
  → 渲染工作台
```

- Token 存 `sessionStorage`，key `jianghu_admin_token`。
- 刷新页面可自动恢复；关闭标签页清除。
- 退出立即删除。
- 不写 `localStorage`、不写 URL、不写 cookie。

### 7.2 表单

- 站点信息、关于、技能、项目、文章、高级 JSON 六个栏目。
- 字段用 `data-scope` / `data-index` / `data-key` / `data-parse` 标记。
- `collectAll()` 只收集当前栏目，避免未渲染栏目被空数组覆盖。
- 列表增删前先 `collectAll()`，防止丢失当前编辑。
- 文章使用“左侧列表 + 右侧编辑器”，切换文章前 `readPostEditor()`。
- 标签按中英文逗号 / 顿号拆分；数据按 `label | value` 行解析；时间线按 `date | title | desc`。

### 7.3 保存

```text
点击保存
  → 若在高级 JSON：先 JSON.parse 校验
  → 收集当前栏目
  → 校验文章 slug 唯一
  → PUT /repos/{owner}/{repo}/contents/data/content.json
     body: { message, content: base64(JSON), sha, branch: "main" }
  → 更新 sha
  → 显示 commit 链接 + Pages 提示
```

- 使用 `sha` 做乐观并发控制；409 时提示重新载入，不覆盖。
- 401 / 403 提示 Token 或 Contents 权限问题。
- 保存成功后 `meta.updatedAt` 更新为当天。
- Base64 使用 `TextEncoder` 分块编码，避免 `btoa` 中文报错。

### 7.4 安全

- 后台页面公开但 `noindex`；`robots.txt` Disallow `/admin/`。
- 写权限完全由 GitHub Token 控制；没有 Token 只能看登录页。
- 不在任何前端文件写 Token。
- 动态正文清洗后才插入 DOM。
- 所有表单输出 `esc()`。

## 8. 样式架构

- `assets/css/style.css`：前台；`:root` Token；BEM 类名；响应式断点 1080 / 920 / 640 / 380。
- `admin/admin.css`：后台；复用 Token 与 `.btn`；登录页、工具栏、标签、表单、文章分栏、移动端。
- 后台 `[hidden] { display:none !important; }`，避免 `.login { display:grid }` 覆盖 hidden。
- 表单输入、文本域、按钮焦点样式统一；后台不使用外部 UI 库。

## 9. SEO

- 首页、项目页静态 title / description / canonical / OG。
- 动态文章由 JS 更新 title、description、canonical、OG、BlogPosting。
- 旧静态文章 noindex + canonical 动态页。
- `sitemap.xml` 使用 `/post.html?slug=...`。
- `robots.txt` 禁止 `/admin/`。
- 首页 JSON-LD：Person + WebSite。

## 10. 性能

- 首页不引入框架、外部字体、CDN。
- `content.json` 约 22KB；CSS 约 40KB；JS 三个文件合计约 20KB。
- 首屏只加载 logo；项目截图懒加载。
- 后台仅登录后才渲染表单，减少初始 DOM。
- 目标：Lighthouse 移动端 Performance ≥ 90；LCP < 2.5s。

## 11. 部署

### 11.1 仓库

- 仓库：`hujiang888/hujiang888.github.io`
- 分支：`main`
- 站点根目录：仓库根目录
- 域名：https://hujiang888.github.io/
- 后台：https://hujiang888.github.io/admin/

### 11.2 发布流程

```bash
git add .
git commit -m "feat: ..."
git push origin main
```

GitHub Pages 使用 `main` 根目录构建；`.nojekyll` 关闭 Jekyll 处理。

### 11.3 后台保存流程

1. 打开 `/admin/`。
2. 生成 Fine-grained Token：仅本仓库，Contents Read and write。
3. 登录、修改、保存。
4. GitHub 生成 commit；Pages 约 1–2 分钟构建。
5. 前台刷新验证。

### 11.4 验证清单

- [ ] 首页 200，HTTPS 正常。
- [ ] `data/content.json` 200，UTF-8 正常。
- [ ] 后台登录成功，SHA 显示。
- [ ] 保存后 commit 出现，Pages 构建完成。
- [ ] 前台显示新内容。
- [ ] 320–1440px 无横向滚动。
- [ ] 控制台无报错，内部链接无 404。

## 12. 测试方案

### 12.1 前台

- 320 / 390 / 768 / 1024 / 1440 视口。
- `scrollWidth <= innerWidth`。
- 首页 JSON 渲染后的姓名、段落数、技能数、项目数、文章链接。
- 动态文章：标题、目录、清洗后的 `<strong>`、上下篇、阅读进度。
- 移动菜单、复制、返回链接。
- 所有内部 `href` / `src` 200。

### 12.2 后台 mock

用 Playwright 拦截 `api.github.com`：

- `/user` 返回登录名。
- GET contents 返回本地 JSON 的 Base64。
- PUT 捕获请求体，Base64 解码后校验 `profile.name`、`skills` 等。
- 验证登录、切换栏目、添加技能、保存、提示。

### 12.3 真实链路

- 用真实 Token 登录线上后台。
- 修改一个无风险字段（如 `profile.updated`）。
- 保存，确认 commit、Pages 构建、前台变化。
- 验证 Token 未出现在仓库 / 页面源码。

## 13. 风险与后续

| 风险 | 应对 |
| --- | --- |
| Token 泄露 | 最小权限、sessionStorage、泄露即撤销 |
| 409 覆盖 | sha 校验，提示重新载入 |
| 动态 HTML XSS | 白名单清洗 |
| Pages 延迟 | 提示构建时间，强刷 |
| JSON 写坏 | 保存前 parse 校验；Git 回滚 |
| 老师要求 Node/MySQL | 说明 Git CMS 边界；如必须，另加服务端与数据库部署 |

后续可扩展：

- 图片上传（GitHub API 写 `assets/img/`）。
- 草稿 / 发布状态字段。
- 版本对比与一键回滚。
- 文章 Markdown 编辑 + 预览。
- RSS、搜索、标签筛选。
- 如果需要传统后端：Express + SQLite/MySQL + JWT，部署到 Render / Railway / 云服务器，前台改为调用 REST API。
