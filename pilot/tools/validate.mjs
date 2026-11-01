// Automatic checks for the pilot content. Run: node pilot/tools/validate.mjs
// 1. structure of every lesson; 2. every language has every key with the same placeholders;
// 3. every text renders; 4. every task variant is solvable and its answer is accepted;
// 5. every typical-mistake code the checker can return has an explanation in every language.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT, loadContent } from './load.mjs';

const require = createRequire(import.meta.url);
require(path.join(ROOT, 'engine/core.js'));
require(path.join(ROOT, 'engine/tasks.js'));
const SC = globalThis.SC;
const { course, lessons, i18n } = loadContent();
const errors = [];
const warn = [];
const E = (m) => errors.push(m);
const INSTRUMENTS = ['fraction-pie', 'number-line', 'chocolate-bar', 'forces-lab'];
const BASE = 'ru';

/* ---------- 1. structure ---------- */
const unitIds = new Set(course.units.map((u) => u.id));
for (const u of course.units) for (const id of u.lessons) if (!lessons[id]) E(`unit ${u.id}: lesson ${id} missing`);
for (const L of Object.values(lessons)) {
  if (!unitIds.has(L.unit)) E(`${L.id}: unknown unit ${L.unit}`);
  if (!['core', 'plus'].includes(L.track)) E(`${L.id}: track must be core|plus`);
  if (!INSTRUMENTS.includes(L.scene.instrument)) E(`${L.id}: unknown instrument ${L.scene.instrument}`);
  if (!(L.predict.correct >= 0 && L.predict.correct < L.predict.options)) E(`${L.id}: predict.correct out of range`);
  if (!Array.isArray(L.explore) || !L.explore.length) E(`${L.id}: explore steps missing`);
  if (L.tasks.length < 6) E(`${L.id}: fewer than 6 tasks`);
  for (const lvl of (L.id.includes('mission') ? [2, 3] : [1, 2, 3])) if (!L.tasks.some((t) => t.level === lvl)) E(`${L.id}: no level ${lvl} task`);
  for (const t of L.tasks) if (!SC.taskTypes[t.type]) E(`${L.id}: unknown task type ${t.type}`);
  for (const c of Object.keys(course.curricula)) if (!L.curricula[c]) warn.push(`${L.id}: no map for ${c}`);
}

/* ---------- 2. languages ---------- */
function walk(obj, prefix, out) {
  if (typeof obj === 'string') { out[prefix] = obj; return out; }
  if (Array.isArray(obj)) { out[prefix + '#len'] = obj.length; obj.forEach((v, i) => walk(v, prefix + '.' + i, out)); return out; }
  for (const k of Object.keys(obj)) walk(obj[k], prefix ? prefix + '.' + k : k, out);
  return out;
}
const base = walk(i18n[BASE], '', {});
for (const L of Object.values(lessons)) {
  const p = 'lessons.' + L.id;
  for (const k of ['title', 'hook', 'page', 'predict.q', 'predict.why', 'explain', 'sandbox']) if (typeof SC.lookup(i18n[BASE], p + '.' + k) !== 'string') E(`${BASE}: ${p}.${k} missing`);
  if (base[p + '.predict.opts#len'] !== L.predict.options) E(`${BASE}: ${p}.predict.opts must have ${L.predict.options} items`);
  if (base[p + '.explore#len'] !== L.explore.length) E(`${BASE}: ${p}.explore must have ${L.explore.length} items`);
}
for (const type of Object.keys(SC.taskTypes)) for (const k of ['prompt', 'h1', 'h2', 'h3', 'sol']) if (typeof SC.lookup(i18n[BASE], 'tasks.' + type + '.' + k) !== 'string') E(`${BASE}: tasks.${type}.${k} missing`);
const langs = course.languages.filter((l) => i18n[l]);
for (const lang of langs) {
  if (lang === BASE) continue;
  const cur = walk(i18n[lang], '', {});
  for (const k of Object.keys(base)) {
    if (!(k in cur)) { E(`${lang}: missing ${k}`); continue; }
    if (k.endsWith('#len')) { if (cur[k] !== base[k]) E(`${lang}: ${k} = ${cur[k]}, expected ${base[k]}`); continue; }
    const a = SC.placeholders(base[k]).join(' '), b = SC.placeholders(cur[k]).join(' ');
    if (a !== b) E(`${lang}: ${k} placeholders [${b}] differ from ${BASE} [${a}]`);
    if (lang !== BASE && cur[k] === base[k] && /[а-яё]/i.test(cur[k])) E(`${lang}: ${k} is still in Russian`);
  }
  for (const k of Object.keys(cur)) if (!(k in base)) warn.push(`${lang}: extra key ${k}`);
}
for (const l of course.languages) if (!i18n[l]) warn.push(`language ${l}: no translation file yet`);

/* ---------- 3 & 4. rendering and tasks ---------- */
const SEEDS = 300;
const errCodes = {};
const src = fs.readFileSync(path.join(ROOT, 'engine/tasks.js'), 'utf8');
for (const m of src.matchAll(/T\['([\w.]+)'\] = \{([\s\S]*?)\n  \};/g)) errCodes[m[1]] = [...new Set([...m[2].matchAll(/err: '(\w+)'/g)].map((x) => x[1]))];

function sceneAnswer(t) {
  const a = t.answer;
  switch (t.type) {
    case 'frac.shade': return { pies: [{ n: a.den, k: a.num }] };
    case 'frac.place': return { n: a.den, max: 1, point: a.num };
    case 'force.springScene': return { mode: 'spring', k: 50, weights: a };
    case 'force.tugScene': return { mode: 'tug', left: a, right: a };
  }
  return a;
}
for (const lang of langs) {
  const dict = i18n[lang];
  const get = (key) => SC.lookup(dict, key);
  const flat = walk(dict, '', {});
  for (const [k, s] of Object.entries(flat)) {
    if (k.startsWith('tasks.') || k.endsWith('#len')) continue;
    if (k.startsWith('curricula.') && k.endsWith('.grade')) { try { SC.render(s, { g: '5' }, lang); } catch (e) { E(`${lang}: ${k}: ${e.message}`); } continue; }
    if (/^ui\.(summary|hint|hintN)$/.test(k)) continue;
    try { SC.render(s, {}, lang); } catch (e) { E(`${lang}: ${k}: ${e.message}`); }
  }
  const used = new Set();
  for (const L of Object.values(lessons)) {
    L.tasks.forEach((spec, i) => {
      used.add(spec.type);
      for (let seed = 1; seed <= SEEDS; seed++) {
        let t;
        try { t = SC.makeTask(spec, seed * 7919 + i); } catch (e) { E(`${L.id} task ${i}: ${e.message}`); return; }
        if (lang === BASE) {
          const r = SC.checkTask(t, sceneAnswer(t));
          if (!r.ok) { E(`${L.id} task ${i} seed ${seed}: correct answer rejected (${JSON.stringify(t.answer)})`); return; }
          const nums = JSON.stringify(t.vars).match(/-?\d+(\.\d+)?/g) || [];
          if (nums.some((x) => !isFinite(+x))) E(`${L.id} task ${i}: non-finite numbers`);
          if (t.input === 'fraction' && (t.answer.den <= 0 || t.answer.num < 0)) E(`${L.id} task ${i}: bad fraction answer`);
        }
        const vars = Object.assign({}, t.vars);
        if (t.planet) vars.planet = get('ui.planets.' + t.planet);
        if (t.side) vars.side = get('ui.dir_' + t.side);
        for (const k of ['prompt', 'h1', 'h2', 'h3', 'sol']) {
          const s = get('tasks.' + t.type + '.' + k);
          if (typeof s !== 'string') { E(`${lang}: tasks.${t.type}.${k} missing`); return; }
          try { SC.render(s, vars, lang); } catch (e) { E(`${lang}: tasks.${t.type}.${k}: ${e.message}`); return; }
        }
        for (const code of errCodes[t.type] || []) {
          const s = get('tasks.' + t.type + '.err.' + code);
          if (s == null) { E(`${lang}: tasks.${t.type}.err.${code} missing`); return; }
          try { SC.render(s, vars, lang); } catch (e) { E(`${lang}: tasks.${t.type}.err.${code}: ${e.message}`); return; }
        }
      }
    });
  }
  if (lang === BASE) for (const type of Object.keys(SC.taskTypes)) if (!used.has(type)) warn.push(`task type ${type} not used by any lesson`);
}

/* ---------- 5. typical mistakes are recognised ---------- */
const probes = [
  ['frac.addUnlike', (t) => ({ num: t.vars.a + t.vars.c, den: t.vars.b + t.vars.d }), 'addDen'],
  ['frac.addSame', (t) => ({ num: t.vars.s, den: 2 * t.vars.n }), 'addDen'],
  ['frac.read', (t) => ({ num: t.answer.den, den: t.answer.num }), 'flip'],
  ['frac.toImproper', (t) => t.vars.w + t.vars.a, 'wPlusA'],
  ['frac.ofNumber', (t) => t.vars.q, 'divOnly'],
  ['force.hooke', (t) => t.vars.k * t.vars.cm, 'cm'],
  ['force.gravity', (t) => t.vars.m, 'noG'],
  ['force.sumOpp', (t) => t.vars.s, 'sum'],
];
for (const [type, wrong, code] of probes) {
  for (let seed = 1; seed <= 100; seed++) {
    const t = SC.makeTask({ type, level: 1, params: {} }, seed);
    if (type === 'frac.ofNumber' && t.vars.a === 1) continue;
    const r = SC.checkTask(t, wrong(t));
    if (r.ok) { E(`${type}: typical mistake accepted as correct (seed ${seed})`); break; }
    if (r.err !== code) { E(`${type}: mistake should be "${code}", got "${r.err}" (seed ${seed})`); break; }
  }
}

console.log(`Lessons: ${Object.keys(lessons).length} · task types: ${Object.keys(SC.taskTypes).length} · languages: ${langs.join(', ')} · variants checked per task: ${SEEDS}`);
if (warn.length) console.log('Warnings:\n  ' + [...new Set(warn)].join('\n  '));
if (errors.length) { console.log(`\n${errors.length} problem(s):\n  ` + [...new Set(errors)].slice(0, 80).join('\n  ')); process.exit(1); }
console.log('All checks passed.');
