/* Programs · 3: holographic scanner. Pick a day: the scan line sweeps, the body turns to the worked side, muscles light up with callouts. */
(() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const { programs: P, names: N, cen: C } = window.PROG;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const flip = $('.scflip'), scan = $('.scan'), call = $('.sccall'), view = $('.scv');
let pi = 0, di = 0, back = false, groups = [];
// centroids are in the 232x214 two-figure viewBox; faces use a 104x212 viewBox starting at -2,-2
const pos = (side, g) => { const c = C[side][g]; if (!c) return null; const x = side === 'ant' ? c[0] : c[0] - 120, y = c[1] - 6; return [(x + 2) / 104, (y + 2) / 212]; };

function light() {
  $$('.scface polygon[data-g]').forEach(p => p.classList.toggle('on', groups.includes(+p.dataset.g)));
}
function callouts() {
  call.innerHTML = '';
  const side = back ? 'pos' : 'ant', fr = $('.scflip').getBoundingClientRect(), vr = view.getBoundingClientRect();
  const seen = groups.map(g => [g, pos(side, g)]).filter(([, p]) => p);
  seen.forEach(([g, [px, py]], k) => {
    let x = fr.left - vr.left + px * fr.width; if (back) x = fr.left - vr.left + (1 - px) * fr.width; // mirrored when turned
    const y = fr.top - vr.top + py * fr.height, left = x < vr.width / 2;
    const el = document.createElement('div'); el.className = 'co' + (left ? ' l' : '');
    const w = Math.max(24, left ? x - 110 : vr.width - x - 110);
    el.style.cssText = `top:${y}px;${left ? `right:${vr.width - x - 5}px` : `left:${x - 5}px`};--w:${Math.min(w, 140)}px`;
    el.innerHTML = `<i></i><s></s><span>${N[g]}</span>`; call.appendChild(el);
    if (!RM) gsap.from(el, { opacity: 0, x: left ? 20 : -20, duration: .5, delay: .9 + k * .08, ease: 'power3.out' });
  });
}
function run() {
  const p = P[pi], d = p.days[di]; groups = d.focus;
  const front = groups.filter(g => C.ant[g]).length, rear = groups.filter(g => C.pos[g]).length;
  back = rear > front; flip.classList.toggle('back', back);
  $$('.scdays button').forEach((b, k) => b.setAttribute('aria-pressed', k === di ? 'true' : 'false'));
  $('.scinfo').innerHTML = `<b>${d.name}</b><ul>${d.ex.map(e => `<li><span>${e.n}</span><b>${e.s} × ${e.r}</b></li>`).join('')}</ul><p class="more">+${d.total - d.ex.length} exerciții, cu serii și repetări, în ghid · lucrezi: ${groups.map(g => N[g].toLowerCase()).join(', ')}</p>`;
  $$('.scface polygon').forEach(q => q.classList.remove('on'));
  call.innerHTML = '';
  if (RM) { light(); callouts(); $('.scpct').textContent = '100%'; return; }
  const h = view.clientHeight;
  gsap.killTweensOf(scan);
  gsap.fromTo(scan, { y: 0 }, { y: h + 90, duration: 1.1, ease: 'power2.inOut', onComplete: () => gsap.fromTo(scan, { y: 0 }, { y: h + 90, duration: 3.4, ease: 'none', repeat: -1, repeatDelay: 1.2 }) });
  const o = { v: 0 }; gsap.to(o, { v: 100, duration: 1.1, ease: 'power2.inOut', onUpdate: () => $('.scpct').textContent = Math.round(o.v) + '%' });
  setTimeout(light, 650); setTimeout(callouts, 1150);
}
function days() {
  const p = P[pi]; $('.sc .freq').textContent = p.freq;
  $('.scdays').innerHTML = p.days.map((d, k) => `<button type="button" data-d="${k}">${d.name.replace(/\s·\s/, '<span>') + '</span>'}</button>`).join('');
  $$('.scdays button').forEach(b => b.addEventListener('click', () => { di = +b.dataset.d; run(); }));
}
$$('.sc .pt').forEach(btn => btn.addEventListener('click', () => { pi = +btn.dataset.p; di = 0; $$('.sc .pt').forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false')); days(); run(); }));
$('.scturn').addEventListener('click', () => { back = !back; flip.classList.toggle('back', back); call.innerHTML = ''; setTimeout(callouts, RM ? 0 : 1100); });
addEventListener('resize', () => { clearTimeout(window.__rt); window.__rt = setTimeout(callouts, 200); });
days();
new IntersectionObserver(([e], o) => { if (e.isIntersecting) { run(); o.disconnect(); } }, { threshold: .35 }).observe(view);
})();
