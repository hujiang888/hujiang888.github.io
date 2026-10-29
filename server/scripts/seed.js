'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function normalizeLinks(html) {
  return String(html || '')
    .replace(/post\.html\?slug=([a-z0-9-]+)/gi, '/post/$1')
    .replace(/projects\/imagegrab\.html/gi, '/project/imagegrab')
    .replace(/href="index\.html#notes"/gi, 'href="/#notes"')
    .replace(/href="index\.html"/gi, 'href="/"')
    .replace(/src="assets\//gi, 'src="/assets/')
    .replace(/href="assets\//gi, 'href="/assets/');
}

async function main() {
  const seedDir = path.join(__dirname, '..', 'seed');
  const content = JSON.parse(fs.readFileSync(path.join(seedDir, 'content.json'), 'utf8'));
  const imagegrabDetail = fs.readFileSync(path.join(seedDir, 'project-imagegrab-detail.html'), 'utf8');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jianghu_portfolio',
    multipleStatements: true,
    charset: 'utf8mb4'
  });

  await connection.beginTransaction();
  try {
    const p = content.profile;
    const a = content.about;
    const c = content.contact;

    await connection.query(
      `INSERT INTO site_settings
       (id, profile_name, profile_en, role, focus, lead, meta, status, location, doing, updated, github, github_name,
        about_intro, about_paragraphs, about_values, about_now, about_timeline,
        contact_intro, contact_note)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        profile_name=VALUES(profile_name), profile_en=VALUES(profile_en), role=VALUES(role),
        focus=VALUES(focus), lead=VALUES(lead), meta=VALUES(meta), status=VALUES(status),
        location=VALUES(location), doing=VALUES(doing), updated=VALUES(updated),
        github=VALUES(github), github_name=VALUES(github_name),
        about_intro=VALUES(about_intro), about_paragraphs=VALUES(about_paragraphs),
        about_values=VALUES(about_values), about_now=VALUES(about_now),
        about_timeline=VALUES(about_timeline), contact_intro=VALUES(contact_intro),
        contact_note=VALUES(contact_note)`,
      [
        p.name, p.en, p.role, p.focus, p.lead, p.school, p.status, p.location, p.doing, p.updated,
        p.github, p.githubName, a.intro, JSON.stringify(a.paragraphs || []), JSON.stringify(a.values || []),
        JSON.stringify(a.now || []), JSON.stringify(a.timeline || []), c.intro, c.note
      ]
    );

    await connection.query('DELETE FROM skills');
    for (let i = 0; i < content.skills.length; i += 1) {
      const skill = content.skills[i];
      await connection.query(
        'INSERT INTO skills (sort_order, title, level, description, tags) VALUES (?, ?, ?, ?, ?)',
        [i, skill.title, skill.level, skill.desc, JSON.stringify(skill.tags || [])]
      );
    }

    await connection.query('DELETE FROM projects');
    for (let i = 0; i < content.projects.length; i += 1) {
      const project = content.projects[i];
      const detail = project.slug === 'imagegrab'
        ? imagegrabDetail
        : normalizeLinks(project.detail_html || '');
      const detailUrl = project.slug === 'imagegrab'
        ? '/project/imagegrab'
        : project.slug === 'llm-lab'
          ? '/post/llm-training-notes'
          : (project.links || {}).detail || '';
      await connection.query(
        `INSERT INTO projects
         (sort_order, slug, title, subtitle, kicker, description, tags, facts, live_url, repo_url, detail_url,
          featured, cover, cover_alt, cover_class, cover_word, cover_note, detail_html)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          i, project.slug, project.title, project.subtitle, project.kicker, project.desc,
          JSON.stringify(project.tags || []), JSON.stringify(project.facts || []),
          (project.links || {}).live || '', (project.links || {}).repo || '', detailUrl,
          project.featured ? 1 : 0, project.cover || '', project.coverAlt || '',
          project.coverClass || 'project-cover--site', project.coverWord || '', project.coverNote || '', detail
        ]
      );
    }

    await connection.query('DELETE FROM posts');
    for (let i = 0; i < content.posts.length; i += 1) {
      const post = content.posts[i];
      await connection.query(
        `INSERT INTO posts (sort_order, slug, title, date_text, read_time, category, excerpt, content_html)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [i, post.slug, post.title, post.date, post.readTime, post.category, post.excerpt, normalizeLinks(post.content)]
      );
    }

    await connection.commit();
    console.log(`已导入：1 个站点设置、${content.skills.length} 个技能、${content.projects.length} 个项目、${content.posts.length} 篇文章。`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('内容导入失败：', error.message);
  process.exit(1);
});
