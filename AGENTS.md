# AGENTS.md

本文件是「Jiang Hu · 个人作品集」的项目说明与 AI 开发约定。任何 AI 工具（DeepSeek Harness、Cursor、Codex、Copilot 等）在本仓库工作时都应先阅读本文件。

## 1. 项目是什么

一个带内容后台的个人作品集：

- 首页：Hero、关于、技能、项目、笔记、联系。
- 动态文章页：`post.html?slug=...`。
- 项目详情：`projects/imagegrab.html`。
- 内容后台：`admin/`，登录后修改站点信息、技能、项目和文章。
- 数据文件：`data/content.json`。
- 文档：`PRD.md`、`TECH_DESIGN.md`、本文件。

线上地址：https://hujiang888.github.io/

后台地址：https://hujiang888.github.io/admin/

## 2. 技术栈（硬性约定）

- HTML5 + CSS3 + 原生 JavaScript（ES2020）。
- **不使用** React、Vue、Tailwind、Vite、Webpack 等框架或构建工具。
- **不引入**外部字体、CDN、统计脚本、第三方 UI 库。
- 图片全部存放在 `assets/img/`，使用本地资源。
- 内容存储：GitHub 仓库中的 `data/content.json`。
- 内容读写：GitHub Contents API（浏览器端直连）。
- 后台认证：GitHub Fine-grained Personal Access Token，`Contents: Read and write`。
- 部署：GitHub Pages，仓库 `hujiang888.github.io`，`main` 分支根目录。

### 2.1 为什么是 Git CMS

GitHub Pages 只能托管静态文件，不能运行 Node / PHP / 数据库。本站采用 **Git-based CMS**：

```text
浏览器后台 → GitHub Contents API → data/content.json → Git commit
                                                    ↓
                                             GitHub Pages 构建
                                                    ↓
                                       前台 fetch JSON 并渲染
```

它不是传统 Node + MySQL 后台，但具备真实的后台能力：登录、读取、可视化编辑、保存、版本记录、发布。数据修改不会只停留在浏览器里，而是写入仓库并触发 Pages 更新。

如果课程明确要求“必须使用 Node/Express + MySQL”，需要额外提供可部署的服务器或数据库账号；当前版本不引入这类依赖。

## 3. 本地运行

在仓库根目录运行：

```bash
python -m http.server 8080
```

访问：

- 前台：http://localhost:8080/
- 后台：http://localhost:8080/admin/

不要直接双击 `index.html` 测试后台或数据渲染，`file://` 下 `fetch` 会失败。

## 4. 目录结构

```text
.
├── index.html                  # 首页；含静态 fallback，content.js 会按 JSON 更新
├── post.html                   # 动态文章页，?slug=...
├── projects/
│   └── imagegrab.html          # ImageGrab 项目详情（静态案例页）
├── posts/                      # 旧版静态文章；noindex，保留兼容
├── admin/
│   ├── index.html              # 内容后台
│   ├── admin.css
│   └── ../assets/js/admin.js   # 后台逻辑（通过 ../assets/js/admin.js 引入）
├── data/
│   └── content.json            # 唯一内容数据源
├── assets/
│   ├── css/style.css           # 全站样式
│   ├── js/main.js              # 导航、滚动、复制、年份
│   ├── js/content.js           # 前台读取 JSON 并渲染首页
│   ├── js/post-page.js         # 动态文章页
│   ├── js/post.js              # 旧静态文章页交互（保留）
│   ├── js/admin.js             # 后台登录、表单、保存
│   └── img/                    # 图片、logo、favicon、OG 图
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
- 后台沿用同一套色板，但使用更紧凑的表单布局。

## 6. 数据与安全

- `data/content.json` 是唯一内容源；不要在 HTML 里再手写一份会覆盖它的内容。
- 数据结构见 `TECH_DESIGN.md` 第 5 节；新增字段必须同步 `content.js`、`post-page.js` 和 `admin.js`。
- **Token 绝不能写入仓库、HTML、JSON、日志或提交历史。**
- 后台 Token 只存 `sessionStorage`，关闭标签页即清除；退出时立即删除。
- 不要用 `localStorage` 保存 Token。
- 不要在前台页面放任何写权限 Token。
- 后台使用 GitHub API 的 `sha` 做乐观并发控制；收到 409 必须提示用户重新载入，不能覆盖。
- 后台正文允许 HTML，但动态文章页必须经过 `post-page.js` 的白名单清洗；不要直接 `innerHTML` 渲染未经清洗的内容。
- 后台页面本身是公开静态页，但写操作由 GitHub Token 权限保护；`admin/` 加 `noindex`，`robots.txt` 禁止抓取。

## 7. 编码约定

- HTML 语义化：`header`、`nav`、`main`、`section`、`article`、`footer`。
- 每个页面必须有唯一 `h1`，标题层级连续。
- 图片必须有 `alt` 与 `width` / `height`；非首屏图片加 `loading="lazy"`。
- CSS 类名使用小写 + 连字符，采用 BEM 风格（如 `.project-card__title`）。
- JavaScript 使用 IIFE + `'use strict'`，不污染全局；不引入依赖。
- 不使用 `innerHTML` 写入未转义的用户输入；数据渲染必须经过 `esc()`。
- 所有外链加 `target="_blank" rel="noreferrer"`。
- 新增页面必须补齐 title、description、canonical、OG 标签。
- 后台表单字段变更后，必须同时更新 `collectAll()` 和渲染函数。

## 8. 内容真实性与边界

- 只写 Jiang Hu 真实做过的项目与学习内容。
- 不虚构公司、实习、奖项、客户、论文或数据。
- 项目指标必须来自实际测试或仓库记录；不确定的数字不要写。
- 不写「精通」「专家」等无法证明的措辞，使用「日常使用」「课程实践」「持续学习」等描述。
- 联系方式只使用公开 GitHub（`hujiang888`），不虚构邮箱或电话。
- 引用他人文章、图片须注明来源；当前项目图片来自本地生成素材或本人项目截图。

## 9. 修改流程

1. 先读 `PRD.md` 与 `TECH_DESIGN.md`，确认改动属于当前范围。
2. 只改必要文件，避免无关格式化。
3. 改前台：起本地服务，检查 320 / 390 / 768 / 1024 / 1440 宽度。
4. 改后台：用 mock GitHub API 或真实 Token 走一遍“登录 → 修改 → 保存 → 前台更新”。
5. 检查控制台无报错、所有内部链接可访问、JSON 保存后仍是合法 UTF-8。
6. 完成一个功能或一篇文章后提交一次 Git，提交信息写清楚改动。
7. 推送 `main` 后等待 GitHub Pages 更新，并验证线上 URL 与后台。

## 10. 验收清单

- [ ] 首页、项目详情、三篇文章可打开，320–1440px 无横向滚动。
- [ ] 移动端菜单可开、可关、点击链接自动收起。
- [ ] 首页从 `data/content.json` 渲染；请求失败时保留静态 fallback。
- [ ] 后台能登录、读取内容、切换栏目、修改并保存。
- [ ] 保存后 GitHub 出现新 commit，Pages 更新，前台内容变化。
- [ ] 后台 401 / 403 / 409 有明确提示。
- [ ] Token 不在仓库、HTML、JSON、控制台或日志中。
- [ ] 动态文章页的 HTML 经过白名单清洗。
- [ ] 所有图片加载成功，alt 完整；控制台无错误，链接无 404。

## 11. 禁止事项

- 不要把 Token、密码、私钥写入仓库或任何前端文件。
- 不要引入框架、构建工具或外部 CDN。
- 不要把站点改成深色主题。
- 不要删除 `PRD.md`、`TECH_DESIGN.md`、`AGENTS.md`、`data/content.json`。
- 不要绕过 GitHub `sha` 并发校验强写内容。
- 不要直接渲染后台粘贴的未清洗 HTML。
- 不要提交 `node_modules`、测试截图缓存或临时文件。
- 不要直接在 `main` 上重写历史或强推。
