'use strict';

const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jianghu_portfolio',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  charset: 'utf8mb4'
});

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function mapSite(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.profile_name,
    en: row.profile_en,
    role: row.role,
    focus: row.focus,
    lead: row.lead || '',
    meta: row.meta || '',
    status: row.status || '',
    location: row.location || '',
    doing: row.doing || '',
    updated: row.updated || '',
    github: row.github || '',
    githubName: row.github_name || '',
    about: {
      intro: row.about_intro || '',
      paragraphs: parseJson(row.about_paragraphs, []),
      values: parseJson(row.about_values, []),
      now: parseJson(row.about_now, []),
      timeline: parseJson(row.about_timeline, [])
    },
    contact: {
      intro: row.contact_intro || '',
      note: row.contact_note || ''
    }
  };
}

function mapProject(row) {
  return {
    ...row,
    featured: Boolean(row.featured),
    tags: parseJson(row.tags, []),
    facts: parseJson(row.facts, []),
    links: {
      live: row.live_url || '',
      repo: row.repo_url || '',
      detail: row.detail_url || ''
    }
  };
}

async function getSite() {
  const [rows] = await pool.query('SELECT * FROM site_settings WHERE id = 1 LIMIT 1');
  return mapSite(rows[0]);
}

async function getSkills() {
  const [rows] = await pool.query('SELECT * FROM skills ORDER BY sort_order ASC, id ASC');
  return rows.map((row) => ({ ...row, tags: parseJson(row.tags, []) }));
}

async function getProjects() {
  const [rows] = await pool.query('SELECT * FROM projects ORDER BY sort_order ASC, id ASC');
  return rows.map(mapProject);
}

async function getProjectBySlug(slug) {
  const [rows] = await pool.query('SELECT * FROM projects WHERE slug = ? LIMIT 1', [slug]);
  return rows[0] ? mapProject(rows[0]) : null;
}

async function getPosts() {
  const [rows] = await pool.query('SELECT * FROM posts ORDER BY sort_order ASC, id ASC');
  return rows;
}

async function getPostBySlug(slug) {
  const [rows] = await pool.query('SELECT * FROM posts WHERE slug = ? LIMIT 1', [slug]);
  return rows[0] || null;
}

async function getCounts() {
  const [[skills]] = await pool.query('SELECT COUNT(*) AS count FROM skills');
  const [[projects]] = await pool.query('SELECT COUNT(*) AS count FROM projects');
  const [[posts]] = await pool.query('SELECT COUNT(*) AS count FROM posts');
  return {
    skills: skills.count,
    projects: projects.count,
    posts: posts.count
  };
}

module.exports = {
  pool,
  parseJson,
  getSite,
  getSkills,
  getProjects,
  getProjectBySlug,
  getPosts,
  getPostBySlug,
  getCounts
};
