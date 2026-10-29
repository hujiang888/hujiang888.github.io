# AGENTS.md

本文件是「Jiang Hu · 个人作品集」的项目说明与 AI 开发约定。任何 AI 工具（DeepSeek Harness、Cursor、Codex、Copilot 等）在本仓库工作时都应先阅读本文件。

## 1. 项目是什么

一个带管理后台的个人作品集，分为两部分：

- **公开站点**：首页、动态文章页、项目详情页，由 Express 服务端渲染。
- **内容后台**：`/admin/login`，管理员登录后编辑站点信息、关于、技能、项目和文章。
- **数据库**：MySQL `jianghu_portfolio`。
- **静态 fallback**：GitHub Pages 上的 `index.html` / `posts/` / `projects/` 仍保留，作为无 Node 环境时的展示页。

项目目录：`day7/portfolio/`。

## 2. 技术栈（硬性约定）

- Node.js 18+（当前机器 Node 24）+ Express 4。
- MySQL 5.7 / 8.0，驱动 `mysql2`。
- 服务端模板：EJS。
- 登录：`express-session` + `bcryptjs`。
- HTML 清洗：`sanitize-html`。
- 前端：原生 HTML / CSS / JavaScript，不使用 React / Vue / Tailwind / Vite / Webpack。
- 不引入外部字体、CDN、统计脚本、第三方 UI 库。
- 图片仍放在 `assets/img/`，由 Express 通过 `/assets` 提供。

## 3. 本地运行

```powershell
cd server
npm.cmd install
npm.cmd run db:setup
npm.cmd run db:seed
npm.cmd start
```

- 前台：http://localhost:3000/
- 后台：http://localhost:3000/admin/login
- 默认管理员：`admin` / `jianghu2026`（在 `server/.env` 中修改）
- Windows 可双击 `server/start.bat`。

MySQL 服务需先启动。数据库连接信息在 `server/.env`，该文件被 Git 忽略，**不得提交**。

## 4. 目录结构

```text
portfolio/
├── server/
│   ├── app.js                 # Express 路由、登录、CRUD
│   ├── db.js                  # MySQL 连接与查询
│   ├── schema.sql             # 表结构
│   ├── scripts/
│   │   ├── setup-db.js
│   │   └── seed.js
│   ├── seed/
│   │   ├── content.json
│   │   └── project-imagegrab-detail.html
│   ├── views/
│   │   ├── index.ejs / post.ejs / project.ejs
│   │   ├── partials/
│   │   └── admin/
│   ├── public/
│   │   ├── admin.css
│   │   └── admin.js
│   ├── .env                   # 本地配置，禁止提交
│   ├── .env.example
│   ├── package.json
│   └── start.bat
├── index.html                 # GitHub Pages 静态 fallback
├── posts/                     # 旧静态文章
├── projects/                  # 旧静态项目详情
├── assets/                    # CSS / JS / 图片，由 Express 和 Pages 共用
├── PRD.md
├── TECH_DESIGN.md
└── AGENTS.md
```

## 5. 数据库

数据库名 `jianghu_portfolio`，字符集 `utf8mb4`。

| 表 | 用途 |
| --- | --- |
| `site_settings` | 单行站点信息、关于、联系区 |
| `skills` | 技能卡片 |
| `projects` | 项目卡片与项目详情 HTML |
| `posts` | 文章 |
| `admin_users` | 管理员账号与 bcrypt 密码哈希 |

- `site_settings` 的 `about_*` 字段存 JSON 字符串。
- `skills.tags`、`projects.tags`、`projects.facts` 存 JSON 字符串。
- 文章 `content_html` 与项目 `detail_html` 存 HTML，输出前必须清洗。
- 所有 SQL 使用参数化查询，不要拼接用户输入。

## 6. 后台与安全

- 登录：`/admin/login`，session cookie `jianghu.sid`，8 小时过期。
- 密码：bcrypt 哈希，不存明文。
- CSRF：所有 POST 表单必须带 `_csrf`，服务端 `verifyCsrf` 校验。
- 会话：本地使用 MemoryStore；服务重启后需要重新登录。生产环境应换成 MySQL/Redis session store。
- 正文：`sanitize-html` 白名单，禁止 script / iframe / on* / javascript:。
- `.env` 含数据库密码与 session secret，必须保留在 `.gitignore` 中。
- 不在客户端 JS 中写数据库密码或管理员密码。
- 后台页面 `noindex`，公开站点不链接敏感配置。

## 7. 视觉规范

- **只做浅色主题**：暖纸底 `#f6f2e9`、卡片 `#fffdf8`、墨色 `#1f211d`、陶土 `#b44a2c`、深绿 `#4d6453`。
- 标题系统中文字体衬线栈；正文系统无衬线栈。
- 大留白、细线、编号章节、克制圆角。
- 后台沿用同一套色板，使用更紧凑的表单与侧栏。
- 不使用深色星空、霓虹渐变、玻璃拟态。

## 8. 编码约定

- HTML 语义化；每页唯一 `h1`。
- EJS 输出文本用 `<%= %>`；只有经过清洗的正文才用 `<%- %>`。
- 图片有 `alt` 与 `width` / `height`；非首屏 `loading="lazy"`。
- JS 使用 IIFE + `'use strict'`；不引入依赖。
- 外链 `target="_blank" rel="noreferrer"`。
- 新增字段必须同步：`schema.sql` → `db.js` / 路由 → EJS 表单 → 前台模板。
- 删除/修改前先读代码，不要覆盖用户内容。

## 9. 内容真实性

- 只写 Jiang Hu 真实做过的项目与学习内容。
- 不虚构公司、实习、奖项、客户、论文或数据。
- 不写「精通」「专家」；使用「日常使用」「课程实践」「持续学习」。
- 联系方式只使用公开 GitHub `hujiang888`。
- 项目指标必须来自实际测试或仓库记录。

## 10. 修改与验收流程

1. 数据/路由改动后运行 `npm.cmd start`，检查前台和后台。
2. 检查 320 / 390 / 768 / 1024 / 1440 宽度无横向滚动。
3. 检查登录、CSRF、增删改查、退出。
4. 检查前台刷新后立即反映数据库修改。
5. 检查控制台无错误、内部链接无 404。
6. 修改完成后提交 Git；不要提交 `.env`、`node_modules`、日志。
7. GitHub Pages 上的静态版本需要单独推送；Node 版本需要部署到支持 Node + MySQL 的服务器。

## 11. 禁止事项

- 不要把数据库密码、`.env`、session secret 提交到仓库。
- 不要用字符串拼接 SQL。
- 不要直接把后台 HTML 未经清洗输出到前台。
- 不要删除 `PRD.md`、`TECH_DESIGN.md`、`AGENTS.md`、`server/schema.sql`。
- 不要引入前端框架、构建工具或外部 CDN。
- 不要直接改写 `main` 历史或强推。
