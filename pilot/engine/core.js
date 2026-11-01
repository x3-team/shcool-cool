/* School Cool pilot · core helpers shared by the engine, task generators and the validator.
   Works both in the browser (window.SC) and in Node (require). */
(function (root) {
  const SC = root.SC || (root.SC = {});

  /* ---------- seeded random ---------- */
  SC.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    const next = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      next,
      int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
      pick: (arr) => arr[Math.floor(next() * arr.length)],
    };
  };

  /* ---------- fractions ---------- */
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
  const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);
  SC.gcd = gcd; SC.lcm = lcm;
  SC.frac = {
    simplify: (n, d) => { const g = gcd(n, d); return { num: n / g, den: d / g }; },
    equal: (a, b) => a.num * b.den === b.num * a.den,
    isLowest: (f) => gcd(f.num, f.den) === 1,
    value: (f) => f.num / f.den,
  };

  /* ---------- numbers & text ---------- */
  SC.fmtNumber = function (x, lang) {
    const r = Math.round(x * 1000) / 1000;
    try { return new Intl.NumberFormat(SC.numberLocale(lang), { maximumFractionDigits: 3 }).format(r); }
    catch (e) { return String(r); }
  };
  /* Western digits everywhere in the pilot; decimal separator follows the language. */
  SC.numberLocale = (lang) => ({ ru: 'ru-RU', en: 'en-US', es: 'es-ES', ar: 'ar-u-nu-latn', hi: 'hi-IN-u-nu-latn', zh: 'zh-CN' }[lang] || 'en-US');

  /* Parse a typed number: accepts "2,5", "2.5", " 12 ", "-3". Returns NaN when not a number. */
  SC.parseNumber = function (s) {
    if (typeof s === 'number') return s;
    const t = String(s || '').trim().replace(/\s+/g, '').replace(',', '.').replace('−', '-');
    if (!/^-?\d+(\.\d+)?$/.test(t)) return NaN;
    return parseFloat(t);
  };

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  SC.esc = esc;

  /* Template language used in every text string:
       {x}        -> value of variable x, formatted as a number
       [[a/b]]    -> stacked fraction with numerator a and denominator b (variables or digits)
       [[w a/b]]  -> mixed number
       **bold**   -> bold
     Variables may be expressions of the form x*y, x+y, x-y. */
  SC.evalVar = function (expr, vars) {
    expr = String(expr).trim();
    if (/^-?\d+(\.\d+)?$/.test(expr)) return parseFloat(expr);
    const m = expr.match(/^(\w+)\s*([*+\-\/])\s*(\w+)$/);
    if (m) {
      const a = SC.evalVar(m[1], vars), b = SC.evalVar(m[3], vars);
      return m[2] === '*' ? a * b : m[2] === '+' ? a + b : m[2] === '-' ? a - b : a / b;
    }
    if (!(expr in vars)) throw new Error('Unknown variable "' + expr + '"');
    return vars[expr];
  };
  SC.fracHTML = (n, d, w) => (w ? '<span class="mixw">' + w + '</span>' : '') + '<span class="frac"><i>' + n + '</i><i>' + d + '</i></span>';
  /* Right-to-left languages. In them, formulas and calculations are kept left-to-right
     (Western digits and Latin symbols), so each math run is wrapped in a bidi isolate. */
  SC.RTL = ['ar', 'he', 'fa', 'ur'];
  SC.isRTL = (lang) => SC.RTL.includes(lang);
  SC.ltr = (s) => '\u2066' + s + '\u2069';
  const MATH_TOKEN = "[A-Za-z0-9{}\\[\\]_*+\\-−·×÷=\\/.,?≈()μΔ₁₂%]+";
  const MATH_RUN = new RegExp(MATH_TOKEN + '(?:[ \u00A0]+' + MATH_TOKEN + ')+', 'g');
  SC.isolateMath = function (tpl) {
    return tpl.replace(MATH_RUN, (m) => {
      const lead = m.match(/^[.,:]*\s*/)[0], trail = m.match(/\s*[.,:]*$/)[0];
      const core = m.slice(lead.length, m.length - trail.length);
      return core.includes(' ') ? lead + SC.ltr(core) + trail : m;
    });
  };
  SC.render = function (tpl, vars, lang) {
    vars = vars || {};
    let s = esc(SC.isRTL(lang) ? SC.isolateMath(tpl) : tpl);
    s = s.replace(/\[\[\s*(?:([\w*+\-]+)\s+)?([\w*+\-]+)\s*\/\s*([\w*+\-]+)\s*\]\]/g, (_, w, a, b) =>
      SC.fracHTML(SC.fmtNumber(SC.evalVar(a, vars), lang), SC.fmtNumber(SC.evalVar(b, vars), lang), w ? SC.fmtNumber(SC.evalVar(w, vars), lang) : ''));
    s = s.replace(/\{([\w*+\-\/ ]+)\}/g, (_, e) => { const v = SC.evalVar(e, vars); return typeof v === 'string' ? esc(v) : SC.fmtNumber(v, lang); });
    s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    /* Isolate chars around atomic inlines (stacked fractions) are not reliable, so use real elements. */
    s = s.replace(/\u2066/g, '<span dir="ltr">').replace(/\u2069/g, '</span>');
    return s;
  };
  /* The set of placeholders used by a template, for cross-language validation. */
  SC.placeholders = function (tpl) {
    const out = new Set();
    String(tpl).replace(/\[\[\s*(?:([\w*+\-]+)\s+)?([\w*+\-]+)\s*\/\s*([\w*+\-]+)\s*\]\]/g, (m) => { out.add(m.replace(/\s+/g, '')); return m; })
      .replace(/\{([\w*+\-\/ ]+)\}/g, (m) => { out.add(m.replace(/\s+/g, '')); return m; });
    return [...out].sort();
  };

  /* Look up "a.b.c" in nested objects whose own keys may contain dots (lesson ids, task types). */
  SC.lookup = function (obj, path) {
    if (obj == null) return undefined;
    if (path === '') return obj;
    if (Object.prototype.hasOwnProperty.call(obj, path)) return obj[path];
    const parts = path.split('.');
    for (let i = parts.length - 1; i >= 1; i--) {
      const head = parts.slice(0, i).join('.');
      if (obj[head] != null && typeof obj[head] === 'object') {
        const r = SC.lookup(obj[head], parts.slice(i).join('.'));
        if (r !== undefined) return r;
      }
    }
    return undefined;
  };

  if (typeof module !== 'undefined') module.exports = SC;
})(typeof window !== 'undefined' ? window : globalThis);
