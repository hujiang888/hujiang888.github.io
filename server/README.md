# Jiang Hu · Portfolio Server

Express + MySQL 版本的动态个人作品集与内容后台。

## 启动

前置：Node.js 18+、MySQL 5.7/8.0，MySQL 服务已启动。

```powershell
cd server
npm.cmd install
npm.cmd run db:setup
npm.cmd run db:seed
npm.cmd start
```

Windows 也可以双击 `start.bat`。

- 前台：http://localhost:3000/
- 后台：http://localhost:3000/admin/login
- 默认管理员：`admin` / `jianghu2026`（在 `server/.env` 中修改后重新运行 `npm.cmd run db:setup`）

## 数据库

数据库名：`jianghu_portfolio`，字符集 `utf8mb4`。

首次使用需要创建数据库与应用账号（把密码换成你自己的）：

```sql
CREATE DATABASE jianghu_portfolio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'jianghu_app'@'127.0.0.1' IDENTIFIED BY 'change-me';
GRANT ALL PRIVILEGES ON jianghu_portfolio.* TO 'jianghu_app'@'127.0.0.1';
FLUSH PRIVILEGES;
```

然后把连接信息写入 `server/.env`（参考 `.env.example`）。`.env` 已被 `.gitignore` 忽略，不要提交。

表结构：

- `site_settings`：站点信息、关于、联系区（单行）
- `skills`：技能
- `projects`：项目卡片与详情
- `posts`：文章
- `admin_users`：管理员，密码使用 bcrypt 哈希

## 常用命令

```powershell
npm.cmd start       # 启动
npm.cmd run dev     # node --watch 自动重启
npm.cmd run db:setup # 建表 + 写入/更新管理员
npm.cmd run db:seed  # 导入 seed 目录内容（会清空 skills/projects/posts 后重建）
```

`db:seed` 会覆盖这三张表的现有数据；日常修改请在后台进行，不要重复 seed。

## 目录

```text
server/
├── app.js              # Express 路由、登录、CRUD
├── db.js               # MySQL 连接与查询
├── schema.sql          # 表结构
├── scripts/
│   ├── setup-db.js
│   └── seed.js
├── seed/
│   ├── content.json
│   └── project-imagegrab-detail.html
├── views/              # EJS 前台与后台
├── public/admin.css    # 后台样式
└── public/admin.js     # 删除确认
```

## 说明

- 前台由 Express 服务端渲染，修改后台后刷新即可看到变化。
- 后台使用 session + CSRF + bcrypt 登录。
- 正文 HTML 在输出前用 `sanitize-html` 白名单清洗。
- GitHub Pages 上仍保留静态版本；Node 动态版本需要运行本服务，或部署到支持 Node + MySQL 的服务器。
