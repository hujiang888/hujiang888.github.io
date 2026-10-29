# Jiang Hu · 个人作品集

一个带内容后台的浅色个人作品集。前台是纯 HTML / CSS / JavaScript，内容统一存放在 `data/content.json`；后台通过 GitHub Contents API 修改数据，保存后自动生成 commit，由 GitHub Pages 发布。

- **线上地址**：https://hujiang888.github.io/
- **内容后台**：https://hujiang888.github.io/admin/
- **GitHub 仓库**：https://github.com/hujiang888/hujiang888.github.io
- **代表项目**：https://hujiang888.github.io/imagegrab/

![Jiang Hu · 个人作品集](assets/img/og-cover.png?v=2)

## 这个版本有什么不同

v1 是纯静态页面：改一段简介要改 HTML。v2 把内容抽成了数据，并加了后台：

- 首页、关于、技能、项目、笔记、联系都从 `data/content.json` 渲染。
- 文章改为动态页 `post.html?slug=...`，后台新增文章后即可访问。
- `/admin/` 提供登录、表单编辑、添加/删除、高级 JSON 编辑。
- 保存会写入 GitHub 仓库，生成 Git commit，Pages 自动构建。
- 每次修改都有版本记录，可回滚。

这是一个 **Git-based CMS**，不是 Node + MySQL 后台。原因是本站部署在 GitHub Pages，不能运行服务端进程；GitHub 仓库承担了内容库与版本库的角色。如果课程明确要求传统服务端，需要额外提供服务器/数据库账号。

## 页面与目录

- 首页：Hero、关于、技能、项目、笔记、联系
- 动态文章：`post.html?slug=imagegrab-retrospective` 等
- 项目详情：`projects/imagegrab.html`
- 内容后台：`admin/`
- 数据文件：`data/content.json`
- 文档：`PRD.md`、`TECH_DESIGN.md`、`AGENTS.md`

```text
.
├── index.html
├── post.html
├── admin/
│   ├── index.html
│   └── admin.css
├── data/
│   └── content.json
├── posts/                  # 旧版静态文章（noindex，保留兼容）
├── projects/
├── assets/
│   ├── css/style.css
│   ├── js/main.js
│   ├── js/content.js
│   ├── js/post-page.js
│   ├── js/admin.js
│   └── img/
├── PRD.md
├── TECH_DESIGN.md
├── AGENTS.md
├── robots.txt
├── sitemap.xml
├── 404.html
└── .nojekyll
```

## 本地预览

在本目录运行：

```bash
python -m http.server 8080
```

访问：

- 前台：http://localhost:8080/
- 后台：http://localhost:8080/admin/

不要直接双击 `index.html` 测试后台：`file://` 下 `fetch` 会失败，页面会退回静态版本。

## 后台怎么用

1. 打开 https://hujiang888.github.io/admin/
2. 生成 GitHub **Fine-grained Personal Access Token**：
   - 进入 GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens。
   - Repository access 只选择 `hujiang888/hujiang888.github.io`。
   - Permissions → Contents 设为 **Read and write**。
3. 把 Token 填进后台，点击“登录并载入内容”。
4. 修改站点信息 / 技能 / 项目 / 文章。
5. 点击“保存并发布”，等待 GitHub Pages 构建 1–2 分钟。
6. 刷新前台查看。

Token 只存在当前标签页的 `sessionStorage`，关闭页面即清除；不会写入仓库。后台页面是公开的，但没有 Token 只能看到登录页，写操作由 GitHub 权限校验。

## 内容更新（开发者方式）

也可以直接改 `data/content.json` 后提交：

```bash
git add data/content.json
git commit -m "content: 更新内容"
git push origin main
```

数据结构见 `TECH_DESIGN.md` 第 5 节。新增文章时，`slug` 只能包含字母、数字和连字符，且不能重复。

## 部署

仓库名：`hujiang888.github.io`，默认分支 `main`，站点根目录为仓库根目录。

```bash
git add .
git commit -m "feat: 更新网站"
git push origin main
```

在 GitHub 仓库的 **Settings → Pages** 中选择 `Deploy from a branch`，分支 `main`，目录 `/ (root)`。等待构建后访问 https://hujiang888.github.io/。

`.nojekyll` 用于关闭 Jekyll 处理，保证 JSON 与静态资源按原样发布。

## 设计说明

- 浅色主题：米白纸面、陶土色强调、深绿辅助。
- 标题使用系统中文字体衬线栈，正文使用系统无衬线栈。
- 不使用外部字体、CDN、统计脚本或第三方 UI。
- 响应式断点：1020 / 920 / 640 / 380px。
- 支持键盘导航、skip link、`prefers-reduced-motion`。

## 说明

站内所有项目与时间线均来自本人课程实践与个人项目；ImageGrab 的测试数据来自本地模拟详情页，不代表真实平台的全量表现。引用或转载请联系作者。
