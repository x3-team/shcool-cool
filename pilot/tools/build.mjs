// Bundles engine + content into one self-contained page: pilot/dist/index.html
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadContent, ENGINE } from './load.mjs';
const content = loadContent();
const langs = content.course.languages.filter((l) => content.i18n[l]);
content.course = { ...content.course, languages: langs };
const tpl = fs.readFileSync(path.join(ROOT, 'engine/index.template.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'engine/style.css'), 'utf8');
const js = ENGINE.map((f) => '/* ' + f + ' */\n' + fs.readFileSync(path.join(ROOT, 'engine', f), 'utf8')).join('\n');
const data = 'window.SC_CONTENT=' + JSON.stringify(content).replace(/</g, '\\u003c') + ';';
const html = tpl.replace('/*STYLE*/', () => css).replace('/*CONTENT*/', () => data).replace('/*SCRIPTS*/', () => js.replace(/<\/script/gi, '<\\/script'));
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist/index.html'), html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' KB', 'languages:', langs.join(','), 'lessons:', Object.keys(content.lessons).length);
