# mock-interview

Personal interview-prep flashcards. The questions live in `subjects/*.json` and are
shared by two front ends:

- a **terminal quiz** (`npm run interview`)
- a **static web app** deployed to GitHub Pages

## Questions

Each file in `subjects/` looks like:

```json
{
  "topic": "Core Java",
  "enabled": true,
  "questions": [
    { "question": "What is the JVM?", "answer": "The **Java Virtual Machine**..." }
  ]
}
```

Both front ends skip entries with an empty `question` or `answer`, so blank slots
can be left in place as placeholders. Answers are markdown — bullets, tables, and
fenced code blocks all render.

### `enabled`

Set `"enabled": false` to keep a subject **local**: the CLI still shows it, but
`build:web` leaves it out of the deployed site. Useful for company-specific or
personal notes you don't want on a public URL. The build prints what it excluded:

```
Built dist/ - 19 topics, 614 questions
Not deployed (enabled: false) - Paypal Specific
```

Omitting the flag means enabled, so a new subject is never silently dropped.

> Bullet indentation matters: nested list items need **2 spaces**. A single leading
> space makes the renderer treat the item as an unintended sub-list.

## CLI

```bash
npm install
npm run interview
```

## Web app

```bash
npm run build:web   # writes dist/
npm run serve:web   # preview at http://localhost:8080
```

`build:web` bundles every `subjects/*.json` into a single `dist/subjects.json`
(browsers can't list a directory over HTTP) and vendors `markdown-it` so the page
has no external dependencies.

`dist/` is generated and git-ignored — never edit it by hand.

### Deploying

`.github/workflows/deploy-pages.yml` builds and publishes to GitHub Pages on every
push to `master` that touches `subjects/`, `web/`, or the build script.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The site is then served at `https://<user>.github.io/mock-interview/`.

> GitHub Pages requires a public repo, or a paid plan for private repos.

## Layout

| Path | Purpose |
| --- | --- |
| `subjects/` | Question data (source of truth) |
| `index.js`, `src/` | Terminal quiz |
| `web/` | Static site source |
| `scripts/build-web.js` | Bundles data + copies `web/` into `dist/` |
| `dist/` | Build output (git-ignored) |
