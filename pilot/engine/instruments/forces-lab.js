/* Instrument: forces lab. One bench, four set-ups:
     gravity  — a crate on a planet; mass and planet change the pull of gravity (g in N/kg)
     spring   — a spring on a stand; hang 100 g weights (1 N each) and read the stretch
     friction — pull a crate across a surface with a dynamometer
     tug      — two forces pull one crate from both sides
   Physics uses g = 10 N/kg on Earth, as stated in every task. */
(function (root) {
  const SC = root.SC;
  SC.instruments = SC.instruments || {};
  const PLANETS = { earth: 10, moon: 1.6, mars: 3.7, jupiter: 24.8 };
  const SURFACES = { ice: 0.1, wood: 0.3, rubber: 0.6 };
  const MASSES = [0.1, 0.25, 0.5, 1, 2, 3, 5, 10, 20, 40, 60];

  SC.instruments['forces-lab'] = function (kit, api) {
    const THREE = kit.THREE;
    let state = { mode: 'gravity', mass: 5, g: 10, planet: 'earth' };
    const N = (x) => SC.ltr(SC.fmtNumber(x, api.lang) + ' ' + api.t('ui.unitN'));

    function arrow(colorKey, len, dir) {
      const g = new THREE.Group();
      const mat = kit.mat(colorKey); mat.depthTest = false; mat.transparent = true;
      const shaft = kit.mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 12), mat, { edges: false });
      const head = kit.mesh(new THREE.ConeGeometry(0.13, 0.3, 16), mat, { edges: false });
      g.add(shaft, head); shaft.renderOrder = head.renderOrder = 10;
      g.setLen = (l) => {
        l = Math.max(0.001, l); const s = Math.max(0.001, l - 0.3);
        shaft.scale.y = s; shaft.position.y = s / 2; head.position.y = s + 0.15;
        g.visible = l > 0.05;
      };
      if (dir === 'down') g.rotation.z = Math.PI; else if (dir === 'right') g.rotation.z = -Math.PI / 2; else if (dir === 'left') g.rotation.z = Math.PI / 2;
      g.setLen(len); return g;
    }
    const lenFor = (F) => 0.35 + Math.log10(1 + F) * 1.1;

    function stepper(cap, value, minus, plus) {
      const box = document.createElement('div'); box.className = 'stepper';
      box.innerHTML = '<span class="cap">' + cap + '</span><button aria-label="−">−</button><b>' + value + '</b><button aria-label="+">+</button>';
      const [m, p] = box.querySelectorAll('button'); m.onclick = minus; p.onclick = plus;
      api.controls.appendChild(box);
    }
    function chips(items, current, pick) {
      const box = document.createElement('div'); box.className = 'chips';
      items.forEach(([id, text]) => {
        const b = document.createElement('button'); b.className = 'chip' + (id === current ? ' on' : ''); b.textContent = text;
        b.onclick = () => pick(id); box.appendChild(b);
      });
      api.controls.appendChild(box);
    }
    const crateSize = (m) => 0.45 + 0.16 * Math.cbrt(m);

    /* ---------------- gravity ---------------- */
    function buildGravity() {
      const s = state; const g = s.g || PLANETS[s.planet || 'earth'];
      const ground = kit.mesh(new THREE.CylinderGeometry(1.7, 1.85, 0.25, 64), kit.mat(s.planet && s.planet !== 'earth' ? 'p_' + s.planet : 'ground'));
      ground.position.y = -0.125; kit.stage.add(ground);
      const c = crateSize(s.mass);
      const crate = kit.mesh(new THREE.BoxGeometry(c, c, c), kit.mat('wood'));
      crate.position.y = c / 2; kit.stage.add(crate);
      const F = s.mass * g;
      const a = arrow('bad', lenFor(F), 'down'); a.position.set(0, c / 2, 0); kit.stage.add(a);
      const L = kit.label('', new THREE.Vector3(0, c + 0.5, 0), 'big');
      const m = SC.ltr(SC.fmtNumber(s.mass, api.lang) + ' ' + api.t('ui.unitKg'));
      L.set(s.labels === false ? m : m + ' · <b>' + N(F) + '</b>');
      const P = kit.label(api.t('ui.planets.' + (s.planet || 'earth')) + ' · ' + SC.ltr('g = ' + SC.fmtNumber(g, api.lang) + ' ' + api.t('ui.unitNkg')), new THREE.Vector3(0, -0.1, 2.0), 'soft');
      kit.frame({ target: [0, 0.2, 0], dist: 7, pitch: 0.3, yaw: 0.4, minPitch: 0.1, maxPitch: 1.0 });
      if (s.locked) return;
      const i = MASSES.indexOf(s.mass);
      stepper(api.t('ui.mass'), m, () => update({ mass: MASSES[Math.max(0, i - 1)] }), () => update({ mass: MASSES[Math.min(MASSES.length - 1, i + 1)] }));
      chips(Object.keys(PLANETS).map((p) => [p, api.t('ui.planets.' + p)]), s.planet || 'earth', (p) => update({ planet: p, g: PLANETS[p] }));
    }

    /* ---------------- spring ---------------- */
    let springMesh = null;
    function helix(len) {
      const turns = 14, r = 0.18;
      const pts = [];
      for (let i = 0; i <= turns * 16; i++) { const t = i / (turns * 16); pts.push(new THREE.Vector3(Math.cos(t * turns * Math.PI * 2) * r, -t * len, Math.sin(t * turns * Math.PI * 2) * r)); }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 16, 0.028, 8, false);
    }
    function buildSpring() {
      const s = state; const k = s.k || 50;
      const cm = s.stretchCm != null ? s.stretchCm : (s.weights || 0) * 1 / k * 100;
      const scale = 0.055, rest = 1.0, top = 3.6;
      const base = kit.mesh(new THREE.BoxGeometry(2.6, 0.16, 1.4), kit.mat('wood')); base.position.y = 0.08; kit.stage.add(base);
      const pole = kit.mesh(new THREE.BoxGeometry(0.12, top + 0.2, 0.12), kit.mat('metal')); pole.position.set(-0.9, (top + 0.2) / 2, -0.3); kit.stage.add(pole);
      const arm = kit.mesh(new THREE.BoxGeometry(1.1, 0.1, 0.12), kit.mat('metal')); arm.position.set(-0.4, top + 0.05, -0.3); kit.stage.add(arm);
      springMesh = new THREE.Mesh(helix(rest + cm * scale), kit.mat('ink', { roughness: 0.4, metalness: 0.3 }));
      springMesh.position.set(0, top, -0.3); kit.stage.add(springMesh);
      const endY = top - rest - cm * scale;
      const hook = kit.mesh(new THREE.TorusGeometry(0.08, 0.02, 8, 16), kit.mat('ink'), { edges: false }); hook.position.set(0, endY - 0.06, -0.3); kit.stage.add(hook);
      // ruler: 0 at the free end of the unstretched spring
      const rl = 22 * scale;
      const ruler = kit.mesh(new THREE.BoxGeometry(0.34, rl + 0.2, 0.04), kit.mat('white')); ruler.position.set(0.6, top - rest - rl / 2, -0.3); kit.stage.add(ruler);
      for (let i = 0; i <= 20; i++) {
        const t = kit.mesh(new THREE.BoxGeometry(i % 5 ? 0.08 : 0.16, 0.012, 0.01), kit.mat('ink'), { edges: false });
        t.position.set(0.49 + (i % 5 ? 0.04 : 0.08), top - rest - i * scale, -0.27); kit.stage.add(t);
        if (i % 5 === 0) { const n = kit.textPlane(String(i), { size: 56, scale: 700 }); n.position.set(0.69, top - rest - i * scale, -0.27); kit.stage.add(n); }
      }
      const pointer = kit.mesh(new THREE.BoxGeometry(0.5, 0.02, 0.02), kit.mat('bad'), { edges: false }); pointer.position.set(0.3, endY, -0.28); kit.stage.add(pointer);
      // hanging weights
      const hang = new THREE.Group(); kit.stage.add(hang);
      const w = s.stretchCm != null ? 0 : (s.weights || 0);
      for (let i = 0; i < w; i++) { const d = kit.mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 32), kit.mat('metal')); d.position.set(0, endY - 0.2 - i * 0.13, -0.3); hang.add(d); }
      // spare weights on the base
      const spare = new THREE.Group(); kit.stage.add(spare);
      for (let i = 0; i < 6 - w; i++) { const d = kit.mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 32), kit.mat('metal')); d.position.set(0.9, 0.22 + i * 0.13, 0.25); spare.add(d); }
      const F = s.stretchCm != null ? k * cm / 100 : w;
      const L = kit.label('', new THREE.Vector3(-0.2, endY - 0.3 - w * 0.13, 0.2), 'big');
      const dl = SC.ltr('Δl = ' + SC.fmtNumber(cm, api.lang) + ' ' + api.t('ui.unitCm'));
      L.set(s.labels === false ? dl : dl + ' · <b>' + N(F) + '</b>');
      if (!s.hideK) kit.label(SC.ltr('k = ' + SC.fmtNumber(k, api.lang) + ' ' + api.t('ui.unitNm')), new THREE.Vector3(-0.4, top + 0.45, -0.3), 'soft');
      kit.frame({ target: [0, 2.0, 0], dist: 8.2, pitch: 0.22, yaw: 0.35, minPitch: 0.05, maxPitch: 0.9 });
      if (s.locked) return;
      if (w < 6) kit.interactive(spare, { onDown: () => update({ weights: w + 1 }) });
      if (w > 0) kit.interactive(hang, { onDown: () => update({ weights: w - 1 }) });
      stepper(api.t('ui.weights'), SC.ltr(w + ' × 1 ' + api.t('ui.unitN')), () => update({ weights: Math.max(0, w - 1) }), () => update({ weights: Math.min(6, w + 1) }));
      if (!s.fixK) chips([25, 50, 100].map((v) => [v, SC.ltr(v + ' ' + api.t('ui.unitNm'))]), k, (v) => update({ k: v }));
    }

    /* ---------------- friction ---------------- */
    function buildFriction() {
      const s = state; const mu = s.mu != null ? s.mu : 0.3; const m = s.mass || 3;
      const surfKey = Object.keys(SURFACES).find((x) => Math.abs(SURFACES[x] - mu) < 1e-9);
      const strip = kit.mesh(new THREE.BoxGeometry(8, 0.12, 2), kit.mat(surfKey ? 's_' + surfKey : 'wood')); strip.position.y = -0.06; kit.stage.add(strip);
      const c = crateSize(m);
      const crate = kit.mesh(new THREE.BoxGeometry(c, c, c), kit.mat('wood')); crate.position.set(-1.2, c / 2, 0); kit.stage.add(crate);
      const Fmax = mu * m * 10;
      const pull = s.pull || 0;
      const fr = Math.min(pull, Fmax);
      const dyn = new THREE.Group(); kit.stage.add(dyn);
      const body = kit.mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.9, 16), kit.mat('white')); body.rotation.z = Math.PI / 2; dyn.add(body);
      const handle = kit.mesh(new THREE.TorusGeometry(0.16, 0.05, 10, 20), kit.mat(s.locked ? 'metal' : 'act'), { edges: false }); handle.position.x = 0.62; handle.rotation.y = Math.PI / 2; dyn.add(handle);
      const restX = -1.2 + c / 2 + 0.9;
      const xFor = (p) => restX + Math.min(1.6, (p / Math.max(1, Fmax * 2)) * 1.6);
      dyn.position.set(xFor(pull), c * 0.45, 0);
      const rope = kit.mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 6), kit.mat('ink'), { edges: false }); rope.rotation.z = Math.PI / 2; kit.stage.add(rope);
      const aPull = arrow('act', lenFor(pull), 'right'); const aFr = arrow('bad', lenFor(fr), 'left');
      aFr.position.set(-1.2 - c / 2 - 0.05, 0.14, 0.75); kit.stage.add(aPull, aFr);
      const L = kit.label('', new THREE.Vector3(0, 1.9, 0), 'big');
      let slide = 0;
      const place = () => {
        const p = state.pull || 0; const moving = p >= Fmax - 1e-9 && p > 0;
        crate.position.x = -1.2 + slide; const cx = crate.position.x;
        dyn.position.x = cx - (-1.2) + xFor(p);
        rope.scale.y = Math.max(0.01, dyn.position.x - 0.45 - (cx + c / 2)); rope.position.set(cx + c / 2 + rope.scale.y / 2, c * 0.45, 0);
        aPull.position.set(dyn.position.x + 0.7, c * 0.45, 0); aPull.setLen(p > 0 ? lenFor(p) : 0);
        aFr.position.x = cx - c / 2 - 0.05; aFr.setLen(p > 0 ? lenFor(Math.min(p, Fmax)) : 0);
        L.set((s.labels === false ? '' : api.t('ui.pull') + ' <b>' + N(p) + '</b> · ' + api.t('ui.friction') + ' <b>' + N(Math.min(p, Fmax)) + '</b>') + (moving ? ' · ' + api.t('ui.sliding') : ''));
        return moving;
      };
      place();
      kit.onFrame = () => { if (place() && !s.locked) { slide += 0.012; if (slide > 2.6) slide = 0; } else if (s.locked && (state.pull || 0) >= Fmax - 1e-9 && state.pull > 0) { slide += 0.008; if (slide > 2.6) slide = 0; } };
      kit.label(api.t('ui.surfaces.' + (surfKey || 'wood')) + ' · ' + SC.ltr('μ = ' + SC.fmtNumber(mu, api.lang)) + ' · ' + SC.ltr(SC.fmtNumber(m, api.lang) + ' ' + api.t('ui.unitKg')), new THREE.Vector3(0, -0.1, 1.4), 'soft');
      kit.frame({ target: [0.2, 0.5, 0], dist: 8.5, fitWidth: 7, pitch: 0.45, yaw: 0.2, minPitch: 0.15, maxPitch: 1.1 });
      if (s.locked) return;
      kit.interactive(handle, {
        cursor: 'grab',
        onMove: (e) => {
          const p = kit.planePoint(e, [0, 1, 0], [0, c * 0.45, 0]); if (!p) return;
          const dx = p.x - (crate.position.x - (-1.2)) - restX;
          const v = Math.max(0, Math.min(Fmax * 2, Math.round((dx / 1.6) * Math.max(1, Fmax * 2))));
          if (v !== state.pull) { state.pull = v; renderFrictionControls(); api.changed(get()); }
        },
      });
      renderFrictionControls();
      function renderFrictionControls() {
        api.controls.innerHTML = '';
        stepper(api.t('ui.pull'), N(state.pull || 0), () => { state.pull = Math.max(0, (state.pull || 0) - 1); renderFrictionControls(); api.changed(get()); }, () => { state.pull = Math.min(Math.ceil(Fmax * 2), (state.pull || 0) + 1); renderFrictionControls(); api.changed(get()); });
        chips(Object.keys(SURFACES).map((x) => [x, api.t('ui.surfaces.' + x)]), surfKey, (x) => update({ mu: SURFACES[x], pull: 0 }));
        const i = MASSES.indexOf(m);
        stepper(api.t('ui.mass'), SC.ltr(SC.fmtNumber(m, api.lang) + ' ' + api.t('ui.unitKg')), () => update({ mass: MASSES[Math.max(3, i - 1)], pull: 0 }), () => update({ mass: MASSES[Math.min(8, i + 1)], pull: 0 }));
      }
    }

    /* ---------------- tug ---------------- */
    function buildTug() {
      const s = state; const left = s.left || 0, right = s.right || 0;
      const floor = kit.mesh(new THREE.BoxGeometry(8.4, 0.12, 2.2), kit.mat('ground')); floor.position.y = -0.06; kit.stage.add(floor);
      const c = 0.8;
      const crate = kit.mesh(new THREE.BoxGeometry(c, c, c), kit.mat('wood')); crate.position.y = c / 2; kit.stage.add(crate);
      const add = (side, F, z, key) => {
        if (F <= 0) return;
        const a = arrow(key, lenFor(F) * 1.2, side); a.position.set(side === 'left' ? -c / 2 - 0.05 : c / 2 + 0.05, c / 2, z); kit.stage.add(a);
        const L = kit.label(N(F), new THREE.Vector3((side === 'left' ? -1 : 1) * (c / 2 + lenFor(F) * 0.6), c / 2 + 0.45, z), 'mid');
        L.obj = null;
      };
      if (s.same && s.parts) { add('right', s.parts[0], 0.22, 'shade2'); add('right', s.parts[1], -0.22, 'shade'); }
      else { add('left', left, 0, 'shade2'); add('right', right, 0, 'shade'); }
      const R = right - left;
      const res = arrow('ink', lenFor(Math.abs(R)) * 1.2, R >= 0 ? 'right' : 'left'); res.position.set(0, c + 0.5, 0); res.visible = s.labels !== false && Math.abs(R) > 0; kit.stage.add(res);
      const L = kit.label(s.labels === false ? '' : (R === 0 ? api.t('ui.balanced') : api.t('ui.resultant') + ' <b>' + N(Math.abs(R)) + '</b>'), new THREE.Vector3(0, c + 1.15, 0), 'big');
      let t = 0;
      kit.onFrame = () => { t += 0.016; crate.position.x = R === 0 ? 0 : Math.sign(R) * Math.min(0.5, 0.1 + Math.abs(Math.sin(t)) * 0.25); };
      kit.frame({ target: [0, 0.6, 0], dist: 9.2, fitWidth: 8, pitch: 0.5, yaw: 0, minPitch: 0.15, maxPitch: 1.1, yawLimit: 0.8 });
      if (s.locked) return;
      if (!s.fixLeft) stepper(api.t('ui.left'), N(left), () => update({ left: Math.max(0, left - 10) }), () => update({ left: Math.min(100, left + 10) }));
      stepper(api.t('ui.right'), N(right), () => update({ right: Math.max(0, right - 10) }), () => update({ right: Math.min(100, right + 10) }));
    }

    function build() {
      kit.reset(); api.controls.innerHTML = '';
      ({ gravity: buildGravity, spring: buildSpring, friction: buildFriction, tug: buildTug })[state.mode]();
      kit.grow();
    }
    function update(patch) { Object.assign(state, patch); build(); api.changed(get()); }
    function get() {
      const s = state;
      if (s.mode === 'gravity') return { mode: s.mode, mass: s.mass, g: s.g || PLANETS[s.planet || 'earth'], planet: s.planet || 'earth' };
      if (s.mode === 'spring') return { mode: s.mode, k: s.k || 50, weights: s.weights || 0 };
      if (s.mode === 'friction') return { mode: s.mode, mass: s.mass, mu: s.mu, pull: s.pull || 0 };
      return { mode: s.mode, left: s.left || 0, right: s.right || 0 };
    }
    function set(s) { state = JSON.parse(JSON.stringify(s)); if (state.mode === 'gravity' && !state.planet) state.planet = 'earth'; build(); }
    return { set, get };
  };

  SC.forcesConst = { PLANETS, SURFACES };
})(typeof window !== 'undefined' ? window : globalThis);
