import { readFile, writeFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';

// Inline Vite's emitted resources rather than maintaining a second copy of the app.
const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
let html = await readFile(resolve(dist, 'index.html'), 'utf8');
for (const match of [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)]) {
  const href = match[0].match(/href="([^"]+)"/)?.[1];
  if (!href) throw Error('Stylesheet URL missing');
  const css = (await readFile(resolve(dist, 'assets', basename(href)), 'utf8'))
    .replace(/@import\s+(?:url\([^)]*\)|"[^"]*"|'[^']*')\s*;/g, '');
  html = html.replace(match[0], `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`);
}
for (const match of [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)]) {
  const js = await readFile(resolve(dist, 'assets', basename(match[1])), 'utf8');
  html = html.replace(match[0], () => `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`);
}
if (/<script[^>]+src=|<link[^>]+rel="stylesheet"|@import\s/.test(html)) {
  throw Error('Standalone file still has external code or stylesheet dependencies');
}
// file:// works offline, using installed Korean fonts instead of Google Fonts.
html = html.replace('</head>', '<!-- Standalone edition: CSS, JavaScript and SVG included; system fonts for offline use. -->\n</head>');
await Promise.all([
  writeFile(resolve(root, 'festival.html'), html),
  writeFile(resolve(dist, 'festival.html'), html),
]);
console.log('Standalone HTML generated: festival.html (also available in dist)');
