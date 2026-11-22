/* Programs section: holographic scanner. Pick a day: the scan line sweeps, the body turns to the worked side, muscles light up with callouts. */
(() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const { programs: P, names: N, cen: C } = window.PROG;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const G = () => window.gsap;
if (!window.PROG || !document.querySelector('.scv')) return;
const flip = $('.scflip'), scan = $('.scan'), call = $('.sccall'), view = $('.scv');
let pi = 0, di = 0, back = false, groups = [];
// centroids are in the 232x214 two-figure viewBox; faces use a 104x212 viewBox starting at -2,-2
const pos = (side, g) => { const c = C[side][g]; if (!c) return null; const x = side === 'ant' ? c[0] : c[0] - 120, y = c[1] - 6; return [(x + 2) / 104, (y + 2) / 212]; };

function light() {
  $$('.scface polygon[data-g]').forEach(p => p.classList.toggle('on', groups.includes(+p.dataset.g)));
}
function callouts() {
  call.innerHTML = '';
  const side = back ? 'pos' : 'ant', fr = flip.getBoundingClientRect(), vr = view.getBoundingClientRect(), W = vr.width, Hh = vr.height;
  const pts = groups.map(g => [g, pos(side, g)]).filter(([, p]) => p).map(([g, [px, py]]) => {
    const x = fr.left - vr.left + (back ? 1 - px : px) * fr.width, y = fr.top - vr.top + py * fr.height;
    return { g, x, y, left: x < W / 2 };
  });
  // labels sit in two columns at the edges; spread them so they never overlap
  const gap = W < 420 ? 24 : 30, pad = 44;
  ['l', 'r'].forEach(sd => {
    const col = pts.filter(p => (sd === 'l') === p.left).sort((a, b) => a.y - b.y);
    col.forEach((p, k) => { p.ly = Math.max(p.y, k ? col[k - 1].ly + gap : pad); });
    for (let k = col.length - 1; k >= 0; k--) { const lim = (k === col.length - 1 ? Hh - pad : col[k + 1].ly - gap); if (col[k].ly > lim) col[k].ly = lim; }
  });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'coln'); svg.setAttribute('viewBox', `0 0 ${W} ${Hh}`);
  const edge = W < 420 ? 10 : 18, lw = W < 420 ? 78 : 110;
  pts.forEach((p, k) => {
    const lx = p.left ? edge + lw : W - edge - lw, mid = p.left ? Math.max(lx + 14, p.x - 26) : Math.min(lx - 14, p.x + 26);
    const pl = document.createElementNS(svg.namespaceURI, 'polyline'); pl.setAttribute('points', `${p.x},${p.y} ${mid},${p.ly} ${lx},${p.ly}`); svg.appendChild(pl);
    const c = document.createElementNS(svg.namespaceURI, 'circle'); c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', 4); svg.appendChild(c);
    const el = document.createElement('span'); el.className = 'col' + (p.left ? ' l' : ''); el.textContent = N[p.g];
    el.style.cssText = `top:${p.ly}px;${p.left ? `left:${edge}px` : `right:${edge}px`};max-width:${lw}px`; call.appendChild(el);
    if (!RM && G()) { gsap.from(el, { opacity: 0, x: p.left ? -14 : 14, duration: .5, delay: .2 + k * .07, ease: 'power3.out' }); gsap.from(pl, { opacity: 0, duration: .5, delay: .1 + k * .07 }); }
  });
  call.prepend(svg);
}
function run() {
  const p = P[pi], d = p.days[di]; groups = d.focus;
  const front = groups.filter(g => C.ant[g]).length, rear = groups.filter(g => C.pos[g]).length;
  back = rear > front; flip.classList.toggle('back', back);
  $$('.scdays button').forEach((b, k) => b.setAttribute('aria-pressed', k === di ? 'true' : 'false'));
  $('.scinfo').innerHTML = `<b>${d.name}</b><ul>${d.ex.map(e => `<li><span>${e.n}</span><b>${e.s} × ${e.r}</b></li>`).join('')}</ul><p class="more">+${d.total - d.ex.length} exerciții, cu serii și repetări, în ghid · lucrezi: ${groups.map(g => N[g].toLowerCase()).join(', ')}</p>`;
  $$('.scface polygon').forEach(q => q.classList.remove('on'));
  call.innerHTML = '';
  if (RM || !G()) { light(); callouts(); $('.scpct').textContent = '100%'; return; }
  const h = view.clientHeight;
  gsap.killTweensOf(scan);
  gsap.fromTo(scan, { y: 0 }, { y: h + 90, duration: 1.1, ease: 'power2.inOut', onComplete: () => gsap.fromTo(scan, { y: 0 }, { y: h + 90, duration: 3.4, ease: 'none', repeat: -1, repeatDelay: 1.2 }) });
  const o = { v: 0 }; gsap.to(o, { v: 100, duration: 1.1, ease: 'power2.inOut', onUpdate: () => $('.scpct').textContent = Math.round(o.v) + '%' });
  setTimeout(light, 650); setTimeout(callouts, 1150);
}
function days() {
  const p = P[pi]; $('.progs .freq').textContent = p.freq;
  $('.scdays').innerHTML = p.days.map((d, k) => `<button type="button" data-d="${k}">${d.name.replace(/\s·\s/, '<span>') + '</span>'}</button>`).join('');
  $$('.scdays button').forEach(b => b.addEventListener('click', () => { di = +b.dataset.d; run(); }));
}
$$('.progs .pt').forEach(btn => btn.addEventListener('click', () => { pi = +btn.dataset.p; di = 0; $$('.progs .pt').forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false')); days(); run(); }));
$('.scturn').addEventListener('click', () => { back = !back; flip.classList.toggle('back', back); call.innerHTML = ''; setTimeout(callouts, RM ? 0 : 1100); });
addEventListener('resize', () => { clearTimeout(window.__rt); window.__rt = setTimeout(callouts, 200); });
days();
new IntersectionObserver(([e], o) => { if (e.isIntersecting) { run(); o.disconnect(); } }, { threshold: .35 }).observe(view);
})();
