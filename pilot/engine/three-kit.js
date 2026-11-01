/* School Cool pilot · small Three.js kit shared by all instruments:
   renderer with calm lighting, theme-aware materials with ink outlines, gentle orbit,
   pointer picking with drag, HTML labels pinned to 3D points, and simple tweens. */
(function (root) {
  const SC = root.SC;
  const PI = Math.PI;

  const THEMES = {
    light: { slice: '#F3EEE2', white: '#FBFBF8', paper: '#F3F1EA', ink: '#2A2F33', shade: '#E39B37', shade2: '#6F93C4', act: '#2F62E8', ground: '#E7E9E3', wood: '#D9C7A7', good: '#1F8A5B', bad: '#D2553F', metal: '#B9C0C4', p_moon: '#C9C7C1', p_mars: '#D49A72', p_jupiter: '#D8B98E', s_ice: '#CFE6F2', s_wood: '#D9C7A7', s_rubber: '#5E6468' },
    dark: { slice: '#CFCBC0', white: '#E9ECEA', paper: '#2B302E', ink: '#15181A', shade: '#F0A94A', shade2: '#86A7D6', act: '#7D9EFF', ground: '#232826', wood: '#9C8566', good: '#5CC48F', bad: '#F07A63', metal: '#8E979C', p_moon: '#8C8A85', p_mars: '#9A6040', p_jupiter: '#9C805C', s_ice: '#7FA3B5', s_wood: '#9C8566', s_rubber: '#3E4346' },
  };

  SC.Kit = function (container) {
    const kit = this;
    const THREE = root.THREE;
    kit.THREE = THREE;
    kit.el = container;
    kit.theme = document.documentElement.dataset.themeResolved || 'light';

    const R = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    R.setPixelRatio(Math.min(2, root.devicePixelRatio || 1));
    R.outputEncoding = THREE.sRGBEncoding;
    R.toneMapping = THREE.ACESFilmicToneMapping;
    R.toneMappingExposure = 0.95;
    R.shadowMap.enabled = true;
    R.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(R.domElement);
    kit.renderer = R;

    const scene = new THREE.Scene();
    kit.scene = scene;
    const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
    kit.camera = cam;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc9cdc6, 0.85));
    const sun = new THREE.DirectionalLight(0xffffff, 0.6);
    sun.position.set(-4, 10, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
    scene.add(sun);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.12 }));
    floor.rotation.x = -PI / 2; floor.receiveShadow = true; scene.add(floor);

    kit.stage = new THREE.Group(); scene.add(kit.stage);

    /* ---------- materials ---------- */
    const reg = [];
    kit.mat = (key, opts) => {
      const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.75 }, opts || {}));
      m.color.set(THEMES[kit.theme][key] || key).convertSRGBToLinear();
      m.userData.key = key; reg.push(m); return m;
    };
    kit.color = (key) => THEMES[kit.theme][key];
    kit.setColor = (m, key) => { m.userData.key = key; m.color.set(THEMES[kit.theme][key] || key).convertSRGBToLinear(); };
    const lineMat = new THREE.LineBasicMaterial({ color: 0x2a2f33, transparent: true, opacity: 0.5 });
    kit.mesh = (geo, mat, opts) => {
      const x = new THREE.Mesh(geo, mat); x.castShadow = true; x.receiveShadow = true;
      if (!opts || opts.edges !== false) x.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), lineMat));
      return x;
    };
    kit.setTheme = (t) => {
      kit.theme = t;
      reg.forEach((m) => m.color.set(THEMES[t][m.userData.key] || m.userData.key).convertSRGBToLinear());
      lineMat.color.set(t === 'dark' ? 0x0b0d0e : 0x2a2f33);
    };

    /* ---------- camera orbit ---------- */
    const orbit = { yaw: 0.5, pitch: 0.55, dist: 9, target: new THREE.Vector3(0, 0.6, 0), minPitch: 0.15, maxPitch: 1.2, yawLimit: 1.1 };
    kit.orbit = orbit;
    kit.frame = (o) => { orbit.fitWidth = 0; Object.assign(orbit, o); if (o.target) orbit.target = new THREE.Vector3(o.target[0], o.target[1], o.target[2]); };
    const placeCam = () => {
      const { yaw, pitch, target } = orbit;
      let dist = orbit.dist;
      /* On narrow screens move back far enough that orbit.fitWidth units fit across. */
      if (orbit.fitWidth) {
        const hf = Math.atan(Math.tan((cam.fov * Math.PI) / 360) * cam.aspect);
        dist = Math.max(dist, (orbit.fitWidth / 2) / Math.tan(hf) * 1.08);
      }
      cam.position.set(target.x + dist * Math.sin(yaw) * Math.cos(pitch), target.y + dist * Math.sin(pitch), target.z + dist * Math.cos(yaw) * Math.cos(pitch));
      cam.lookAt(target);
    };

    /* ---------- picking ---------- */
    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
    const hits = []; // {obj, onDown, onMove, onUp, cursor}
    kit.interactive = (obj, handlers) => { obj.traverse((o) => { o.userData.handlers = handlers; }); hits.push(obj); return obj; };
    kit.clearInteractive = () => { hits.length = 0; };
    const toNDC = (e) => { const r = R.domElement.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
    const pick = (e) => { toNDC(e); ray.setFromCamera(ptr, cam); const h = ray.intersectObjects(hits, true).find((x) => x.object.userData.handlers && x.object.type === 'Mesh'); return h; };
    /* Point on a horizontal or vertical plane under the pointer (for drags). */
    kit.planePoint = (e, normal, point) => {
      toNDC(e); ray.setFromCamera(ptr, cam);
      const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(...normal), new THREE.Vector3(...point));
      const out = new THREE.Vector3(); return ray.ray.intersectPlane(pl, out) ? out : null;
    };
    let drag = null, hover = null;
    const dom = R.domElement;
    dom.addEventListener('pointerdown', (e) => {
      const h = pick(e);
      if (h) {
        const H = h.object.userData.handlers;
        drag = { kind: 'obj', H, obj: h.object, point: h.point };
        H.onDown && H.onDown(e, h);
      } else drag = { kind: 'orbit', x: e.clientX, y: e.clientY };
      dom.setPointerCapture(e.pointerId);
    });
    dom.addEventListener('pointermove', (e) => {
      if (drag && drag.kind === 'orbit') {
        orbit.yaw = Math.max(-orbit.yawLimit, Math.min(orbit.yawLimit, orbit.yaw - (e.clientX - drag.x) * 0.006));
        orbit.pitch = Math.max(orbit.minPitch, Math.min(orbit.maxPitch, orbit.pitch + (e.clientY - drag.y) * 0.004));
        drag.x = e.clientX; drag.y = e.clientY; return;
      }
      if (drag && drag.kind === 'obj') { drag.H.onMove && drag.H.onMove(e); return; }
      const h = pick(e);
      const H = h && h.object.userData.handlers;
      if (hover && hover !== H && hover.onLeave) hover.onLeave();
      if (H && H !== hover && H.onEnter) H.onEnter(h);
      hover = H || null;
      dom.style.cursor = H ? (H.cursor || 'pointer') : 'grab';
    });
    const end = (e) => { if (drag && drag.kind === 'obj' && drag.H.onUp) drag.H.onUp(e); drag = null; };
    dom.addEventListener('pointerup', end); dom.addEventListener('pointercancel', end);
    dom.addEventListener('wheel', (e) => { e.preventDefault(); orbit.dist = Math.max(orbit.minDist || 4, Math.min(orbit.maxDist || 18, orbit.dist * (1 + Math.sign(e.deltaY) * 0.08))); }, { passive: false });

    /* ---------- labels ---------- */
    const labels = [];
    const layer = document.createElement('div'); layer.className = 'labels'; container.appendChild(layer);
    kit.label = (html, pos, cls) => {
      const el = document.createElement('div'); el.className = 'tag ' + (cls || ''); el.innerHTML = html; layer.appendChild(el);
      const L = { el, pos: pos.clone ? pos.clone() : new THREE.Vector3(...pos), obj: null, set(h) { el.innerHTML = h; }, show(v) { el.style.display = v ? '' : 'none'; } };
      labels.push(L); return L;
    };
    kit.clearLabels = () => { labels.forEach((l) => l.el.remove()); labels.length = 0; };
    const v3 = new THREE.Vector3();
    const placeLabels = () => {
      const w = container.clientWidth, h = container.clientHeight;
      labels.forEach((L) => {
        if (L.obj) L.obj.getWorldPosition(v3).add(L.pos); else v3.copy(L.pos);
        v3.project(cam);
        L.el.style.transform = 'translate(-50%,-100%) translate(' + ((v3.x + 1) / 2 * w).toFixed(1) + 'px,' + ((1 - v3.y) / 2 * h).toFixed(1) + 'px)';
      });
    };

    /* ---------- tweens & loop ---------- */
    const tweens = [];
    kit.tween = (from, to, ms, step, done) => { tweens.push({ t0: performance.now(), from, to, ms, step, done }); };
    kit.onFrame = null;
    let grow = 0;
    kit.grow = () => { grow = 0; };
    const loop = (now) => {
      for (let i = tweens.length - 1; i >= 0; i--) {
        const T = tweens[i]; const p = Math.min(1, (now - T.t0) / T.ms); const e = 1 - Math.pow(1 - p, 3);
        T.step(T.from + (T.to - T.from) * e); if (p >= 1) { tweens.splice(i, 1); T.done && T.done(); }
      }
      if (grow < 1) { grow = Math.min(1, grow + 0.045); const e = 1 - Math.pow(1 - grow, 3); kit.stage.scale.setScalar(0.001 + e * 0.999); kit.stage.position.y = -0.6 * (1 - e); }
      kit.onFrame && kit.onFrame(now);
      placeCam(); R.render(scene, cam); placeLabels();
      kit.raf = requestAnimationFrame(loop);
    };

    kit.resize = () => {
      const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return;
      R.setSize(w, h, false); cam.aspect = w / h;
      cam.fov = w / h < 0.9 ? 44 : 32; cam.updateProjectionMatrix();
    };
    new ResizeObserver(kit.resize).observe(container);
    kit.resize();
    kit.raf = requestAnimationFrame(loop);

    /* Remove everything an instrument built. */
    kit.reset = () => {
      kit.stage.children.slice().forEach((c) => kit.stage.remove(c));
      kit.clearInteractive(); kit.clearLabels(); kit.onFrame = null; tweens.length = 0;
    };

    /* Text drawn onto a plane (for numbers on rulers etc.). */
    kit.textPlane = (text, opts) => {
      opts = opts || {};
      const size = opts.size || 64, w = opts.w || 256, h = opts.h || 96;
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d'); x.fillStyle = opts.color || THEMES[kit.theme].ink;
      x.font = '700 ' + size + 'px Manrope, "Noto Sans", system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2);
      const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w / (opts.scale || 400), h / (opts.scale || 400)), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false }));
      return m;
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
