/**
 * 文章 / 项目详情页：阅读进度与目录高亮。
 */
(function () {
  'use strict';

  const bar = document.getElementById('readingBar');
  const article = document.querySelector('.article-body');

  function updateProgress() {
    if (!bar) return;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    bar.style.width = (progress * 100).toFixed(2) + '%';
  }

  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);

  const tocLinks = Array.from(document.querySelectorAll('.article-toc a[href^="#"]'));
  if (tocLinks.length && article && 'IntersectionObserver' in window) {
    const headings = tocLinks
      .map((link) => document.getElementById(link.getAttribute('href').slice(1)))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          tocLinks.forEach((link) => {
            link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id);
          });
        });
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: 0 }
    );

    headings.forEach((heading) => observer.observe(heading));
  }
})();
