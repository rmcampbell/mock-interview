#!/usr/bin/env node
/**
 * Minimal static server for previewing dist/ locally.
 * Needed because the page fetches subjects.json, which browsers block on file://
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(path.dirname(__dirname), 'dist');
const port = Number(process.env.PORT) || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

if (!fs.existsSync(root)) {
  console.error('dist/ not found. Run `npm run build:web` first.');
  process.exit(1);
}

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const filePath = path.join(root, rel);

  // Keep requests inside dist/
  if (!filePath.startsWith(root)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, body) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(filePath)] || 'application/octet-stream' });
    res.end(body);
  });
}).listen(port, () => {
  console.log(`Serving dist/ at http://localhost:${port}`);
});
