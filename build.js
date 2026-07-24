#!/usr/bin/env node
/* Seruleb static build.
 * Source pages are authored as *.dc.html (editable in Omelette & Claude Code).
 * This produces dist/ with clean .html URLs that Cloudflare Pages serves.
 * Run: node build.js   (Cloudflare Pages: Build command = "node build.js", Output = "dist")
 */
const fs = require('fs');
const path = require('path');

const OUT = 'dist';
const RUNTIME = ['support.js'];
// 'madina' — отдельный статический сайт, живёт на /madina/ и копируется как есть.
const ASSET_DIRS = ['assets', 'madina'];
const PASSTHROUGH = ['_headers', '_redirects', 'robots.txt', 'sitemap.xml'];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let pages = 0;
for (const f of fs.readdirSync('.')) {
  if (!f.endsWith('.dc.html')) continue;
  const html = fs.readFileSync(f, 'utf8').replace(/\.dc\.html/g, '.html');
  fs.writeFileSync(path.join(OUT, f.replace(/\.dc\.html$/, '.html')), html);
  pages++;
}

for (const f of RUNTIME) if (fs.existsSync(f)) fs.copyFileSync(f, path.join(OUT, f));

const copyDir = (src, dst) => {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
};
for (const dir of ASSET_DIRS) if (fs.existsSync(dir)) copyDir(dir, path.join(OUT, dir));
for (const f of PASSTHROUGH) if (fs.existsSync(f)) fs.copyFileSync(f, path.join(OUT, f));

console.log(`Built ${pages} page(s) -> ${OUT}/`);
