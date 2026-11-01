// Loads the pilot content (course, lessons, translations) from pilot/content.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
export function loadContent() {
  const course = readJSON(path.join(ROOT, 'content/course.json'));
  const lessons = {};
  for (const f of fs.readdirSync(path.join(ROOT, 'content/lessons')).sort()) {
    if (!f.endsWith('.json')) continue;
    const L = readJSON(path.join(ROOT, 'content/lessons', f));
    lessons[L.id] = L;
  }
  const i18n = {};
  for (const lang of course.languages) {
    const p = path.join(ROOT, 'content/i18n', lang + '.json');
    if (fs.existsSync(p)) i18n[lang] = readJSON(p);
  }
  return { course, lessons, i18n };
}
export const ENGINE = ['core.js', 'tasks.js', 'three-kit.js', 'instruments/fraction-pie.js', 'instruments/number-line.js', 'instruments/chocolate-bar.js', 'instruments/forces-lab.js', 'app.js'];
