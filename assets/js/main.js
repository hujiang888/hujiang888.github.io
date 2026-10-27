/**
 * 胡江 · 个人作品集
 * 全站交互：导航、滚动高亮、进入视口动画、复制、年份。
 */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  const header = document.querySelector('.site-header');
  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('navToggle');
  const navLinks = nav ? Array.from(nav.querySelectorAll('.nav__link')) : [];
  const sections = Array.from(document.querySelectorAll('main section[id]'));
  const revealEls = Array.from(document.querySelectorAll('.reveal'));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------- 年份 ---------------------------- */

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------------------------- 导航 ---------------------------- */

  function setMenu(open) {
    if (!nav || !navToggle) return;
    nav.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    document.body.classList.toggle('menu-open', open);
  }

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      setMenu(!nav.classList.contains('is-open'));
    });
  }

  if (nav) {
    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setMenu(false));
    });
  }

  document.addEventListener('click', (event) => {
    if (!nav || !nav.classList.contains('is-open')) return;
    if (nav.contains(event.target) || (navToggle && navToggle.contains(event.target))) return;
    setMenu(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenu(false);
  });

  const desktop = window.matchMedia('(min-width: 921px)');
  const onDesktop = (event) => {
    if (event.matches) setMenu(false);
  };
  if (typeof desktop.addEventListener === 'function') desktop.addEventListener('change', onDesktop);
  else if (typeof desktop.addListener === 'function') desktop.addListener(onDesktop);

  /* -------------------------- 滚动阴影 -------------------------- */

  function updateHeader() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }

  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  /* -------------------------- 当前区块 -------------------------- */

  if ('IntersectionObserver' in window && sections.length && navLinks.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = '#' + entry.target.id;
          navLinks.forEach((link) => {
            link.classList.toggle('is-active', link.getAttribute('href') === target);
          });
        });
      },
      { rootMargin: '-42% 0px -50% 0px', threshold: 0 }
    );

    sections.forEach((section) => spy.observe(section));
  }

  /* -------------------------- 进入视口 -------------------------- */

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------------------------- 复制 ---------------------------- */

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (error) {
      ok = false;
    }
    textarea.remove();
    return ok;
  }

  document.querySelectorAll('[data-copy]').forEach((button) => {
    const label = button.querySelector('.copy-label');
    const original = label ? label.textContent : '';
    let timer = 0;

    button.addEventListener('click', async () => {
      const text = button.getAttribute('data-copy') || '';
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch (error) {
        ok = fallbackCopy(text);
      }

      if (!label) return;
      clearTimeout(timer);
      label.textContent = ok ? '已复制' : '复制失败，请手动选择';
      button.classList.toggle('is-copied', ok);
      timer = setTimeout(() => {
        label.textContent = original;
        button.classList.remove('is-copied');
      }, 1800);
    });
  });
})();
