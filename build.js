#!/usr/bin/env node
// Static site generator for erlandsson.dev. No dependencies.
// Reads projects.json and renders templates/ + projects/<slug>/content.html into dist/.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

// Everything in static/ is copied into the root of dist/ (static/assets/x.png -> /assets/x.png).
const STATIC_DIR = path.join(ROOT, 'static');
const CNAME = path.join(ROOT, 'CNAME'); // optional, must end up at the site root for custom domains

function fail(msg) {
    console.error(`\nBuild failed: ${msg}\n`);
    process.exit(1);
}

const esc = (s) =>
    String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

// Single-pass placeholder substitution: inserted values are never re-scanned,
// so a "{{...}}" inside project content can't be expanded, and "$" is safe.
function render(template, values, name) {
    return template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
        if (!(key in values)) fail(`${name} uses unknown placeholder {{${key}}}`);
        return values[key];
    });
}

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
function write(rel, data) {
    const out = path.join(DIST, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, data);
}

// ---- Load and validate projects.json ---------------------------------------

let projects;
try {
    projects = JSON.parse(read('projects.json'));
} catch (e) {
    fail(`could not read projects.json: ${e.message}`);
}
if (!Array.isArray(projects)) fail('projects.json must be an array');

const contentPath = (p) => `projects/${p.slug}/content.html`;
const seen = new Set();
projects.forEach((p, i) => {
    const where = `projects.json entry #${i + 1}${p && p.slug ? ` ("${p.slug}")` : ''}`;
    if (!p || typeof p !== 'object') fail(`${where} is not an object`);
    for (const f of ['slug', 'title', 'description', 'logo']) {
        if (typeof p[f] !== 'string' || !p[f].trim()) fail(`${where} is missing required field "${f}"`);
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(p.slug)) {
        fail(`${where}: slug may only contain letters, digits, "_" and "-"`);
    }
    if (seen.has(p.slug)) fail(`duplicate slug "${p.slug}"`);
    seen.add(p.slug);

    if ('content' in p) fail(`${where}: "content" is no longer a field; the page body is always projects/${p.slug}/content.html`);
    // The folder must be named after the slug; it holds the images and content.html.
    if (!fs.existsSync(path.join(ROOT, 'projects', p.slug))) {
        fail(`${where}: folder "projects/${p.slug}/" does not exist`);
    }
    const hasLink = typeof p.link === 'string' && p.link.trim();
    // An entry with "link" is external (no page of its own); otherwise it needs content.html.
    if (!hasLink && !fs.existsSync(path.join(ROOT, contentPath(p)))) {
        fail(`${where}: missing "${contentPath(p)}" (add it, or set "link" for an external project)`);
    }
    // Projects with their own page show the subtitle under the title; external ones have no page.
    if (!hasLink && (typeof p.subtitle !== 'string' || !p.subtitle.trim())) {
        fail(`${where} is missing required field "subtitle"`);
    }
    if (hasLink && !/^https?:\/\//.test(p.link)) fail(`${where}: "link" must be an http(s) URL`);
    if (typeof p.date_added !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.date_added) || isNaN(Date.parse(p.date_added))) {
        fail(`${where}: "date_added" must be a valid YYYY-MM-DD date`);
    }
    if (!p.logo.startsWith('/')) fail(`${where}: "logo" must be a site path starting with "/"`);
    // Site paths map to the repo as: /projects/... -> projects/..., everything else -> static/...
    const logoSrc = p.logo.startsWith('/projects/') ? path.join(ROOT, p.logo) : path.join(STATIC_DIR, p.logo);
    if (!fs.existsSync(logoSrc)) fail(`${where}: logo file "${p.logo}" does not exist`);
});

// Index order: newest first by date_added (stable, so ties keep file order).
projects.sort((a, b) => b.date_added.localeCompare(a.date_added));

const indexTpl = read('templates/index.html');
const projectTpl = read('templates/project.html');

const SITE_URL = (fs.existsSync(path.join(ROOT, 'CNAME'))
    ? `https://${read('CNAME').trim()}`
    : 'https://nikerl.github.io');

// ---- Clean + static files ---------------------------------------------------

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

if (!fs.existsSync(STATIC_DIR)) fail('required folder "static/" is missing');
fs.cpSync(STATIC_DIR, DIST, { recursive: true });
if (fs.existsSync(CNAME)) fs.copyFileSync(CNAME, path.join(DIST, 'CNAME'));

// Each project lives in projects/<slug>/ (images + content fragment).
// Copy the folder to dist/projects/<slug>/, except the raw content fragment,
// which is rendered into index.html below.
for (const p of projects) {
    const dir = path.join(ROOT, 'projects', p.slug);
    const contentAbs = path.resolve(ROOT, contentPath(p));
    fs.cpSync(dir, path.join(DIST, 'projects', p.slug), {
        recursive: true,
        filter: (src) => path.resolve(src) !== contentAbs,
    });
}

// ---- Index ------------------------------------------------------------------

const isExternal = (p) => !!p.link;
const pageUrl = (p) => `/projects/${p.slug}/`;

// One card per project, from templates/project_card.html, indented to match
// where {{PROJECT_LIST}} sits in templates/index.html.
const cardTpl = read('templates/project_card.html').trim();
const listIndent = (indexTpl.match(/^([ \t]*)\{\{PROJECT_LIST\}\}/m) || [, ''])[1];

const projectList = projects
    .map((p) => {
        const card = render(
            cardTpl,
            {
                HREF: esc(isExternal(p) ? p.link : pageUrl(p)),
                // External links must bypass the client-side router.
                LINK_ATTRS: isExternal(p) ? ' data-no-router' : '',
                LOGO: esc(p.logo),
                TITLE: esc(p.title),
                DESCRIPTION: esc(p.description),
            },
            'templates/project_card.html'
        );
        return card.split('\n').map((line) => (line ? listIndent + line : line)).join('\n');
    })
    .join('\n')
    .trimStart(); // the first card sits right after the placeholder's own indent

write('index.html', render(indexTpl, { PROJECT_LIST: projectList, SITE_URL: esc(SITE_URL) }, 'templates/index.html'));

// ---- Project pages ----------------------------------------------------------
// External projects (with "link") have no page of their own.

for (const p of projects) {
    if (isExternal(p)) continue;
    const html = render(
        projectTpl,
        {
            TITLE: esc(p.title),
            DESCRIPTION: esc(p.description),
            LOGO: esc(p.logo),
            LOGO_URL: esc(SITE_URL + p.logo),
            PAGE_URL: esc(SITE_URL + pageUrl(p)),
            // Trusted HTML, inserted raw, but {{TITLE}} / {{SUBTITLE}} in it are filled from projects.json.
            CONTENT: render(
                read(contentPath(p)).trim(),
                { TITLE: esc(p.title), SUBTITLE: esc(p.subtitle) },
                contentPath(p)
            ),
        },
        'templates/project.html'
    );
    write(`projects/${p.slug}/index.html`, html);
}

console.log(`Built ${projects.length} projects into dist/`);
