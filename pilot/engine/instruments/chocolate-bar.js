/* Instrument: chocolate bar. A bar of `total` pieces split into `rows` equal strips.
   Tap a strip to break it off. state: { rows, cols, total, pick, locked, labels } */
(function (root) {
  const SC = root.SC;
  SC.instruments = SC.instruments || {};

  SC.instruments['chocolate-bar'] = function (kit, api) {
    const THREE = kit.THREE;
    let state = { rows: 4, cols: 3, total: 12, pick: 0, locked: false, labels: true };
    let strips = [], label;

    function build() {
      kit.reset(); strips = [];
      const { rows, cols, total } = state;
      const per = total / rows;
      const cw = 0.62, ch = 0.62, gap = 0.06;
      const W = cols * (cw + gap), D = rows * (ch + gap);
      const wrap = kit.mesh(new THREE.BoxGeometry(W + 0.5, 0.06, D + 0.5), kit.mat('paper'));
      wrap.position.y = 0.03; kit.stage.add(wrap);
      for (let r = 0; r < rows; r++) {
        const g = new THREE.Group();
        g.position.z = -D / 2 + (r + 0.5) * (ch + gap);
        for (let c = 0; c < cols; c++) {
          const b = kit.mesh(new THREE.BoxGeometry(cw, 0.2, ch), kit.mat('wood'));
          b.position.set(-W / 2 + (c + 0.5) * (cw + gap), 0.16, 0); g.add(b);
          if (cols === 1) {
            const t = kit.textPlane(SC.fmtNumber(per, api.lang), { size: 60 });
            t.rotation.x = -Math.PI / 2; t.position.set(b.position.x, 0.262, 0); g.add(t);
          }
        }
        g.userData.on = r < state.pick;
        if (g.userData.on) { g.position.x = W / 2 + 0.9; g.position.y = 0.05; }
        kit.stage.add(g); strips.push(g);
        if (!state.locked) kit.interactive(g, { onDown: () => toggle(r), onEnter: () => { g.position.y += 0.05; }, onLeave: () => { g.position.y = g.userData.on ? 0.05 : 0; } });
      }
      label = state.labels !== false ? kit.label('', new THREE.Vector3(0, 0.9, -D / 2 - 0.5), 'big') : null;
      kit.frame({ target: [0.6, 0.1, 0], dist: Math.max(W, D) * 1.6 + 4, fitWidth: W + 3, pitch: 0.95, yaw: 0.15, minPitch: 0.5, maxPitch: 1.35 });
      kit.grow(); refresh();
    }

    function toggle(r) {
      const g = strips[r]; g.userData.on = !g.userData.on;
      const W = state.cols * 0.68;
      const x1 = g.position.x; kit.tween(x1, g.userData.on ? W / 2 + 0.9 : 0, 260, (v) => { g.position.x = v; });
      g.position.y = g.userData.on ? 0.05 : 0;
      state.pick = strips.filter((s) => s.userData.on).length;
      refresh(); api.changed(get());
    }

    function refresh() {
      const per = state.total / state.rows;
      if (label) label.set(SC.fracHTML(state.pick, state.rows) + ' <small>→</small> ' + SC.fmtNumber(state.pick * per, api.lang) + ' / ' + SC.fmtNumber(state.total, api.lang));
      api.controls.innerHTML = '';
    }

    function get() { return { rows: state.rows, total: state.total, pick: state.pick }; }
    function set(s) { state = Object.assign({ labels: true, locked: false, pick: 0 }, JSON.parse(JSON.stringify(s))); if (!state.cols) state.cols = state.total / state.rows; build(); }
    return { set, get };
  };
})(typeof window !== 'undefined' ? window : globalThis);
