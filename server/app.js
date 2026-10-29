'use strict';

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const sanitizeHtml = require('sanitize-html');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const SESSION_SECRET = process.env.SESSION_SECRET || 'local-dev-secret-change-me';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'jianghu2026';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, '..', 'assets'), { maxAge: '1h' }));
app.use('/admin-assets', express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

app.use(
  session({
    name: 'jianghu.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

/* ------------------------------ 通用工具 ------------------------------ */

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function coverWord(value) {
  return escapeHtml(value || '').replace(/\r?\n/g, '<br />');
}

function asset(value) {
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:')) return value;
  return '/' + String(value).replace(/^\/+/, '');
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
    .map((line) => line.trim())
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
    .filter((item) => item.label && item.value);
}

function parseTimeline(value) {
  return splitLines(value)
    .map((line) => {
      const [date, title, ...rest] = line.split('|');
      return { date: (date || '').trim(), title: (title || '').trim(), desc: rest.join('|').trim() };
    })
    .filter((item) => item.date && item.title);
}

function sanitizeBody(html) {
  return sanitizeHtml(String(html || ''), {
    allowedTags: ['h2', 'h3', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'blockquote', 'pre', 'code', 'a', 'figure', 'figcaption', 'img', 'br', 'hr'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      h2: ['id'],
      h3: ['id'],
      img: ['src', 'alt', 'width', 'height', 'loading']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href || '';
        if (/^https?:/i.test(href)) {
          return { tagName, attribs: { ...attribs, target: '_blank', rel: 'noreferrer' } };
        }
        return { tagName, attribs };
      },
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: 'lazy' } })
    }
  });
}

function buildToc(html) {
  let index = 0;
  const toc = [];
  const withIds = String(html || '').replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (match, attrs, inner) => {
    index += 1;
    let id = (attrs.match(/id="([^"]+)"/i) || [])[1];
    if (!id) {
      id = `section-${index}`;
      attrs += ` id="${id}"`;
    }
    const text = inner.replace(/<[^>]+>/g, '').trim();
    toc.push({ id, text });
    return `<h2${attrs}>${inner}</h2>`;
  });
  return { html: withIds, toc };
}

function flash(req, type, message) {
  req.session.flash = { type, message };
}

function requireAuth(req, res, next) {
  if (req.session && req.session.admin) return next();
  return res.redirect('/admin/login');
}

function verifyCsrf(req, res, next) {
  if (!req.body || req.body._csrf !== req.session.csrf) {
    return res.status(403).render('error', {
      title: '请求已过期',
      message: '表单校验失败，请返回上一页刷新后重试。',
      site: res.locals.site
    });
  }
  return next();
}

/* ------------------------------ 中间件 ------------------------------ */

app.use(async (req, res, next) => {
  try {
    const site = await db.getSite();
    if (!site) throw new Error('site_settings 没有数据，请先运行 npm run db:setup && npm run db:seed');
    res.locals.site = site;
    res.locals.admin = req.session.admin || null;
    res.locals.baseUrl = BASE_URL;
    res.locals.flash = req.session.flash || null;
    delete req.session.flash;
    if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
    res.locals.csrf = req.session.csrf;
    res.locals.asset = asset;
    res.locals.coverWord = coverWord;
    res.locals.active = '';
    next();
  } catch (error) {
    next(error);
  }
});

/* ------------------------------ 公开站点 ------------------------------ */

app.get('/', async (req, res, next) => {
  try {
    const [skills, projects, posts] = await Promise.all([db.getSkills(), db.getProjects(), db.getPosts()]);
    const featured = projects.find((project) => project.featured) || projects[0] || null;
    const otherProjects = projects.filter((project) => project !== featured);
    res.render('index', {
      active: 'about',
      skills,
      projects,
      posts,
      featured,
      otherProjects
    });
  } catch (error) {
    next(error);
  }
});

app.get('/post/:slug', async (req, res, next) => {
  try {
    const posts = await db.getPosts();
    const index = posts.findIndex((post) => post.slug === req.params.slug);
    if (index < 0) {
      return res.status(404).render('error', {
        title: '没有找到这篇文章',
        message: '这个链接可能已经过期，或者文章已被移除。',
        site: res.locals.site
      });
    }
    const post = posts[index];
    const cleaned = sanitizeBody(post.content_html);
    const { html, toc } = buildToc(cleaned);
    res.render('post', {
      active: 'notes',
      post,
      bodyHtml: html,
      toc,
      prev: posts[index - 1] || null,
      next: posts[index + 1] || null
    });
  } catch (error) {
    next(error);
  }
});

app.get('/project/:slug', async (req, res, next) => {
  try {
    const project = await db.getProjectBySlug(req.params.slug);
    if (!project) {
      return res.status(404).render('error', {
        title: '没有找到这个项目',
        message: '项目可能已经被移除。',
        site: res.locals.site
      });
    }
    if (!project.detail_html) {
      if (project.links.detail) return res.redirect(project.links.detail);
      if (project.links.repo) return res.redirect(project.links.repo);
      return res.redirect('/#work');
    }
    const cleaned = sanitizeBody(project.detail_html);
    const { html, toc } = buildToc(cleaned);
    res.render('project', {
      active: 'work',
      project,
      projectHtml: html,
      toc
    });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------ 后台登录 ------------------------------ */

app.get('/admin/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.render('admin/login', { title: '内容后台', error: null });
});

app.post('/admin/login', verifyCsrf, async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    const [rows] = await db.pool.query('SELECT * FROM admin_users WHERE username = ? LIMIT 1', [username]);
    const user = rows[0];
    const ok = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!ok) {
      return res.status(401).render('admin/login', {
        title: '内容后台',
        error: '用户名或密码不正确。'
      });
    }
    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.admin = { id: user.id, username: user.username };
      req.session.csrf = crypto.randomBytes(24).toString('hex');
      res.redirect('/admin');
    });
  } catch (error) {
    next(error);
  }
});

app.post('/admin/logout', requireAuth, verifyCsrf, (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

/* ------------------------------ 后台页面 ------------------------------ */

app.get('/admin', requireAuth, async (req, res, next) => {
  try {
    const [counts, posts] = await Promise.all([db.getCounts(), db.getPosts()]);
    res.render('admin/dashboard', {
      title: '概览',
      subtitle: '内容总览与最近更新',
      active: 'dashboard',
      counts,
      recentPosts: posts.slice(0, 5)
    });
  } catch (error) {
    next(error);
  }
});

app.get('/admin/profile', requireAuth, (req, res) => {
  res.render('admin/profile', {
    title: '站点信息',
    subtitle: '首屏、页脚和联系区',
    active: 'profile'
  });
});

app.post('/admin/profile', requireAuth, verifyCsrf, async (req, res, next) => {
  try {
    const body = req.body;
    await db.pool.query(
      `UPDATE site_settings SET
        profile_name=?, profile_en=?, role=?, focus=?, lead=?, meta=?, status=?, location=?, doing=?, updated=?,
        github=?, github_name=?, contact_intro=?, contact_note=?
       WHERE id=1`,
      [
        body.profile_name || '', body.profile_en || '', body.role || '', body.focus || '', body.lead || '',
        body.meta || '', body.status || '', body.location || '', body.doing || '', body.updated || '',
        body.github || '', body.github_name || '', body.contact_intro || '', body.contact_note || ''
      ]
    );
    flash(req, 'success', '站点信息已保存。');
    res.redirect('/admin/profile');
  } catch (error) {
    next(error);
  }
});

app.get('/admin/about', requireAuth, (req, res) => {
  res.render('admin/about', {
    title: '关于',
    subtitle: '正文、原则、NOW 与时间线',
    active: 'about'
  });
});

app.post('/admin/about', requireAuth, verifyCsrf, async (req, res, next) => {
  try {
    const body = req.body;
    await db.pool.query(
      `UPDATE site_settings SET
        about_intro=?, about_paragraphs=?, about_values=?, about_now=?, about_timeline=?
       WHERE id=1`,
      [
        body.about_intro || '',
        JSON.stringify(splitParagraphs(body.about_paragraphs)),
        JSON.stringify(splitLines(body.about_values)),
        JSON.stringify(splitLines(body.about_now)),
        JSON.stringify(parseTimeline(body.about_timeline))
      ]
    );
    flash(req, 'success', '关于内容已保存。');
    res.redirect('/admin/about');
  } catch (error) {
    next(error);
  }
});

/* 技能 */
app.get('/admin/skills', requireAuth, async (req, res, next) => {
  try {
    const skills = await db.getSkills();
    res.render('admin/skills', {
      title: '技能',
      subtitle: '添加、编辑与删除技能卡片',
      active: 'skills',
      skills
    });
  } catch (error) {
    next(error);
  }
});

app.post('/admin/skills', requireAuth, verifyCsrf, async (req, res, next) => {
  try {
    const [[max]] = await db.pool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM skills');
    await db.pool.query(
      'INSERT INTO skills (sort_order, title, level, description, tags) VALUES (?, ?, ?, ?, ?)',
      [max.next_order, req.body.title || '新技能', req.body.level || '', req.body.description || '', JSON.stringify(splitTags(req.body.tags))]
    );
    flash(req, 'success', '技能已添加。');
    res.redirect('/admin/skills');
  } catch (error) {
    next(error);
  }
});

app.post('/admin/skills/:id', requireAuth, verifyCsrf, async (req, res, next) => {
  try {
    await db.pool.query(
      'UPDATE skills SET title=?, level=?, description=?, tags=? WHERE id=?',
      [req.body.title || '', req.body.level || '', req.body.description || '', JSON.stringify(splitTags(req.body.tags)), req.params.id]
    );
    flash(req, 'success', '技能已更新。');
    res.redirect('/admin/skills');
  } catch (error) {
    next(error);
  }
});

app.post('/admin/skills/:id/delete', requireAuth, verifyCsrf, async (req, res, next) => {
  try {
    await db.pool.query('DELETE FROM skills WHERE id=?', [req.params.id]);
    flash(req, 'success', '技能已删除。');
    res.redirect('/admin/skills');
  } catch (error) {
    next(error);
  }
});

/* 项目 */
app.get('/admin/projects', requireAuth, async (req, res, next) => {
  try {
    const projects = await db.getProjects();
    res.render('admin/projects', {
      title: '项目',
      subtitle: '首页精选、项目卡片与详情页',
      active: 'projects',
      projects
    });
  } catch (error) {
    next(error);
  }
});

function projectFormData(body) {
  return {
    slug: String(body.slug || '').trim(),
    title: body.title || '',
    subtitle: body.subtitle || '',
    kicker: body.kicker || '',
    description: body.description || '',
    tags: JSON.stringify(splitTags(body.tags)),
    facts: JSON.stringify(parseFacts(body.facts)),
    live_url: body.live_url || '',
    repo_url: body.repo_url || '',
    detail_url: body.detail_url || '',
    featured: body.featured ? 1 : 0,
    cover: body.cover || '',
    cover_alt: body.cover_alt || '',
    cover_class: body.cover_class || 'project-cover--site',
    cover_word: body.cover_word || '',
    cover_note: body.cover_note || '',
    detail_html: body.detail_html || ''
  };
}

app.get('/admin/projects/new', requireAuth, (req, res) => {
  res.render('admin/project-form', {
    title: '新建项目',
    subtitle: '添加一个项目卡片',
    active: 'projects',
    project: {
      id: null, slug: '', title: '', subtitle: '', kicker: '', description: '', tags: [], facts: [],
      links: { live: '', repo: '', detail: '' }, featured: false, cover: '', cover_alt: '',
      cover_class: 'project-cover--site', cover_word: '', cover_note: '', detail_html: ''
    }
  });
});

app.post('/admin/projects', requireAuth, verifyCsrf, async (req, res, next) => {
  try {
    if (!/^[a-z0-9-]+$/i.test(req.body.slug || '')) {
      flash(req, 'error', '项目 slug 只能包含字母、数字和连字符。');
      return res.redirect('/admin/projects/new');
    }
    const data = projectFormData(req.body);
    const [[max]] = await db.pool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM projects');
    await db.pool.query(
      `INSERT INTO projects
       (sort_order, slug, title, subtitle, kicker, description, tags, facts, live_url, repo_url, detail_url, featured,
        cover, cover_alt, cover_class, cover_word, cover_note, detail_html)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [max.next_order, data.slug, data.title, data.subtitle, data.kicker, data.description, data.tags, data.facts,
        data.live_url, data.repo_url, data.detail_url, data.featured, data.cover, data.cover_alt,
        data.cover_class, data.cover_word, data.cover_note, data.detail_html]
    );
    flash(req, 'success', '项目已创建。');
    res.redirect('/admin/projects');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      flash(req, 'error', '项目 slug 已存在。');
      return res.redirect('/admin/projects/new');
    }
    next(error);
  }
});

app.get('/admin/projects/:id/edit', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await db.pool.query('SELECT * FROM projects WHERE id=? LIMIT 1', [req.params.id]);
    if (!rows[0]) return res.redirect('/admin/projects');
    const project = {
      ...rows[0],
      tags: db.parseJson(rows[0].tags, []),
      facts: db.parseJson(rows[0].facts, []),
      links: { live: rows[0].live_url || '', repo: rows[0].repo_url || '', detail: rows[0].detail_url || '' }
    };
    res.render('admin/project-form', {
      title: '编辑项目',
      subtitle: project.title,
      active: 'projects',
      project
    });
  } catch (error) {
    next(error);
  }
});

app.post('/admin/projects/:id', requireAuth, verifyCsrf, async (req, res, next) => {
  try {
    if (!/^[a-z0-9-]+$/i.test(req.body.slug || '')) {
      flash(req, 'error', '项目 slug 只能包含字母、数字和连字符。');
      return res.redirect(`/admin/projects/${req.params.id}/edit`);
    }
    const data = projectFormData(req.body);
    await db.pool.query(
      `UPDATE projects SET slug=?, title=?, subtitle=?, kicker=?, description=?, tags=?, facts=?,
        live_url=?, repo_url=?, detail_url=?, featured=?, cover=?, cover_alt=?, cover_class=?,
        cover_word=?, cover_note=?, detail_html=? WHERE id=?`,
      [data.slug, data.title, data.subtitle, data.kicker, data.description, data.tags, data.facts,
        data.live_url, data.repo_url, data.detail_url, data.featured, data.cover, data.cover_alt,
        data.cover_class, data.cover_word, data.cover_note, data.detail_html, req.params.id]
    );
    flash(req, 'success', '项目已保存。');
    res.redirect('/admin/projects');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      flash(req, 'error', '项目 slug 已存在。');
      return res.redirect(`/admin/projects/${req.params.id}/edit`);
    }
    next(error);
  }
});

app.post('/admin/projects/:id/delete', requireAuth, verifyCsrf, async (req, res, next) => {
  try {
    await db.pool.query('DELETE FROM projects WHERE id=?', [req.params.id]);
    flash(req, 'success', '项目已删除。');
    res.redirect('/admin/projects');
  } catch (error) {
    next(error);
  }
});

/* 文章 */
app.get('/admin/posts', requireAuth, async (req, res, next) => {
  try {
    const posts = await db.getPosts();
    res.render('admin/posts', {
      title: '文章',
      subtitle: '笔记列表与发布状态',
      active: 'posts',
      posts
    });
  } catch (error) {
    next(error);
  }
});

app.get('/admin/posts/new', requireAuth, (req, res) => {
  res.render('admin/post-form', {
    title: '新建文章',
    subtitle: '写一篇新的开发笔记',
    active: 'posts',
    post: { id: null, slug: '', title: '', date_text: '', read_time: '5 MIN', category: '随笔', excerpt: '', content_html: '<h2 id="section-1">小标题</h2><p>正文。</p>' }
  });
});

app.post('/admin/posts', requireAuth, verifyCsrf, async (req, res, next) => {
  try {
    if (!/^[a-z0-9-]+$/i.test(req.body.slug || '')) {
      flash(req, 'error', '文章 slug 只能包含字母、数字和连字符。');
      return res.redirect('/admin/posts/new');
    }
    const [[max]] = await db.pool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM posts');
    await db.pool.query(
      `INSERT INTO posts (sort_order, slug, title, date_text, read_time, category, excerpt, content_html)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [max.next_order, req.body.slug, req.body.title || '', req.body.date_text || '', req.body.read_time || '',
        req.body.category || '', req.body.excerpt || '', req.body.content_html || '']
    );
    flash(req, 'success', '文章已创建。');
    res.redirect('/admin/posts');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      flash(req, 'error', '文章 slug 已存在。');
      return res.redirect('/admin/posts/new');
    }
    next(error);
  }
});

app.get('/admin/posts/:id/edit', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await db.pool.query('SELECT * FROM posts WHERE id=? LIMIT 1', [req.params.id]);
    if (!rows[0]) return res.redirect('/admin/posts');
    res.render('admin/post-form', {
      title: '编辑文章',
      subtitle: rows[0].title,
      active: 'posts',
      post: rows[0]
    });
  } catch (error) {
    next(error);
  }
});

app.post('/admin/posts/:id', requireAuth, verifyCsrf, async (req, res, next) => {
  try {
    if (!/^[a-z0-9-]+$/i.test(req.body.slug || '')) {
      flash(req, 'error', '文章 slug 只能包含字母、数字和连字符。');
      return res.redirect(`/admin/posts/${req.params.id}/edit`);
    }
    await db.pool.query(
      `UPDATE posts SET slug=?, title=?, date_text=?, read_time=?, category=?, excerpt=?, content_html=? WHERE id=?`,
      [req.body.slug, req.body.title || '', req.body.date_text || '', req.body.read_time || '',
        req.body.category || '', req.body.excerpt || '', req.body.content_html || '', req.params.id]
    );
    flash(req, 'success', '文章已保存。');
    res.redirect('/admin/posts');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      flash(req, 'error', '文章 slug 已存在。');
      return res.redirect(`/admin/posts/${req.params.id}/edit`);
    }
    next(error);
  }
});

app.post('/admin/posts/:id/delete', requireAuth, verifyCsrf, async (req, res, next) => {
  try {
    await db.pool.query('DELETE FROM posts WHERE id=?', [req.params.id]);
    flash(req, 'success', '文章已删除。');
    res.redirect('/admin/posts');
  } catch (error) {
    next(error);
  }
});

/* ------------------------------ 错误处理 ------------------------------ */

app.use((req, res) => {
  res.status(404).render('error', {
    title: '页面走丢了',
    message: '这个地址没有对应的页面。',
    site: res.locals.site
  });
});

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(500).render('error', {
    title: '服务器出错了',
    message: '页面暂时无法加载，请稍后再试。',
    site: res.locals.site
  });
});

app.listen(PORT, () => {
  console.log(`Jiang Hu portfolio: ${BASE_URL}`);
  console.log(`Admin: ${BASE_URL}/admin/login`);
});

module.exports = app;
