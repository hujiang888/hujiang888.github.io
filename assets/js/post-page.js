/**
 * 动态文章页：读取 data/content.json，按 ?slug= 渲染文章。
 */
(function () {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const bar = document.getElementById('readingBar');
  const body = document.getElementById('postBody');
  const toc = document.getElementById('postToc');
  const tocLinks = document.getElementById('postTocLinks');
  const params = new URLSearchParams(location.search);
  const slug = params.get('slug') || '';

  const ALLOWED = new Set([
    'H2', 'H3', 'P', 'UL', 'OL', 'LI', 'STRONG', 'EM', 'BLOCKQUOTE',
    'PRE', 'CODE', 'A', 'FIGURE', 'FIGCAPTION', 'IMG', 'BR', 'HR'
  ]);

  function safeUrl(value) {
    const url = String(value || '').trim();
    if (!url) return false;
    if (/^(https?:|mailto:)/i.test(url)) return true;
    if (/^(\/|\.\/|\.\.\/|#)/.test(url)) return true;
    if (/^[a-zA-Z0-9._~-]+([/?#][^\s]*)?$/.test(url) && !/^[a-z][a-z0-9+.-]*:/i.test(url)) return true;
    return false;
  }

  function sanitize(html) {
    const doc = new DOMParser().parseFromString(`<div id="content-root">${html}</div>`, 'text/html');
    const root = doc.getElementById('content-root');
    const blocked = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'LINK', 'META']);

    function clean(parent) {
      Array.from(parent.childNodes).forEach((node) => {
        if (node.nodeType !== 1) return;
        const el = node;
        if (blocked.has(el.tagName)) {
          el.remove();
          return;
        }

        // 先清洗子节点，再决定当前节点是保留还是解包
        clean(el);

        if (!ALLOWED.has(el.tagName)) {
          while (el.firstChild) parent.insertBefore(el.firstChild, el);
          el.remove();
          return;
        }

        Array.from(el.attributes).forEach((attr) => {
          const name = attr.name.toLowerCase();
          const allowedAttr =
            (el.tagName === 'A' && name === 'href') ||
            (el.tagName === 'IMG' && ['src', 'alt', 'width', 'height', 'loading'].includes(name)) ||
            (/^H[23]$/.test(el.tagName) && name === 'id');
          if (!allowedAttr) {
            el.removeAttribute(attr.name);
            return;
          }
          if ((name === 'href' || name === 'src') && !safeUrl(attr.value)) {
            el.removeAttribute(attr.name);
          }
        });

        if (el.tagName === 'A' && el.getAttribute('href') && /^https?:/i.test(el.getAttribute('href'))) {
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noreferrer');
        }
        if (el.tagName === 'IMG') {
          if (!el.getAttribute('alt')) el.setAttribute('alt', '');
          el.setAttribute('loading', 'lazy');
        }
      });
    }

    clean(root);
    return root.innerHTML;
  }

  function setMeta(selector, value) {
    const el = $(selector);
    if (el && value) el.setAttribute('content', value);
  }

  function updateProgress() {
    if (!bar) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    bar.style.width = (ratio * 100).toFixed(2) + '%';
  }

  function renderToc() {
    if (!toc || !tocLinks || !body) return;
    const headings = Array.from(body.querySelectorAll('h2'));
    if (!headings.length) {
      toc.hidden = true;
      return;
    }

    headings.forEach((heading, index) => {
      if (!heading.id) heading.id = `section-${index + 1}`;
      const link = document.createElement('a');
      link.href = '#' + heading.id;
      link.textContent = heading.textContent;
      tocLinks.appendChild(link);
    });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            Array.from(tocLinks.querySelectorAll('a')).forEach((link) => {
              link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id);
            });
          });
        },
        { rootMargin: '-18% 0px -68% 0px', threshold: 0 }
      );
      headings.forEach((heading) => observer.observe(heading));
    }
  }

  function articleNav(posts, index) {
    const nav = document.createElement('nav');
    nav.className = 'article-nav';
    nav.setAttribute('aria-label', '文章导航');

    const prev = posts[index - 1];
    const next = posts[index + 1];
    if (prev) {
      const link = document.createElement('a');
      link.href = `post.html?slug=${encodeURIComponent(prev.slug)}`;
      link.innerHTML = `<span>PREV</span><strong>${prev.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</strong>`;
      nav.appendChild(link);
    }
    if (next) {
      const link = document.createElement('a');
      link.href = `post.html?slug=${encodeURIComponent(next.slug)}`;
      link.innerHTML = `<span>NEXT</span><strong>${next.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</strong>`;
      nav.appendChild(link);
    }
    if (!nav.children.length) {
      const link = document.createElement('a');
      link.href = 'index.html#notes';
      link.innerHTML = '<span>BACK</span><strong>返回全部笔记</strong>';
      nav.appendChild(link);
    }
    body.appendChild(nav);
  }

  function showError(message) {
    if (!body) return;
    body.innerHTML = `<h2>没有找到这篇文章</h2><p>${message}</p><p><a href="index.html#notes">返回全部笔记</a></p>`;
    const title = document.getElementById('postTitle');
    if (title) title.textContent = '没有找到这篇文章';
    const kicker = document.getElementById('postKicker');
    if (kicker) kicker.textContent = '404 · NOTE';
    if (toc) toc.hidden = true;
  }

  fetch(`data/content.json?t=${Date.now()}`, { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`content ${response.status}`);
      return response.json();
    })
    .then((data) => {
      const posts = Array.isArray(data.posts) ? data.posts : [];
      const index = posts.findIndex((post) => post.slug === slug);
      if (index < 0) {
        showError('这个链接可能已经过期，或者文章已被移除。');
        return;
      }

      const post = posts[index];
      const profile = data.profile || {};
      const title = `${post.title} · ${profile.name || 'Jiang Hu'}`;
      document.title = title;
      setMeta('meta[name="description"]', post.excerpt);
      setMeta('meta[property="og:title"]', post.title);
      setMeta('meta[property="og:description"]', post.excerpt);
      setMeta('meta[name="twitter:title"]', post.title);
      setMeta('meta[name="twitter:description"]', post.excerpt);

      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.setAttribute('href', `https://hujiang888.github.io/post.html?slug=${encodeURIComponent(post.slug)}`);
      setMeta('meta[property="og:url"]', `https://hujiang888.github.io/post.html?slug=${encodeURIComponent(post.slug)}`);

      const kicker = document.getElementById('postKicker');
      if (kicker) kicker.textContent = `NOTE ${String(index + 1).padStart(2, '0')} · ${post.category} · ${post.date}`;
      const titleEl = document.getElementById('postTitle');
      if (titleEl) titleEl.textContent = post.title;
      const deck = document.getElementById('postDeck');
      if (deck) deck.textContent = post.excerpt;
      const meta = document.getElementById('postMeta');
      if (meta) {
        [profile.name || 'Jiang Hu', post.readTime, post.category].forEach((value) => {
          const span = document.createElement('span');
          span.textContent = value;
          meta.appendChild(span);
        });
      }

      if (body) {
        body.innerHTML = sanitize(post.content || '');
        const end = document.createElement('p');
        end.className = 'article-end';
        end.textContent = `写于 ${post.date}。`;
        body.appendChild(end);
        articleNav(posts, index);
        renderToc();
      }

      const jsonLd = document.createElement('script');
      jsonLd.type = 'application/ld+json';
      jsonLd.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt,
        datePublished: post.date,
        author: { '@type': 'Person', name: profile.name || 'Jiang Hu', url: 'https://hujiang888.github.io/' },
        mainEntityOfPage: `https://hujiang888.github.io/post.html?slug=${encodeURIComponent(post.slug)}`
      });
      document.head.appendChild(jsonLd);

      updateProgress();
      window.addEventListener('scroll', updateProgress, { passive: true });
      window.addEventListener('resize', updateProgress);
    })
    .catch((error) => {
      console.warn('文章加载失败：', error);
      showError('内容数据暂时无法读取，请稍后再试。');
    });
})();
