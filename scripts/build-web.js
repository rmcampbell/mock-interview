#!/usr/bin/env node
/**
 * Builds the static site into dist/.
 *
 * Browsers cannot list a directory over HTTP, so every subjects/*.json is
 * bundled into a single dist/subjects.json the page fetches once. The files in
 * subjects/ remain the single source of truth for both the CLI and the web app.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.dirname(__dirname);
const subjectsDir = path.join(root, 'subjects');
const webDir = path.join(root, 'web');
const outDir = path.join(root, 'dist');

function buildSubjects() {
  const topics = [];
  const disabled = [];
  let skipped = 0;

  for (const file of fs.readdirSync(subjectsDir).sort()) {
    if (!file.endsWith('.json') || file === 'template.json') continue;

    const filePath = path.join(subjectsDir, file);
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      // Match the CLI's behavior: a broken file is reported, not fatal.
      console.error(`  ! ${file}: invalid JSON (${error.message}) - skipped`);
      skipped += 1;
      continue;
    }

    const { topic, questions, enabled } = parsed;
    if (!topic || !Array.isArray(questions)) {
      console.error(`  ! ${file}: expected { topic, questions[] } - skipped`);
      skipped += 1;
      continue;
    }

    // `enabled: false` keeps a subject local (CLI only) and out of the deployment.
    // Omitting the flag means enabled, so a new subject is never silently dropped.
    if (enabled === false) {
      disabled.push(topic);
      continue;
    }

    // Same filter the CLI applies: drop the empty placeholder slots.
    const usable = questions.filter((q) => q && q.question && q.answer);
    if (!usable.length) {
      console.error(`  ! ${file}: no answerable questions - skipped`);
      skipped += 1;
      continue;
    }

    topics.push({ topic, questions: usable });
  }

  return { topics, skipped, disabled };
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

fs.rmSync(outDir, { recursive: true, force: true });
copyDir(webDir, outDir);

const { topics, skipped, disabled } = buildSubjects();
fs.writeFileSync(path.join(outDir, 'subjects.json'), JSON.stringify(topics));

// Vendor third-party scripts so the page has no external CDN dependency.
// Prism core already covers markup/css/clike/javascript; the rest are the
// languages actually used in subjects/ (java, sql, http).
const vendorFiles = [
  ['markdown-it', 'dist/markdown-it.min.js', 'markdown-it.min.js'],
  ['prismjs', 'prism.js', 'prism.js'],
  ['prismjs', 'components/prism-java.min.js', 'prism-java.min.js'],
  ['prismjs', 'components/prism-sql.min.js', 'prism-sql.min.js'],
  ['prismjs', 'components/prism-http.min.js', 'prism-http.min.js']
];

const vendorDir = path.join(outDir, 'vendor');
fs.mkdirSync(vendorDir, { recursive: true });

for (const [pkg, from, to] of vendorFiles) {
  const src = path.join(root, 'node_modules', pkg, from);
  if (!fs.existsSync(src)) {
    console.error(`\n${pkg}/${from} not found. Run \`npm install\` first.`);
    process.exit(1);
  }

  fs.copyFileSync(src, path.join(vendorDir, to));
}

// Tell GitHub Pages not to run the output through Jekyll.
fs.writeFileSync(path.join(outDir, '.nojekyll'), '');

const totalQuestions = topics.reduce((sum, t) => sum + t.questions.length, 0);
console.log(`Built dist/ - ${topics.length} topics, ${totalQuestions} questions${skipped ? `, ${skipped} file(s) skipped` : ''}`);
if (disabled.length) {
  console.log(`Not deployed (enabled: false) - ${disabled.join(', ')}`);
}
