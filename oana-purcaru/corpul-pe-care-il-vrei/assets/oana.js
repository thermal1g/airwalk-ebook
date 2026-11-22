/* Oana's personal page: motion (GSAP + ScrollTrigger + Lenis), same language as the funnel. */
(() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const H = document.documentElement;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH = matchMedia('(hover:none),(pointer:coarse)').matches;
if (TOUCH) H.classList.add('touch');
const PIN = () => !RM && !TOUCH && innerWidth >= 1024;
if (!PIN()) H.classList.add('nopin');

// no-GSAP-safe parts
$$('[data-fill]').forEach(el => { el.innerHTML = [...el.childNodes].map(n => n.nodeType === 3 ? n.textContent.split(/(\s+)/).map(w => w.trim() ? `<span class="w">${w}</span>` : w).join('') : `<span class="w">${n.outerHTML}</span>`).join('').trim(); });
$$('.osk').forEach(c => c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px'); }));
// results row: drag with the mouse (with momentum), native swipe on touch. It is never moved by the page scroll:
// the old scroll-linked scrollLeft fought the user (jumps while scrolling, snapping back after a drag; fixed 22 Nov 2026)
{ const row = $('.orzrow'); if (row) { let d = null, v = 0, raf = 0, lastX = 0, lastT = 0;
  const glide = () => { v *= .94; row.scrollLeft -= v; raf = Math.abs(v) > .3 ? requestAnimationFrame(glide) : 0; };
  row.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; cancelAnimationFrame(raf); v = 0;
    d = { x: e.clientX, l: row.scrollLeft, moved: false }; lastX = e.clientX; lastT = performance.now(); });
  row.addEventListener('pointermove', e => { if (!d) return; const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 4) { d.moved = true; row.classList.add('drag'); row.setPointerCapture(e.pointerId); }
    if (!d.moved) return; e.preventDefault(); row.scrollLeft = d.l - dx;
    const now = performance.now(), dt = Math.max(1, now - lastT); v = (e.clientX - lastX) * (16 / dt) * .9; lastX = e.clientX; lastT = now; });
  const end = e => { if (!d) return; const was = d.moved; d = null; row.classList.remove('drag');
    if (was) { if (performance.now() - lastT > 80) v = 0; raf = requestAnimationFrame(glide); } };
  row.addEventListener('pointerup', end); row.addEventListener('pointercancel', end); row.addEventListener('lostpointercapture', end);
  row.addEventListener('dragstart', e => e.preventDefault());
  row.addEventListener('wheel', () => { cancelAnimationFrame(raf); v = 0; }, { passive: true }); } }
// story track: native progress on touch / narrow
const track = $('.osttrack'), steps = $$('.osc'), prog = p => { const pr = $('.ost .chprog'); if (!pr) return; pr.style.setProperty('--p', p); $('.cur-n', pr).textContent = String(Math.min(steps.length, Math.round(p * (steps.length - 1)) + 1)).padStart(2, '0'); };
if (track && !PIN()) track.addEventListener('scroll', () => prog(track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth)), { passive: true });

if (!window.gsap || !window.ScrollTrigger) { $$('[data-fill] .w').forEach(w => w.style.opacity = 1); return; }
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

let lenis = null;
if (!RM && !TOUCH && window.Lenis) { lenis = new Lenis({ lerp: .09 }); lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(500, 33); H.classList.add('lenis'); }
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => { const t = $(a.getAttribute('href')); if (!t) return; e.preventDefault(); lenis ? lenis.scrollTo(t, { offset: -70, duration: 1.4 }) : t.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); }));

// cursor + magnetic buttons
const cur = $('.cur'), dot = $('.cdot');
if (cur && matchMedia('(hover:hover) and (pointer:fine)').matches && !RM) {
  const xc = gsap.quickTo(cur, 'x', { duration: .45, ease: 'power3' }), yc = gsap.quickTo(cur, 'y', { duration: .45, ease: 'power3' });
  const xd = gsap.quickTo(dot, 'x', { duration: .08 }), yd = gsap.quickTo(dot, 'y', { duration: .08 });
  addEventListener('pointermove', e => { xc(e.clientX); yc(e.clientY); xd(e.clientX); yd(e.clientY); });
  $$('[data-cur]').forEach(el => { el.addEventListener('mouseenter', () => { cur.classList.add('on'); $('span', cur).textContent = el.dataset.cur; }); el.addEventListener('mouseleave', () => cur.classList.remove('on')); });
  $$('.mag').forEach(el => { const xs = gsap.quickTo(el, 'x', { duration: .6, ease: 'elastic.out(1,.4)' }), ys = gsap.quickTo(el, 'y', { duration: .6, ease: 'elastic.out(1,.4)' });
    el.addEventListener('mousemove', e => { const r = el.getBoundingClientRect(); xs((e.clientX - r.left - r.width / 2) * .3); ys((e.clientY - r.top - r.height / 2) * .3); });
    el.addEventListener('mouseleave', () => { xs(0); ys(0); }); });
} else if (cur) { cur.remove(); dot.remove(); }
{ const nv = $('.nav'), solid = () => nv.classList.toggle('solid', scrollY > 60); addEventListener('scroll', solid, { passive: true }); solid(); }
H.classList.add('done');

if (RM) { $$('[data-fill] .w').forEach(w => w.style.opacity = 1); return; }

// hero intro: shards slide in, the script name writes itself in with a skew, the photo frame wipes open
gsap.timeline({ defaults: { ease: 'expo.out' } })
  .from('.ohframe', { clipPath: 'polygon(100% 0,100% 0,100% 100%,100% 100%)', duration: 1.4, ease: 'expo.inOut' }, 0)
  .from('.ohframe img', { scale: 1.25, duration: 1.8 }, 0)
  .from('.hshards g', { x: i => (i % 2 ? 10 : -10), opacity: 0, duration: 1.3, stagger: .08 }, .3)
  .from('.ohn .o1', { clipPath: 'inset(0 100% 0 0)', x: -30, duration: 1.4, ease: 'power3.inOut' }, .35)
  .from('.ohn .o2', { yPercent: 110, opacity: 0, duration: 1 }, .7)
  .from('.oht .tag, .ohl, .ohchips li, .oht .hcta', { y: 26, opacity: 0, duration: .9, stagger: .06 }, .9)
  .from('.ohring', { scale: .4, rotate: -120, opacity: 0, duration: 1.4 }, .8);
gsap.to('.ohring', { rotate: 360, duration: 26, repeat: -1, ease: 'none' });
const hs = { trigger: '.ohero', start: 'top top', end: 'bottom top', scrub: true };
gsap.to('.ohframe img', { yPercent: -10, ease: 'none', scrollTrigger: hs });
gsap.to('.oht', { yPercent: 16, opacity: .25, ease: 'none', scrollTrigger: { ...hs, start: '30% top' } });
gsap.to('.hshards .g-l', { y: -14, ease: 'none', scrollTrigger: hs }); gsap.to('.hshards .g-r', { y: 10, ease: 'none', scrollTrigger: hs });
// hero photo tilts toward the cursor
if (!TOUCH) { const fr = $('.ohv'); const rx = gsap.quickTo(fr, 'rotationX', { duration: .8, ease: 'power3' }), ry = gsap.quickTo(fr, 'rotationY', { duration: .8, ease: 'power3' });
  gsap.set(fr, { transformPerspective: 1400 });
  $('.ohero').addEventListener('pointermove', e => { ry((e.clientX / innerWidth - .5) * 8); rx(-(e.clientY / innerHeight - .5) * 6); }); }

// marquee, speed follows scroll velocity
{ const mt = $('.mt'); mt.innerHTML += mt.innerHTML; const tw = gsap.to(mt, { xPercent: -50, ease: 'none', duration: 38, repeat: -1 });
  ScrollTrigger.create({ onUpdate: s => { const v = Math.min(Math.abs(s.getVelocity()) / 300, 5); gsap.to(tw, { timeScale: s.direction * (1 + v), duration: .25, overwrite: true }); gsap.to(tw, { timeScale: s.direction, duration: 1.2, delay: .25 }); } }); }

// section heads + word fill + counters
$$('.sh').forEach(sh => { const tl = gsap.timeline({ scrollTrigger: { trigger: sh, start: 'top 85%' } });
  const k = $('.k', sh), h = $('h2', sh); if (k) tl.from(k, { x: -30, opacity: 0, duration: .7, ease: 'power3.out' }); if (h) tl.from(h, { y: 46, opacity: 0, duration: 1, ease: 'power4.out' }, '<.08'); });
$$('[data-fill]').forEach(el => gsap.to($$('.w', el), { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 50%', scrub: true } }));
$$('[data-count]').forEach(el => { const to = +el.dataset.count, o = { v: 0 }; gsap.to(o, { v: to, duration: 1.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' }, onUpdate: () => el.textContent = Math.round(o.v) }); });
gsap.from('.onums li', { y: 40, opacity: 0, stagger: .08, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: '.onums', start: 'top 85%' } });
gsap.from('.osk', { y: 60, opacity: 0, rotate: () => gsap.utils.random(-3, 3), stagger: .07, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: '.oskills', start: 'top 85%' } });

// story: pinned horizontal timeline on desktop
const mm = gsap.matchMedia();
mm.add('(min-width:1024px) and (hover:hover) and (pointer:fine)', () => {
  H.classList.remove('nopin');
  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  const tw = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.ostpin', pin: true, start: 'top top', end: () => '+=' + dist(), scrub: 1, invalidateOnRefresh: true, onUpdate: s => prog(s.progress) } });
  steps.forEach(c => { const img = $('.osi img', c);
    if (img) gsap.fromTo(img, { xPercent: -6, scale: 1.08 }, { xPercent: 6, scale: 1, ease: 'none', scrollTrigger: { trigger: c, containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } });
    gsap.from($$('.ost2 > *', c), { y: 30, opacity: 0, stagger: .06, duration: .7, ease: 'power3.out', scrollTrigger: { trigger: c, containerAnimation: tw, start: 'left 85%' } }); });
  return () => { H.classList.add('nopin'); gsap.set(track, { clearProps: 'transform' }); };
});
mm.add('(max-width:1023px), (hover:none), (pointer:coarse)', () => { gsap.from('.osc', { y: 50, opacity: 0, stagger: .08, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: track, start: 'top 85%' } }); });

// bodyfit mosaic: each photo drifts at its own speed
$$('.obfm figure').forEach((f, i) => { const sp = [.5, 1.1, .8, 1.4][i] || 1;
  gsap.fromTo(f, { y: 70 * sp }, { y: -70 * sp, ease: 'none', scrollTrigger: { trigger: '.obf', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo($('img', f), { yPercent: -10 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.obf', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from(f, { clipPath: 'inset(100% 0 0 0)', duration: 1.3, delay: i * .1, ease: 'expo.inOut', scrollTrigger: { trigger: '.obfm', start: 'top 80%' } }); });
gsap.from('.obft > *', { y: 30, opacity: 0, stagger: .08, duration: .8, scrollTrigger: { trigger: '.obft', start: 'top 80%' } });
// results row drifts sideways with the page

gsap.from('.orzrow figure', { y: 60, opacity: 0, stagger: .05, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: '.orzrow', start: 'top 85%' } });
$$('.lens').forEach(l => gsap.from(l, { y: 90, opacity: 0, scale: .94, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: l, start: 'top 85%' } }));
// contact rows slide in, footer name drifts
gsap.from('.olinks li', { x: -60, opacity: 0, stagger: .08, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: '.olinks', start: 'top 85%' } });
gsap.from('.octa', { y: 40, opacity: 0, duration: .9, scrollTrigger: { trigger: '.octa', start: 'top 90%' } });
gsap.fromTo('.fbig span:first-child', { xPercent: -6 }, { xPercent: 2, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
gsap.fromTo('.fbig span:last-child', { xPercent: 6 }, { xPercent: -2, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
// guide shapes: section decor and seams drift and turn
$$('.dz .dk').forEach(el => { const sp = +el.dataset.sp || .5, sec = el.closest('section,footer');
  gsap.fromTo(el, { y: 140 * sp, rotate: el.tagName === 'svg' ? -40 * sp : 0 }, { y: -140 * sp, rotate: el.tagName === 'svg' ? 60 * sp : 0, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } }); });
$$('.seam').forEach((sm, i) => { const st = { trigger: sm, start: 'top bottom', end: 'top top', scrub: true }, d = i % 2 ? 1 : -1;
  gsap.fromTo($$('.st', sm), { y: 60, rotate: -30 * d }, { y: -60, rotate: 50 * d, ease: 'none', stagger: .05, scrollTrigger: st });
  gsap.fromTo($$('.sd', sm), { y: 40 }, { y: -40, ease: 'none', scrollTrigger: st });
  const sg = $('.sg', sm); if (sg) gsap.from(sg, { scaleX: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: sm, start: 'top 85%' } }); });
addEventListener('load', () => ScrollTrigger.refresh());
document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
