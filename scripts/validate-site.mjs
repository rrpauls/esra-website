import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hosting = JSON.parse(readFileSync(resolve(root, '.openai/hosting.json'), 'utf8'));
const dist = resolve(root, hosting.static.directory);
const errors = [];
let pages = 0;

function checkFile(url, source) {
  if (!url || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url)) return;
  const pathname = decodeURIComponent(url.split(/[?#]/)[0]);
  const target = pathname.startsWith('/')
    ? resolve(dist, `.${pathname}`)
    : resolve(dirname(source), pathname);
  const rel = relative(dist, target);
  if (rel === '..' || rel.startsWith(`..${sep}`)) {
    errors.push(`${relative(dist, source)}: reference outside dist: ${url}`);
    return;
  }
  try {
    const info = statSync(target);
    if (info.isDirectory()) statSync(resolve(target, 'index.html'));
  } catch {
    errors.push(`${relative(dist, source)}: missing local file: ${url}`);
  }
}

function inspect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) { inspect(path); continue; }
    if (entry.name.endsWith('.webmanifest')) {
      const manifest = JSON.parse(readFileSync(path, 'utf8'));
      for (const icon of manifest.icons ?? []) checkFile(icon.src, path);
    }
    if (!entry.name.endsWith('.html')) continue;
    pages++;
    const html = readFileSync(path, 'utf8');
    if (!/<title>\s*[^<]+<\/title>/i.test(html)) errors.push(`${entry.name}: missing page title`);
    const ids = new Set([...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map(match => match[1]));
    for (const match of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/g)) {
      if (match[1].startsWith('#')) {
        if (match[1] !== '#' && !ids.has(decodeURIComponent(match[1].slice(1)))) {
          errors.push(`${entry.name}: missing anchor: ${match[1]}`);
        }
      } else checkFile(match[1], path);
    }
    for (const match of html.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) checkFile(match[1], path);
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/\bsrc\s*=|\btype\s*=\s*["'](?:module|application\/ld\+json)/i.test(match[1])) continue;
      try { new Script(match[2], { filename: relative(dist, path) }); }
      catch (error) { errors.push(error.message); }
    }
  }
}

statSync(resolve(dist, 'index.html'));
inspect(dist);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${pages} HTML page(s), local assets, manifest icons, page anchors and inline JavaScript.`);
}
