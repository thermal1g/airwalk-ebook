/* Curved lens carousel: photo cards bent around the inside of a cylinder (WebGL, no library).
   Drag / swipe / arrows / keyboard; caption + counter follow the active card. Without WebGL the plain list stays. */
(() => {
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const VS = `attribute vec2 p;uniform float off,R,D,F,asp,W,H;varying vec2 uv;varying float edge;
void main(){float x=off+p.x*W;float th=x/R;float X=R*sin(th);float Z=R*(1.0-cos(th));float Y=p.y*H;
float w=D-Z;gl_Position=vec4(X*F/asp,Y*F,0.0,w);uv=vec2(p.x+.5,.5-p.y);edge=clamp(abs(th)/1.2,0.,1.);}`;
const FS = `precision mediump float;uniform sampler2D t;uniform vec2 px;uniform float rad,dim;uniform vec3 fc;varying vec2 uv;varying float edge;
void main(){vec2 q=abs(uv-.5)*px-(px*.5-rad);float d=length(max(q,0.))-rad;float a=1.0-smoothstep(-1.0,0.5,d);
vec4 c=texture2D(t,uv);c.rgb=mix(c.rgb,fc,dim);gl_FragColor=vec4(c.rgb*a,a);}`;

function make(root) {
  const cv = root.querySelector('canvas'), list = [...root.querySelectorAll('.lens-fb li')];
  const n = list.length, ar = parseFloat(root.dataset.ar || '.75'), fit = root.dataset.fit || 'cover';
  const cap = root.querySelector('.lens-cap'), cnt = root.querySelector('.lens-n');
  let gl = null;
  try { gl = cv.getContext('webgl', { premultipliedAlpha: true, antialias: true, alpha: true }); } catch (e) {}
  if (!gl || !n) { root.classList.add('nogl'); return; }
  root.classList.add('gl');
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { root.classList.remove('gl'); root.classList.add('nogl'); return; }
  gl.useProgram(pr);
  // strip mesh: 48 columns x 1 row
  const C = 48, v = [];
  for (let i = 0; i < C; i++) { const a = -.5 + i / C, b = -.5 + (i + 1) / C; v.push(a, -.5, b, -.5, a, .5, a, .5, b, -.5, b, .5); }
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['off', 'R', 'D', 'F', 'asp', 'W', 'H', 'px', 'rad', 'dim', 't', 'fc'].forEach(k => U[k] = gl.getUniformLocation(pr, k));
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const tex = list.map(() => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([60, 20, 30, 255]));
    [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(f => gl.texParameteri(gl.TEXTURE_2D, f, gl.LINEAR));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; });
  const TW = 640, TH = Math.round(TW / ar);
  const upload = (i) => {
    const img = list[i].querySelector('img');
    const go = () => {
      const c = document.createElement('canvas'); c.width = TW; c.height = TH; const x = c.getContext('2d');
      x.fillStyle = getComputedStyle(root).getPropertyValue('--lensbg').trim() || '#fff'; x.fillRect(0, 0, TW, TH);
      const s = fit === 'contain' ? Math.min(TW / img.naturalWidth, TH / img.naturalHeight) * .92 : Math.max(TW / img.naturalWidth, TH / img.naturalHeight);
      const w = img.naturalWidth * s, h = img.naturalHeight * s; x.drawImage(img, (TW - w) / 2, (TH - h) / 2, w, h);
      gl.bindTexture(gl.TEXTURE_2D, tex[i]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); need();
    };
    img.loading = 'eager';
    if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go, { once: true });
  };
  let fade = [0, 0, 0];
  const readFade = () => { const c = getComputedStyle(root).getPropertyValue('--lensfade').trim() || '#000000'; const h = c.replace('#', ''); fade = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255); };
  readFade();
  let loaded = false;
  const loadAll = () => { loaded = true; list.forEach((_, i) => upload(i)); };
  // geometry in "card height" units
  const W = ar, GAP = ar * .1, STEP = W + GAP;
  let pos = 0, target = 0, vel = 0, raf = 0, visible = false, active = -1;
  const R = () => Math.max(1.4, STEP * 2.6), D = 3.2;
  const resize = () => {
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); gl.viewport(0, 0, cv.width, cv.height); need();
  };
  const setCap = () => {
    const i = ((Math.round(pos) % n) + n) % n; if (i === active) return; active = i;
    const li = list[i]; if (cap) { cap.classList.remove('in'); void cap.offsetWidth;
      cap.querySelector('.lk').textContent = li.dataset.k || ''; cap.querySelector('.lt').textContent = li.dataset.t || ''; cap.querySelector('.lc').textContent = li.dataset.c || '';
      cap.classList.add('in'); }
    if (cnt) cnt.textContent = String(i + 1).padStart(2, '0');
  };
  const draw = () => {
    raf = 0;
    if (!dragging) { const k = RM ? 1 : .12; pos += (target - pos) * k; if (Math.abs(target - pos) < .0005) pos = target; }
    const asp = cv.width / cv.height, hfit = Math.min(1, .95 * asp / (W * 1.38));
    const F = 1.38 * D * hfit;
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.uniform3fv(U.fc, fade);
    gl.uniform1f(U.R, R()); gl.uniform1f(U.D, D); gl.uniform1f(U.F, F); gl.uniform1f(U.asp, asp); gl.uniform1f(U.W, W); gl.uniform1f(U.H, 1);
    const pxH = cv.height * F / D / 2; gl.uniform2f(U.px, W * pxH * 2 / 2, pxH); gl.uniform1f(U.rad, 14 * (devicePixelRatio > 1 ? 2 : 1));
    for (let i = 0; i < n; i++) {
      let d = i - pos; d = ((d % n) + n * 1.5) % n - n / 2; // wrap around: shortest offset
      const x = d * STEP; if (Math.abs(x / R()) > 1.45) continue;
      gl.uniform1f(U.off, x); gl.uniform1f(U.dim, Math.min(.55, Math.abs(d) * .16));
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[i]); gl.uniform1i(U.t, 0);
      gl.drawArrays(gl.TRIANGLES, 0, C * 6);
    }
    setCap();
    if (visible && (dragging || Math.abs(target - pos) > .0005)) need();
  };
  const need = () => { if (!raf && visible) raf = requestAnimationFrame(draw); };
  // input
  let dragging = false, sx = 0, sp = 0, lx = 0, lt = 0, moved = false;
  const pxPerStep = () => cv.getBoundingClientRect().width / 3.2;
  cv.addEventListener('pointerdown', e => { dragging = true; moved = false; sx = lx = e.clientX; sp = pos; lt = performance.now(); vel = 0; cv.setPointerCapture(e.pointerId); root.classList.add('drag'); });
  cv.addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true;
    pos = sp - dx / pxPerStep(); const now = performance.now(); vel = (e.clientX - lx) / Math.max(1, now - lt); lx = e.clientX; lt = now; need(); });
  const up = e => { if (!dragging) return; dragging = false; root.classList.remove('drag');
    target = Math.round(pos - (RM ? 0 : vel * 220 / pxPerStep())); if (!moved) { const r = cv.getBoundingClientRect(); const rel = (e.clientX - r.left) / r.width - .5; if (Math.abs(rel) > .18) target = Math.round(pos) + Math.sign(rel); }
    need(); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  const go = d => { target = Math.round(target) + d; need(); };
  root.querySelector('.lens-prev')?.addEventListener('click', () => go(-1));
  root.querySelector('.lens-next')?.addEventListener('click', () => go(1));
  root.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } });
  new ResizeObserver(resize).observe(cv);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { if (!loaded) loadAll(); need(); } }, { rootMargin: '300px 0px' }).observe(root);
  addEventListener('palchange', () => { setTimeout(() => { readFade(); if (loaded) loadAll(); need(); }, 60); });
  resize();
}
const init = () => document.querySelectorAll('[data-lens]').forEach(make);
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
