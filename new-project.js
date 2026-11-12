#!/usr/bin/env node
// Usage: node new-project.js <slug>
// Creates projects/<slug>/content.html and appends a placeholder entry to projects.json.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const slug = process.argv[2];

function fail(msg) {
    console.error(`\nError: ${msg}\n`);
    process.exit(1);
}

if (!slug) fail('usage: node new-project.js <slug>   (e.g. my_project)');
if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(slug)) {
    fail('slug may only contain letters, digits, "_" and "-", and must start with a letter or digit');
}

const jsonPath = path.join(ROOT, 'projects.json');
const dir = path.join(ROOT, 'projects', slug);

let projects;
try {
    projects = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
} catch (e) {
    fail(`could not read projects.json: ${e.message}`);
}
if (projects.some((p) => p.slug === slug)) fail(`projects.json already has a project with slug "${slug}"`);
if (fs.existsSync(dir)) fail(`folder projects/${slug}/ already exists`);

const title = slug
    .split(/[_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
const today = new Date().toISOString().slice(0, 10);

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(
    path.join(dir, 'content.html'),
    `<h1>${title}</h1>
<hr>
<p>
    Describe the project here.
</p>
`
);

projects.push({
    slug,
    title,
    description: 'TODO: one line shown on the index and in link previews',
    date_added: today,
    logo: `/projects/${slug}/logo.png`,
});
fs.writeFileSync(jsonPath, JSON.stringify(projects, null, 4) + '\n');

console.log(`Created projects/${slug}/content.html and added "${slug}" to projects.json.`);
console.log('Next:');
console.log(`  - put the logo at projects/${slug}/logo.png (or change "logo" in projects.json); the build fails until it exists`);
console.log('  - fill in title, description and date_added in projects.json');
console.log(`  - write projects/${slug}/content.html`);
