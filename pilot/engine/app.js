/* School Cool pilot · the app: catalog, the Book lesson player, tasks with hints, languages and curriculum maps.
   Everything the child reads comes from SC_CONTENT.i18n[lang]; lessons are data in SC_CONTENT.lessons. */
(function () {
  const SC = window.SC;
  const C = window.SC_CONTENT;
  const LANGS = C.course.languages;
  const STEPS = ['page', 'predict', 'explore', 'explain', 'tasks', 'sandbox'];
  const $ = (sel, el) => (el || document).querySelector(sel);
  const h = (tag, attrs, html) => { const e = document.createElement(tag); if (attrs) for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else if (k.startsWith('on')) e[k] = attrs[k]; else e.setAttribute(k, attrs[k]); } if (html != null) e.innerHTML = html; return e; };

  /* ---------- storage (optional; the page works without it) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('sc.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('sc.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };

  /* ---------- language ---------- */
  const guessLang = () => { const n = (navigator.language || 'en').slice(0, 2); return LANGS.includes(n) ? n : (LANGS.includes('en') ? 'en' : LANGS[0]); };
  let lang = store.get('lang', null) || guessLang();
  if (!LANGS.includes(lang)) lang = LANGS.includes('en') ? 'en' : LANGS[0];
  let country = store.get('country', null) || ({ ru: 'ru-fgos', hi: 'in-ncert' }[lang] || 'us-ccss');

  const dict = () => C.i18n[lang];
  const lookup = (obj, path) => SC.lookup(obj, path);
  function t(key, vars) {
    let s = lookup(dict(), key);
    if (s == null) s = lookup(C.i18n.en || C.i18n[LANGS[0]], key);
    if (s == null) return key;
    return vars ? SC.render(s, vars, lang) : SC.render(s, {}, lang);
  }
  const tl = (lessonId, key, vars) => t('lessons.' + lessonId + '.' + key, vars);

  function applyLang() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = t('ui.appTitle');
  }

  /* ---------- theme ---------- */
  function resolvedTheme() { const forced = document.documentElement.dataset.theme; if (forced) return forced; return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  function setTheme(th) { if (th) document.documentElement.dataset.theme = th; else delete document.documentElement.dataset.theme; store.set('theme', th || null); if (kit) kit.setTheme(resolvedTheme()); }
  const savedTheme = store.get('theme', null); if (savedTheme) document.documentElement.dataset.theme = savedTheme;

  /* ---------- progress ---------- */
  const progress = store.get('progress', {}); // lessonId -> {solved:[idx], seen:bool}
  let sparks = store.get('sparks', 0);
  const saveProgress = () => { store.set('progress', progress); store.set('sparks', sparks); };
  const lp = (id) => progress[id] || (progress[id] = { solved: [], seen: false });

  /* ---------- top bar ---------- */
  const app = $('#app');
  function topBar(crumb) {
    const bar = h('header', { class: 'top' });
    bar.appendChild(h('a', { class: 'logo', href: '#/' }, 'School <span>Cool</span>'));
    bar.appendChild(h('div', { class: 'crumb' }, crumb || ''));
    bar.appendChild(h('div', { class: 'sparks', title: t('ui.sparks') }, '✦ ' + sparks));
    const sel = h('select', { 'aria-label': t('ui.language') });
    LANGS.forEach((l) => { const o = h('option', { value: l }, C.i18n[l].ui.langName); if (l === lang) o.selected = true; sel.appendChild(o); });
    sel.onchange = () => { lang = sel.value; store.set('lang', lang); applyLang(); route(); };
    bar.appendChild(sel);
    const th = h('button', { class: 'iconbtn', 'aria-label': t('ui.theme') }, resolvedTheme() === 'dark' ? '☀' : '☾');
    th.onclick = () => { setTheme(resolvedTheme() === 'dark' ? 'light' : 'dark'); th.textContent = resolvedTheme() === 'dark' ? '☀' : '☾'; };
    bar.appendChild(th);
    return bar;
  }

  /* ---------- catalog ---------- */
  function mapLabel(unit) {
    const m = unit.curricula[country];
    if (!m) return t('ui.noMap');
    return t('curricula.' + country + '.name') + ' · ' + t('curricula.' + country + '.grade', { g: m.grade }) + ' · ' + t('curricula.' + country + '.units.' + unit.id);
  }
  function showCatalog() {
    destroyKit();
    app.innerHTML = '';
    app.appendChild(topBar(''));
    const wrap = h('main', { class: 'catalog' });
    wrap.appendChild(h('h1', { class: 'hello' }, t('ui.hello')));
    wrap.appendChild(h('p', { class: 'sub' }, t('ui.pilotIntro')));
    const f = h('div', { class: 'filters' });
    const cl = h('label', null, t('ui.curriculum'));
    const cs = h('select');
    Object.keys(C.course.curricula).forEach((id) => { const o = h('option', { value: id }, t('curricula.' + id + '.name')); if (id === country) o.selected = true; cs.appendChild(o); });
    cs.onchange = () => { country = cs.value; store.set('country', country); showCatalog(); };
    cl.appendChild(cs); f.appendChild(cl); wrap.appendChild(f);
    const units = h('div', { class: 'units' });
    C.course.units.forEach((u) => {
      const card = h('section', { class: 'unit' });
      card.appendChild(h('div', { class: 'tint' }, '<div class="badge" style="background:' + u.tint + '">' + u.icon + '</div><div><h2>' + t('units.' + u.id + '.title') + '</h2><div class="map">' + mapLabel(u) + '</div></div>'));
      const ul = h('ol', { class: 'lessons' });
      u.lessons.forEach((id, i) => {
        const L = C.lessons[id]; const P = progress[id];
        const solved = P ? P.solved.length : 0, total = L.tasks.length;
        const st = solved >= total ? '<span class="st done">✓</span>' : solved ? '<span class="st">' + solved + '/' + total + '</span>' : '';
        const li = h('li'); li.appendChild(h('a', { href: '#/l/' + id }, '<span class="num">' + String(i + 1).padStart(2, '0') + '</span><span class="t">' + tl(id, 'title') + '</span>' + st));
        ul.appendChild(li);
      });
      card.appendChild(ul); units.appendChild(card);
    });
    wrap.appendChild(units);
    wrap.appendChild(h('p', { class: 'note' }, t('ui.pilotNote')));
    app.appendChild(wrap);
  }

  /* ---------- 3D ---------- */
  let kit = null, inst = null, instName = null, onSceneChange = null, controlsEl = null, stageEl = null;
  function destroyKit() { if (kit) { cancelAnimationFrame(kit.raf); kit.renderer.dispose(); } kit = null; inst = null; instName = null; }
  function ensureKit(sceneEl) {
    destroyKit();
    stageEl = h('div', { class: 'stage3d' }); controlsEl = h('div', { class: 'ctrls' });
    sceneEl.appendChild(stageEl); sceneEl.appendChild(controlsEl);
    document.documentElement.dataset.themeResolved = resolvedTheme();
    kit = new SC.Kit(stageEl); kit.setTheme(resolvedTheme());
  }
  function showScene(name, state) {
    if (!kit) return;
    if (name !== instName) {
      instName = name;
      inst = SC.instruments[name](kit, { t: (k) => t(k), lang, controls: controlsEl, changed: (s) => onSceneChange && onSceneChange(s) });
    }
    inst.set(state);
  }

  /* ---------- lesson player ---------- */
  function showLesson(id, step) {
    const L = C.lessons[id]; if (!L) { location.hash = '#/'; return; }
    const unit = C.course.units.find((u) => u.id === L.unit);
    step = STEPS.includes(step) ? step : 'page';
    app.innerHTML = '';
    app.appendChild(topBar(t('units.' + unit.id + '.title') + ' · ' + tl(id, 'title')));
    const wrap = h('main', { class: 'lesson' });
    const book = h('div', { class: 'book' });
    const page = h('section', { class: 'page', 'aria-live': 'polite' });
    const scene = h('section', { class: 'scene', 'aria-label': t('ui.scene') });
    book.appendChild(page); book.appendChild(scene); wrap.appendChild(book);
    const steps = h('nav', { class: 'steps', 'aria-label': t('ui.steps') });
    STEPS.forEach((s, i) => {
      const b = h('button', { 'aria-current': s === step ? 'step' : 'false' }, '<b>' + (i + 1) + '</b><span>' + t('ui.step.' + s) + '</span>');
      b.onclick = () => go(id, s); steps.appendChild(b);
    });
    wrap.appendChild(steps);
    app.appendChild(wrap);
    ensureKit(scene);
    lp(id).seen = true; saveProgress();
    const ctx = { id, L, page, unit };
    ({ page: stepPage, predict: stepPredict, explore: stepExplore, explain: stepExplain, tasks: stepTasks, sandbox: stepSandbox })[step](ctx);
  }
  const go = (id, step) => { location.hash = '#/l/' + id + '/' + step; };
  const next = (ctx, step) => { const i = STEPS.indexOf(step); const b = h('button', { class: 'btn' }, i < STEPS.length - 1 ? t('ui.next') + ' · ' + t('ui.step.' + STEPS[i + 1]) : t('ui.toCatalog')); b.onclick = () => (i < STEPS.length - 1 ? go(ctx.id, STEPS[i + 1]) : nextLesson(ctx)); return b; };
  function nextLesson(ctx) { const list = ctx.unit.lessons; const i = list.indexOf(ctx.id); location.hash = i < list.length - 1 ? '#/l/' + list[i + 1] : '#/'; }
  function head(ctx, step) { ctx.page.appendChild(h('div', { class: 'k' }, t('ui.step.' + step))); ctx.page.appendChild(h('h1', null, tl(ctx.id, 'title'))); }

  function stepPage(ctx) {
    head(ctx, 'page');
    ctx.page.appendChild(h('p', { class: 'lead' }, tl(ctx.id, 'hook')));
    tl(ctx.id, 'page').split('\n').forEach((p) => ctx.page.appendChild(h('p', null, p)));
    const r = h('div', { class: 'row' }); r.appendChild(next(ctx, 'page')); ctx.page.appendChild(r);
    onSceneChange = null; showScene(ctx.L.scene.instrument, ctx.L.scene.state);
  }

  function stepPredict(ctx) {
    head(ctx, 'predict');
    ctx.page.appendChild(h('p', { class: 'prompt' }, tl(ctx.id, 'predict.q')));
    const opts = h('div', { class: 'opts' }); const res = h('div');
    const n = ctx.L.predict.options;
    for (let i = 0; i < n; i++) {
      const b = h('button', { class: 'opt' }, tl(ctx.id, 'predict.opts.' + i));
      b.onclick = () => {
        [...opts.children].forEach((x, j) => { x.disabled = true; if (j === ctx.L.predict.correct) x.classList.add('right'); });
        if (i !== ctx.L.predict.correct) b.classList.add('wrong');
        res.innerHTML = '';
        res.appendChild(h('div', { class: 'box ' + (i === ctx.L.predict.correct ? 'good' : 'info') }, '<div class="h">' + t(i === ctx.L.predict.correct ? 'ui.predictRight' : 'ui.predictCheck') + '</div>' + tl(ctx.id, 'predict.why')));
        const r = h('div', { class: 'row' }); r.appendChild(next(ctx, 'predict')); res.appendChild(r);
        if (ctx.L.predict.state) showScene(ctx.L.predict.instrument || ctx.L.scene.instrument, ctx.L.predict.state);
      };
      opts.appendChild(b);
    }
    ctx.page.appendChild(opts); ctx.page.appendChild(res);
    onSceneChange = null; showScene(ctx.L.scene.instrument, ctx.L.scene.state);
  }

  function goalMet(goal, s) { return Object.keys(goal).every((path) => JSON.stringify(lookup(s, path)) === JSON.stringify(goal[path])); }

  function stepExplore(ctx, i) {
    i = i || 0;
    ctx.page.innerHTML = '';
    head(ctx, 'explore');
    const E = ctx.L.explore; const st = E[i];
    ctx.page.appendChild(h('div', { class: 'explore-n' }, (i + 1) + ' / ' + E.length));
    ctx.page.appendChild(h('p', { class: 'prompt' }, tl(ctx.id, 'explore.' + i)));
    const goal = st.goal ? h('div', { class: 'goal' }, '<i></i>' + t('ui.goalTodo')) : null;
    if (goal) ctx.page.appendChild(goal);
    const r = h('div', { class: 'row' });
    if (i > 0) { const b = h('button', { class: 'ghost' }, t('ui.back')); b.onclick = () => stepExplore(ctx, i - 1); r.appendChild(b); }
    if (st.state) { const s = h('button', { class: 'ghost' }, t('ui.reset')); s.onclick = () => showScene(st.instrument || ctx.L.scene.instrument, st.state); r.appendChild(s); }
    r.appendChild(h('div', { class: 'spacer' }));
    const nb = i < E.length - 1 ? h('button', { class: 'btn' }, t('ui.next')) : next(ctx, 'explore');
    if (i < E.length - 1) nb.onclick = () => stepExplore(ctx, i + 1);
    r.appendChild(nb);
    ctx.page.appendChild(r);
    const mark = (ok) => { if (!goal) return; goal.classList.toggle('ok', ok); goal.innerHTML = '<i>' + (ok ? '✓' : '') + '</i>' + t(ok ? 'ui.goalDone' : 'ui.goalTodo'); };
    onSceneChange = (s) => { if (st.goal && goalMet(st.goal, s)) mark(true); };
    if (st.state) showScene(st.instrument || ctx.L.scene.instrument, st.state);
    else if (!inst) showScene(ctx.L.scene.instrument, ctx.L.scene.state);
    if (st.goal && inst && goalMet(st.goal, inst.get())) mark(true);
  }

  function stepExplain(ctx) {
    head(ctx, 'explain');
    const box = h('div', { class: 'rule' });
    tl(ctx.id, 'explain').split('\n').forEach((p) => box.appendChild(h('p', null, p)));
    ctx.page.appendChild(box);
    const f = lookup(dict(), 'lessons.' + ctx.id + '.formula');
    if (f) ctx.page.appendChild(h('div', { class: 'formula' }, SC.render(f, {}, lang)));
    const r = h('div', { class: 'row' }); r.appendChild(next(ctx, 'explain')); ctx.page.appendChild(r);
    onSceneChange = null; const s = ctx.L.explainScene || ctx.L.scene; showScene(s.instrument, s.state);
  }

  function stepSandbox(ctx) {
    head(ctx, 'sandbox');
    ctx.page.appendChild(h('p', { class: 'lead' }, tl(ctx.id, 'sandbox')));
    const P = lp(ctx.id);
    ctx.page.appendChild(h('div', { class: 'box info' }, t('ui.summary', { s: P.solved.length, n: ctx.L.tasks.length })));
    const r = h('div', { class: 'row' }); r.appendChild(next(ctx, 'sandbox')); ctx.page.appendChild(r);
    onSceneChange = null; const s = ctx.L.sandbox || ctx.L.scene; showScene(s.instrument, Object.assign({}, s.state, { locked: false, labels: true }));
  }

  /* ---------- tasks ---------- */
  function seedFor(id, i, n) { let x = 2166136261; const s = id + ':' + i + ':' + n; for (let j = 0; j < s.length; j++) { x ^= s.charCodeAt(j); x = Math.imul(x, 16777619); } return x >>> 0; }
  function stepTasks(ctx, i, variant) {
    i = i || 0; variant = variant || 0;
    const P = lp(ctx.id);
    ctx.page.innerHTML = '';
    head(ctx, 'tasks');
    const nav = h('div', { class: 'tasknav' });
    ctx.L.tasks.forEach((_, j) => { const b = h('button', { 'aria-current': j === i ? 'true' : 'false', class: P.solved.includes(j) ? 'ok' : '' }, String(j + 1)); b.onclick = () => stepTasks(ctx, j); nav.appendChild(b); });
    ctx.page.appendChild(nav);
    const spec = ctx.L.tasks[i];
    const task = SC.makeTask(spec, seedFor(ctx.id, i, variant));
    const vars = Object.assign({}, task.vars);
    if (task.planet) vars.planet = t('ui.planets.' + task.planet);
    if (task.side) vars.side = t('ui.dir_' + task.side);
    const base = 'tasks.' + task.type + '.';
    ctx.page.appendChild(h('div', { class: 'level' }, '<i>' + [1, 2, 3].map((l) => '<b class="' + (l <= spec.level ? 'on' : '') + '"></b>').join('') + '</i>' + t('ui.level' + spec.level)));
    ctx.page.appendChild(h('p', { class: 'prompt' }, t(base + 'prompt', vars)));

    /* answer input */
    const ans = h('div', { class: 'answer' });
    let read;
    if (task.input === 'number') {
      const inp = h('input', { inputmode: 'decimal', 'aria-label': t('ui.answer'), autocomplete: 'off' }); ans.appendChild(inp);
      if (task.unit) ans.appendChild(h('span', { class: 'unit-l' }, t('ui.unit' + task.unit.replace('/', ''))));
      read = () => { const v = SC.parseNumber(inp.value); return isNaN(v) ? null : v; };
      inp.onkeydown = (e) => { if (e.key === 'Enter') check(); };
    } else if (task.input === 'fraction' || task.input === 'mixed') {
      let w = null;
      if (task.input === 'mixed') { w = h('input', { inputmode: 'numeric', 'aria-label': t('ui.whole') }); ans.appendChild(w); }
      const fin = h('div', { class: 'fin' }); const a = h('input', { inputmode: 'numeric', 'aria-label': t('ui.numerator') }); const b = h('input', { inputmode: 'numeric', 'aria-label': t('ui.denominator') });
      fin.appendChild(a); fin.appendChild(h('hr')); fin.appendChild(b); ans.appendChild(fin);
      read = () => { const n = SC.parseNumber(a.value), d = SC.parseNumber(b.value); if (isNaN(n) || isNaN(d) || d === 0) { if (!isNaN(n) && d === 0) return { num: n, den: 0 }; return null; } const r = { num: n, den: d }; if (w) { const wv = SC.parseNumber(w.value); if (isNaN(wv)) return null; r.w = wv; } return r; };
      [a, b, w].forEach((x) => x && (x.onkeydown = (e) => { if (e.key === 'Enter') check(); }));
    } else if (task.input === 'choice') {
      let sel = null; const ch = h('div', { class: 'choice' });
      task.options.forEach((o) => { const b = h('button', { 'aria-label': o }, SC.esc(o)); b.onclick = () => { sel = o; [...ch.children].forEach((x) => x.classList.toggle('sel', x === b)); }; ch.appendChild(b); });
      ans.appendChild(ch); read = () => sel;
    } else {
      ans.appendChild(h('div', { class: 'box info' }, t('ui.sceneAnswer')));
      read = () => (inst ? inst.get() : null);
    }
    ctx.page.appendChild(ans);

    const fb = h('div'); const hintsEl = h('div', { class: 'opts' });
    const row = h('div', { class: 'row' });
    const cb = h('button', { class: 'btn' }, t('ui.check')); cb.onclick = () => check();
    let hints = 0, usedSolution = false, tries = 0;
    const hb = h('button', { class: 'ghost' }, t('ui.hint', { n: 1 }));
    hb.onclick = () => { if (hints >= 3) return; hints++; hintsEl.appendChild(h('div', { class: 'box hint' }, '<div class="h">' + t('ui.hintN', { n: hints }) + '</div>' + t(base + 'h' + hints, vars))); hb.innerHTML = hints < 3 ? t('ui.hint', { n: hints + 1 }) : t('ui.noMoreHints'); hb.disabled = hints >= 3; if (hints >= 3) sb.hidden = false; };
    const sb = h('button', { class: 'ghost', hidden: '' }, t('ui.solution'));
    sb.onclick = () => { usedSolution = true; fb.innerHTML = ''; fb.appendChild(h('div', { class: 'box info' }, '<div class="h">' + t('ui.solution') + '</div>' + t(base + 'sol', vars))); };
    const another = h('button', { class: 'ghost' }, t('ui.another')); another.onclick = () => stepTasks(ctx, i, variant + 1);
    row.appendChild(cb); row.appendChild(hb); row.appendChild(sb); row.appendChild(h('div', { class: 'spacer' })); row.appendChild(another);
    ctx.page.appendChild(row); ctx.page.appendChild(hintsEl); ctx.page.appendChild(fb);

    function check() {
      const v = read();
      fb.innerHTML = '';
      if (v == null) { fb.appendChild(h('div', { class: 'box info' }, t('ui.typeAnswer'))); return; }
      tries++;
      const r = SC.checkTask(task, v);
      if (r.ok) {
        if (!P.solved.includes(i)) { P.solved.push(i); if (!usedSolution) sparks += 1; saveProgress(); }
        fb.appendChild(h('div', { class: 'box good' }, '<div class="h">' + t('ui.correct') + '</div>' + (usedSolution ? '' : t('ui.sparkPlus'))));
        nav.children[i].classList.add('ok');
        const nr = h('div', { class: 'row' });
        if (i < ctx.L.tasks.length - 1) { const nb = h('button', { class: 'btn' }, t('ui.nextTask')); nb.onclick = () => stepTasks(ctx, i + 1); nr.appendChild(nb); }
        else nr.appendChild(next(ctx, 'tasks'));
        fb.appendChild(nr);
      } else {
        const msg = r.err ? t(base + 'err.' + r.err, vars) : t('ui.wrong');
        fb.appendChild(h('div', { class: 'box bad' }, '<div class="h">' + t('ui.notYet') + '</div>' + msg));
        sb.hidden = false;
      }
    }

    onSceneChange = null;
    if (task.scene) showScene(task.scene.instrument, task.scene.state);
    else showScene(ctx.L.scene.instrument, Object.assign({}, ctx.L.scene.state, { locked: false }));
    if (row.closest) { /* keep focus friendly */ const first = ans.querySelector('input'); if (first && matchMedia('(pointer:fine)').matches) first.focus({ preventScroll: true }); }
  }

  /* ---------- router ---------- */
  function route() {
    applyLang();
    const m = location.hash.match(/^#\/l\/([^/]+)(?:\/(\w+))?/);
    if (m) showLesson(decodeURIComponent(m[1]), m[2]); else showCatalog();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (kit) kit.setTheme(resolvedTheme()); });
  route();
})();
