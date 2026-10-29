# Jiang Hu · 个人作品集网站 PRD

- 文档版本：v3.0
- 更新日期：2026-10-29
- 项目类型：Node.js + Express + MySQL 动态个人作品集 + 管理后台
- 本地地址：http://localhost:3000/
- 本地后台：http://localhost:3000/admin/login
- 静态 fallback：https://hujiang888.github.io/

## 1. 背景与目标

### 1.1 背景

第一版网站是纯静态 HTML。老师指出：网站不能只是静态展示，应该能在管理后台直接修改数据。

尝试过 Git CMS（GitHub 仓库当数据库、Token 登录）后，确认这不是想要的形式。当前改为传统 Web 架构：

- Node.js + Express 提供服务端。
- MySQL 存储站点、技能、项目和文章。
- EJS 服务端渲染前台。
- 管理员通过 `/admin/login` 登录，在后台表单中增删改查。
- 修改后刷新前台即可看到变化。

### 1.2 目标

1. 有一个真正的管理后台 UI，而不是改 JSON / 改 HTML。
2. 数据存在 MySQL，刷新页面后仍然存在。
3. 前台由服务端渲染，不是写死在 HTML 里。
4. 保留原有浅色编辑风格与内容。
5. 在本机可以直接启动、演示、继续维护。

## 2. 用户与场景

| 用户 | 需求 |
| --- | --- |
| 访客 | 浏览首页、项目、文章，联系作者 |
| 管理员（Jiang Hu） | 登录后台，修改站点信息、技能、项目、文章 |
| 课程老师 / 评审 | 查看前台、后台 UI、数据库表，确认数据确实来自 MySQL |

典型场景：

1. 管理员登录后台，修改首屏简介，保存，刷新首页立即更新。
2. 新增技能，首页技能区出现新卡片。
3. 新建项目，填写封面、标签、数据与详情 HTML，首页与项目详情页更新。
4. 新建文章，填写 slug 与正文，通过 `/post/slug` 访问。
5. 删除一条测试数据，前台同步消失。

## 3. 信息架构

```text
公开站点（Express + EJS）
├── /                         首页
├── /post/:slug               文章详情
├── /project/:slug            项目详情
└── 404

管理后台（session 登录）
├── /admin/login              登录
├── /admin                    概览
├── /admin/profile            站点信息
├── /admin/about              关于
├── /admin/skills             技能（列表 + 新增 + 编辑 + 删除）
├── /admin/projects           项目列表
├── /admin/projects/new       新建项目
├── /admin/projects/:id/edit  编辑项目
├── /admin/posts              文章列表
├── /admin/posts/new          新建文章
└── /admin/posts/:id/edit     编辑文章

MySQL：jianghu_portfolio
├── site_settings
├── skills
├── projects
├── posts
└── admin_users
```

## 4. 功能需求

### 4.1 公开站点

| 编号 | 功能 | 优先级 |
| --- | --- | --- |
| F-01 | 首页首屏：姓名、身份、方向、简介、索引卡 | MVP |
| F-02 | 关于：段落、原则、NOW、时间线，来自 MySQL | MVP |
| F-03 | 技能：按数据库顺序渲染卡片 | MVP |
| F-04 | 项目：精选大卡 + 普通卡片；链接、标签、数据 | MVP |
| F-05 | 项目详情：封面、指标、正文、外链 | MVP |
| F-06 | 笔记列表：数据库文章 | MVP |
| F-07 | 文章详情：标题、摘要、正文、目录、进度、上下篇 | MVP |
| F-08 | 联系区：GitHub、复制用户名 | MVP |
| F-09 | 响应式 320–1440px | MVP |
| F-10 | 移动菜单、滚动高亮、进入视口动画 | MVP |
| F-11 | 404 页面 | Should |

### 4.2 管理后台

| 编号 | 功能 | 优先级 |
| --- | --- | --- |
| A-01 | 管理员用户名 + 密码登录 | MVP |
| A-02 | bcrypt 密码校验、session 会话、退出 | MVP |
| A-03 | 所有 POST 表单 CSRF 校验 | MVP |
| A-04 | 概览：技能 / 项目 / 文章数量、最近文章 | MVP |
| A-05 | 站点信息：名称、身份、简介、元信息、GitHub、联系区 | MVP |
| A-06 | 关于：段落、原则、NOW、时间线 | MVP |
| A-07 | 技能：新增、编辑、删除 | MVP |
| A-08 | 项目：列表、新建、编辑、删除、精选、详情 HTML | MVP |
| A-09 | 文章：列表、新建、编辑、删除 | MVP |
| A-10 | 表单校验：必填、slug 格式与唯一性 | MVP |
| A-11 | 保存后 flash 提示 | MVP |
| A-12 | 后台移动端可用 | Should |

### 4.3 不在本期范围

- 多管理员、角色权限、审核流。
- 图片上传（图片先放入 `assets/img/`，后台填写路径）。
- 评论、点赞、统计、邮件订阅。
- 草稿 / 定时发布。
- 线上 Node 部署（需要服务器与数据库托管）。

## 5. 数据设计

### 5.1 表

- `site_settings`：单行；`about_*` 为 JSON 字符串。
- `skills`：标题、熟练度、说明、标签 JSON、排序。
- `projects`：slug、标题、副标题、kicker、描述、标签 JSON、数据 JSON、链接、精选、封面、详情 HTML。
- `posts`：slug、标题、日期、阅读时间、分类、摘要、正文 HTML。
- `admin_users`：用户名、bcrypt 哈希。

### 5.2 数据规则

- slug 只允许字母、数字、连字符，且唯一。
- `featured=1` 的项目出现在首页精选位。
- 文章正文与项目详情 HTML 输出前必须经过白名单清洗。
- 所有 SQL 使用参数化查询。

## 6. 设计规范

- 浅色暖纸：`#f6f2e9` 背景、`#fffdf8` 卡片、`#1f211d` 墨色、`#b44a2c` 陶土、`#4d6453` 深绿。
- 标题衬线、正文无衬线、标签等宽。
- 首页保持原有编辑感；后台使用侧栏 + 表单卡片。
- 320 / 390 / 768 / 1024 / 1440 为验收宽度。

## 7. 非功能需求

### 7.1 安全

- 密码使用 bcrypt，不存明文。
- session cookie `httpOnly`、`sameSite=lax`。
- 所有 POST 请求校验 CSRF token。
- HTML 正文白名单清洗，移除 script / iframe / on* / javascript:。
- `.env` 不提交；数据库应用账号只授权本库。
- 后台 `noindex`。

### 7.2 性能

- 服务端渲染，无需前端框架。
- 首页 4 个技能、3 个项目、3 篇文章，查询量很小。
- 图片懒加载。
- 静态资源由 Express 提供，生产可加缓存头。

### 7.3 可维护性

- 表结构与 seed 脚本可重建数据库。
- 路由按资源拆分，模板按页面拆分。
- 部署到其他机器只需 Node、MySQL、`.env` 和 `npm install`。

## 8. 验收标准

- [ ] `http://localhost:3000/` 可打开，内容来自 MySQL。
- [ ] `/admin/login` 登录成功，错误密码有提示。
- [ ] 站点信息、关于、技能、项目、文章均可修改。
- [ ] 新增 / 删除技能后前台立即变化。
- [ ] 新建 / 编辑 / 删除项目后首页与详情页正确。
- [ ] 新建 / 编辑 / 删除文章后 `/post/:slug` 正确。
- [ ] 退出后无法访问 `/admin`。
- [ ] 320–1440px 无横向滚动，控制台无错误。
- [ ] `.env`、数据库密码、session secret 不在仓库中。

## 9. 里程碑

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| M1 | 回滚 Git CMS，恢复静态站点 | 已完成 |
| M2 | MySQL 建库、建表、导入内容 | 已完成 |
| M3 | Express + EJS 前台 | 已完成 |
| M4 | 登录、session、CSRF | 已完成 |
| M5 | 技能 / 项目 / 文章 CRUD | 已完成 |
| M6 | 浏览器验收与文档 | 已完成 |
| M7 | 部署到公网 Node 服务器 | 待服务器 |

## 10. 部署说明

当前动态版本运行在本机：

```powershell
cd server
npm.cmd start
```

GitHub Pages 上保留的是静态 fallback，不能运行 Node/MySQL。若要公网访问动态版本，需要：

- 一台支持 Node 的服务器（或 Render / Railway / 云服务器）。
- 一个可远程访问的 MySQL（或服务器本机 MySQL）。
- 配置 `.env`、反向代理与 HTTPS。
