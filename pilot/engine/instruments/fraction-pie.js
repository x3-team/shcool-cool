/* Instrument: fraction pies. Round pies cut into equal slices; tap a slice to colour it.
   state: { pies:[{n,k}], locked, labels, hideSecond } */
(function (root) {
  const SC = root.SC;
  SC.instruments = SC.instruments || {};

  SC.instruments['fraction-pie'] = function (kit, api) {
    const THREE = kit.THREE;
    let state = { pies: [{ n: 4, k: 1 }], locked: false, labels: true };
    let groups = [];
    const R = 1.05, H = 0.22, GAP = 0.035;

    function wedgeGeo(i, n) {
      const a0 = (i / n) * Math.PI * 2 + Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 + Math.PI / 2;
      const s = new THREE.Shape();
      if (n === 1) { s.absarc(0, 0, R, 0, Math.PI * 2, false); }
      else { s.moveTo(0, 0); s.absarc(0, 0, R, a0, a1, false); s.lineTo(0, 0); }
      const g = new THREE.ExtrudeGeometry(s, { depth: H, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: Math.max(6, Math.ceil(64 / n)) });
      g.rotateX(-Math.PI / 2);
      const mid = (a0 + a1) / 2;
      return { g, dx: n === 1 ? 0 : Math.cos(mid) * GAP, dz: n === 1 ? 0 : -Math.sin(mid) * GAP };
    }

    function build() {
      kit.reset();
      groups = [];
      const pies = state.pies;
      const spacing = 2.55, cols = Math.min(pies.length, 3), rows = Math.ceil(pies.length / 3);
      pies.forEach((p, idx) => {
        const g = new THREE.Group();
        const col = idx % 3, row = Math.floor(idx / 3);
        const inRow = Math.min(3, pies.length - row * 3);
        g.position.set((col - (inRow - 1) / 2) * spacing, 0, (row - (rows - 1) / 2) * spacing);
        const plate = kit.mesh(new THREE.CylinderGeometry(R + 0.16, R + 0.2, 0.08, 64), kit.mat('ground'));
        plate.position.y = 0.04; g.add(plate);
        const slices = [];
        const hidden = state.hideSecond && idx === 1;
        for (let i = 0; i < p.n; i++) {
          const w = wedgeGeo(i, p.n);
          const on = !hidden && i < p.k;
          const m = kit.mesh(w.g, kit.mat(on ? 'shade' : 'slice'));
          m.position.set(w.dx, 0.08 + (on ? 0.06 : 0), w.dz);
          m.userData.on = on;
          g.add(m); slices.push(m);
          if (!state.locked) {
            kit.interactive(m, {
              onEnter: () => { m.position.y += 0.03; },
              onLeave: () => { m.position.y = 0.08 + (m.userData.on ? 0.06 : 0); },
              onDown: () => toggle(idx, i),
            });
          }
        }
        let label = null;
        if (state.labels !== false && !hidden) label = kit.label('', new THREE.Vector3(g.position.x, 0.95, g.position.z - R - 0.2), 'big');
        groups.push({ g, slices, label, p });
        kit.stage.add(g);
      });
      const span = Math.max(cols * spacing, rows * spacing * 1.3);
      kit.frame({ target: [0, 0.1, 0.1], dist: 3.4 + span * 1.2, pitch: 0.95, yaw: 0.25, minPitch: 0.5, maxPitch: 1.35 });
      kit.grow();
      refresh();
    }

    function toggle(idx, i) {
      const G = groups[idx], m = G.slices[i];
      m.userData.on = !m.userData.on;
      kit.setColor(m.material, m.userData.on ? 'shade' : 'slice');
      const y0 = m.position.y;
      kit.tween(y0, 0.08 + (m.userData.on ? 0.06 : 0), 220, (v) => { m.position.y = v; });
      G.p.k = G.slices.filter((s) => s.userData.on).length;
      G.p.area = G.p.k / G.p.n;
      refresh();
      api.changed(get());
    }

    function refresh() {
      groups.forEach((G) => { if (G.label) G.label.set(SC.fracHTML(G.p.k, G.p.n)); });
      renderControls();
    }

    function renderControls() {
      const c = api.controls; c.innerHTML = '';
      if (state.locked) return;
      groups.slice(0, 2).forEach((G, idx) => {
        const box = document.createElement('div'); box.className = 'stepper';
        box.innerHTML = '<span class="cap">' + api.t('ui.slices') + (groups.length > 1 ? ' ' + (idx + 1) : '') + '</span><button aria-label="−">−</button><b>' + G.p.n + '</b><button aria-label="+">+</button>';
        const [minus, plus] = box.querySelectorAll('button');
        minus.onclick = () => setSlices(idx, G.p.n - 1);
        plus.onclick = () => setSlices(idx, G.p.n + 1);
        c.appendChild(box);
      });
      const clear = document.createElement('button'); clear.className = 'chip'; clear.textContent = api.t('ui.clear');
      clear.onclick = () => { state.pies.forEach((p) => { p.k = 0; p.area = 0; }); build(); api.changed(get()); };
      c.appendChild(clear);
    }

    function setSlices(idx, n) {
      n = Math.max(1, Math.min(12, n));
      const p = state.pies[idx]; if (p.area == null) p.area = p.k / p.n; p.n = n; p.k = Math.min(n, Math.round(p.area * n));
      build(); api.changed(get());
    }

    function get() { return { pies: state.pies.map((p) => ({ n: p.n, k: p.k })) }; }
    function set(s) { state = JSON.parse(JSON.stringify(Object.assign({ labels: true, locked: false }, s))); build(); }

    return { set, get };
  };
})(typeof window !== 'undefined' ? window : globalThis);
