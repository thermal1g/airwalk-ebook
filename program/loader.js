/* Airwalk loader: a desk drawn in wireframe, the camera pushes in, the hero book is drawn, opens, the loading
   steps are written in it letter by letter, then the book flies past the camera through red streaks.
   Variant 1: canvas 2D "blueprint" (own 3D projection, no WebGL - used on every touch device)
   Variant 2: three.js glowing wireframe        Variant 3: three.js lines that turn into solid, lit objects
   Variant 4: an iPhone scrolling our site with the loading written on top; pixel dissolve, then it flies through the camera (2D, also on phones)
   Picker (localhost or ?picker=1): variant 1/2/3, duration 4.5 / 6 / full, replay. */
(() => {
const TOUCH = matchMedia('(hover:none),(pointer:coarse)').matches;
const RED = '#e50914', WHITE = '#f5f5f1';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const ease = t => (t = clamp(t), t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), eout = t => 1 - Math.pow(1 - clamp(t), 3), ein = t => Math.pow(clamp(t), 3);
const v3 = (x, y, z) => [x, y, z], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm = a => mul(a, 1 / Math.hypot(...a)), lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// ---------------- settings & picker ----------------
const Q = new URLSearchParams(location.search);
const PICK = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || Q.has('picker');
let saved = {}; try { saved = JSON.parse(localStorage.getItem('awLoader') || '{}'); } catch (e) {}
const DURS = { s: 4.5, m: 6, f: 8.5 };
let VAR = +(Q.get('loader') || saved.v || 4), DK = Q.get('ld') || saved.d || 's';
if (!DURS[DK]) DK = 's'; if (![1, 2, 3, 4].includes(VAR)) VAR = 4;
let seen = false; try { seen = sessionStorage.getItem('awLoaderSeen') === '1'; sessionStorage.setItem('awLoaderSeen', '1'); } catch (e) {}
let DUR = DURS[DK]; if (seen && !PICK) DUR = 2.4;           // repeat visit in the same session: short version
const VARIANT = TOUCH && VAR !== 4 ? 1 : VAR;               // phones get a 2D version: 1, or 4 which is 2D already

function picker() {
  if (!PICK) return;
  const el = document.createElement('div'); el.className = 'ldpick';
  const b = (k, v, t) => `<button data-${k}='${v}' class='${(k === 'v' ? VAR == v : DK == v) ? 'on' : ''}'>${t}</button>`;
  el.innerHTML = `<b>Loader</b>${b('v', 1, '1 · Blueprint')}${b('v', 2, '2 · Wireframe 3D')}${b('v', 3, '3 · Lines → solid')}${b('v', 4, '4 · Phone')}<i></i>${b('d', 's', '4.5 s')}${b('d', 'm', '6 s')}${b('d', 'f', 'Full 8.5 s')}<i></i><button data-r=1>↻ Replay</button>${TOUCH ? '<small>Phone: 1 or 4</small>' : ''}`;
  el.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.v) VAR = +t.dataset.v; if (t.dataset.d) DK = t.dataset.d;
    try { localStorage.setItem('awLoader', JSON.stringify({ v: VAR, d: DK })); sessionStorage.removeItem('awLoaderSeen'); } catch (e) {}
    scrollTo(0, 0); location.reload();
  });
  document.body.appendChild(el);
  const st = document.createElement('style');
  st.textContent = `.ldpick{position:fixed;left:16px;bottom:16px;z-index:400;display:flex;flex-wrap:wrap;gap:6px;align-items:center;max-width:calc(100vw - 32px);padding:10px 12px;background:rgba(10,10,10,.92);border:1px solid #333;font:600 11px/1 G,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#aaa;backdrop-filter:blur(8px)}
  .ldpick b{color:#fff;margin-right:6px}.ldpick i{width:1px;height:18px;background:#333;margin:0 4px}.ldpick small{color:#777;font-size:10px}
  .ldpick button{font:inherit;letter-spacing:inherit;text-transform:inherit;color:#ddd;background:#1a1a1a;border:1px solid #333;padding:7px 9px;cursor:pointer}
  .ldpick button.on{background:${RED};border-color:${RED};color:#fff}.ldpick button:hover{border-color:#777}`;
  document.head.appendChild(st);
}

// ---------------- the scene, described once ----------------
// units ~ metres, y up; desk top surface at y = 0; the book lies in the middle of the desk
function sceneDesc() {
  const P = [];   // primitives: {kind, ..., t0 (0..1 inside its phase), phase:'desk'|'book', red}
  const box = (c, s, t0, o = {}) => P.push({ k: 'box', c, s, t0, ...o });
  const cyl = (c, r, h, t0, o = {}) => P.push({ k: 'cyl', c, r, h, t0, ...o });
  const seg = (a, b, t0, o = {}) => P.push({ k: 'seg', a, b, t0, ...o });
  // desk
  box([0, -.04, 0], [3.4, .08, 1.7], 0);
  [[-1.6, -.78], [1.6, -.78], [-1.6, .78], [1.6, .78]].forEach(([x, z], i) => box([x, -.79, z], [.07, 1.42, .07], .1 + i * .04));
  box([0, -.25, -.8], [3.1, .3, .03], .3, { faint: 1 });
  // lamp
  cyl([-1.25, .02, -.45], .17, .04, .35); seg([-1.25, .04, -.45], [-1.05, .75, -.5], .42); seg([-1.05, .75, -.5], [-.7, .95, -.3], .5);
  cyl([-.68, .84, -.28], .14, .18, .56, { cone: .05 });
  // laptop
  box([1.05, .012, -.25], [.9, .024, .6], .5); P.push({ k: 'quad', pts: [[.6, .024, -.55], [1.5, .024, -.55], [1.5, .6, -.72], [.6, .6, -.72]], t0: .6 });
  // mug
  cyl([1.4, .11, .45], .1, .22, .66);
  // papers
  P.push({ k: 'quad', pts: [[-1.35, .002, .2], [-.75, .002, .12], [-.66, .002, .82], [-1.26, .002, .9]], t0: .72, faint: 1 });
  P.push({ k: 'quad', pts: [[-1.25, .004, .28], [-.68, .004, .26], [-.66, .004, .95], [-1.23, .004, .97]], t0: .78, faint: 1 });
  // floor grid line (horizon of the drawing)
  seg([-4, -1.5, 1.2], [4, -1.5, 1.2], .82, { faint: 1 }); seg([-4, -1.5, -1.2], [4, -1.5, -1.2], .86, { faint: 1 });
  return P;
}
// book geometry in its own space (hinge along z at x = -0.46, top of the page block y = .085)
const BW = .92, BD = 1.26, BH = .085, HX = -.46;
function bookPrims() {
  const P = [];
  P.push({ k: 'box', c: [0, .005, 0], s: [BW, .01, BD], t0: 0, red: 1 });                 // back cover
  P.push({ k: 'box', c: [.02, .045, 0], s: [BW - .06, .07, BD - .05], t0: .2 });         // page block
  for (let i = 1; i < 6; i++) P.push({ k: 'seg', a: [.47, .015 + i * .012, -.6], b: [.47, .015 + i * .012, .6], t0: .3 + i * .03, faint: 1 }); // page edges
  return P;
}
// front cover outline (+ the red "V" of the hero cover) for an opening angle a (0 closed, PI open flat to the left)
function coverLines(a) {
  const ca = Math.cos(a), sa = Math.sin(a), y0 = BH + .006;
  const p = (u, z) => [HX + ca * u, y0 + sa * u, z];        // u: 0..BW across the cover
  const L = [], q = [[0, -.63], [BW, -.63], [BW, .63], [0, .63]];
  for (let i = 0; i < 4; i++) L.push([p(...q[i]), p(...q[(i + 1) % 4]), 0]);
  L.push([p(.22, -.5), p(.46, .15), 1], [p(.46, .15), p(.7, -.5), 1], [p(.32, -.5), p(.46, -.1), 1], [p(.46, -.1), p(.6, -.5), 1]); // V
  L.push([p(.14, .38), p(.62, .38), 0], [p(.14, .46), p(.5, .46), 0]);                   // title lines
  return L;
}
// edges of primitives as segment lists [[a,b], ...]
function edges(pr) {
  if (pr.k === 'seg') return [[pr.a, pr.b]];
  if (pr.k === 'quad') return pr.pts.map((p, i) => [p, pr.pts[(i + 1) % 4]]);
  if (pr.k === 'box') {
    const [cx, cy, cz] = pr.c, [sx, sy, sz] = pr.s.map(v => v / 2), V = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) V.push([cx + x * sx, cy + y * sy, cz + z * sz]);
    return [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]].map(([a, b]) => [V[a], V[b]]);
  }
  if (pr.k === 'cyl') {
    const n = 20, E = [], r2 = pr.cone ? pr.cone : pr.r, [cx, cy, cz] = pr.c, h = pr.h / 2;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2;
      E.push([[cx + Math.cos(a) * pr.r, cy - h, cz + Math.sin(a) * pr.r], [cx + Math.cos(b) * pr.r, cy - h, cz + Math.sin(b) * pr.r]]);
      E.push([[cx + Math.cos(a) * r2, cy + h, cz + Math.sin(a) * r2], [cx + Math.cos(b) * r2, cy + h, cz + Math.sin(b) * r2]]);
      if (i % 5 === 0) E.push([[cx + Math.cos(a) * pr.r, cy - h, cz + Math.sin(a) * pr.r], [cx + Math.cos(a) * r2, cy + h, cz + Math.sin(a) * r2]]);
    }
    return E;
  }
  return [];
}

// ---------------- timeline (fractions of the total duration) ----------------
const PH = { desk: [0, .2], push: [.12, .44], book: [.2, .42], open: [.42, .52], write: [.5, .82], fly: [.82, 1] };
const ph = (t, k) => clamp((t - PH[k][0]) / (PH[k][1] - PH[k][0]));

// camera framing: fit a width W centred on target, looking down at pitch (deg)
function frame(target, W, H, pitch, fov, aspect) {
  const t = Math.tan(fov / 2 * Math.PI / 180), d = Math.max((W / 2) / (t * aspect), (H / 2) / t);
  const pr = pitch * Math.PI / 180; return { pos: add(target, [0, Math.sin(pr) * d, Math.cos(pr) * d]), look: target };
}
function camAt(t, aspect) {
  const fov = 40, portrait = aspect < 1;
  const A = frame([0, -.1, 0], 3.9, 2.2, 24, fov, aspect);
  const B = frame([0, 0, .05], portrait ? 1.3 : 2.2, 1.5, 48, fov, aspect);
  const C = frame(portrait ? [.01, BH, .02] : [HX, BH, .02], portrait ? .98 : 2.0, 1.36, 62, fov, aspect);
  let c;
  if (t < PH.push[0]) c = { pos: lerp3(add(A.pos, [0, .35, .8]), A.pos, ease(t / PH.push[0])), look: A.look };
  else if (t < PH.open[0]) { const k = ease((t - PH.push[0]) / (PH.open[0] - PH.push[0])); c = { pos: lerp3(A.pos, B.pos, k), look: lerp3(A.look, B.look, k) }; }
  else { const k = ease((t - PH.open[0]) / (PH.write[0] + .06 - PH.open[0])); c = { pos: lerp3(B.pos, C.pos, k), look: lerp3(B.look, C.look, k) };
    const dr = ph(t, 'write'); c.pos = add(c.pos, [Math.sin(dr * 2) * .03, -dr * .05, -dr * .04]); }
  return { ...c, fov };
}
// book transform: rises and flies at the camera during the fly phase
function bookXf(t, cam) {
  const f = ph(t, 'fly'); if (!f) return { off: [0, 0, 0], rot: 0, s: 1 };
  const k = ein(f), dir = sub(cam.pos, [HX * .5, BH, 0]);
  return { off: mul(dir, k * 1.45), rot: k * .9, s: 1 };
}
const applyXf = (p, xf) => { // rotate about x then offset (book space -> world)
  const c = Math.cos(xf.rot), s = Math.sin(xf.rot), y = p[1] * c - p[2] * s, z = p[1] * s + p[2] * c;
  return [p[0] + xf.off[0], y + xf.off[1], z + xf.off[2]];
};

// ---------------- page text (shared by every variant) ----------------
function pageWriter(steps, head) {
  const lines = [{ t: head.toUpperCase(), s: 'h' }, ...steps.map((s, i) => ({ t: String(i + 1).padStart(2, '0') + '  ' + s, s: 'c' }))];
  const total = lines.reduce((a, l) => a + l.t.length, 0);
  // draws in page units: 860 x 1180, origin top-left; prog 0..1 = how much is written, pct shown at the bottom
  return (ctx, prog, pct, now) => {
    let left = Math.floor(prog * total), y = 150;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = RED; ctx.font = '700 24px G, sans-serif'; ctx.fillText('AIRWALK', 70, 96);
    ctx.fillStyle = 'rgba(20,20,20,.35)'; ctx.fillRect(70, 112, 720, 2);
    for (const l of lines) {
      const show = l.t.slice(0, Math.max(0, left)); left -= l.t.length;
      if (l.s === 'h') { ctx.font = '800 54px G, sans-serif'; ctx.fillStyle = '#111'; y += 40; ctx.fillText(show, 70, y); y += 70; }
      else {
        ctx.font = '600 40px A, sans-serif'; ctx.fillStyle = '#1a1a1a';
        const num = show.slice(0, 2), rest = show.slice(2);
        ctx.fillStyle = RED; ctx.font = '800 40px G, sans-serif'; ctx.fillText(num, 70, y);
        ctx.fillStyle = '#1a1a1a'; ctx.font = '600 40px A, sans-serif'; ctx.fillText(rest, 130, y);
        if (show.length === l.t.length) { ctx.fillStyle = RED; ctx.font = '800 34px G, sans-serif'; ctx.fillText('✓', 760, y); }
        y += 92;
      }
      if (left < 0 && show.length && Math.floor(now * 2.5) % 2 === 0) { const w = ctx.measureText(show.slice(l.s === 'h' ? 0 : 2)).width; ctx.fillStyle = RED; ctx.fillRect((l.s === 'h' ? 70 : 130) + w + 6, y - (l.s === 'h' ? 110 : 130), 4, l.s === 'h' ? 54 : 44); }
      if (left <= 0) break;
    }
    // progress bar
    ctx.fillStyle = 'rgba(20,20,20,.12)'; ctx.fillRect(70, 1060, 720, 10); ctx.fillStyle = RED; ctx.fillRect(70, 1060, 720 * pct, 10);
    ctx.fillStyle = '#111'; ctx.font = '800 44px G, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(Math.round(pct * 100) + '%', 790, 1040); ctx.textAlign = 'left';
  };
}

// ---------------- streaks overlay ----------------
function streaks(canvas) {
  const ctx = canvas.getContext('2d'), S = [];
  for (let i = 0; i < 90; i++) S.push({ a: Math.random() * Math.PI * 2, r: Math.random() * .25, v: .6 + Math.random() * 1.6, l: .08 + Math.random() * .35, c: i % 3 === 0 ? WHITE : i % 3 === 1 ? RED : '#8a0c13', w: .6 + Math.random() * 2.2, d: Math.random() * .35 });
  return (f, W, H) => {
    ctx.clearRect(0, 0, W, H); if (f <= 0 || f >= 1) return;
    const cx = W / 2, cy = H / 2, R = Math.hypot(W, H) / 2;
    ctx.globalCompositeOperation = 'lighter';
    for (const s of S) {
      const k = clamp((f - s.d) / (1 - s.d)); if (!k) continue;
      const r0 = (s.r + k * k * s.v * 1.4) * R, r1 = r0 + s.l * R * (0.3 + k);
      ctx.strokeStyle = s.c; ctx.globalAlpha = Math.sin(k * Math.PI) * .9; ctx.lineWidth = s.w * (1 + k * 2) * devicePixelRatio;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(s.a) * r0, cy + Math.sin(s.a) * r0); ctx.lineTo(cx + Math.cos(s.a) * r1, cy + Math.sin(s.a) * r1); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
}

// ---------------- variant 1: canvas 2D blueprint ----------------
function V1(cv) {
  const ctx = cv.getContext('2d'); let W = 0, H = 0, view, proj;
  const desk = sceneDesc().map(p => ({ ...p, E: edges(p) })), book = bookPrims().map(p => ({ ...p, E: edges(p) }));
  function setCam(c) {
    const z = norm(sub(c.pos, c.look)), x = norm(cross([0, 1, 0], z)), y = cross(z, x);
    view = { x, y, z, p: c.pos }; proj = 1 / Math.tan(c.fov / 2 * Math.PI / 180);
  }
  const P = p => { const d = sub(p, view.p), cz = -dot(d, view.z); if (cz < .02) return null;
    return [W / 2 + dot(d, view.x) / cz * proj * H / 2, H / 2 - dot(d, view.y) / cz * proj * H / 2, cz]; };
  function line(a, b, k) { const A = P(a), B = P(k < 1 ? lerp3(a, b, k) : b); if (!A || !B) return; ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); }
  function drawPrims(list, t01, color, alpha, xf) {
    for (const pr of list) {
      const k = clamp((t01 - pr.t0) / .3); if (!k) continue;
      ctx.strokeStyle = pr.red ? RED : color; ctx.globalAlpha = alpha * (pr.faint ? .35 : 1); ctx.beginPath();
      const n = pr.E.length, show = k * n;
      pr.E.forEach((e, i) => { const kk = clamp(show - i); if (kk > 0) line(xf ? applyXf(e[0], xf) : e[0], xf ? applyXf(e[1], xf) : e[1], kk); });
      ctx.stroke();
    }
  }
  return {
    resize(w, h) { W = w; H = h; },
    draw(t, now, write) {
      const cam = camAt(t, W / H); setCam(cam);
      ctx.clearRect(0, 0, W, H);
      // blueprint paper: faint grid + frame marks
      ctx.globalAlpha = .07; ctx.strokeStyle = WHITE; ctx.lineWidth = 1; ctx.beginPath();
      const g = Math.max(40, W / 30); for (let x = (W / 2) % g; x < W; x += g) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } for (let y = (H / 2) % g; y < H; y += g) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke();
      ctx.globalAlpha = .5; ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.beginPath();
      [[24, 24, 1, 1], [W - 24, 24, -1, 1], [24, H - 24, 1, -1], [W - 24, H - 24, -1, -1]].forEach(([x, y, a, b]) => { ctx.moveTo(x, y + 28 * b); ctx.lineTo(x, y); ctx.lineTo(x + 28 * a, y); }); ctx.stroke();
      const fade = 1 - ph(t, 'fly') * 1.2;
      ctx.lineWidth = 1.3 * devicePixelRatio; ctx.lineCap = 'round';
      drawPrims(desk, ph(t, 'desk') * 1.3, WHITE, .75 * clamp(fade + .2), null);
      // dimension line under the desk, like a technical drawing
      const dk = ph(t, 'desk');
      if (dk > .6) { const a = P([-1.7, -1.62, 1.2]), b = P([1.7, -1.62, 1.2]); if (a && b) { ctx.globalAlpha = (dk - .6) * 1.6 * clamp(fade); ctx.strokeStyle = RED; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        ctx.fillStyle = RED; ctx.font = `600 ${11 * devicePixelRatio}px G, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('1700 MM', (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 8 * devicePixelRatio); ctx.textAlign = 'left'; } }
      // book
      const xf = bookXf(t, cam), bk = ph(t, 'book'), bf = 1 - clamp((ph(t, 'fly') - .35) / .45);
      ctx.lineWidth = 1.6 * devicePixelRatio;
      drawPrims(book, bk * 1.2, WHITE, bf, xf);
      const ang = ease(ph(t, 'open')) * Math.PI;
      if (bk > .55) { ctx.globalAlpha = clamp((bk - .55) * 3) * bf; ctx.beginPath(); ctx.strokeStyle = WHITE;
        const L = coverLines(ang); L.forEach(([a, b, r]) => { if (!r) line(applyXf(a, xf), applyXf(b, xf), 1); }); ctx.stroke();
        ctx.beginPath(); ctx.strokeStyle = RED; L.forEach(([a, b, r]) => { if (r) line(applyXf(a, xf), applyXf(b, xf), 1); }); ctx.stroke(); }
      // the page with the writing (affine map of page units onto the projected page)
      if (ang > Math.PI * .55) {
        const o = P(applyXf([-.42, BH + .002, -.6], xf)), u = P(applyXf([.44, BH + .002, -.6], xf)), v = P(applyXf([-.42, BH + .002, .6], xf));
        if (o && u && v) { ctx.save(); ctx.globalAlpha = clamp((ang / Math.PI - .55) * 4) * bf;
          ctx.setTransform((u[0] - o[0]) / 860, (u[1] - o[1]) / 860, (v[0] - o[0]) / 1180, (v[1] - o[1]) / 1180, o[0], o[1]);
          ctx.fillStyle = 'rgba(245,245,241,.94)'; ctx.fillRect(0, 0, 860, 1180); write(ctx); ctx.restore(); }
        const lo = P(applyXf([HX - BW + .04, BH + .004, -.6], xf)), lu = P(applyXf([HX - .02, BH + .004, -.6], xf)), lv = P(applyXf([HX - BW + .04, BH + .004, .6], xf));
        if (lo && lu && lv && W / H >= 1) { ctx.save(); ctx.globalAlpha = clamp((ang / Math.PI - .55) * 4) * .9 * bf;
          ctx.setTransform((lu[0] - lo[0]) / 860, (lu[1] - lo[1]) / 860, (lv[0] - lo[0]) / 1180, (lv[1] - lo[1]) / 1180, lo[0], lo[1]);
          ctx.fillStyle = '#0d0d0d'; ctx.fillRect(0, 0, 860, 1180); ctx.fillStyle = RED; ctx.font = '800 86px G, sans-serif'; ctx.fillText('AIR', 70, 980); ctx.fillStyle = WHITE; ctx.fillText('WALK', 70, 1080); ctx.restore(); }
      }
      ctx.globalAlpha = 1;
    },
    dispose() {}
  };
}

// ---------------- variants 2 & 3: three.js ----------------
function V23(cv, solid, frontUrl) {
  const T = window.AW && window.AW.THREE; if (!T) return null;
  const r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.outputColorSpace = T.SRGBColorSpace; r.toneMapping = T.ACESFilmicToneMapping;
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(40, 1, .05, 60); scene.fog = new T.Fog(solid ? 0x000000 : 0x4a060b, 3, solid ? 16 : 9);
  // variant 2: drifting dust in the light, red and white
  let dust = null;
  if (!solid) { const n = 700, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos.set([(Math.random() - .5) * 7, Math.random() * 3 - .8, (Math.random() - .5) * 6], i * 3); const w = Math.random() < .35; col.set(w ? [1, 1, 1] : [.9, .04, .08], i * 3); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3));
    dust = new T.Points(g, new T.PointsMaterial({ size: .018, vertexColors: true, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false })); scene.add(dust); }
  const mk = (list, color) => list.map(pr => {
    const E = edges(pr), pos = new Float32Array(E.length * 6); E.forEach((e, i) => pos.set([...e[0], ...e[1]], i * 6));
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    const m = new T.LineBasicMaterial({ color: pr.red ? 0xe50914 : color, transparent: true, opacity: pr.faint ? .3 : .95, fog: true });
    const L = new T.LineSegments(g, m); L.userData = { pr, n: E.length * 2 }; g.setDrawRange(0, 0); return L;
  });
  const deskL = mk(sceneDesc(), 0xf5f5f1); deskL.forEach(l => scene.add(l));
  const bookG = new T.Group(); scene.add(bookG);
  const bookL = mk(bookPrims(), 0xf5f5f1); bookL.forEach(l => bookG.add(l));
  // front cover: pivot on the hinge
  const pivot = new T.Group(); pivot.position.set(HX, BH + .006, 0); bookG.add(pivot);
  const coverPos = [], coverRed = [];
  coverLines(0).forEach(([a, b, red]) => (red ? coverRed : coverPos).push(a[0] - HX, a[1] - BH - .006, a[2], b[0] - HX, b[1] - BH - .006, b[2]));
  const lineObj = (arr, c) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(arr, 3)); return new T.LineSegments(g, new T.LineBasicMaterial({ color: c, transparent: true, opacity: 0 })); };
  const coverW = lineObj(coverPos, 0xf5f5f1), coverR = lineObj(coverRed, 0xe50914); pivot.add(coverW, coverR);
  // writing: canvas texture on the right page (and the AIRWALK inside cover on the left)
  const tc = document.createElement('canvas'); tc.width = 860; tc.height = 1180; const tctx = tc.getContext('2d');
  const tex = new T.CanvasTexture(tc); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
  const page = new T.Mesh(new T.PlaneGeometry(.86, 1.18), new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0 }));
  page.rotation.x = -Math.PI / 2; page.position.set(.01, BH + .003, 0); bookG.add(page);
  const lc = document.createElement('canvas'); lc.width = 860; lc.height = 1180; const lx = lc.getContext('2d');
  lx.fillStyle = '#0d0d0d'; lx.fillRect(0, 0, 860, 1180); lx.font = '800 96px G, sans-serif'; lx.fillStyle = RED; lx.fillText('AIR', 70, 980); lx.fillStyle = WHITE; lx.fillText('WALK', 70, 1090);
  const ltex = new T.CanvasTexture(lc); ltex.colorSpace = T.SRGBColorSpace;
  const inside = new T.Mesh(new T.PlaneGeometry(.88, 1.2), new T.MeshBasicMaterial({ map: ltex, transparent: true, opacity: 0, side: T.DoubleSide }));
  inside.rotation.set(Math.PI / 2, 0, Math.PI); inside.position.set(BW / 2, solid ? -.0075 : -.004, 0); pivot.add(inside);
  // variant 3: the solid objects that the lines turn into
  const solids = [];
  if (solid) {
    scene.add(new T.HemisphereLight(0xffffff, 0x220405, .55));
    const key = new T.SpotLight(0xffe8d8, 60, 14, .55, .6); key.position.set(-2.2, 4.5, 3); scene.add(key);
    const rim = new T.PointLight(0xe50914, 18, 8); rim.position.set(2.5, 1.5, -1.5); scene.add(rim);
    const mat = (c, rough = .6, metal = 0) => new T.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal, transparent: true, opacity: 0 });
    const addSolid = (pr, m, parent = scene) => {
      let g; if (pr.k === 'box') g = new T.BoxGeometry(...pr.s); else if (pr.k === 'cyl') g = new T.CylinderGeometry(pr.cone || pr.r, pr.r, pr.h, 32); else return;
      const ms = new T.Mesh(g, m); ms.position.set(...pr.c); parent.add(ms); solids.push({ ms, pr, book: parent !== scene });
    };
    sceneDesc().forEach(pr => !pr.faint && pr.c && addSolid(pr, pr.k === 'cyl' ? mat(0x2a2a2c, .35, .6) : mat(pr.c[1] < -.1 ? 0x141414 : 0x1c1714, .55)));
    const lid = new T.Mesh(new T.PlaneGeometry(.9, .62), mat(0x111214, .3, .7)); lid.position.set(1.05, .31, -.635); lid.rotation.x = -.33; scene.add(lid); solids.push({ ms: lid, pr: { t0: .6 } });
    bookPrims().forEach((pr, i) => pr.k === 'box' && addSolid(pr, i === 0 ? mat(0x111111, .4) : mat(0xf1efe9, .9), bookG));
    const tl = new T.TextureLoader(), cmat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .45, transparent: true, opacity: 0 });
    if (frontUrl) tl.load(frontUrl, t => { t.colorSpace = T.SRGBColorSpace; cmat.map = t; cmat.needsUpdate = true; });
    const cov = new T.Mesh(new T.BoxGeometry(BW, .012, 1.26), [mat(0x111111), mat(0x111111), cmat, mat(0x0d0d0d), mat(0x111111), mat(0x111111)]);
    cov.position.set(BW / 2, 0, 0); pivot.add(cov); solids.push({ ms: cov, pr: { t0: .7 }, book: true, cover: 1 });
  }
  let W = 1, H = 1;
  return {
    resize(w, h) { W = w; H = h; r.setSize(w / devicePixelRatio, h / devicePixelRatio, false); cam.aspect = w / h; cam.updateProjectionMatrix(); },
    draw(t, now, write) {
      const c = camAt(t, W / H);
      if (!solid) { const o = (1 - ease(clamp(t / PH.open[0]))) * .5; c.pos = add(c.pos, [Math.sin(o * 2.4) * 2.2 * o, 0, -o * .6]); if (dust) { dust.rotation.y = now * .03; dust.material.opacity = .55 * (1 - ph(t, 'fly')); } }
      cam.position.set(...c.pos); cam.lookAt(...c.look); cam.fov = c.fov; cam.updateProjectionMatrix();
      const dk = ph(t, 'desk') * 1.3, bk = ph(t, 'book') * 1.2, fly = ph(t, 'fly');
      const reveal = (L, k, fade) => L.forEach(l => { const kk = clamp((k - l.userData.pr.t0) / .3); l.geometry.setDrawRange(0, Math.floor(kk * l.userData.n / 2) * 2); l.material.opacity = (l.userData.pr.faint ? .3 : .95) * fade * (solid ? 1 - clamp((k - l.userData.pr.t0 - .45) * 2) * .7 : 1); });
      reveal(deskL, dk, 1 - fly); reveal(bookL, bk, 1);
      const co = clamp((ph(t, 'book') - .55) * 3); coverW.material.opacity = co * (solid ? .25 : 1); coverR.material.opacity = co * (solid ? .25 : 1);
      const ang = ease(ph(t, 'open')) * Math.PI; pivot.rotation.z = ang;
      const pv = clamp((ang / Math.PI - .55) * 4); page.material.opacity = pv; inside.material.opacity = pv * (solid ? .95 : .9);
      if (pv > 0) { tctx.clearRect(0, 0, 860, 1180); tctx.fillStyle = 'rgba(245,245,241,.97)'; tctx.fillRect(0, 0, 860, 1180); write(tctx); tex.needsUpdate = true; }
      solids.forEach(s => { const k = s.book ? bk : dk; s.ms.material && [].concat(s.ms.material).forEach(m => m.opacity = clamp((k - (s.pr.t0 || 0) - .35) * 2.2) * (s.book ? 1 : 1 - fly)); });
      // fly: the whole book group lifts and rushes past the camera
      const xf = bookXf(t, c); bookG.position.set(...xf.off); bookG.rotation.x = xf.rot;
      const bf = 1 - clamp((fly - .35) / .45); bookG.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { if (m.userData.o0 === undefined || m.opacity > 0) m.opacity *= bf; }); });
      r.render(scene, cam);
    },
    dispose() { r.dispose(); r.forceContextLoss && r.forceContextLoss(); }
  };
}

// ---------------- variant 4: the phone ----------------
// An iPhone rises into frame. Its screen scrolls through our own site (a real capture, program/<lang>/scroll.jpg)
// and the loading runs on top of it: pixel % counter, the head line and the five steps written letter by letter,
// each with its own bar, plus the total bar. At 100 % the dark layer dissolves into red pixels from the centre
// while the screen scrolls back to the hero; then the phone flies at the camera and through it, onto the real hero.
function V4(cv, { steps, head, scrollUrl, lang }) {
  // big type sliding behind the phone: three rows, alternate directions (outline / solid / red outline)
  const RO4 = lang === 'ro';
  const ROWS4 = RO4 ? [['TU VORBEȘTI', 'NOI CONSTRUIM PRODUSUL'], ['DE LA CE ȘTII', 'LA UN GHID CARE SE VINDE'], ['CREATORI', 'GHIDURI', 'LANSĂRI']]
                    : [['YOU TALK', 'WE BUILD THE PRODUCT'], ['FROM WHAT YOU KNOW', 'TO A GUIDE THAT SELLS'], ['CREATORS', 'GUIDES', 'LAUNCHES']];
  const rowW = [];
  function buildRow(words, ri, fs, gap) {
    const c = document.createElement('canvas'), x = c.getContext('2d'), font = `ultra-expanded 800 ${fs}px G, sans-serif`;
    x.font = font; let w = 0; const parts = words.map(t => { const m = x.measureText(t).width, o = { t, x: w, m }; w += m + gap * 2; return o; });
    const lw = Math.max(1.5, fs * .018), h = Math.ceil(fs * 1.5);
    c.width = Math.ceil(w); c.height = h; x.font = font; x.textBaseline = 'middle'; x.lineJoin = 'round';
    const col = ri === 0 ? WHITE : RED;
    for (const pt of parts) {
      if (ri === 1) { x.fillStyle = WHITE; x.fillText(pt.t, pt.x, h / 2); }
      else {
        x.globalCompositeOperation = 'source-over'; x.strokeStyle = col; x.fillStyle = col; x.lineWidth = lw * 2;
        x.strokeText(pt.t, pt.x, h / 2); x.fillText(pt.t, pt.x, h / 2);
        x.globalCompositeOperation = 'destination-out'; x.fillText(pt.t, pt.x, h / 2); x.globalCompositeOperation = 'source-over';
      }
      const q = fs * .16; x.fillStyle = RED; x.fillRect(pt.x + pt.m + gap - q / 2, h / 2 - q / 2, q, q);
    }
    return { fs, w, c };
  }
  const main = cv.getContext('2d'); let ctx = main, W = 0, H = 0, dpr = 1;
  // the fly-through runs on the compositor: the phone is rendered once into its own canvas and moved with
  // element.animate (transform + opacity), so the hero starting up underneath cannot make it stutter
  let snap = null, snapC = null, flyEl = null, anims = [];
  function makeSnap(now) {
    const portrait = H > W * 1.1, phH = Math.min(H * (portrait ? .74 : .8), W * (portrait ? .64 : .5) / .47), pw = phH * .47;
    const m = 120 * dpr, bw = pw + m * 2, bh = phH + m * 2, k = dpr >= 1.5 ? 1.5 : 2;
    const c = document.createElement('canvas'); c.width = Math.ceil(bw * k); c.height = Math.ceil(bh * k);
    snapC = { c, bw, bh, k }; ctx = c.getContext('2d'); ctx.setTransform(k, 0, 0, k, 0, 0);
    draw(P4.fly[0], now, 'snap'); ctx = main; snap = c;
  }
  function startFly(now) {
    if (!snap) makeSnap(now);
    draw(P4.fly[0], now, 'bg');                         // the main canvas keeps the glow and type, without the phone
    const { c, bw, bh } = snapC, cw = bw / dpr, chh = bh / dpr;
    Object.assign(c.style, { position: 'absolute', left: (W / dpr - cw) / 2 + 'px', top: (H / dpr - chh) / 2 + 'px', width: cw + 'px', height: chh + 'px', willChange: 'transform, opacity', pointerEvents: 'none' });
    cv.after(c); flyEl = c;
    const dur = Math.max(300, (P4.fly[1] - P4.fly[0]) * DUR * 1000), kf = [];
    for (let i = 0; i <= 24; i++) {
      const f = i / 24, sc = 1 + Math.pow(f, 2.4) * 18, rot = -.08 * Math.sin(f * Math.PI * .9);
      kf.push({ offset: f, transform: `translate3d(0,0,0) rotate(${rot}rad) scale(${sc})`, opacity: 1 - ein(clamp((f - .6) / .4)) });
    }
    const fa = c.animate(kf, { duration: dur, easing: 'linear', fill: 'forwards' }); anims.push(fa);
    api.flyDone = fa.finished.catch(() => {});
    // no streaks in this variant (Alexandru, 19 Nov 2026): only the phone and the fading type
    anims.push(cv.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.35)' }], { duration: dur * .75, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }));
  }
  const COLS = 40, RN = new Float32Array(COLS * 120), RN2 = new Float32Array(COLS * 120);
  for (let i = 0; i < RN.length; i++) { RN[i] = Math.random(); RN2[i] = Math.random(); }
  const shot = new Image(); let shotOk = false, shotIn = 0;
  if (scrollUrl) { shot.onload = () => { shotOk = true; }; shot.decoding = 'async'; shot.src = scrollUrl; }
  const pix = document.createElement('canvas'), px = pix.getContext('2d');
  const lines = steps.map((s, i) => String(i + 1).padStart(2, '0') + s);
  const headU = head.toUpperCase(), total = headU.length + lines.reduce((a, l) => a + l.length - 2, 0);
  const clock = () => { const d = new Date(); return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const ph = (t, k) => clamp((t - P4[k][0]) / (P4[k][1] - P4[k][0]));
  const rr = (x, y, w, h, q) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, q) : ctx.rect(x, y, w, h); };
  function pixelText(txt, h) {
    px.font = `800 ${h}px G, sans-serif`; const w = Math.ceil(px.measureText(txt).width) + 2;
    if (pix.width !== w || pix.height !== Math.ceil(h * 1.1)) { pix.width = w; pix.height = Math.ceil(h * 1.1); }
    px.clearRect(0, 0, pix.width, pix.height); px.font = `800 ${h}px G, sans-serif`; px.fillStyle = '#fff'; px.textBaseline = 'top'; px.fillText(txt, 1, 1); return w;
  }
  const api = {
    flyDone: null,
    resize(w, h) { if (flyEl) return; W = cv.width = w; H = cv.height = h; dpr = devicePixelRatio || 1; },
    draw(t, now) { if (t >= P4.fly[0]) { if (!flyEl) startFly(now); return; } if (t >= P4.done[0] + .08 && !snap) makeSnap(now); draw(t, now); },
    dispose() { anims.forEach(a => a.cancel()); }
  };
  return api;
  function draw(t, now, mode) {
      const intro = eout(clamp(t / .1)), wp = ph(t, 'write'), done = ph(t, 'done'), f = ph(t, 'fly');
      const portrait = H > W * 1.1;
      const phH = Math.min(H * (portrait ? .74 : .8), W * (portrait ? .64 : .5) / .47), pw = phH * .47;
      const s = 1 + Math.pow(f, 2.4) * 18, rot = -.08 * Math.sin(f * Math.PI * .9);
      if (mode !== 'snap') {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); ctx.globalAlpha = 1;
      if (mode === 'bg') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
      // red glow behind the phone (deep red into black)
      const gl = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * .6), ga = intro * (1 - f);
      gl.addColorStop(0, `rgba(229,9,20,${.3 * ga})`); gl.addColorStop(.5, `rgba(110,10,16,${.22 * ga})`); gl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
      // sliding type: each row is rendered once into its own strip (outlines as whole letters: stroke + fill,
      // then the fill is cut out, so overlapping parts inside a glyph never show), then just moved every frame
      {
        const fs = Math.round(portrait ? H * .105 : H * .2), gap = fs * .5;
        const ta2 = intro * (1 - ein(clamp(f / .7))), grow = 1 + f * .35;
        ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(grow, grow); ctx.translate(-W / 2, -H / 2);
        ROWS4.forEach((words, ri) => {
          if (!rowW[ri] || rowW[ri].fs !== fs) rowW[ri] = buildRow(words, ri, fs, gap);
          const R0 = rowW[ri], dir = ri % 2 ? 1 : -1, sp = W * (.06 + ri * .015);
          let off = ((now * sp + t * W * .5) * dir) % R0.w; if (off > 0) off -= R0.w;
          const y = H / 2 + (ri - 1) * fs * 1.02 - R0.c.height / 2;
          ctx.globalAlpha = ta2 * (ri === 1 ? .95 : .55);
          for (let x = off; x < W; x += R0.w) ctx.drawImage(R0.c, Math.round(x), Math.round(y));
        });
        ctx.restore(); ctx.globalAlpha = 1;
      }
      }
      if (mode === 'bg') return;
      if (mode === 'snap') ctx.translate(snapC.bw / 2, snapC.bh / 2);
      else { ctx.globalAlpha = 1 - ein(clamp((f - .6) / .4)); ctx.translate(W / 2, H / 2 + (1 - intro) * H * .6); ctx.rotate(rot + (1 - intro) * .12); ctx.scale(s, s); }
      // body
      const r = pw * .16, x0 = -pw / 2, y0 = -phH / 2;
      ctx.shadowColor = 'rgba(0,0,0,.75)'; ctx.shadowBlur = 70 * dpr; ctx.shadowOffsetY = 34 * dpr;
      rr(x0, y0, pw, phH, r); ctx.fillStyle = '#0a0a0a'; ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.lineWidth = Math.max(1, pw * .009); ctx.strokeStyle = '#3d3d3d'; ctx.stroke();
      ctx.fillStyle = '#2a2a2a'; [[.2, .028], [.3, .055], [.39, .055]].forEach(([y, h]) => ctx.fillRect(x0 - pw * .012, y0 + phH * y, pw * .012, phH * h));
      ctx.fillRect(-x0, y0 + phH * .3, pw * .012, phH * .085);
      // screen
      const b = pw * .036, sx = x0 + b, sy = y0 + b, sw = pw - b * 2, sh = phH - b * 2, cs = sw / COLS, rows = Math.ceil(sh / cs);
      ctx.save(); rr(sx, sy, sw, sh, r * .82); ctx.clip();
      ctx.fillStyle = '#000'; ctx.fillRect(sx, sy, sw, sh);
      // the site, scrolling: down while it loads, back to the hero when done
      if (shotOk) {
        shotIn = Math.min(1, shotIn + .06);
        const k = sw / shot.naturalWidth, range = Math.max(0, shot.naturalHeight * k - sh);
        const yy = range * ease(wp) * .92 * (1 - eout(done));
        ctx.globalAlpha *= shotIn; ctx.drawImage(shot, sx, sy - yy, sw, shot.naturalHeight * k); ctx.globalAlpha /= shotIn || 1;
      }
      // the dark layer the loading is written on, made of pixels so it can dissolve
      const cx = COLS / 2, cy = rows * .48, md = Math.hypot(cx, cy);
      for (let j = 0; j < rows; j++) for (let i = 0; i < COLS; i++) {
        const k = (j % 120) * COLS + i;
        let sz = 1, red = false;
        if (done > 0) {
          const e = eout(done) * 1.3 - Math.hypot(i + .5 - cx, j + .5 - cy) / md + (RN2[k] - .5) * .2;
          if (e > .14) continue; if (e > 0) { sz = 1 - e / .14; red = RN[k] > .35; }
        }
        ctx.fillStyle = red ? (RN[k] > .8 ? '#ff2a33' : '#E50914') : `rgba(0,0,0,${.5 + .28 * Math.sin(Math.PI * clamp(j / rows * 1.1 - .02)) + RN[k] * .03})`;
        const q = cs * sz + (sz === 1 ? 1.5 : 0), o = (cs - cs * sz) / 2; ctx.fillRect(sx + i * cs + o, sy + j * cs + o, q, q);
      }
      // the loading, written on top
      const ta = 1 - clamp(done / .3);
      if (ta > 0) {
        ctx.save(); ctx.globalAlpha *= ta;
        const pct = Math.min(isFinite(wp) ? clamp(wp * 1.02) : 0, 1), L = sx + sw * .1, Rr = sx + sw * .9, tw = Rr - L;
        // label + pixel %
        ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
        ctx.font = `800 ${sh * .02}px G, sans-serif`; ctx.fillStyle = WHITE; ctx.fillText('AIR', L, sy + sh * .12); const aw = ctx.measureText('AIR').width; ctx.fillStyle = RED; ctx.fillText('WALK', L + aw, sy + sh * .12);
        const lab = Math.round(pct * 100) + '%', pw2 = pixelText(lab, 12), sc = cs * .82;
        ctx.imageSmoothingEnabled = false; ctx.drawImage(pix, L - sc, sy + sh * .14, pix.width * sc, pix.height * sc); ctx.imageSmoothingEnabled = true;
        // what is written so far
        let left = Math.floor(eout(wp * 1.05) * total), y = sy + sh * .36;
        const hShow = headU.slice(0, Math.max(0, left)); left -= headU.length;
        ctx.font = `800 ${sh * .028}px G, sans-serif`; ctx.fillStyle = WHITE; ctx.fillText(hShow, L, y);
        if (left < 0 && Math.floor(now * 2.5) % 2 === 0) { ctx.fillStyle = RED; ctx.fillRect(L + ctx.measureText(hShow).width + 3, y - sh * .026, 3, sh * .028); }
        ctx.fillStyle = 'rgba(245,245,241,.18)'; ctx.fillRect(L, y + sh * .02, tw, 1);
        y += sh * .075;
        let nDone = 0;
        for (const l of lines) {
          if (left <= 0) break;
          const body = l.slice(2), show = body.slice(0, left), full = show.length === body.length; left -= body.length;
          ctx.font = `800 ${sh * .019}px G, sans-serif`; ctx.fillStyle = RED; ctx.fillText(l.slice(0, 2), L, y);
          ctx.font = `600 ${sh * .021}px A, sans-serif`; ctx.fillStyle = WHITE; ctx.fillText(show, L + sw * .1, y);
          if (!full && Math.floor(now * 2.5) % 2 === 0) { ctx.fillStyle = RED; ctx.fillRect(L + sw * .1 + ctx.measureText(show).width + 3, y - sh * .02, 3, sh * .022); }
          if (full) { nDone++; ctx.font = `800 ${sh * .02}px G, sans-serif`; ctx.fillStyle = RED; ctx.textAlign = 'right'; ctx.fillText('✓', Rr, y); ctx.textAlign = 'left'; }
          // this chapter's own bar
          ctx.fillStyle = 'rgba(245,245,241,.14)'; ctx.fillRect(L + sw * .1, y + sh * .014, tw - sw * .1, Math.max(1, sh * .003));
          ctx.fillStyle = RED; ctx.fillRect(L + sw * .1, y + sh * .014, (tw - sw * .1) * (show.length / body.length), Math.max(1, sh * .003));
          y += sh * .068;
        }
        // total bar in pixel blocks
        const by = sy + sh * .86, n = 24, gap = tw / n;
        for (let i = 0; i < n; i++) { ctx.fillStyle = i < Math.round(pct * n) ? RED : 'rgba(245,245,241,.14)'; ctx.fillRect(L + i * gap, by, gap * .78, sh * .012); }
        ctx.font = `600 ${sh * .013}px G, sans-serif`; ctx.fillStyle = 'rgba(245,245,241,.6)'; ctx.fillText(lab, L, by - sh * .012);
        ctx.textAlign = 'right'; ctx.fillText(nDone + ' / ' + steps.length, Rr, by - sh * .012); ctx.textAlign = 'left';
        ctx.restore();
      }
      // status bar, island, home indicator
      ctx.fillStyle = WHITE; ctx.font = `600 ${sh * .02}px A, sans-serif`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText(clock(), sx + sw * .1, sy + sh * .035);
      ctx.fillRect(sx + sw * .82, sy + sh * .029, sw * .075, sh * .012); ctx.fillRect(sx + sw * .9, sy + sh * .032, sw * .008, sh * .006);
      for (let i = 0; i < 3; i++) ctx.fillRect(sx + sw * (.71 + i * .026), sy + sh * (.041 - .004 * (i + 1)), sw * .016, sh * .004 * (i + 1));
      ctx.fillStyle = '#000'; rr(sx + sw * .34, sy + sh * .018, sw * .32, sh * .034, sh * .017); ctx.fill();
      ctx.fillStyle = 'rgba(245,245,241,.85)'; rr(sx + sw * .34, sy + sh * .982, sw * .32, sh * .006, sh * .003); ctx.fill();
      // glass reflection
      const gr = ctx.createLinearGradient(sx, sy, sx + sw, sy + sh); gr.addColorStop(0, 'rgba(255,255,255,.07)'); gr.addColorStop(.35, 'rgba(255,255,255,0)'); ctx.fillStyle = gr; ctx.fillRect(sx, sy, sw, sh);
      ctx.restore();
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  }
}
// phone timeline: the writing holds near its end until the site is ready; done = pixel dissolve + scroll back to the hero
const P4 = { write: [.08, .7], done: [.7, .82], fly: [.82, 1] };

// ---------------- runner ----------------
function run({ pre, steps, head, ready, frontUrl, onExit }) {
  picker();
  pre.innerHTML = `<canvas class='ldc'></canvas><canvas class='lds'></canvas><button class='ldskip' aria-label='Skip'>${document.documentElement.lang === 'ro' ? 'Sari peste' : 'Skip'}</button>`;
  pre.classList.add('ld3d');
  const cv = $q('.ldc', pre), sc = $q('.lds', pre);
  let V = VARIANT === 4 ? V4(cv, { steps, head, scrollUrl: frontUrl && frontUrl.replace(/cover\.jpg$/, 'scroll.jpg'), lang: document.documentElement.lang }) : VARIANT === 1 ? null : V23(cv, VARIANT === 3, frontUrl), is2d = VARIANT === 1 || VARIANT === 4; if (!V) V = V1(cv);
  const st = streaks(sc), write0 = pageWriter(steps, head);
  const size = () => { const w = innerWidth * devicePixelRatio, h = innerHeight * devicePixelRatio; [cv, sc].forEach(c => { if (c !== cv || is2d) { c.width = w; c.height = h; } }); V.resize(w, h); };
  size(); addEventListener('resize', size);
  let isReady = false, readyAt = 0, t0 = performance.now(), skipAt = null, exited = false, hold = 0, last = t0;
  ready.then(() => { isReady = true; readyAt = performance.now(); });
  setTimeout(() => { isReady = true; }, DUR * 1000 + 4000);   // never wait more than 4 s past the animation
  const skip = () => { if (skipAt === null) skipAt = PH.fly[0]; };
  $q('.ldskip', pre).addEventListener('click', skip);
  ['wheel', 'touchstart', 'keydown'].forEach(e => addEventListener(e, skip, { once: true, passive: true }));
  function frame() {
    const now = performance.now();
    const dt = (now - last) / 1000; last = now;
    let t = (now - t0) / 1000 / DUR - hold;
    // the writing waits for the real load: hold at 92 % of the write phase until the site is ready
    const wEnd = VARIANT === 4 ? P4.write[0] + (P4.write[1] - P4.write[0]) * .92 : PH.write[0] + (PH.write[1] - PH.write[0]) * .92;
    if (!isReady && t > wEnd) { hold += t - wEnd; t = wEnd; }
    if (skipAt !== null && t < skipAt) { hold -= skipAt - t; t = skipAt; }
    if (Q.has('ldt')) t = +Q.get('ldt');   // review hook: freeze the timeline
    const wp = ph(t, 'write'), pct = clamp(wp * 1.02);
    V.draw(t, now / 1000, ctx => write0(ctx, eout(wp * 1.08), pct, now / 1000));
    const f = ph(t, 'fly');
    if (VARIANT === 4) { if (f > 0 && !pre.dataset.fly) { pre.dataset.fly = 1; pre.style.background = 'transparent'; } }   // V4: the fly runs on the compositor
    else { st(f, sc.width, sc.height); pre.style.background = `rgba(0,0,0,${1 - ease(clamp((f - .25) / .6))})`; }
    if (f > 0 && !exited) { exited = true; onExit && onExit(); }
    const end = () => { V.dispose(); pre.style.display = 'none'; pre.innerHTML = ''; removeEventListener('resize', size); };
    if (t < 1) requestAnimationFrame(frame);
    else if (V.flyDone) V.flyDone.then(() => requestAnimationFrame(end));   // V4: remove only after the phone has really left
    else end();
  }
  // fonts first, so the page text never flashes in a fallback face
  Promise.race([document.fonts ? Promise.all([document.fonts.load('800 40px G'), document.fonts.load('600 40px A')]) : 0, new Promise(r => setTimeout(r, 1200))])
    .then(() => { t0 = last = performance.now(); requestAnimationFrame(frame); });
}
const $q = (s, r) => r.querySelector(s);
window.AWLoader = { run, VARIANT, DUR };
})();
