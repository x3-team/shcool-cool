/* School Cool pilot · task generators.
   Every task type knows how to make a fresh variant from a seed, what kind of answer it takes,
   how to check it and which typical mistakes it can recognise. All texts live in i18n files
   under tasks.<type> (prompt, h1, h2, h3, sol, err.<id>). Numbers are never written into texts. */
(function (root) {
  const SC = root.SC;
  const F = SC.frac;
  const near = (x, y) => Math.abs(x - y) <= 1e-6 + 0.005 * Math.abs(y);
  const G = 10; // N/kg, stated in every physics prompt

  const T = {};
  SC.taskTypes = T;

  /* input kinds: fraction {num,den} · number · mixed {w,num,den} · choice (value from options) · scene (instrument state) */

  T['frac.read'] = {
    input: 'fraction',
    gen(r, p) {
      const n = r.pick(p.dens || [2, 3, 4, 5, 6, 8]);
      const k = r.int(1, n - 1);
      return { vars: { k, n, u: n - k }, answer: { num: k, den: n }, scene: { instrument: 'fraction-pie', state: { pies: [{ n, k }], locked: true, labels: false } } };
    },
    check(v, t) {
      const a = t.answer;
      if (F.equal(v, a)) return { ok: true };
      if (v.num === a.den && v.den === a.num) return { ok: false, err: 'flip' };
      if (v.num === t.vars.u && v.den === a.den) return { ok: false, err: 'unshaded' };
      return { ok: false };
    },
  };

  T['frac.shade'] = {
    input: 'scene',
    gen(r, p) {
      const n = r.pick(p.dens || [3, 4, 5, 6, 8]);
      const k = r.int(1, n - 1);
      return { vars: { k, n }, answer: { num: k, den: n }, scene: { instrument: 'fraction-pie', state: { pies: [{ n: p.fixedSlices ? n : 2, k: 0 }], locked: false } } };
    },
    check(state, t) {
      const pie = state && state.pies && state.pies[0];
      if (!pie) return { ok: false };
      if (pie.k === t.answer.num && pie.n === t.answer.den) return { ok: true };
      if (pie.n !== t.answer.den && pie.k * t.answer.den === pie.n * t.answer.num) return { ok: true };
      if (pie.n !== t.answer.den) return { ok: false, err: 'slices' };
      return { ok: false, err: 'count' };
    },
  };

  T['frac.numline'] = {
    input: 'fraction',
    gen(r, p) {
      const n = r.pick(p.dens || [2, 3, 4, 5, 6, 8]);
      const max = p.max || 1;
      const k = r.int(1, n * max - 1);
      return { vars: { k, n }, answer: { num: k, den: n }, scene: { instrument: 'number-line', state: { n, max, point: k, locked: true, labels: false } } };
    },
    check(v, t) {
      const a = t.answer;
      if (F.equal(v, a)) return { ok: true };
      if (v.num === a.num && v.den === a.den + 1) return { ok: false, err: 'ticks' };
      if (v.num === a.den && v.den === a.num) return { ok: false, err: 'flip' };
      return { ok: false };
    },
  };

  T['frac.place'] = {
    input: 'scene',
    gen(r, p) {
      const n = r.pick(p.dens || [3, 4, 5, 6, 8]);
      const max = p.max || 1;
      const k = r.int(1, n * max - 1);
      return { vars: { k, n }, answer: { num: k, den: n }, scene: { instrument: 'number-line', state: { n, max, point: 0, locked: false } } };
    },
    check(s, t) {
      if (!s) return { ok: false };
      if (s.point * t.answer.den === t.answer.num * s.n) return { ok: true };
      if (s.point === t.answer.num + 1 || s.point === t.answer.num - 1) return { ok: false, err: 'offByOne' };
      return { ok: false };
    },
  };

  T['frac.equiv'] = {
    input: 'number',
    gen(r, p) {
      const b = r.pick(p.dens || [2, 3, 4, 5, 6]);
      const a = r.int(1, b - 1);
      const m = r.int(2, p.maxMul || 4);
      return { vars: { a, b, m, bm: b * m, am: a * m }, answer: a * m, scene: { instrument: 'fraction-pie', state: { pies: [{ n: b, k: a }, { n: b * m, k: a * m }], locked: true, hideSecond: true } } };
    },
    check(v, t) {
      if (v === t.answer) return { ok: true };
      if (v === t.vars.a + (t.vars.bm - t.vars.b)) return { ok: false, err: 'add' };
      if (v === t.vars.a) return { ok: false, err: 'same' };
      return { ok: false };
    },
  };

  T['frac.simplify'] = {
    input: 'fraction',
    gen(r, p) {
      let a, b;
      do { b = r.pick(p.dens || [2, 3, 4, 5, 6, 7, 8, 9]); a = r.int(1, b - 1); } while (SC.gcd(a, b) !== 1);
      const g = r.pick(p.muls || [2, 3, 4, 5, 6]);
      return { vars: { a, b, g, ag: a * g, bg: b * g }, answer: { num: a, den: b } };
    },
    check(v, t) {
      if (F.equal(v, t.answer) && F.isLowest(v)) return { ok: true };
      if (F.equal(v, t.answer)) return { ok: false, err: 'notLowest' };
      return { ok: false };
    },
  };

  T['frac.compare'] = {
    input: 'choice', options: ['<', '=', '>'],
    gen(r, p) {
      const mode = p.mode || 'sameDen';
      let a, b, c, d;
      if (mode === 'sameDen') { b = d = r.pick([5, 6, 7, 8, 9, 10, 12]); a = r.int(1, b - 1); do { c = r.int(1, d - 1); } while (c === a); }
      else if (mode === 'sameNum') { a = c = r.int(1, 5); b = r.int(a + 1, 12); do { d = r.int(a + 1, 12); } while (d === b); }
      else { do { b = r.pick([3, 4, 5, 6, 8, 9, 10, 12]); d = r.pick([3, 4, 5, 6, 8, 9, 10, 12]); a = r.int(1, b - 1); c = r.int(1, d - 1); } while (b === d || a * d === b * c && r.next() < .7); }
      const s = Math.sign(a * d - c * b);
      return { vars: { a, b, c, d, l: SC.lcm(b, d), al: a * SC.lcm(b, d) / b, cl: c * SC.lcm(b, d) / d }, answer: s < 0 ? '<' : s > 0 ? '>' : '=', scene: { instrument: 'fraction-pie', state: { pies: [{ n: b, k: a }, { n: d, k: c }], locked: true } } };
    },
    check(v, t) {
      if (v === t.answer) return { ok: true };
      const { a, c } = t.vars;
      if (a === c) return { ok: false, err: 'bigDen' };
      return { ok: false };
    },
  };

  T['frac.addSame'] = {
    input: 'fraction',
    gen(r, p) {
      const n = r.pick(p.dens || [5, 6, 7, 8, 9, 10, 12]);
      const a = r.int(1, n - 2);
      const b = r.int(1, p.overOne ? n - 1 : n - 1 - a);
      return { vars: { a, b, n, s: a + b }, answer: { num: a + b, den: n }, scene: { instrument: 'fraction-pie', state: { pies: [{ n, k: a }, { n, k: b }], locked: true } } };
    },
    check(v, t) {
      if (F.equal(v, t.answer)) return { ok: true };
      if (v.num === t.vars.s && v.den === 2 * t.vars.n) return { ok: false, err: 'addDen' };
      return { ok: false };
    },
  };

  T['frac.subSame'] = {
    input: 'fraction',
    gen(r, p) {
      const n = r.pick(p.dens || [5, 6, 7, 8, 9, 10, 12]);
      const a = r.int(2, n - 1);
      const b = r.int(1, a - 1);
      return { vars: { a, b, n, s: a - b }, answer: { num: a - b, den: n }, scene: { instrument: 'fraction-pie', state: { pies: [{ n, k: a }], locked: true } } };
    },
    check(v, t) {
      if (t.answer.num === 0 ? v.num === 0 : F.equal(v, t.answer)) return { ok: true };
      if (v.num === t.vars.s && v.den === 0) return { ok: false, err: 'subDen' };
      return { ok: false };
    },
  };

  T['frac.lcd'] = {
    input: 'number',
    gen(r, p) {
      let b, d;
      do { b = r.pick(p.dens || [2, 3, 4, 5, 6, 8, 9, 10, 12]); d = r.pick(p.dens || [2, 3, 4, 5, 6, 8, 9, 10, 12]); } while (b === d || (p.notCoprime && SC.gcd(b, d) === 1));
      return { vars: { b, d, l: SC.lcm(b, d), p: b * d }, answer: SC.lcm(b, d) };
    },
    check(v, t) {
      if (v === t.answer) return { ok: true };
      if (v === t.vars.p) return { ok: false, err: 'product' };
      if (v > 0 && v % t.vars.b === 0 && v % t.vars.d === 0) return { ok: false, err: 'notLeast' };
      return { ok: false };
    },
  };

  T['frac.addUnlike'] = {
    input: 'fraction',
    gen(r, p) {
      const sub = p.op === '-';
      let a, b, c, d;
      do {
        b = r.pick(p.dens || [2, 3, 4, 5, 6, 8, 10, 12]); d = r.pick(p.dens || [2, 3, 4, 5, 6, 8, 10, 12]);
        a = r.int(1, b - 1); c = r.int(1, d - 1);
      } while (b === d || (sub && a * d <= c * b) || (!sub && !p.overOne && a * d + c * b > b * d));
      const l = SC.lcm(b, d), al = a * l / b, cl = c * l / d, s = sub ? al - cl : al + cl;
      const sim = F.simplify(s, l);
      return { vars: { a, b, c, d, l, al, cl, s, sn: sim.num, sd: sim.den, op: sub ? '−' : '+' }, answer: { num: s, den: l }, scene: { instrument: 'fraction-pie', state: { pies: [{ n: b, k: a }, { n: d, k: c }], locked: true } } };
    },
    check(v, t) {
      if (F.equal(v, t.answer)) return { ok: true };
      const { a, b, c, d } = t.vars;
      if ((v.num === a + c || v.num === Math.abs(a - c)) && (v.den === b + d || v.den === Math.abs(b - d))) return { ok: false, err: 'addDen' };
      if (v.den === t.vars.l && (v.num === a + c || v.num === Math.abs(a - c))) return { ok: false, err: 'noScale' };
      return { ok: false };
    },
  };

  T['frac.toImproper'] = {
    input: 'number',
    gen(r, p) {
      const n = r.pick(p.dens || [2, 3, 4, 5, 6, 8]);
      const w = r.int(1, 5), a = r.int(1, n - 1);
      return { vars: { w, a, n, wn: w * n, t: w * n + a }, answer: w * n + a, scene: { instrument: 'fraction-pie', state: { pies: Array.from({ length: w }, () => ({ n, k: n })).concat([{ n, k: a }]), locked: true } } };
    },
    check(v, t) {
      if (v === t.answer) return { ok: true };
      if (v === t.vars.w + t.vars.a) return { ok: false, err: 'wPlusA' };
      if (v === t.vars.wn) return { ok: false, err: 'forgotA' };
      return { ok: false };
    },
  };

  T['frac.toMixed'] = {
    input: 'mixed',
    gen(r, p) {
      const n = r.pick(p.dens || [2, 3, 4, 5, 6, 8]);
      const w = r.int(1, 4), a = r.int(1, n - 1);
      return { vars: { w, a, n, t: w * n + a, wn: w * n }, answer: { w, num: a, den: n } };
    },
    check(v, t) {
      const a = t.answer;
      if (v.w === a.w && v.num * a.den === a.num * v.den) return { ok: true };
      if (v.w === a.num && v.num === a.w) return { ok: false, err: 'swap' };
      return { ok: false };
    },
  };

  T['frac.ofNumber'] = {
    input: 'number',
    gen(r, p) {
      const b = r.pick(p.dens || [2, 3, 4, 5, 6, 8, 10]);
      const a = r.int(1, b - 1);
      const q = r.int(2, p.maxQ || 12);
      const N = b * q;
      return { vars: { a, b, N, q, ans: a * q }, answer: a * q, scene: { instrument: 'chocolate-bar', state: { rows: b, cols: q > 8 ? 1 : q, total: N, pick: 0, locked: false } } };
    },
    check(v, t) {
      if (v === t.answer) return { ok: true };
      if (v === t.vars.q) return { ok: false, err: 'divOnly' };
      if (v === t.vars.N * t.vars.a) return { ok: false, err: 'mulOnly' };
      return { ok: false };
    },
  };

  T['frac.toDecimal'] = {
    input: 'number',
    gen(r, p) {
      const d = r.pick(p.dens || [10, 100]);
      const k = d === 10 ? r.int(1, 9) : r.pick([r.int(1, 9), r.int(11, 99)]);
      return { vars: { k, d, x: k / d }, answer: k / d, scene: { instrument: 'number-line', state: { n: 10, max: 1, point: d === 10 ? k : 0, locked: true, decimals: true, labels: false } } };
    },
    check(v, t) {
      if (near(v, t.answer)) return { ok: true };
      if (t.vars.d === 100 && near(v, t.vars.k / 10)) return { ok: false, err: 'place' };
      if (t.vars.d === 10 && near(v, t.vars.k / 100)) return { ok: false, err: 'place' };
      return { ok: false };
    },
  };

  /* ---------- physics: forces (g = 10 N/kg) ---------- */

  T['force.gravity'] = {
    input: 'number', unit: 'N',
    gen(r, p) {
      const m = r.pick(p.masses || [1, 2, 3, 5, 8, 12, 20, 40, 60]);
      return { vars: { m, F: m * G }, answer: m * G, scene: { instrument: 'forces-lab', state: { mode: 'gravity', mass: m, g: G, locked: true, labels: false } } };
    },
    check(v, t) {
      if (near(v, t.answer)) return { ok: true };
      if (near(v, t.vars.m)) return { ok: false, err: 'noG' };
      return { ok: false };
    },
  };

  T['force.gravityGrams'] = {
    input: 'number', unit: 'N',
    gen(r, p) {
      const mg = r.pick([100, 200, 250, 300, 400, 500, 750]);
      return { vars: { mg, m: mg / 1000, F: mg / 1000 * G }, answer: mg / 1000 * G, scene: { instrument: 'forces-lab', state: { mode: 'gravity', mass: mg / 1000, g: G, locked: true, labels: false } } };
    },
    check(v, t) {
      if (near(v, t.answer)) return { ok: true };
      if (near(v, t.vars.mg * G)) return { ok: false, err: 'grams' };
      if (near(v, t.vars.m) || near(v, t.vars.mg)) return { ok: false, err: 'noG' };
      return { ok: false };
    },
  };

  T['force.planet'] = {
    input: 'number', unit: 'N',
    gen(r, p) {
      const pl = r.pick([['moon', 1.6], ['mars', 3.7], ['jupiter', 24.8]]);
      const m = r.pick([2, 5, 10, 20, 40]);
      return { vars: { m, g: pl[1], F: m * pl[1] }, answer: m * pl[1], planet: pl[0], scene: { instrument: 'forces-lab', state: { mode: 'gravity', mass: m, g: pl[1], planet: pl[0], locked: true, labels: false } } };
    },
    check(v, t) {
      if (near(v, t.answer)) return { ok: true };
      if (near(v, t.vars.m * G)) return { ok: false, err: 'earthG' };
      return { ok: false };
    },
  };

  T['force.massFromWeight'] = {
    input: 'number', unit: 'Kg',
    gen(r, p) {
      const m = r.pick([2, 4, 5, 6, 15, 30, 45, 70]);
      return { vars: { P: m * G, m }, answer: m };
    },
    check(v, t) {
      if (near(v, t.answer)) return { ok: true };
      if (near(v, t.vars.P * G)) return { ok: false, err: 'mult' };
      return { ok: false };
    },
  };

  T['force.hooke'] = {
    input: 'number', unit: 'N',
    gen(r, p) {
      const k = r.pick([20, 40, 50, 80, 100, 200]);
      const cm = r.pick([2, 4, 5, 8, 10, 15]);
      return { vars: { k, cm, x: cm / 100, F: k * cm / 100 }, answer: k * cm / 100, scene: { instrument: 'forces-lab', state: { mode: 'spring', k, stretchCm: cm, locked: true, labels: false } } };
    },
    check(v, t) {
      if (near(v, t.answer)) return { ok: true };
      if (near(v, t.vars.k * t.vars.cm)) return { ok: false, err: 'cm' };
      return { ok: false };
    },
  };

  T['force.stiffness'] = {
    input: 'number', unit: 'N/m',
    gen(r, p) {
      const k = r.pick([20, 40, 50, 80, 100, 200]);
      const cm = r.pick([2, 4, 5, 10]);
      return { vars: { k, cm, x: cm / 100, F: k * cm / 100 }, answer: k, scene: { instrument: 'forces-lab', state: { mode: 'spring', k, stretchCm: cm, locked: true, labels: false, hideK: true } } };
    },
    check(v, t) {
      if (near(v, t.answer)) return { ok: true };
      if (near(v, t.vars.F / t.vars.cm)) return { ok: false, err: 'cm' };
      if (near(v, t.vars.F * t.vars.x)) return { ok: false, err: 'invert' };
      return { ok: false };
    },
  };

  T['force.springScene'] = {
    input: 'scene',
    gen(r, p) {
      const k = 50; // N/m, every weight is 100 g = 1 N
      const n = r.int(1, 5);
      return { vars: { k, n, F: n, cm: n / k * 100, x: n / k }, answer: n, scene: { instrument: 'forces-lab', state: { mode: 'spring', k, weights: 0, locked: false, fixK: true } } };
    },
    check(s, t) {
      if (!s) return { ok: false };
      if (s.weights === t.answer) return { ok: true };
      return { ok: false, err: s.weights > t.answer ? 'tooMany' : 'tooFew' };
    },
  };

  T['force.sumSame'] = {
    input: 'number', unit: 'N',
    gen(r, p) {
      const a = r.pick([10, 15, 20, 25, 30, 40, 60]), b = r.pick([5, 10, 20, 35, 50]);
      return { vars: { a, b, R: a + b, d: Math.abs(a - b) }, answer: a + b, scene: { instrument: 'forces-lab', state: { mode: 'tug', left: 0, right: a + b, parts: [a, b], same: true, locked: true, labels: false } } };
    },
    check(v, t) {
      if (near(v, t.answer)) return { ok: true };
      if (near(v, t.vars.d)) return { ok: false, err: 'diff' };
      return { ok: false };
    },
  };

  T['force.sumOpp'] = {
    input: 'number', unit: 'N',
    gen(r, p) {
      let a, b; do { a = r.pick([20, 30, 45, 50, 70, 80, 100]); b = r.pick([10, 25, 40, 60, 90]); } while (a === b);
      return { vars: { a, b, R: Math.abs(a - b), s: a + b }, answer: Math.abs(a - b), side: a > b ? 'left' : 'right', scene: { instrument: 'forces-lab', state: { mode: 'tug', left: a, right: b, locked: true, labels: false } } };
    },
    check(v, t) {
      if (near(v, t.answer)) return { ok: true };
      if (near(v, t.vars.s)) return { ok: false, err: 'sum' };
      return { ok: false };
    },
  };

  T['force.tugScene'] = {
    input: 'scene',
    gen(r, p) {
      const a = r.pick([20, 30, 40, 50, 60]);
      return { vars: { a }, answer: a, scene: { instrument: 'forces-lab', state: { mode: 'tug', left: a, right: 0, locked: false, fixLeft: true } } };
    },
    check(s, t) {
      if (!s) return { ok: false };
      if (s.right === t.answer && s.left === t.answer) return { ok: true };
      return { ok: false, err: s.right > t.answer ? 'tooMany' : 'tooFew' };
    },
  };

  T['force.friction'] = {
    input: 'number', unit: 'N',
    gen(r, p) {
      const mu = r.pick([0.1, 0.2, 0.3, 0.4, 0.5]);
      const m = r.pick([2, 4, 5, 10, 20]);
      return { vars: { mu, m, N: m * G, F: mu * m * G }, answer: mu * m * G, scene: { instrument: 'forces-lab', state: { mode: 'friction', mass: m, mu, pull: 0, locked: true, labels: false } } };
    },
    check(v, t) {
      if (near(v, t.answer)) return { ok: true };
      if (near(v, t.vars.mu * t.vars.m)) return { ok: false, err: 'noG' };
      if (near(v, t.vars.N)) return { ok: false, err: 'noMu' };
      return { ok: false };
    },
  };

  T['force.uniform'] = {
    input: 'number', unit: 'N',
    gen(r, p) {
      const F0 = r.pick([3, 4, 6, 8, 12]);
      return { vars: { F: F0, m: r.pick([2, 3, 5]) }, answer: F0, scene: { instrument: 'forces-lab', state: { mode: 'friction', mass: 3, mu: F0 / 30, pull: F0, locked: true } } };
    },
    check(v, t) { return near(v, t.answer) ? { ok: true } : (near(v, 0) ? { ok: false, err: 'zero' } : { ok: false }); },
  };

  /* Choose the variant of a task for a given lesson task spec and seed. */
  SC.makeTask = function (spec, seed) {
    const type = T[spec.type];
    if (!type) throw new Error('Unknown task type ' + spec.type);
    const r = SC.rng(seed);
    const t = type.gen(r, spec.params || {});
    t.type = spec.type; t.input = type.input; t.options = type.options; t.unit = type.unit; t.level = spec.level; t.seed = seed;
    return t;
  };
  SC.checkTask = (t, value) => T[t.type].check(value, t);

  if (typeof module !== 'undefined') module.exports = SC;
})(typeof window !== 'undefined' ? window : globalThis);
