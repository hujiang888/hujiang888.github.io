/**
 * 内容后台：GitHub Contents API + 可视化表单。
 * Token 只保存在当前标签页的 sessionStorage，不写入仓库。
 */
(function () {
  'use strict';

  const API = 'https://api.github.com';
  const OWNER = 'hujiang888';
  const REPO = 'hujiang888.github.io';
  const FILE = 'data/content.json';
  const BRANCH = 'main';
  const TOKEN_KEY = 'jianghu_admin_token';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const state = {
    token: sessionStorage.getItem(TOKEN_KEY) || '',
    sha: null,
    data: null,
    tab: 'profile',
    postIndex: 0,
    busy: false,
    dirty: false
  };

  const loginView = $('#loginView');
  const dashboard = $('#dashboard');
  const tokenInput = $('#tokenInput');
  const loginBtn = $('#loginBtn');
  const loginStatus = $('#loginStatus');
  const saveStatus = $('#saveStatus');
  const adminPanel = $('#adminPanel');
  const shaLabel = $('#shaLabel');

  /* ------------------------------- 工具 ------------------------------- */

  const esc = (value) =>
    String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  function toBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function fromBase64(base64) {
    const binary = atob(String(base64).replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function setStatus(el, message, isError = false) {
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('is-error', Boolean(isError));
  }

  function field(label, scope, key, value, options = {}) {
    const index = options.index == null ? '' : ` data-index="${options.index}"`;
    const parse = options.parse ? ` data-parse="${options.parse}"` : '';
    const full = options.full ? ' field--full' : '';
    const common = `data-scope="${scope}" data-key="${key}"${index}${parse}`;
    const control = options.rows
      ? `<textarea rows="${options.rows}" ${common} placeholder="${esc(options.placeholder || '')}">${esc(value)}</textarea>`
      : `<input type="${options.type || 'text'}" ${common} value="${esc(value)}" placeholder="${esc(options.placeholder || '')}" />`;
    return `<label class="field${full}"><span>${label}</span>${control}</label>`;
  }

  function checkField(label, scope, key, checked, index) {
    return `<label class="field field--check">
      <input type="checkbox" data-scope="${scope}" data-key="${key}" data-index="${index}" ${checked ? 'checked' : ''} />
      <span>${label}</span>
    </label>`;
  }

  function splitLines(value) {
    return String(value || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function splitParagraphs(value) {
    return String(value || '')
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }

  function splitTags(value) {
    return String(value || '')
      .split(/[,，、]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  function parseFacts(value) {
    return splitLines(value)
      .map((line) => {
        const [label, ...rest] = line.split('|');
        return { label: (label || '').trim(), value: rest.join('|').trim() };
      })
      .filter((fact) => fact.label && fact.value);
  }

  function parseTimeline(value) {
    return splitLines(value)
      .map((line) => {
        const [date, title, ...rest] = line.split('|');
        return { date: (date || '').trim(), title: (title || '').trim(), desc: rest.join('|').trim() };
      })
      .filter((item) => item.date && item.title);
  }

  /* ------------------------------- API ------------------------------- */

  async function api(path, options = {}) {
    const response = await fetch(API + path, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        Authorization: `Bearer ${state.token}`,
        ...(options.headers || {})
      }
    });

    let body = null;
    try {
      body = await response.json();
    } catch (error) {
      body = null;
    }

    if (!response.ok) {
      const error = new Error((body && body.message) || `GitHub API ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return body;
  }

  async function loadContent() {
    const result = await api(`/repos/${OWNER}/${REPO}/contents/${FILE}?ref=${BRANCH}`);
    if (!result || !result.content) throw new Error('没有找到 data/content.json');
    state.sha = result.sha;
    state.data = JSON.parse(fromBase64(result.content));
    state.postIndex = 0;
    state.dirty = false;
    if (!state.data.profile) throw new Error('内容数据结构不正确：缺少 profile');
    if (!Array.isArray(state.data.skills)) state.data.skills = [];
    if (!Array.isArray(state.data.projects)) state.data.projects = [];
    if (!Array.isArray(state.data.posts)) state.data.posts = [];
    if (!state.data.about) state.data.about = {};
    if (!state.data.contact) state.data.contact = {};
    if (!state.data.meta) state.data.meta = {};
    showDashboard();
    renderTab();
  }

  async function login() {
    const token = (tokenInput.value || '').trim();
    if (!token) {
      setStatus(loginStatus, '请先填入 GitHub Token。', true);
      return;
    }
    if (state.busy) return;

    state.busy = true;
    loginBtn.disabled = true;
    setStatus(loginStatus, '正在验证 Token…');

    try {
      state.token = token;
      const user = await api('/user');
      sessionStorage.setItem(TOKEN_KEY, token);
      await loadContent();
      setStatus(loginStatus, `已登录：${user.login}`, false);
      loginBtn.disabled = false;
    } catch (error) {
      sessionStorage.removeItem(TOKEN_KEY);
      state.token = '';
      state.data = null;
      setStatus(
        loginStatus,
        error.status === 401
          ? 'Token 无效或已过期。'
          : error.status === 403
            ? 'Token 没有 Contents 写入权限，请检查权限设置。'
            : error.message,
        true
      );
    } finally {
      state.busy = false;
      loginBtn.disabled = false;
    }
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    state.token = '';
    state.data = null;
    state.sha = null;
    state.dirty = false;
    dashboard.hidden = true;
    loginView.hidden = false;
    tokenInput.value = '';
    $('#logoutBtn').hidden = true;
    setStatus(loginStatus, '已退出。');
  }

  /* ------------------------------- 登录 / 面板 ------------------------------- */

  function showDashboard() {
    loginView.hidden = true;
    dashboard.hidden = false;
    $('#logoutBtn').hidden = false;
    shaLabel.textContent = state.sha ? `SHA ${state.sha.slice(0, 7)}` : 'SHA —';
  }

  /* ------------------------------- 表单渲染 ------------------------------- */

  function renderProfilePanel() {
    const p = state.data.profile || {};
    return `<div class="admin-card">
      <div class="admin-card__head">
        <h2>站点信息</h2>
        <p>同步到首屏、页脚和联系区</p>
      </div>
      <div class="admin-grid">
        ${field('显示名', 'profile', 'name', p.name)}
        ${field('英文名', 'profile', 'en', p.en)}
        ${field('身份', 'profile', 'role', p.role)}
        ${field('方向', 'profile', 'focus', p.focus)}
        ${field('首屏简介', 'profile', 'lead', p.lead, { rows: 4, full: true })}
        ${field('首屏元信息', 'profile', 'school', p.school)}
        ${field('开放状态', 'profile', 'status', p.status)}
        ${field('坐标', 'profile', 'location', p.location)}
        ${field('正在做', 'profile', 'doing', p.doing)}
        ${field('最近更新', 'profile', 'updated', p.updated)}
        ${field('GitHub 地址', 'profile', 'github', p.github, { full: true })}
        ${field('GitHub 用户名', 'profile', 'githubName', p.githubName)}
      </div>
      <p class="admin-note">这里只改文案与链接，不会上传图片；封面图请先把文件放进 <code>assets/img/</code>，再填相对路径。</p>
    </div>
    <div class="admin-card">
      <div class="admin-card__head">
        <h2>联系区</h2>
        <p>首页底部文案</p>
      </div>
      <div class="admin-grid">
        ${field('联系区介绍', 'contact', 'intro', (state.data.contact || {}).intro, { rows: 3, full: true })}
        ${field('联系区备注', 'contact', 'note', (state.data.contact || {}).note, { full: true })}
      </div>
    </div>`;
  }

  function renderAboutPanel() {
    const a = state.data.about || {};
    return `<div class="admin-card">
      <div class="admin-card__head">
        <h2>关于</h2>
        <p>正文与时间线</p>
      </div>
      <div class="admin-grid">
        ${field('开头一句', 'about', 'intro', a.intro, { rows: 2, full: true })}
        ${field('正文段落（空行分段）', 'about', 'paragraphs', (a.paragraphs || []).join('\n\n'), {
          rows: 9,
          full: true,
          parse: 'paragraphs'
        })}
        ${field('做事原则（每行一条）', 'about', 'values', (a.values || []).join('\n'), {
          rows: 4,
          full: true,
          parse: 'lines'
        })}
        ${field('正在做（每行一条）', 'about', 'now', (a.now || []).join('\n'), {
          rows: 4,
          full: true,
          parse: 'lines'
        })}
        ${field('时间线（每行：日期 | 标题 | 说明）', 'about', 'timeline', (a.timeline || []).map((i) => `${i.date} | ${i.title} | ${i.desc}`).join('\n'), {
          rows: 8,
          full: true,
          parse: 'timeline'
        })}
      </div>
      <p class="admin-note">时间线最后一条会自动标记为 <code>NOW</code>。日期、标题、说明用竖线分隔。</p>
    </div>`;
  }

  function renderSkillsPanel() {
    const skills = state.data.skills || [];
    return `<div class="admin-card">
      <div class="admin-card__head">
        <h2>技能</h2>
        <button type="button" class="mini-btn" data-add="skills">＋ 添加技能</button>
      </div>
      ${skills.length ? skills.map((skill, index) => `
        <div class="admin-item">
          <div class="admin-item__head">
            <strong>${esc(skill.title || '未命名技能')}</strong>
            <div class="admin-item__actions"><button type="button" class="mini-btn mini-btn--danger" data-remove="skills" data-index="${index}">删除</button></div>
          </div>
          <div class="admin-grid">
            ${field('标题', 'skills', 'title', skill.title, { index })}
            ${field('熟练度描述', 'skills', 'level', skill.level, { index })}
            ${field('说明', 'skills', 'desc', skill.desc, { index, rows: 2, full: true })}
            ${field('标签（逗号分隔）', 'skills', 'tags', (skill.tags || []).join(', '), { index, full: true, parse: 'tags' })}
          </div>
        </div>`).join('') : '<div class="admin-empty">还没有技能条目。</div>'}
    </div>`;
  }

  function renderProjectsPanel() {
    const projects = state.data.projects || [];
    return `<div class="admin-card">
      <div class="admin-card__head">
        <h2>项目</h2>
        <button type="button" class="mini-btn" data-add="projects">＋ 添加项目</button>
      </div>
      ${projects.length ? projects.map((project, index) => `
        <div class="admin-item">
          <div class="admin-item__head">
            <strong>${esc(project.title || '未命名项目')}</strong>
            <div class="admin-item__actions"><button type="button" class="mini-btn mini-btn--danger" data-remove="projects" data-index="${index}">删除</button></div>
          </div>
          <div class="admin-grid">
            ${field('标题', 'projects', 'title', project.title, { index })}
            ${field('Slug（数据标识）', 'projects', 'slug', project.slug, { index })}
            ${field('副标题', 'projects', 'subtitle', project.subtitle, { index })}
            ${field('Kicker（年份 · 类型）', 'projects', 'kicker', project.kicker, { index })}
            ${field('封面图路径（可选）', 'projects', 'cover', project.cover, { index })}
            ${field('一句话描述', 'projects', 'desc', project.desc, { index, rows: 3, full: true })}
            ${field('标签（逗号分隔）', 'projects', 'tags', (project.tags || []).join(', '), { index, full: true, parse: 'tags' })}
            ${field('数据（每行：标签 | 值）', 'projects', 'facts', (project.facts || []).map((f) => `${f.label} | ${f.value}`).join('\n'), { index, rows: 3, full: true, parse: 'facts' })}
            ${field('线上链接', 'projects', 'live', (project.links || {}).live, { index })}
            ${field('源码链接', 'projects', 'repo', (project.links || {}).repo, { index })}
            ${field('详情链接', 'projects', 'detail', (project.links || {}).detail, { index, full: true })}
            ${field('卡片封面样式（llm / site）', 'projects', 'coverClass', project.coverClass, { index })}
            ${field('封面大字（可换行）', 'projects', 'coverWord', project.coverWord, { index, rows: 2 })}
            ${field('封面备注', 'projects', 'coverNote', project.coverNote, { index })}
            ${field('封面 alt', 'projects', 'coverAlt', project.coverAlt, { index, full: true })}
            ${checkField('设为首屏精选项目', 'projects', 'featured', Boolean(project.featured), index)}
          </div>
        </div>`).join('') : '<div class="admin-empty">还没有项目条目。</div>'}
    </div>`;
  }

  function renderPostsPanel() {
    const posts = state.data.posts || [];
    const index = Math.min(Math.max(0, state.postIndex), Math.max(0, posts.length - 1));
    const post = posts[index] || {};
    return `<div class="admin-card">
      <div class="admin-card__head">
        <h2>文章</h2>
        <button type="button" class="mini-btn" data-add="posts">＋ 新建文章</button>
      </div>
      <div class="admin-split">
        <div class="admin-list">
          ${posts.length ? posts.map((item, i) => `
            <button type="button" class="admin-list__item ${i === index ? 'is-active' : ''}" data-post-select="${i}">
              <strong>${esc(item.title || '未命名文章')}</strong>
              <span>${esc(item.date || '')} · ${esc(item.category || '')}</span>
            </button>`).join('') : '<div class="admin-empty">还没有文章。</div>'}
        </div>
        <div class="admin-editor">
          ${posts.length ? `
            <div class="admin-grid">
              ${field('标题', 'posts', 'title', post.title, { index, full: true })}
              ${field('Slug（URL 使用）', 'posts', 'slug', post.slug, { index })}
              ${field('日期', 'posts', 'date', post.date, { index })}
              ${field('阅读时间', 'posts', 'readTime', post.readTime, { index })}
              ${field('分类', 'posts', 'category', post.category, { index })}
              ${field('摘要', 'posts', 'excerpt', post.excerpt, { index, rows: 3, full: true })}
              ${field('正文 HTML', 'posts', 'content', post.content, { index, rows: 18, full: true })}
            </div>
            <p class="admin-note">正文支持 HTML：<code>&lt;h2 id="..."&gt;</code>、<code>&lt;p&gt;</code>、<code>&lt;pre&gt;&lt;code&gt;</code>、<code>&lt;blockquote&gt;</code>。保存后可在动态文章页预览。</p>
            <div class="admin-editor__foot">
              <a href="../post.html?slug=${encodeURIComponent(post.slug || '')}" target="_blank" rel="noreferrer">打开文章页 ↗</a>
              <button type="button" class="mini-btn mini-btn--danger" data-post-delete="${index}">删除这篇文章</button>
            </div>
          ` : '<div class="admin-empty">点击“新建文章”开始。</div>'}
        </div>
      </div>
    </div>`;
  }

  function renderJsonPanel() {
    return `<div class="admin-card">
      <div class="admin-card__head">
        <h2>高级 JSON</h2>
        <p>直接编辑完整数据</p>
      </div>
      <p class="admin-note">适合批量修改。点击“应用到表单”后，再点击顶部“保存并发布”。无效 JSON 不会被应用。</p>
      <textarea class="field admin-json" id="jsonEditor" spellcheck="false">${esc(JSON.stringify(state.data, null, 2))}</textarea>
      <div class="admin-editor__foot">
        <button type="button" class="mini-btn" data-apply-json>应用到表单</button>
        <button type="button" class="mini-btn" data-refresh-json>从当前数据刷新</button>
      </div>
    </div>`;
  }

  function renderTab() {
    $$('.admin-nav button').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.tab === state.tab);
    });

    if (!state.data) return;
    if (state.tab === 'profile') adminPanel.innerHTML = renderProfilePanel();
    else if (state.tab === 'about') adminPanel.innerHTML = renderAboutPanel();
    else if (state.tab === 'skills') adminPanel.innerHTML = renderSkillsPanel();
    else if (state.tab === 'projects') adminPanel.innerHTML = renderProjectsPanel();
    else if (state.tab === 'posts') adminPanel.innerHTML = renderPostsPanel();
    else adminPanel.innerHTML = renderJsonPanel();
  }

  /* ------------------------------- 收集表单 ------------------------------- */

  function collectProfile() {
    const profile = state.data.profile || {};
    $$('[data-scope="profile"]').forEach((el) => {
      profile[el.dataset.key] = el.value;
    });
    state.data.profile = profile;
  }

  function collectAbout() {
    const about = state.data.about || {};
    $$('[data-scope="about"]').forEach((el) => {
      const value = el.value;
      if (el.dataset.parse === 'paragraphs') about[el.dataset.key] = splitParagraphs(value);
      else if (el.dataset.parse === 'lines') about[el.dataset.key] = splitLines(value);
      else if (el.dataset.parse === 'timeline') about[el.dataset.key] = parseTimeline(value);
      else about[el.dataset.key] = value;
    });
    state.data.about = about;
  }

  function collectContact() {
    const contact = state.data.contact || {};
    $$('[data-scope="contact"]').forEach((el) => {
      contact[el.dataset.key] = el.value;
    });
    state.data.contact = contact;
  }

  function collectItems(scope) {
    const map = new Map();
    $$(`[data-scope="${scope}"][data-index]`).forEach((el) => {
      const index = Number(el.dataset.index);
      if (!Number.isInteger(index)) return;
      if (!map.has(index)) map.set(index, {});
      const item = map.get(index);
      const key = el.dataset.key;
      if (el.type === 'checkbox') item[key] = el.checked;
      else if (el.dataset.parse === 'tags') item[key] = splitTags(el.value);
      else if (el.dataset.parse === 'facts') item[key] = parseFacts(el.value);
      else item[key] = el.value;
    });

    return Array.from(map.keys())
      .sort((a, b) => a - b)
      .map((index) => map.get(index));
  }

  function collectSkills() {
    const items = collectItems('skills');
    items.forEach((item) => {
      item.tags = item.tags || [];
    });
    state.data.skills = items;
  }

  function collectProjects() {
    const items = collectItems('projects');
    items.forEach((item) => {
      item.facts = item.facts || [];
      item.tags = item.tags || [];
      item.featured = Boolean(item.featured);
      item.links = {
        live: item.live || '',
        repo: item.repo || '',
        detail: item.detail || ''
      };
      delete item.live;
      delete item.repo;
      delete item.detail;
    });
    state.data.projects = items;
  }

  function readPostEditor() {
    if (!state.data || !Array.isArray(state.data.posts)) return;
    const index = state.postIndex;
    if (!state.data.posts[index]) return;
    $$('[data-scope="posts"]').forEach((el) => {
      state.data.posts[index][el.dataset.key] = el.value;
    });
  }

  function collectAll() {
    if (!state.data) return;
    if (state.tab === 'profile') {
      collectProfile();
      collectContact();
    } else if (state.tab === 'about') collectAbout();
    else if (state.tab === 'skills') collectSkills();
    else if (state.tab === 'projects') collectProjects();
    else if (state.tab === 'posts') readPostEditor();
  }

  /* ------------------------------- 保存 ------------------------------- */

  async function save() {
    if (!state.data || state.busy) return;

    if (state.tab === 'json') {
      const editor = $('#jsonEditor');
      if (editor) {
        try {
          state.data = JSON.parse(editor.value);
        } catch (error) {
          setStatus(saveStatus, 'JSON 格式错误：' + error.message, true);
          return;
        }
      }
    } else {
      collectAll();
    }

    const slugs = new Set();
    for (const post of state.data.posts || []) {
      if (!post.slug || !/^[a-z0-9-]+$/i.test(post.slug)) {
        setStatus(saveStatus, '文章 slug 只能包含字母、数字和连字符。', true);
        return;
      }
      if (slugs.has(post.slug)) {
        setStatus(saveStatus, `文章 slug 重复：${post.slug}`, true);
        return;
      }
      slugs.add(post.slug);
    }

    state.busy = true;
    $('#saveBtn').disabled = true;
    setStatus(saveStatus, '正在提交到 GitHub…');

    try {
      state.data.meta = state.data.meta || {};
      state.data.meta.updatedAt = new Date().toISOString().slice(0, 10);
      const json = JSON.stringify(state.data, null, 2) + '\n';
      const result = await api(`/repos/${OWNER}/${REPO}/contents/${FILE}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          message: `content: 后台更新网站内容 (${new Date().toISOString().slice(0, 16).replace('T', ' ')})`,
          content: toBase64(json),
          sha: state.sha,
          branch: BRANCH
        })
      });

      state.sha = result.content.sha;
      state.dirty = false;
      shaLabel.textContent = `SHA ${state.sha.slice(0, 7)}`;
      const commitUrl = result.commit && result.commit.html_url;
      saveStatus.textContent = '已保存 · Pages 构建通常需要 1–2 分钟';
      saveStatus.classList.remove('is-error');
      if (commitUrl) {
        const link = document.createElement('a');
        link.href = commitUrl;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = ' 查看提交 ↗';
        link.style.marginLeft = '6px';
        link.style.color = 'var(--accent)';
        saveStatus.appendChild(link);
      }
    } catch (error) {
      if (error.status === 409) {
        setStatus(saveStatus, '文件已在别处更新，请先点击“重新载入”再保存。', true);
      } else if (error.status === 401 || error.status === 403) {
        setStatus(saveStatus, 'GitHub 拒绝了写入，请检查 Token 的 Contents 读写权限。', true);
      } else {
        setStatus(saveStatus, '保存失败：' + error.message, true);
      }
    } finally {
      state.busy = false;
      $('#saveBtn').disabled = false;
    }
  }

  /* ------------------------------- 事件 ------------------------------- */

  function addItem(scope) {
    collectAll();
    if (scope === 'skills') {
      state.data.skills = state.data.skills || [];
      state.data.skills.push({ title: '新技能', level: '持续学习', desc: '', tags: [] });
    } else if (scope === 'projects') {
      state.data.projects = state.data.projects || [];
      state.data.projects.push({
        slug: 'new-project-' + Date.now(),
        title: '新项目',
        subtitle: '',
        kicker: '2026 · 项目',
        desc: '',
        tags: [],
        facts: [],
        links: { live: '', repo: '', detail: '' },
        featured: false,
        cover: '',
        coverAlt: '',
        coverClass: 'project-cover--site',
        coverWord: 'NEW',
        coverNote: 'PROJECT / 2026'
      });
    } else if (scope === 'posts') {
      state.data.posts = state.data.posts || [];
      state.data.posts.push({
        slug: 'new-post-' + Date.now(),
        title: '新文章',
        date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
        readTime: '3 MIN',
        category: '随笔',
        excerpt: '',
        content: '<h2 id="section-1">小标题</h2>\n<p>在这里写正文。</p>'
      });
      state.postIndex = state.data.posts.length - 1;
    }
    state.dirty = true;
    renderTab();
  }

  function removeItem(scope, index) {
    if (!window.confirm('确定删除这一条吗？保存并发布后才会从线上移除。')) return;
    collectAll();
    if (scope === 'skills' && state.data.skills) state.data.skills.splice(index, 1);
    if (scope === 'projects' && state.data.projects) state.data.projects.splice(index, 1);
    state.dirty = true;
    renderTab();
  }

  function switchTab(tab) {
    if (tab === state.tab) return;
    if (state.tab === 'posts') readPostEditor();
    else if (state.tab !== 'json') collectAll();
    state.tab = tab;
    renderTab();
  }

  $$('.admin-nav button').forEach((button) => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });

  loginBtn.addEventListener('click', login);
  tokenInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') login();
  });
  $('#logoutBtn').addEventListener('click', logout);
  $('#saveBtn').addEventListener('click', save);

  $('#reloadBtn').addEventListener('click', async () => {
    if (state.dirty && !window.confirm('有未保存的修改，确定重新载入吗？')) return;
    setStatus(saveStatus, '正在重新载入…');
    try {
      await loadContent();
      setStatus(saveStatus, '已载入最新内容。');
    } catch (error) {
      setStatus(saveStatus, '载入失败：' + error.message, true);
    }
  });

  adminPanel.addEventListener('click', (event) => {
    const add = event.target.closest('[data-add]');
    if (add) {
      addItem(add.dataset.add);
      return;
    }

    const remove = event.target.closest('[data-remove]');
    if (remove) {
      removeItem(remove.dataset.remove, Number(remove.dataset.index));
      return;
    }

    const selectPost = event.target.closest('[data-post-select]');
    if (selectPost) {
      readPostEditor();
      state.postIndex = Number(selectPost.dataset.postSelect);
      renderTab();
      return;
    }

    const deletePost = event.target.closest('[data-post-delete]');
    if (deletePost) {
      if (!window.confirm('确定删除这篇文章吗？保存并发布后才会从线上移除。')) return;
      state.data.posts.splice(Number(deletePost.dataset.postDelete), 1);
      state.postIndex = Math.max(0, Math.min(state.postIndex, state.data.posts.length - 1));
      state.dirty = true;
      renderTab();
      return;
    }

    const applyJson = event.target.closest('[data-apply-json]');
    if (applyJson) {
      const editor = $('#jsonEditor');
      if (!editor) return;
      try {
        const parsed = JSON.parse(editor.value);
        if (!parsed.profile || !Array.isArray(parsed.posts)) throw new Error('缺少 profile 或 posts');
        state.data = parsed;
        state.dirty = true;
        setStatus(saveStatus, 'JSON 已应用到表单，记得点击保存并发布。');
      } catch (error) {
        setStatus(saveStatus, 'JSON 无效：' + error.message, true);
      }
      return;
    }

    const refreshJson = event.target.closest('[data-refresh-json]');
    if (refreshJson) {
      renderTab();
      setStatus(saveStatus, '已从当前数据刷新。');
    }
  });

  adminPanel.addEventListener('input', (event) => {
    const el = event.target;
    if (el.dataset.scope) {
      state.dirty = true;
      if (el.dataset.scope === 'posts') {
        const index = state.postIndex;
        if (state.data.posts[index]) state.data.posts[index][el.dataset.key] = el.value;
      }
    }
  });

  window.addEventListener('beforeunload', (event) => {
    if (!state.dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });

  if (state.token) {
    tokenInput.value = state.token;
    login();
  }
})();
