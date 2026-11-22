/* Programs · 2: a deck of exercise cards with Oana's gym photos. Drag the top card aside (or use arrows / keys). */
(() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const { programs: P, names: N } = window.PROG, PH = window.PHOTOS;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const deck = $('.deck'), tplF = $('#mini').content.querySelector('.mf'), tplB = $('#mini').content.querySelector('.mb');
let pi = 0, di = 0, order = [], busy = false;
const FRONT = new Set([1, 2, 3, 5, 9, 11]);

function mini(groups) {
  const front = groups.filter(g => FRONT.has(g)).length >= groups.filter(g => !FRONT.has(g)).length;
  const s = (front ? tplF : tplB).cloneNode(true); s.classList.add('mini');
  $$('polygon[data-g]', s).forEach(p => { if (groups.includes(+p.dataset.g)) p.classList.add('on'); });
  return s.outerHTML;
}
function cards() {
  const p = P[pi], d = p.days[di], label = d.name;
  const out = d.ex.map((e, k) => `<article class="card"><img class="ph" src="${PH[(pi * 4 + di * 2 + k) % PH.length]}" alt="" draggable="false">
    <div class="ct"><span>${label}</span><b>0${k + 1}</b></div>
    <div class="cb"><div><h3>${e.n}</h3><span class="sr">${e.s} × ${e.r}</span><div class="mg">${e.g.map(g => `<i>${N[g]}</i>`).join('')}</div></div>${mini(e.g)}</div></article>`);
  out.push(`<article class="card lock"><i class="sl"></i><svg class="tri2" viewBox="0 0 20 18" aria-hidden="true"><path d="M10 1.5L18.5 16.5H1.5Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
    <span class="big">+${d.total - d.ex.length}</span><p>exerciții pentru ${label.replace(/^[^·]*·\s*/, '')}, cu serii și repetări, în ghid.</p><a class="btn" href="../../#cumpara">Vreau ghidul</a></article>`);
  return out;
}
function layout(anim) {
  order.forEach((c, i) => {
    c.style.zIndex = 100 - i; c.classList.toggle('top', i === 0);
    const v = { x: 0, y: i * 14, scale: 1 - i * .05, rotate: i === 0 ? 0 : (i % 2 ? 2.5 : -2.5) * i, opacity: i > 3 ? 0 : 1, rotationX: 0, rotationY: 0 };
    anim && !RM ? gsap.to(c, { ...v, duration: .55, ease: 'power3.out' }) : gsap.set(c, v);
  });
  $('.dkc b').textContent = (cards.idx % order.length) + 1; $('.dkc i').textContent = order.length;
}
cards.idx = 0;
function render() {
  const p = P[pi];
  $('.dkdays').innerHTML = p.days.map((d, k) => `<button type="button" aria-pressed="${k === di}" data-d="${k}">${d.name}</button>`).join('');
  $$('.dkdays button').forEach(b => b.addEventListener('click', () => { di = +b.dataset.d; render(); }));
  deck.innerHTML = cards().join(''); order = $$('.card', deck); cards.idx = 0;
  layout(false);
  if (!RM) gsap.from(order, { y: 80, opacity: 0, rotate: () => gsap.utils.random(-8, 8), stagger: .07, duration: .7, ease: 'power3.out' });
  order.forEach(bind);
}
function next(dir = 1) {
  if (busy) return; busy = true;
  const c = order[0];
  const done = () => { order.push(order.shift()); cards.idx++; layout(true); busy = false; };
  if (RM) return done();
  gsap.to(c, { x: dir * innerWidth * .7, rotate: dir * 24, opacity: 0, duration: .45, ease: 'power2.in', onComplete: () => { gsap.set(c, { x: 0, opacity: 1 }); done(); } });
}
function prev() {
  if (busy) return; busy = true;
  const c = order.pop(); order.unshift(c); cards.idx = (cards.idx - 1 + order.length) % order.length;
  if (!RM) gsap.fromTo(c, { x: -innerWidth * .6, rotate: -24, opacity: 0 }, { x: 0, rotate: 0, opacity: 1, duration: .5, ease: 'power3.out' });
  layout(true); setTimeout(() => busy = false, 450);
}
function bind(c) {
  let sx = 0, dx = 0, drag = false;
  c.addEventListener('pointerdown', e => { if (c !== order[0] || e.target.closest('a')) return; drag = true; sx = e.clientX; dx = 0; c.setPointerCapture(e.pointerId); gsap.killTweensOf(c); });
  c.addEventListener('pointermove', e => {
    if (drag) { dx = e.clientX - sx; gsap.set(c, { x: dx, rotate: dx * .06, rotationY: 0, rotationX: 0 }); return; }
    if (c !== order[0] || RM || e.pointerType !== 'mouse') return;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    gsap.to(c, { rotationY: x * 14, rotationX: -y * 12, duration: .4, ease: 'power2.out' });
  });
  const up = () => { if (!drag) return; drag = false; if (Math.abs(dx) > 110) next(Math.sign(dx)); else gsap.to(c, { x: 0, rotate: 0, duration: .5, ease: 'elastic.out(1,.6)' }); };
  c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  c.addEventListener('pointerleave', () => { if (!drag) gsap.to(c, { rotationY: 0, rotationX: 0, duration: .6 }); });
}
$('.dkx').addEventListener('click', () => next(1));
$('.dkp').addEventListener('click', prev);
deck.tabIndex = 0; deck.setAttribute('aria-label', 'Cărți cu exerciții; săgețile stânga și dreapta schimbă cartea');
deck.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); next(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); } });
$$('.dk2 .pt').forEach(btn => btn.addEventListener('click', () => { pi = +btn.dataset.p; di = 0; $$('.dk2 .pt').forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false')); render(); }));
render();
})();
