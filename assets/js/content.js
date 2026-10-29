/**
 * 前台内容渲染：读取 data/content.json，把静态 HTML 升级为可后台维护的数据视图。
 * 如果请求失败，页面保留 index.html 中的静态内容，不影响阅读。
 */
(function () {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const esc = (value) =>
    String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const text = (id, value) => {
    const el = document.getElementById(id);
    if (el && value != null) el.textContent = value;
  };

  const tagsHtml = (tags) =>
    `<ul class="tags">${(tags || []).map((tag) => `<li>${esc(tag)}</li>`).join('')}</ul>`;

  function renderProfile(data) {
    const p = data.profile || {};
    text('heroName', p.name);
    text('heroRole', p.role);
    text('heroFocus', p.focus);
    text('heroLead', p.lead);
    text('heroMeta', p.school);
    text('heroStatus', p.status);
    text('profileEn', p.en);
    text('factLocation', p.location);
    text('factDoing', p.doing);
    text('factUpdated', p.updated);
    text('brandName', p.name);
    text('footerName', p.name);
    text('footerCopyName', p.name);
    text('footerUpdated', p.updated ? `Last updated ${p.updated}` : '');

    if (p.github) {
      $$('a[href="https://github.com/hujiang888"]').forEach((a) => {
        a.setAttribute('href', p.github);
      });
    }
    if (p.githubName) {
      $$('[data-copy]').forEach((button) => {
        button.setAttribute('data-copy', p.githubName);
      });
      $$('.contact-card strong').forEach((strong) => {
        if (strong.textContent.trim().startsWith('@')) {
          strong.textContent = '@' + p.githubName;
        }
      });
    }

    if (p.name && p.focus) {
      const title = `${p.name} · ${p.focus} | 个人作品集`;
      document.title = title;
      const desc = `${p.name} 的个人作品集：${p.role || ''}，关注 ${p.focus}。这里记录项目、实验与开发笔记。`;
      const metaDesc = $('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', desc);
      ['og:title', 'twitter:title'].forEach((property) => {
        const el = $(`meta[property="${property}"], meta[name="${property}"]`);
        if (el) el.setAttribute('content', title);
      });
      ['og:description', 'twitter:description'].forEach((property) => {
        const el = $(`meta[property="${property}"], meta[name="${property}"]`);
        if (el) el.setAttribute('content', desc);
      });
    }
  }

  function renderAbout(data) {
    const about = data.about || {};
    text('aboutIntro', about.intro);
    const paragraphs = $('#aboutParagraphs');
    if (paragraphs && Array.isArray(about.paragraphs)) {
      paragraphs.innerHTML = about.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('');
    }

    const values = $('#valuesList');
    if (values && Array.isArray(about.values)) {
      values.innerHTML = about.values
        .map((value, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span><strong>${esc(value)}</strong></li>`)
        .join('');
    }

    const now = $('#aboutNowList');
    if (now && Array.isArray(about.now)) {
      now.innerHTML = about.now
        .map((item, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span>${esc(item)}</li>`)
        .join('');
    }

    const timeline = $('#timelineList');
    if (timeline && Array.isArray(about.timeline)) {
      timeline.innerHTML = about.timeline
        .map((item, index) => {
          const isNow = index === about.timeline.length - 1 || /^NOW$/i.test(item.date || '');
          return `<li class="${isNow ? 'timeline__now' : ''}">
            <span class="timeline__date">${esc(item.date)}</span>
            <div><strong>${esc(item.title)}</strong><p>${esc(item.desc)}</p></div>
          </li>`;
        })
        .join('');
    }
  }

  function renderSkills(data) {
    const grid = $('#skillsGrid');
    if (!grid || !Array.isArray(data.skills)) return;
    grid.innerHTML = data.skills
      .map(
        (skill, index) => `<article class="skill-card">
          <div class="skill-card__head">
            <span class="skill-card__num">${String(index + 1).padStart(2, '0')}</span>
            <h3>${esc(skill.title)}</h3>
            <span class="skill-card__level">${esc(skill.level)}</span>
          </div>
          <p>${esc(skill.desc)}</p>
          ${tagsHtml(skill.tags)}
        </article>`
      )
      .join('');
  }

  function linkHtml(project) {
    const links = project.links || {};
    const items = [];
    if (links.live) {
      items.push(
        `<a class="link-accent" href="${esc(links.live)}" target="_blank" rel="noreferrer">线上体验 <svg class="icon"><use href="#i-arrow"></use></svg></a>`
      );
    }
    if (links.repo) {
      items.push(`<a href="${esc(links.repo)}" target="_blank" rel="noreferrer">源码</a>`);
    }
    if (links.detail) {
      items.push(`<a href="${esc(links.detail)}">项目详情</a>`);
    }
    return items.join('');
  }

  function renderProjects(data) {
    const projects = Array.isArray(data.projects) ? data.projects : [];
    if (!projects.length) return;
    const feature = projects.find((p) => p.featured) || projects[0];
    const rest = projects.filter((p) => p !== feature);

    const featureEl = $('#projectFeature');
    if (featureEl) {
      const cover = feature.cover || 'assets/img/og-cover.png';
      const detail = (feature.links && feature.links.detail) || (feature.links && feature.links.live) || '#work';
      featureEl.innerHTML = `
        <a class="project-feature__media" href="${esc(detail)}" aria-label="查看 ${esc(feature.title)} 项目详情">
          <img src="${esc(cover)}" alt="${esc(feature.coverAlt || feature.title)}" width="1200" height="800" loading="lazy" />
          <span class="project-feature__badge">FEATURED / 01</span>
        </a>
        <div class="project-feature__body">
          <p class="project-kicker">${esc(feature.kicker)}</p>
          <h3>${esc(feature.title)} <span>${esc(feature.subtitle || '')}</span></h3>
          <p class="project-desc">${esc(feature.desc)}</p>
          ${tagsHtml(feature.tags)}
          <dl class="project-facts">
            ${(feature.facts || [])
              .slice(0, 4)
              .map((fact) => `<div><dt>${esc(fact.label)}</dt><dd>${esc(fact.value)}</dd></div>`)
              .join('')}
          </dl>
          <div class="project-links">${linkHtml(feature)}</div>
        </div>`;
    }

    const grid = $('#projectGrid');
    if (grid) {
      grid.innerHTML = rest
        .map((project, index) => {
          const links = project.links || {};
          const href = links.detail || links.live || links.repo || '#work';
          const external = /^https?:/i.test(href);
          const label = links.detail && links.detail.includes('post.html')
            ? '查看实验笔记'
            : links.repo
              ? '查看源码'
              : '查看详情';
          const word = esc(project.coverWord || 'HJ.').replace(/\n/g, '<br />');
          const serif = /HJ/i.test(word) ? ' project-cover__word--serif' : '';
          return `<article class="project-card">
            <div class="project-card__cover ${esc(project.coverClass || 'project-cover--site')}" aria-hidden="true">
              <span class="project-cover__index">${String(index + 2).padStart(2, '0')}</span>
              <span class="project-cover__word${serif}">${word}</span>
              <span class="project-cover__note">${esc(project.coverNote || '')}</span>
            </div>
            <div class="project-card__body">
              <p class="project-kicker">${esc(project.kicker)}</p>
              <h3>${esc(project.title)}</h3>
              <p>${esc(project.desc)}</p>
              ${tagsHtml(project.tags)}
              <a class="link-accent" href="${esc(href)}"${external ? ' target="_blank" rel="noreferrer"' : ''}>${label} <svg class="icon"><use href="#i-arrow"></use></svg></a>
            </div>
          </article>`;
        })
        .join('');
    }
  }

  function renderNotes(data) {
    const list = $('#noteList');
    if (!list || !Array.isArray(data.posts)) return;
    list.innerHTML = data.posts
      .map(
        (post, index) => `<a class="post-row" href="post.html?slug=${encodeURIComponent(post.slug)}">
          <span class="post-row__num">${String(index + 1).padStart(2, '0')}</span>
          <div class="post-row__body">
            <div class="post-row__meta"><span>${esc(post.date)}</span><span>${esc(post.readTime)}</span><span>${esc(post.category)}</span></div>
            <h3>${esc(post.title)}</h3>
            <p>${esc(post.excerpt)}</p>
          </div>
          <span class="post-row__arrow"><svg class="icon"><use href="#i-arrow"></use></svg></span>
        </a>`
      )
      .join('');
    const more = $('.notes-more');
    if (more) more.textContent = `持续更新中 · 目前有 ${data.posts.length} 篇`;
  }

  function renderContact(data) {
    const contact = data.contact || {};
    text('contactIntro', contact.intro);
    text('contactNote', contact.note);
  }

  function render(data) {
    renderProfile(data);
    renderAbout(data);
    renderSkills(data);
    renderProjects(data);
    renderNotes(data);
    renderContact(data);
    document.documentElement.dataset.content = 'ready';
  }

  fetch(`data/content.json?t=${Date.now()}`, { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`content ${response.status}`);
      return response.json();
    })
    .then(render)
    .catch((error) => {
      console.warn('内容数据加载失败，保留静态版本：', error);
    });
})();
