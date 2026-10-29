# Jiang Hu · 个人作品集 技术设计文档

- 文档版本：v3.0
- 更新日期：2026-10-29
- 对应 PRD：`PRD.md`
- 架构：Node.js + Express + MySQL + EJS
- 本地地址：http://localhost:3000/
- 后台：http://localhost:3000/admin/login

## 1. 设计目标

在保留原有浅色编辑风格的前提下，把网站升级为真正的动态应用：

1. 前台由 Express 服务端渲染，内容来自 MySQL。
2. 后台有独立登录和表单 UI，支持增删改查。
3. 数据持久化，刷新、重启后仍然存在。
4. 不引入前端框架和构建工具，保持可读、可维护。
5. 本地可运行，后续可迁移到支持 Node + MySQL 的服务器。

## 2. 总体架构

```text
浏览器
├── GET /                     → Express → MySQL → EJS 首页
├── GET /post/:slug           → Express → MySQL → EJS 文章
├── GET /project/:slug        → Express → MySQL → EJS 项目
└── /admin/*
      ├── GET 登录页 / 表单页
      ├── POST 登录 / 保存 / 删除
      └── session + CSRF + bcrypt

server/
├── app.js       路由、认证、CRUD、模板渲染
├── db.js        mysql2 连接池与查询
├── views/       EJS 前台 + 后台
├── public/      后台 CSS / JS
├── schema.sql   表结构
├── scripts/     setup-db.js / seed.js
└── seed/        初始内容
```

请求生命周期：

1. `express.static` 先处理 `/assets`、`/admin-assets`。
2. `express-session` 建立会话。
3. 全局中间件读取 `site_settings`，注入 `site`、`admin`、`flash`、`csrf`。
4. 路由查询 MySQL 并渲染 EJS。
5. 后台 POST 先校验 CSRF，再写库，写入 flash，重定向。

## 3. 技术栈

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 运行时 | Node.js 18+（当前 24） | 本机已安装 |
| Web | Express 4 | 路由与中间件 |
| 数据库 | MySQL 5.7 / 8.0 | 本机 MySQL57 |
| 驱动 | mysql2/promise | 连接池、参数化查询 |
| 模板 | EJS | 服务端渲染、无构建 |
| 会话 | express-session | 默认 MemoryStore |
| 密码 | bcryptjs | 纯 JS，避免原生编译 |
| 清洗 | sanitize-html | 正文白名单 |
| 后台 UI | 原生 CSS | 与前台共用设计 Token |

不引入 React / Vue / Tailwind / Vite / Webpack / 外部 CDN。

## 4. 数据库设计

数据库：`jianghu_portfolio`，字符集 `utf8mb4`。

### 4.1 site_settings

单行（`id=1`）：

- 站点：`profile_name`、`profile_en`、`role`、`focus`、`lead`、`meta`、`status`、`location`、`doing`、`updated`、`github`、`github_name`
- 关于：`about_intro`、`about_paragraphs`、`about_values`、`about_now`、`about_timeline`
- 联系：`contact_intro`、`contact_note`
- `about_*` 以 JSON 字符串保存数组/对象。

### 4.2 skills

```sql
id, sort_order, title, level, description, tags, created_at, updated_at
```

`tags` 为 JSON 数组字符串。

### 4.3 projects

```sql
id, sort_order, slug, title, subtitle, kicker, description,
tags, facts, live_url, repo_url, detail_url, featured,
cover, cover_alt, cover_class, cover_word, cover_note,
detail_html, created_at, updated_at
```

- `tags` / `facts` 为 JSON 字符串。
- `featured=1` 一个项目出现在首页精选位。
- `detail_html` 为项目详情正文，输出前清洗。
- `cover` 是 `assets/img/...` 相对路径或外链。

### 4.4 posts

```sql
id, sort_order, slug, title, date_text, read_time, category, excerpt,
content_html, created_at, updated_at
```

### 4.5 admin_users

```sql
id, username, password_hash, created_at
```

密码使用 bcrypt 10 轮哈希。

## 5. 路由

### 5.1 公开

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/` | 首页：site + skills + projects + posts |
| GET | `/post/:slug` | 文章详情，上一篇/下一篇 |
| GET | `/project/:slug` | 项目详情；无详情时跳转详情链接 |

### 5.2 登录

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/admin/login` | 登录页 |
| POST | `/admin/login` | 校验 CSRF、用户名、bcrypt 密码；regenerate session |
| POST | `/admin/logout` | 销毁 session |

### 5.3 后台

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/admin` | 概览 |
| GET/POST | `/admin/profile` | 站点信息 |
| GET/POST | `/admin/about` | 关于 |
| GET | `/admin/skills` | 技能列表 |
| POST | `/admin/skills` | 新增技能 |
| POST | `/admin/skills/:id` | 更新技能 |
| POST | `/admin/skills/:id/delete` | 删除技能 |
| GET | `/admin/projects` | 项目列表 |
| GET | `/admin/projects/new` | 新建表单 |
| POST | `/admin/projects` | 创建 |
| GET | `/admin/projects/:id/edit` | 编辑表单 |
| POST | `/admin/projects/:id` | 更新 |
| POST | `/admin/projects/:id/delete` | 删除 |
| GET | `/admin/posts` | 文章列表 |
| GET | `/admin/posts/new` | 新建表单 |
| POST | `/admin/posts` | 创建 |
| GET | `/admin/posts/:id/edit` | 编辑表单 |
| POST | `/admin/posts/:id` | 更新 |
| POST | `/admin/posts/:id/delete` | 删除 |

## 6. 认证与安全

### 6.1 登录

1. 登录页渲染 CSRF token。
2. POST 校验 `_csrf`。
3. 查询 `admin_users`，`bcrypt.compare` 校验密码。
4. `req.session.regenerate()`，写入 `req.session.admin`。
5. 重定向 `/admin`。

`requireAuth` 保护所有 `/admin` 页面；未登录跳转登录页。

### 6.2 会话

- cookie 名：`jianghu.sid`
- `httpOnly: true`
- `sameSite: 'lax'`
- 8 小时过期
- 本地 MemoryStore；重启服务需要重新登录。生产环境建议替换为 MySQL/Redis store。

### 6.3 CSRF

- 中间件为每个 session 生成 `csrf`。
- 所有 POST 表单包含 `<input type="hidden" name="_csrf">`。
- `verifyCsrf` 比较 `req.body._csrf` 与 `req.session.csrf`，失败返回 403。

### 6.4 HTML 清洗

`sanitizeBody()` 使用 `sanitize-html`：

- 允许：`h2 h3 p ul ol li strong em blockquote pre code a figure figcaption img br hr`
- 允许属性：`a[href target rel]`、`h2/h3[id]`、`img[src alt width height loading]`
- 限制协议：http、https、mailto
- 移除 script、iframe、on*、javascript:、data:
- 外链自动加 `target="_blank" rel="noreferrer"`

### 6.5 密钥

- `.env` 保存数据库连接、session secret、管理员初始账号。
- `.env` 在 `.gitignore` 中，不提交。
- 数据库应用账号只授权 `jianghu_portfolio.*`，不使用 root。

## 7. 模板与前端

### 7.1 公共 partials

- `partials/head.ejs`：meta、OG、CSS、favicon。
- `partials/header.ejs`：导航、品牌、GitHub。
- `partials/footer.ejs`：页脚、年份、`main.js`、可选 `post.js`。
- `partials/sprite.ejs`：SVG 图标。

### 7.2 页面

- `index.ejs`：Hero / 关于 / 技能 / 项目 / 笔记 / 联系。
- `post.ejs`：文章详情、目录、阅读进度、上下篇。
- `project.ejs`：项目详情、指标、正文、链接。
- `error.ejs`：404 / 500。

### 7.3 后台

- `admin/login.ejs`
- `admin/dashboard.ejs`
- `admin/profile.ejs`
- `admin/about.ejs`
- `admin/skills.ejs`
- `admin/projects.ejs`
- `admin/project-form.ejs`
- `admin/posts.ejs`
- `admin/post-form.ejs`

后台 CSS 在 `server/public/admin.css`，复用前台设计 Token；`admin.js` 只负责删除确认。

## 8. 初始化与运行

### 8.1 数据库

```sql
CREATE DATABASE jianghu_portfolio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'jianghu_app'@'127.0.0.1' IDENTIFIED BY 'change-me';
GRANT ALL PRIVILEGES ON jianghu_portfolio.* TO 'jianghu_app'@'127.0.0.1';
FLUSH PRIVILEGES;
```

`.env`：

```ini
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=jianghu_app
DB_PASSWORD=change-me
DB_NAME=jianghu_portfolio
SESSION_SECRET=long-random-string
ADMIN_USER=admin
ADMIN_PASSWORD=jianghu2026
```

### 8.2 命令

```powershell
cd server
npm.cmd install
npm.cmd run db:setup
npm.cmd run db:seed
npm.cmd start
```

- `db:setup`：执行 `schema.sql`，写入/更新管理员 bcrypt 哈希。
- `db:seed`：导入 `seed/content.json` 与项目详情；会清空 skills/projects/posts。
- `npm.cmd run dev`：`node --watch`。
- `start.bat`：双击启动。

## 9. 测试

### 9.1 手工验收

- 登录成功 / 失败。
- 未登录访问 `/admin` 跳转。
- 错误 CSRF 返回 403。
- 技能、项目、文章增删改。
- 修改后刷新前台立即生效。
- 320 / 390 / 768 / 1024 / 1440 无横向滚动。
- 控制台无错误。

### 9.2 自动化验收（本地）

用 Playwright：

1. 打开首页，检查 `h1`、技能数、文章链接。
2. 打开文章 / 项目页，检查目录与正文。
3. 登录后台，检查概览统计。
4. 新增测试技能 → 首页出现 → 删除。
5. 修改 `doing` → 首页出现 → 恢复。
6. 项目 / 文章编辑页原样保存，检查 flash。

## 10. 部署

### 10.1 当前状态

- 动态版本：本机 `http://localhost:3000`，MySQL57 服务。
- GitHub Pages：保留回滚后的静态 fallback，不能运行 Node/MySQL。

### 10.2 若要公网部署

需要：

1. 支持 Node 的服务器（Render / Railway / 云服务器）。
2. 可访问的 MySQL 数据库（或服务器本机 MySQL）。
3. 设置环境变量（不要提交 `.env`）。
4. 反向代理与 HTTPS。
5. 生产环境替换 MemoryStore session，配置备份。

## 11. 已知限制

- 本地使用 MemoryStore，多进程/重启会丢失登录状态。
- 图片上传未实现，封面需手动放入 `assets/img/`。
- 没有草稿、定时发布、版本回滚。
- MySQL 5.7 不支持部分新语法，SQL 保持兼容。
- Node 动态版本尚未部署公网。
