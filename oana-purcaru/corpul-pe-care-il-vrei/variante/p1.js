/* Programs · 1: the week builds itself as you scroll. The body sketch draws on, then each day fills its muscles. */
(() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const { programs: P, names: N } = window.PROG;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
gsap.registerPlugin(ScrollTrigger);
let lenis = null;
if (!RM && window.Lenis) { lenis = new Lenis({ lerp: .09 }); lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }

const polys = $$('.sk polygon'), mus = polys.filter(p => p.dataset.g);
polys.forEach(p => p.setAttribute('fill-opacity', 0));
const dayEls = () => $$('.sbdays li');
let pi = 0, tl = null, shown = -2;

const exHTML = (d) => d.ex.map(e => `<article class="sbc"><b>${e.n}</b><span class="sr">${e.s} × ${e.r}</span><div class="mg">${e.g.map(g => `<i>${N[g]}</i>`).join('')}</div></article>`).join('');
function showDay(i, dir) {
  if (i === shown) return; shown = i;
  const p = P[pi], d = p.days[Math.max(0, i)];
  dayEls().forEach((li, k) => { li.classList.toggle('on', k === i); li.classList.toggle('done', k < i); });
  $('.sbn').textContent = i < 0 ? 'Schița' : 'Ziua ' + (i + 1);
  $('.sbname').textContent = i < 0 ? 'derulează ca să construiești săptămâna' : d.name.replace(/^[^·]*·\s*/, '');
  const box = $('.sbex');
  if (i < 0) { box.innerHTML = ''; $('.sbmore').textContent = ''; return; }
  box.innerHTML = exHTML(d);
  $('.sbmore').textContent = `+${d.total - d.ex.length} exerciții, cu serii și repetări, în ghid`;
  if (!RM) gsap.from($$('.sbc', box), { x: dir < 0 ? -40 : 40, opacity: 0, duration: .6, stagger: .08, ease: 'power3.out' });
}

function build() {
  const p = P[pi];
  $('.sb .freq').textContent = p.freq;
  $('.sbdays').innerHTML = p.days.map((d, k) => `<li>${d.name}</li>`).join('');
  if (tl) { tl.scrollTrigger && tl.scrollTrigger.kill(); tl.kill(); }
  gsap.set(polys, { attr: { 'fill-opacity': 0 } });
  shown = -2;
  if (RM) { gsap.set(polys, { strokeDashoffset: 0 }); const set = new Set(p.days.flatMap(d => d.focus)); mus.forEach(m => { if (set.has(+m.dataset.g)) m.setAttribute('fill-opacity', .9); }); showDay(0, 1); return; }
  const n = p.days.length;
  tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: {
    trigger: '.sb', pin: '.sbpin', start: 'top top', end: () => '+=' + innerHeight * (n + 1.2), scrub: .6, invalidateOnRefresh: true,
    onUpdate: s => { const t = s.progress * (n + 1.2); showDay(t < 1 ? -1 : Math.min(n - 1, Math.floor(t - 1)), s.direction); $('.sbprog i').style.transform = `scaleX(${s.progress})`; } } });
  tl.fromTo(polys, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1, stagger: { each: .9 / polys.length, from: 'start' } }, 0);
  p.days.forEach((d, i) => {
    const on = mus.filter(m => d.focus.includes(+m.dataset.g)), off = mus.filter(m => !d.focus.includes(+m.dataset.g));
    tl.to(off, { attr: { 'fill-opacity': i ? .12 : 0 }, duration: .25 }, 1 + i)
      .to(on, { attr: { 'fill-opacity': 1 }, duration: .5, stagger: { each: .25 / Math.max(1, on.length), from: 'center' } }, 1 + i);
  });
  tl.to({}, { duration: .2 });
}

$$('.sb .pt').forEach(btn => btn.addEventListener('click', () => {
  pi = +btn.dataset.p; $$('.sb .pt').forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
  build(); ScrollTrigger.refresh();
  const y = $('.sb').getBoundingClientRect().top + scrollY;
  lenis ? lenis.scrollTo(y + 2, { duration: .8 }) : scrollTo({ top: y + 2, behavior: 'smooth' });
}));
build();
addEventListener('load', () => ScrollTrigger.refresh());
})();
