# Jiang Hu · 个人作品集

一个带管理后台的浅色个人作品集：前台由 Express 服务端渲染，内容保存在 MySQL；后台登录后可以直接修改站点信息、关于、技能、项目和文章。

- **本地前台**：http://localhost:3000/
- **本地后台**：http://localhost:3000/admin/login
- **静态 fallback**：https://hujiang888.github.io/
- **GitHub**：https://github.com/hujiang888

![Jiang Hu · 个人作品集](assets/img/og-cover.png?v=2)

## 这一版是什么

- **Node.js + Express + MySQL + EJS**，不是纯静态页面。
- 首页、文章页、项目详情页都从 MySQL 读取数据后由服务端渲染。
- `/admin/login` 是独立管理后台，支持增删改查。
- 修改后台后刷新前台即可看到变化，数据刷新/重启后仍然存在。
- GitHub Pages 上保留回滚后的静态 fallback；动态版本需要运行 Node 服务。

## 快速启动

前置：Node.js 18+、MySQL 5.7/8.0，MySQL 服务已经启动。

```powershell
cd server
npm.cmd install
npm.cmd run db:setup
npm.cmd run db:seed
npm.cmd start
```

也可以双击 `server/start.bat`。

- 前台：http://localhost:3000/
- 后台：http://localhost:3000/admin/login
- 默认管理员：`admin` / `jianghu2026`
- 管理员密码在 `server/.env` 的 `ADMIN_PASSWORD` 中；修改后重新运行 `npm.cmd run db:setup`。

`db:seed` 会清空 `skills` / `projects` / `posts` 后重新导入，日常维护请用后台，不要重复 seed。

## 数据库

数据库：`jianghu_portfolio`，字符集 `utf8mb4`。

首次在另一台机器部署时，用 root 创建数据库与应用账号（密码换成自己的）：

```sql
CREATE DATABASE jianghu_portfolio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'jianghu_app'@'127.0.0.1' IDENTIFIED BY 'change-me';
GRANT ALL PRIVILEGES ON jianghu_portfolio.* TO 'jianghu_app'@'127.0.0.1';
FLUSH PRIVILEGES;
```

然后复制 `server/.env.example` 为 `server/.env`，填入连接信息。`.env` 已被 Git 忽略，不要提交。

表结构：

- `site_settings`：站点信息、关于、联系区
- `skills`：技能
- `projects`：项目卡片与项目详情
- `posts`：文章
- `admin_users`：管理员，密码 bcrypt 哈希

## 后台能改什么

- 站点信息：显示名、英文名、身份、方向、简介、元信息、GitHub、联系区
- 关于：正文、原则、NOW、时间线
- 技能：新增、编辑、删除
- 项目：列表、新建、编辑、删除、精选、封面、数据、详情 HTML
- 文章：列表、新建、编辑、删除

保存后前台刷新即可看到变化。

## 目录

```text
.
├── server/                 # Node + Express + MySQL 应用
│   ├── app.js
│   ├── db.js
│   ├── schema.sql
│   ├── scripts/
│   ├── seed/
│   ├── views/
│   ├── public/
│   ├── .env               # 本地配置，禁止提交
│   ├── .env.example
│   ├── package.json
│   └── start.bat
├── index.html              # GitHub Pages 静态 fallback
├── posts/                  # 旧静态文章
├── projects/               # 旧静态项目详情
├── assets/                 # CSS / JS / 图片
├── PRD.md
├── TECH_DESIGN.md
└── AGENTS.md
```

## 技术栈

- Node.js 18+ / Express 4
- MySQL 5.7 / 8.0 + `mysql2`
- EJS 服务端模板
- `express-session` + `bcryptjs` 登录
- `sanitize-html` 正文白名单
- 原生 CSS / JavaScript，无 React / Vue / Tailwind / Vite / Webpack

## 安全说明

- 数据库密码、session secret 只在 `server/.env`，不提交仓库。
- 管理员密码使用 bcrypt 哈希。
- 所有后台 POST 表单带 CSRF token。
- 文章 / 项目正文输出前经过白名单清洗。
- 后台页面 `noindex`。

## 说明

站内所有项目与时间线均来自本人课程实践与个人项目；ImageGrab 的测试数据来自本地模拟详情页，不代表真实平台的全量表现。

GitHub Pages 上仍是静态展示页，不能运行 Node/MySQL。要让老师从公网访问动态后台，需要把 `server/` 部署到支持 Node + MySQL 的服务器，并配置 HTTPS 与数据库连接。
