/* Instrument: number line. A wooden track from 0 to max cut into equal parts; drag the bead.
   state: { n, max, point, locked, labels, decimals } — the bead sits at point/n. */
(function (root) {
  const SC = root.SC;
  SC.instruments = SC.instruments || {};

  SC.instruments['number-line'] = function (kit, api) {
    const THREE = kit.THREE;
    let state = { n: 4, max: 1, point: 1, locked: false, labels: true };
    let bead, beadLabel, L, x0;

    function xAt(point) { return x0 + (point / state.n) * (L / state.max); }

    function build() {
      kit.reset();
      const { n, max } = state;
      L = max === 1 ? 6.4 : 8.4; x0 = -L / 2;
      const track = kit.mesh(new THREE.BoxGeometry(L + 0.6, 0.18, 0.7), kit.mat('wood'));
      track.position.y = 0.09; kit.stage.add(track);
      const groove = kit.mesh(new THREE.BoxGeometry(L, 0.03, 0.08), kit.mat('ink'), { edges: false });
      groove.position.set(0, 0.19, 0); kit.stage.add(groove);
      for (let i = 0; i <= n * max; i++) {
        const whole = i % n === 0;
        const t = kit.mesh(new THREE.BoxGeometry(whole ? 0.05 : 0.03, 0.04, whole ? 0.6 : 0.36), kit.mat('ink'), { edges: false });
        t.position.set(xAt(i), 0.2, 0); kit.stage.add(t);
        if (whole) {
          const num = kit.textPlane(SC.fmtNumber(i / n, api.lang), { size: 84, scale: 260 });
          num.rotation.x = -0.75; num.position.set(xAt(i), 0.36, 0.62); kit.stage.add(num);
        } else if (state.decimals) {
          const num = kit.textPlane(SC.fmtNumber(i / n, api.lang), { size: 60, scale: 420 });
          num.rotation.x = -0.75; num.position.set(xAt(i), 0.3, 0.55); kit.stage.add(num);
        }
      }
      bead = new THREE.Group();
      const ball = kit.mesh(new THREE.SphereGeometry(0.2, 32, 16), kit.mat(state.locked ? 'shade' : 'act'), { edges: false });
      ball.position.y = 0.42; bead.add(ball);
      const stem = kit.mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 12), kit.mat('ink'), { edges: false });
      stem.position.y = 0.24; bead.add(stem);
      bead.position.x = xAt(state.point);
      kit.stage.add(bead);
      if (!state.locked) {
        kit.interactive(ball, {
          cursor: 'grab',
          onMove: (e) => {
            const p = kit.planePoint(e, [0, 1, 0], [0, 0.42, 0]); if (!p) return;
            const k = Math.round(((p.x - x0) / L) * state.max * state.n);
            const cl = Math.max(0, Math.min(state.n * state.max, k));
            if (cl !== state.point) { state.point = cl; moveBead(); api.changed(get()); }
          },
        });
      }
      beadLabel = state.labels !== false ? kit.label('', new THREE.Vector3(0, 0.95, 0), 'big') : null;
      if (beadLabel) beadLabel.obj = bead;
      kit.frame({ target: [0, 0.2, 0.3], dist: L * 1.3 + 2.4, fitWidth: L + 1.4, pitch: 0.8, yaw: 0, minPitch: 0.35, maxPitch: 1.3, yawLimit: 0.7 });
      kit.grow();
      refresh();
    }

    function moveBead() { const x1 = bead.position.x; kit.tween(x1, xAt(state.point), 160, (v) => { bead.position.x = v; }); refresh(); }

    function refresh() {
      if (beadLabel) beadLabel.set(state.decimals ? SC.fmtNumber(state.point / state.n, api.lang) : SC.fracHTML(state.point, state.n));
      const c = api.controls; c.innerHTML = '';
      if (state.locked || state.decimals) return;
      const box = document.createElement('div'); box.className = 'stepper';
      box.innerHTML = '<span class="cap">' + api.t('ui.parts') + '</span><button aria-label="−">−</button><b>' + state.n + '</b><button aria-label="+">+</button>';
      const [minus, plus] = box.querySelectorAll('button');
      minus.onclick = () => setN(state.n - 1); plus.onclick = () => setN(state.n + 1);
      c.appendChild(box);
      const move = document.createElement('div'); move.className = 'stepper';
      move.innerHTML = '<span class="cap">' + api.t('ui.point') + '</span><button aria-label="←">←</button><button aria-label="→">→</button>';
      const [l, r] = move.querySelectorAll('button');
      l.onclick = () => { if (state.point > 0) { state.point--; moveBead(); api.changed(get()); } };
      r.onclick = () => { if (state.point < state.n * state.max) { state.point++; moveBead(); api.changed(get()); } };
      c.appendChild(move);
    }

    function setN(n) {
      n = Math.max(1, Math.min(12, n));
      const v = state.point / state.n; state.n = n; state.point = Math.round(v * n);
      build(); api.changed(get());
    }

    function get() { return { n: state.n, max: state.max, point: state.point }; }
    function set(s) { state = Object.assign({ labels: true, locked: false, max: 1, point: 0 }, JSON.parse(JSON.stringify(s))); build(); }
    return { set, get };
  };
})(typeof window !== 'undefined' ? window : globalThis);
