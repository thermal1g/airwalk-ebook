/* Corpul pe care îl vrei · motion (GSAP + ScrollTrigger + Lenis), modelled on ebook.airwalk.ro.
   Touch devices: native scrolling, no pins, horizontal sections become swipe carousels.
   Reduced motion: no loader, no smooth scroll, no pins, content shown as is. */
(() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const H = document.documentElement;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH = matchMedia('(hover:none),(pointer:coarse)').matches;
if (TOUCH) H.classList.add('touch');
const wideQ = matchMedia('(min-width:1024px)');
const PIN = () => !RM && !TOUCH && wideQ.matches;
if (!PIN()) H.classList.add('nopin');

const finishLoader = () => H.classList.add('done');
setTimeout(finishLoader, 6500); // fail-safe: the loader never blocks the page

/* ---------- things that work without GSAP ---------- */
// sticky mobile CTA: after the hero, hidden while the buy section or the cookie banner is on screen
const sticky = $('.sticky');
if (sticky && 'IntersectionObserver' in window) {
  let pastHero = false, atBuy = false, atFoot = false;
  const upd = () => { const on = pastHero && !atBuy && !atFoot && !$('#awc'); sticky.classList.toggle('on', on); H.classList.toggle('has-sticky', on); };
  new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting && e.boundingClientRect.top < 0; upd(); }).observe($('.hero'));
  new IntersectionObserver(([e]) => { atBuy = e.isIntersecting; upd(); }, { rootMargin: '0px 0px -10% 0px' }).observe($('#cumpara'));
  new IntersectionObserver(([e]) => { atFoot = e.isIntersecting; upd(); }).observe($('.fcols'));
  new MutationObserver(upd).observe(document.body, { childList: true });
}
// pains: tap / Enter toggles the answer on hover devices too
$$('.pain').forEach(p => {
  p.addEventListener('click', () => p.classList.toggle('open'));
  p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.classList.toggle('open'); } });
});
// program tabs (WAI-ARIA tabs with arrow keys)
const tabs = $$('.ptabs [role=tab]');
const selectTab = (t, focus) => {
  tabs.forEach(b => { const on = b === t; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; $('#' + b.getAttribute('aria-controls')).hidden = !on; });
  if (focus) t.focus(); clearFocus();
  window.ScrollTrigger && ScrollTrigger.refresh();
};
tabs.forEach((t, i) => {
  t.addEventListener('click', () => selectTab(t));
  t.addEventListener('keydown', e => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
    e.preventDefault(); selectTab(tabs[(i + d + tabs.length) % tabs.length], true);
  });
});
// muscle map focus: days and legend items highlight their muscle groups
const mm = $('.mm');
const clearFocus = () => { if (!mm) return; mm.classList.remove('focus'); $$('.hi', mm).forEach(x => x.classList.remove('hi')); $$('.leg li.hi, .day.on').forEach(x => x.classList.remove('hi', 'on')); };
const focusGroups = gs => {
  clearFocus(); if (!gs.length) return;
  mm.classList.add('focus');
  gs.forEach(g => { $$(`[data-g="${g}"]`, mm).forEach(x => x.classList.add('hi')); const li = $(`.leg li[data-g="${g}"]`); li && li.classList.add('hi'); });
};
$$('.day').forEach(d => {
  const gs = d.dataset.focus ? d.dataset.focus.split(',') : [];
  const on = () => { focusGroups(gs); d.classList.add('on'); };
  d.addEventListener('mouseenter', on); d.addEventListener('focus', on);
  d.addEventListener('mouseleave', clearFocus); d.addEventListener('blur', clearFocus);
  d.addEventListener('click', () => d.classList.contains('on') ? clearFocus() : on());
});
$$('.leg li').forEach(li => {
  const on = () => focusGroups([li.dataset.g]);
  li.addEventListener('mouseenter', on); li.addEventListener('focus', on);
  li.addEventListener('mouseleave', clearFocus); li.addEventListener('blur', clearFocus);
  li.addEventListener('click', on);
});
// statement: split into words (plain DOM, no plugin)
$$('[data-fill]').forEach(el => { el.innerHTML = [...el.childNodes].map(n => n.nodeType === 3 ? n.textContent.split(/(\s+)/).map(w => w.trim() ? `<span class="w">${w}</span>` : w).join('') : `<span class="w">${n.outerHTML}</span>`).join('').trim(); });
// native horizontal carousels: progress + coverflow tilt (touch / narrow)
const chTrack = $('.chtrack');
const setChProg = p => { const pr = $('.chprog'); if (!pr) return; pr.style.setProperty('--p', p); const n = Math.min(10, Math.max(1, Math.round(p * 9) + 1)); $('.cur-n', pr).textContent = String(n).padStart(2, '0'); };
const chHint = $('.chhint'), chP = $('.chp'), chX = $('.chx');
const chStep = () => { const c = $('.chc', chTrack); return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(chTrack).columnGap || 22) : 400; };
const chState = p => { if (chP) chP.disabled = p < .01; if (chX) chX.disabled = p > .99; if (p > .03 && chHint) chHint.classList.add('gone'); };
let chPinST = null; // set when the desktop pin is active
const chGo = dir => {
  if (chPinST) { // pinned: horizontal position = vertical scroll inside the pin
    const st = chPinST, cur = scrollY - st.start, step = chStep();
    const to = Math.min(st.end, Math.max(st.start, st.start + Math.round((cur + dir * step) / step) * step));
    window.__lenis ? window.__lenis.scrollTo(to, { duration: 1 }) : scrollTo({ top: to, behavior: 'smooth' });
  } else chTrack.scrollBy({ left: dir * chStep(), behavior: RM ? 'auto' : 'smooth' });
};
if (chP) chP.addEventListener('click', () => chGo(-1));
if (chX) chX.addEventListener('click', () => chGo(1));
const nativeCarousels = () => {
  if (!chTrack || chTrack.dataset.nat) return; chTrack.dataset.nat = 1;
  const upd = () => { const p = chTrack.scrollLeft / Math.max(1, chTrack.scrollWidth - chTrack.clientWidth); setChProg(p); if (!chPinST) chState(p); };
  chTrack.addEventListener('scroll', upd, { passive: true }); upd();
  // mouse users on narrow screens: drag the row like a phone
  let down = null;
  chTrack.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || chPinST || e.target.closest('a,button')) return; down = { x: e.clientX, l: chTrack.scrollLeft, moved: false }; });
  addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - down.x; if (Math.abs(dx) > 4 && !down.moved) { down.moved = true; chTrack.classList.add('drag'); } if (down.moved) chTrack.scrollLeft = down.l - dx; });
  addEventListener('pointerup', () => { if (!down) return; const was = down.moved; down = null; chTrack.classList.remove('drag'); if (was) { const st = chStep(); chTrack.scrollTo({ left: Math.round(chTrack.scrollLeft / st) * st, behavior: 'smooth' }); } });
  // first time the row is seen: a short peek to the right, so it is obvious it moves sideways
  if (!RM && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e]) => { if (!e.isIntersecting || chPinST) return; io.disconnect();
      setTimeout(() => { if (chTrack.scrollLeft > 4) return; chTrack.style.scrollSnapType = 'none';
        chTrack.scrollTo({ left: Math.min(140, chStep() * .38), behavior: 'smooth' });
        setTimeout(() => { chTrack.scrollTo({ left: 0, behavior: 'smooth' }); setTimeout(() => chTrack.style.scrollSnapType = '', 600); }, 700); }, 450); }, { threshold: .55 });
    io.observe(chTrack);
  }
};
// FAQ: orbital carousel (cards on an arc, active one on top, its answer in the middle)
{ const orb = $('.orb');
  if (orb) {
    const cards = $$('.oc', orb), ans = $$('.oa', orb), dots = $$('.od', orb), n = cards.length;
    let cur = 0, timer = 0, user = false, inView = false;
    const place = () => {
      const w = orb.clientWidth, R = Math.max(360, w * .62), cw = cards[0].offsetWidth, step = Math.min(30, ((cw + (w < 600 ? -40 : 26)) / R) * 180 / Math.PI);
      cards.forEach((c, i) => {
        let d = i - cur; d = ((d % n) + n * 1.5) % n - n / 2;
        const a = d * step * Math.PI / 180, x = Math.sin(a) * R, y = (1 - Math.cos(a)) * R;
        const far = Math.abs(d);
        c.style.transform = `translate(-50%,0) translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${(d * step).toFixed(1)}deg) scale(${(1 - Math.min(far, 3) * .07).toFixed(3)})`;
        c.style.opacity = far > 3.2 ? 0 : (1 - far * .2).toFixed(2);
        c.style.zIndex = 10 - Math.round(far);
        c.classList.toggle('on', d === 0); c.tabIndex = far > 3.2 ? -1 : 0;
        c.setAttribute('aria-current', d === 0 ? 'true' : 'false');
      });
      ans.forEach((x, i) => x.hidden = i !== cur);
      dots.forEach((x, i) => x.setAttribute('aria-current', i === cur ? 'true' : 'false'));
      $('.onum b', orb).textContent = String(cur + 1).padStart(2, '0');
    };
    const go = (i, byUser) => { cur = (i + n) % n; if (byUser) { user = true; clearInterval(timer); } place();
      const a = $('.oa:not([hidden])', orb); if (a && !RM) a.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.2,.7,.2,1)' }); };
    cards.forEach((c, i) => c.addEventListener('click', () => go(i, true)));
    dots.forEach((d, i) => d.addEventListener('click', () => go(i, true)));
    $('.op', orb).addEventListener('click', () => go(cur - 1, true));
    $('.onx', orb).addEventListener('click', () => go(cur + 1, true));
    orb.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1, true); $('.oc.on', orb).focus(); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1, true); $('.oc.on', orb).focus(); } });
    const auto = () => { clearInterval(timer); if (RM || user || !inView) return; timer = setInterval(() => go(cur + 1), 6500); };
    orb.addEventListener('pointerenter', () => clearInterval(timer)); orb.addEventListener('pointerleave', auto);
    orb.addEventListener('focusin', () => clearInterval(timer));
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; auto(); }, { threshold: .4 }).observe(orb);
    new ResizeObserver(place).observe(orb); place();
  }
}

// analytics: which CTA leads to the buy section (fires only after cookie consent; awTrack is a no-op before)
$$('a[href="#cumpara"]').forEach((a, i) => a.addEventListener('click', () => window.awTrack && awTrack('cta_click', { placement: a.closest('section,header,.sticky')?.className.split(' ')[0] || 'sticky', index: i })));

/* ---------- without GSAP: stop here, page fully usable ---------- */
if (!window.gsap || !window.ScrollTrigger) { H.classList.add('no-gsap'); finishLoader(); if (!PIN()) nativeCarousels(); return; }
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });
if (!PIN()) nativeCarousels();
// GSAP folds the CSS `translate` of the hero cut-out into pixels; keep the centring in percent instead
{ const hm = gsap.matchMedia();
  hm.add('(max-width:1023px)', () => { gsap.set('.hcut', { x: 0, xPercent: -54.9 }); });
  hm.add('(min-width:1024px)', () => { gsap.set('.hcut', { x: 0, xPercent: -51.3 }); }); }

// ---------- smooth scroll (desktop pointer only) ----------
let lenis = null;
if (!RM && !TOUCH && window.Lenis) {
  lenis = new Lenis({ lerp: .09, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(500, 33);
  H.classList.add('lenis'); window.__lenis = lenis;
}
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const id = a.getAttribute('href'); if (id.length < 2) return;
  const t = $(id); if (!t) return; e.preventDefault();
  lenis ? lenis.scrollTo(t, { offset: id === '#top' ? 0 : -70, duration: 1.4 }) : t.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
  history.replaceState(null, '', id);
}));

// ---------- cursor + magnetic ----------
const cur = $('.cur'), dot = $('.cdot');
if (cur && matchMedia('(hover:hover) and (pointer:fine)').matches && !RM) {
  const xc = gsap.quickTo(cur, 'x', { duration: .45, ease: 'power3' }), yc = gsap.quickTo(cur, 'y', { duration: .45, ease: 'power3' });
  const xd = gsap.quickTo(dot, 'x', { duration: .08 }), yd = gsap.quickTo(dot, 'y', { duration: .08 });
  addEventListener('pointermove', e => { xc(e.clientX); yc(e.clientY); xd(e.clientX); yd(e.clientY); });
  document.addEventListener('mouseleave', () => { cur.classList.add('hide'); dot.classList.add('hide'); });
  document.addEventListener('mouseenter', () => { cur.classList.remove('hide'); dot.classList.remove('hide'); });
  $$('[data-cur]').forEach(el => {
    el.addEventListener('mouseenter', () => { cur.classList.add('on'); $('span', cur).textContent = el.dataset.cur; });
    el.addEventListener('mouseleave', () => cur.classList.remove('on'));
  });
  $$('a,button,summary,[tabindex="0"]').forEach(el => { if (el.dataset.cur) return;
    el.addEventListener('mouseenter', () => gsap.to(cur, { scale: 1.5, duration: .3 })); el.addEventListener('mouseleave', () => gsap.to(cur, { scale: 1, duration: .3 })); });
  $$('.mag').forEach(el => {
    const xs = gsap.quickTo(el, 'x', { duration: .6, ease: 'elastic.out(1,.4)' }), ys = gsap.quickTo(el, 'y', { duration: .6, ease: 'elastic.out(1,.4)' });
    el.addEventListener('mousemove', e => { const r = el.getBoundingClientRect(); xs((e.clientX - r.left - r.width / 2) * .3); ys((e.clientY - r.top - r.height / 2) * .3); });
    el.addEventListener('mouseleave', () => { xs(0); ys(0); });
  });
} else if (cur) { cur.remove(); dot.remove(); }

// ---------- nav ----------
{ const nv = $('.nav'), solid = () => nv.classList.toggle('solid', scrollY > 60); addEventListener('scroll', solid, { passive: true }); solid(); }

/* ---------- reduced motion: no reveals, only the interactions above ---------- */
if (RM) { finishLoader(); return; }

// ---------- loader -> hero intro ----------
const intro = gsap.timeline({ paused: true, defaults: { ease: 'power4.out' } });
intro.from('.ht .ln', { yPercent: 55, opacity: 0, rotate: 2.5, duration: 1.1, stagger: .12 })
  .from('.hero .tag', { y: 20, opacity: 0, duration: .7 }, '<.1')
  .from('.hpanel', { clipPath: 'polygon(100% 0,100% 0,100% 100%,100% 100%)', duration: 1.2, ease: 'expo.inOut' }, 0)
  .from('.hshards .g-l', { x: -9, duration: 1.3, ease: 'expo.out' }, .35)
  .from('.hshards .g-r', { x: 9, duration: 1.3, ease: 'expo.out' }, .45)
  .from('.hshards .g-tr', { x: 12, y: -12, duration: 1.3, ease: 'expo.out' }, .3)
  .from('.hshards .g-bot', { y: 12, duration: 1.2, ease: 'expo.out' }, .5)
  .from('.hpsh polygon', { opacity: 0, x: 20, stagger: .04, duration: .9, ease: 'power3.out' }, .7)
  .from('.hcut', { y: 90, opacity: 0, scale: .96, duration: 1.3 }, .25)
  .from('.book', { x: -80, y: 40, rotate: -14, opacity: 0, duration: 1.2 }, .55)
  .from('.hbadge', { scale: 0, rotate: -120, duration: 1, ease: 'back.out(1.7)' }, .8)
  .from('.hl, .hcta > *, .hstats li', { y: 26, opacity: 0, duration: .8, stagger: .07 }, .5)
  .from('.hsh.s2, .hsh.s3', { xPercent: 30, opacity: 0, duration: 1.4 }, 0)
  .from('.htri, .hero .dg', { scale: 0, opacity: 0, duration: .8, stagger: .08, ease: 'back.out(2)' }, .7)
  .from('.nav', { y: -30, opacity: 0, duration: .8 }, .4);

const lt = gsap.timeline({ onComplete: () => { finishLoader(); } });
const cnt = { v: 0 }, lc = $('.loader .lc'), line = $('.loader .lline i');
// the loader assembles like the guide's cover: shards slide in, the name writes itself, a lime counter runs on a diagonal bar
lt.from('.loader .lp1', { xPercent: -100, duration: .7, ease: 'expo.out' }, 0)
  .from('.loader .lp2', { xPercent: 100, duration: .7, ease: 'expo.out' }, 0)
  .from('.loader .l-tr', { x: 14, y: -14, opacity: 0, duration: .9, ease: 'expo.out' }, .15)
  .from('.loader .l-bl', { x: -14, y: 14, opacity: 0, duration: .9, ease: 'expo.out' }, .2)
  .from('.loader .l-r', { x: 10, opacity: 0, duration: .9, ease: 'expo.out' }, .25)
  .from('.loader .ltri, .loader .ldots', { scale: 0, rotate: -90, opacity: 0, stagger: .06, duration: .7, ease: 'back.out(2)' }, .3)
  .from('.loader .lcov img', { rotationY: 80, x: -40, opacity: 0, duration: 1, ease: 'expo.out' }, .3)
  .from('.loader .lo', { clipPath: 'inset(0 100% 0 0)', duration: .9, ease: 'power2.inOut' }, .4)
  .from('.loader .lpu i', { yPercent: 110, stagger: .04, duration: .7, ease: 'expo.out' }, .6)
  .from('.loader .lsub, .loader .lfoot', { y: 14, opacity: 0, duration: .6 }, .75)
  .to(cnt, { v: 100, duration: 1.3, ease: 'power2.inOut', onUpdate: () => { lc.textContent = Math.round(cnt.v); line.style.transform = `scaleX(${cnt.v / 100})`; } }, .5)
  .to('.loader .ltri', { rotate: '+=120', duration: 1.3, ease: 'none' }, .5)
  // exit: content lifts away, the two halves split along the diagonal
  .to('.loader .lmid, .loader .lfoot', { y: -30, opacity: 0, filter: 'blur(6px)', duration: .45, ease: 'power2.in' }, '+=.1')
  .to('.loader .lsh, .loader .ltri, .loader .ldots', { opacity: 0, scale: 1.1, duration: .45 }, '<')
  .to('.loader .lp1', { yPercent: -105, duration: .85, ease: 'expo.inOut' }, '<.15')
  .to('.loader .lp2', { yPercent: 105, duration: .85, ease: 'expo.inOut' }, '<')
  .add(() => intro.play(), '<.3');
lt.pause();
const startLoader = () => lt.play();
document.fonts && document.fonts.ready ? document.fonts.ready.then(startLoader) : startLoader();

// hero scroll parallax + book tilt
const hs = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
gsap.to('.hcut', { yPercent: -8, ease: 'none', scrollTrigger: hs });
gsap.to('.hpanel', { yPercent: 10, ease: 'none', scrollTrigger: hs });
gsap.to('.book', { yPercent: -45, rotate: 8, ease: 'none', scrollTrigger: hs });
gsap.to('.hsh.s2', { xPercent: 8, ease: 'none', scrollTrigger: hs });
gsap.to('.hshards .g-l', { y: -14, ease: 'none', scrollTrigger: hs });
gsap.to('.hshards .g-r', { y: 10, ease: 'none', scrollTrigger: hs });
gsap.to('.hshards .g-tr', { y: 6, x: 3, ease: 'none', scrollTrigger: hs });
gsap.to('.htxt', { yPercent: 14, opacity: .2, ease: 'none', scrollTrigger: { ...hs, start: '30% top' } });
const bk = $('.bk');
if (bk && !TOUCH) {
  const rx = gsap.quickTo(bk, 'rotationX', { duration: .6, ease: 'power3' }), ry = gsap.quickTo(bk, 'rotationY', { duration: .6, ease: 'power3' });
  gsap.set(bk, { rotationY: 24, rotationX: 4, rotationZ: -4, transition: 'none' });
  $('.hero').addEventListener('pointermove', e => { const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5; ry(24 + x * 26); rx(4 - y * 18); });
  $('.hero').addEventListener('pointerleave', () => { ry(24); rx(4); });
  // the brand panel behind Oana tilts toward the cursor too
  const hp = $('.hpanel'); if (hp) { gsap.set(hp, { transformPerspective: 1200, transformOrigin: '50% 60%' });
    const px = gsap.quickTo(hp, 'rotationY', { duration: .9, ease: 'power3' }), py = gsap.quickTo(hp, 'rotationX', { duration: .9, ease: 'power3' });
    $('.hero').addEventListener('pointermove', e => { px((e.clientX / innerWidth - .5) * 10); py(-(e.clientY / innerHeight - .5) * 8); });
    $('.hero').addEventListener('pointerleave', () => { px(0); py(0); }); }
}

// ---------- marquee driven by scroll velocity ----------
{ const mt = $('.mt'); mt.innerHTML += mt.innerHTML;
  const tw = gsap.to(mt, { xPercent: -50, ease: 'none', duration: 38, repeat: -1 });
  let dir = 1;
  ScrollTrigger.create({ onUpdate: s => { dir = s.direction; const v = Math.min(Math.abs(s.getVelocity()) / 300, 5);
    gsap.to(tw, { timeScale: dir * (1 + v), duration: .25, overwrite: true }); gsap.to(tw, { timeScale: dir, duration: 1.2, delay: .25 }); } });
}

// ---------- section heads ----------
$$('.sh').forEach(sh => {
  const k = $('.k', sh), h = $('h2', sh), rest = $$('.intro, .btn', sh);
  const tl = gsap.timeline({ scrollTrigger: { trigger: sh, start: 'top 85%' } });
  if (k) tl.from(k, { x: -30, opacity: 0, duration: .7, ease: 'power3.out' });
  if (h) tl.from(h, { y: 46, opacity: 0, duration: 1, ease: 'power4.out' }, '<.08');
  if (rest.length) tl.from(rest, { y: 24, opacity: 0, duration: .8, stagger: .08, ease: 'power3.out' }, '<.2');
});

// ---------- statement word fill ----------
$$('[data-fill]').forEach(el => gsap.to($$('.w', el), { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 50%', scrub: true } }));
gsap.from('.stmt .tag, .stmt .sign', { y: 24, opacity: 0, duration: .8, stagger: .15, scrollTrigger: { trigger: '.stmt', start: 'top 75%' } });

// ---------- pains ----------
gsap.from('.pain', { y: 70, opacity: 0, rotate: 1.5, duration: 1, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '.pgrid', start: 'top 85%' } });

// ---------- chapters: pinned horizontal scroll on desktop ----------
const mmq = gsap.matchMedia();
mmq.add({ pin: '(min-width:1024px) and (hover:hover) and (pointer:fine)' }, ctx => {
  if (!ctx.conditions.pin) return;
  H.classList.remove('nopin');
  const dist = () => Math.max(0, chTrack.scrollWidth - innerWidth);
  const tw = gsap.to(chTrack, { x: () => -dist(), ease: 'none',
    scrollTrigger: { trigger: '.chpin', pin: true, start: 'top top', end: () => '+=' + dist(), scrub: 1, invalidateOnRefresh: true, onUpdate: s => { setChProg(s.progress); chState(s.progress); } } });
  chPinST = tw.scrollTrigger; chTrack.dataset.cur = 'Derulează';
  $$('.chc', chTrack).forEach(c => {
    const img = $('.chi img', c);
    if (img) gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: c, containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } });
    gsap.from($$('.cht > *', c), { y: 30, opacity: 0, stagger: .06, duration: .7, ease: 'power3.out', scrollTrigger: { trigger: c, containerAnimation: tw, start: 'left 85%' } });
  });
  return () => { chPinST = null; chTrack.dataset.cur = 'Trage'; H.classList.add('nopin'); gsap.set(chTrack, { clearProps: 'transform' }); nativeCarousels(); };
});
mmq.add('(max-width:1023px), (hover:none), (pointer:coarse)', () => {
  gsap.from('.chc', { y: 50, opacity: 0, stagger: .08, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: '.chtrack', start: 'top 85%' } });
});
$$('.lens').forEach(l => gsap.from(l, { y: 90, opacity: 0, scale: .94, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: l, start: 'top 85%' } }));

// ---------- programs ----------
gsap.from('.ptabs button', { y: 24, opacity: 0, stagger: .07, duration: .7, scrollTrigger: { trigger: '.ptabs', start: 'top 88%' } });
gsap.from('.scv', { y: 60, opacity: 0, scale: .96, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: '.scg', start: 'top 85%' } });
gsap.from('.scside > *', { x: 40, opacity: 0, stagger: .08, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: '.scg', start: 'top 80%' } });

// ---------- results ----------
const countUp = (el) => {
  const raw = el.textContent, m = raw.match(/([−-]?)(\d+(?:,\d+)?)/); if (!m) return;
  const dec = (m[2].split(',')[1] || '').length, to = parseFloat(m[2].replace(',', '.')), o = { v: 0 };
  gsap.to(o, { v: to, duration: 1.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' },
    onUpdate: () => el.textContent = raw.replace(m[0], m[1] + o.v.toFixed(dec).replace('.', ',')) });
};
$$('.rzf .big').forEach(countUp);
$$('[data-count]').forEach(countUp);
gsap.from('.rzf', { y: 80, opacity: 0, duration: 1.1, stagger: .15, ease: 'power3.out', scrollTrigger: { trigger: '.rzfeat', start: 'top 85%' } });
gsap.from('.rzf .ri img', { scale: 1.15, duration: 1.6, ease: 'power3.out', scrollTrigger: { trigger: '.rzfeat', start: 'top 85%' } });

// ---------- quote ----------
{ const qt = $('.qt'); const parts = [];
  qt.childNodes.forEach(n => { if (n.nodeType === 3) n.textContent.split(/(\s+)/).forEach(w => parts.push(w.trim() ? `<span class="qw">${w}</span>` : w)); else parts.push(`<span class="qw">${n.outerHTML}</span>`); });
  qt.innerHTML = parts.join('');
  gsap.set('.qw', { display: 'inline-block' });
  gsap.from('.qw', { y: 40, opacity: 0, filter: 'blur(8px)', duration: .9, stagger: .035, ease: 'power3.out', scrollTrigger: { trigger: qt, start: 'top 80%' } });
  gsap.fromTo('.quote .qm', { yPercent: 20, rotate: -8 }, { yPercent: -20, rotate: 4, ease: 'none', scrollTrigger: { trigger: '.quote', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.quote .sign', { y: 20, opacity: 0, duration: .8, scrollTrigger: { trigger: qt, start: 'bottom 85%' } });
}

// ---------- about ----------
gsap.from('.abimg', { clipPath: 'inset(100% 0 0 0)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: '.abg', start: 'top 80%' } });
gsap.fromTo('.abimg img', { yPercent: -10 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true } });
gsap.from('.abt > *', { y: 30, opacity: 0, duration: .8, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: '.abt', start: 'top 80%' } });

// ---------- buy ----------
gsap.from('.bt > *', { y: 36, opacity: 0, duration: .9, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: '.bgrid', start: 'top 80%' } });
gsap.from('.inc li', { x: -30, opacity: 0, duration: .7, stagger: .08, scrollTrigger: { trigger: '.inc', start: 'top 85%' } });
gsap.from('.ck', { y: 90, rotate: 3, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.bgrid', start: 'top 75%' } });
gsap.to('.hsh.b1', { xPercent: -6, ease: 'none', scrollTrigger: { trigger: '.buy', start: 'top bottom', end: 'bottom top', scrub: true } });

// ---------- faq ----------
gsap.from('.orb-ring', { y: 120, opacity: 0, scale: .9, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.orb', start: 'top 80%' } });
gsap.from('.orb-mid, .orb-ctl, .fqcta', { y: 30, opacity: 0, duration: .9, stagger: .1, scrollTrigger: { trigger: '.orb', start: 'top 70%' } });

// ---------- footer ----------
gsap.fromTo('.fbig span:first-child', { xPercent: -6 }, { xPercent: 2, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
gsap.fromTo('.fbig span:last-child', { xPercent: 6 }, { xPercent: -2, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
gsap.from('.fcols > div, .ff .fbar', { y: 30, opacity: 0, duration: .8, stagger: .1, scrollTrigger: { trigger: '.fcols', start: 'top 95%' } });
gsap.from('.ff .ftop > *', { y: 40, opacity: 0, duration: 1, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '.ff', start: 'top 60%' } });

// ---------- section transitions (scrubbed, ebook-inspired) ----------
H.classList.add('tx');
// 1. chapters -> programs: the light page enters on the ebook's diagonal cut, with a brand-colour slash on its edge
gsap.fromTo('.progs.tx-slash', { '--t': 1 }, { '--t': 0, ease: 'none', scrollTrigger: { trigger: '.progs', start: 'top bottom', end: 'top 25%', scrub: true } });
// 2. programs -> pages: the light page peels off from the bottom-left corner like a turned page
{ const pg = $('.pturn .pg'), fl = $('.pturn .fl');
  if (pg && fl) {
    const P = a => 'polygon(' + a.map(([x, y]) => x.toFixed(2) + '% ' + y.toFixed(2) + '%').join(',') + ')';
    const turn = p => { const c = -100 + p * 200; // fold line x - y = c (in % of the section)
      const rest = c <= 0 ? [[0, 0], [100, 0], [100, 100], [100 + c, 100], [0, -c]] : [[c, 0], [100, 0], [100, 100 - c]];
      const peel = c <= 0 ? [[0, -c], [100 + c, 100], [0, 100]] : [[0, 0], [c, 0], [100, 100 - c], [100, 100], [0, 100]];
      pg.style.clipPath = P(p >= 1 ? [[100, 0], [100, 0], [100, 0]] : rest);
      fl.style.clipPath = P(p >= 1 ? [[100, 0], [100, 0], [100, 0]] : peel.map(([x, y]) => [y + c, x - c])); };
    turn(0);
    ScrollTrigger.create({ trigger: '.pages', start: 'top 92%', end: 'top 18%', scrub: .4, onUpdate: s => turn(s.progress), onRefresh: s => turn(s.progress) });
  } }
// 3. results -> quote: the light page splits down the middle like a before/after and slides open
gsap.fromTo('.quote', { '--t': 0 }, { '--t': 1, ease: 'none', scrollTrigger: { trigger: '.quote', start: 'top 95%', end: 'top 30%', scrub: true } });
// 4. about -> buy: the offer opens as an iris from the top edge
gsap.fromTo('.buy', { '--t': 0 }, { '--t': 1, ease: 'none', scrollTrigger: { trigger: '.buy', start: 'top bottom', end: 'top 20%', scrub: true } });

// decor: every guide shape inside a section drifts at its own speed; triangles also turn
$$('.dz .dk').forEach(el => { const sp = +el.dataset.sp || .5, sec = el.closest('section,footer');
  gsap.fromTo(el, { y: 140 * sp, rotate: el.tagName === 'svg' ? -40 * sp : 0 }, { y: -140 * sp, rotate: el.tagName === 'svg' ? 60 * sp : 0, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } }); });
// gutter layer: shapes down both edges of the page, each scrolling at its own speed (slower or faster than the page)
$$('.fx .dk').forEach(el => { const sp = +el.dataset.sp || 1;
  gsap.fromTo(el, { y: 220 * sp, rotate: el.tagName === 'svg' ? -50 * sp : 0 }, { y: -220 * sp, rotate: el.tagName === 'svg' ? 70 * sp : 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: .5 } }); });
// quote: keywords get a dark wipe, one after another
{ const ems = $$('.qt em'); ScrollTrigger.create({ trigger: '.qt', start: 'top 62%', once: true, onEnter: () => ems.forEach((e, i) => setTimeout(() => e.classList.add('on'), 500 + i * 380)) }); }

// seams: the guide's triangles drift and turn, slashes draw in, dots float, all tied to scroll
$$('.seam').forEach((sm, i) => {
  const st = { trigger: sm, start: 'top bottom', end: 'top top', scrub: true }, dir = i % 2 ? 1 : -1;
  gsap.fromTo($$('.st', sm), { y: 60, rotate: -30 * dir }, { y: -60, rotate: 50 * dir, ease: 'none', stagger: .05, scrollTrigger: st });
  gsap.fromTo($$('.sd', sm), { y: 40 }, { y: -40, ease: 'none', scrollTrigger: st });
  const sg = $('.sg', sm); if (sg) gsap.from(sg, { scaleX: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: sm, start: 'top 85%' } });
});

// ---------- chapter rail (same pattern as the programme's section rail) ----------
{
  const L = { start: 'Start', ghid: 'Ghidul', probleme: 'Problemele', capitole: 'Capitolele', programe: 'Programe', rasfoieste: 'Răsfoiește', rezultate: 'Rezultate', calculator: 'Calculator', oana: 'Oana', cumpara: 'Oferta', intrebari: 'Întrebări' };
  const secs = Object.keys(L).map(id => ({ id, el: document.getElementById(id), name: L[id] })).filter(s => s.el);
  if (secs.length > 3) {
    const nav = document.createElement('div'); nav.className = 'snav'; nav.setAttribute('role', 'navigation'); nav.setAttribute('aria-label', 'Secțiunile paginii');
    nav.innerHTML = `<button class="snav-t" type="button" aria-label="Arată secțiunile" aria-expanded="false"></button><div class="snav-tr"><i class="snav-f"></i></div><span class="snav-cur"></span><ol>` +
      secs.map((s, i) => `<li style="--i:${i}"><a href="#${s.id}"><b>${String(i + 1).padStart(2, '0')}</b><span>${s.name}</span></a></li>`).join('') + '</ol>';
    document.body.appendChild(nav);
    const fill = $('.snav-f', nav), cur = $('.snav-cur', nav), lis = $$('li', nav), tog = $('.snav-t', nav);
    let tops = [], max = 1, act = -1;
    const Y = () => window.__lenis ? window.__lenis.scroll : scrollY;
    const measure = () => {
      max = Math.max(1, ScrollTrigger.maxScroll(window));
      tops = secs.map(s => { const st = ScrollTrigger.create({ trigger: s.el, start: 'top top' }); const v = st.start; st.kill(); return Math.min(max, v); });
      tops[0] = 0;
      lis.forEach((li, i) => li.style.setProperty('--p', (i / (secs.length - 1) * 100).toFixed(2) + '%'));
      update();
    };
    const update = () => {
      if (!tops.length) return;
      const y = Y(), n = secs.length - 1;
      let k = 0; for (let i = 0; i < tops.length; i++) if (y >= tops[i]) k = i;
      const nx = k < n ? tops[k + 1] : max, loc = nx > tops[k] ? Math.min(1, (y - tops[k]) / (nx - tops[k])) : 1;
      fill.style.transform = `scaleY(${Math.min(1, (k + loc) / n)})`;
      let a = 0; for (let i = 0; i < tops.length; i++) if (y >= tops[i] - innerHeight * .4) a = i;
      if (a !== act) {
        act = a; lis.forEach((li, i) => { li.classList.toggle('on', i === a); li.classList.toggle('done', i < a); });
        cur.textContent = String(a + 1).padStart(2, '0') + '  ' + secs[a].name; cur.style.setProperty('--p', lis[a].style.getPropertyValue('--p'));
        cur.classList.remove('in'); void cur.offsetWidth; cur.classList.add('in');
      }
      nav.classList.toggle('show', H.classList.contains('done'));
    };
    ScrollTrigger.addEventListener('refresh', measure); ScrollTrigger.refresh();
    window.__lenis ? window.__lenis.on('scroll', update) : addEventListener('scroll', update, { passive: true });
    setInterval(update, 800);
    const close = () => { nav.classList.remove('open'); tog.setAttribute('aria-expanded', 'false'); };
    const go = i => {
      const t = i === 0 ? 0 : tops[i] + 2;
      window.__lenis ? window.__lenis.scrollTo(t, { duration: 1.4 }) : scrollTo({ top: t, behavior: RM ? 'auto' : 'smooth' });
      close();
    };
    lis.forEach((li, i) => $('a', li).addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); go(i); if (e.detail) e.currentTarget.blur(); }));
    tog.addEventListener('click', () => { const o = nav.classList.toggle('open'); tog.setAttribute('aria-expanded', o); });
    document.addEventListener('pointerdown', e => { if (!nav.contains(e.target)) close(); });
    addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }
}

// ---------- hero signature: strokes write one after another once in view (after the loader), card drifts with parallax ----------
{
  const sig = $('.hsig');
  if (sig) {
    const ps = $$('path', sig), ls = ps.map(p => p.getTotalLength() + 1), tot = ls.reduce((a, b) => a + b, 0);
    ps.forEach((p, i) => { p.style.strokeDasharray = ls[i] + ' ' + ls[i]; });
    const draw = t => { let n = 0; ps.forEach((p, i) => { const k = Math.min(1, Math.max(0, (t * tot - n) / ls[i])); n += ls[i]; p.style.strokeDashoffset = ls[i] * (1 - k); p.style.visibility = k > .01 ? 'visible' : 'hidden'; }); };
    if (RM) draw(1); else {
      draw(0);
      const start = () => { const t0 = performance.now() + 450, f = now => { const t = Math.min(1, Math.max(0, (now - t0) / 1900)); draw(t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2); if (t < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); };
      let fired = false;
      const go = () => { if (fired) return; if (!H.classList.contains('done')) return setTimeout(go, 120); fired = true; start(); };
      // parallax exactly like airwalk.ro: offset from the section centre × speed, eased toward it
      const host = $('.hero'); let y = 0;
      const speed = -0.12;
      gsap.ticker.add((time, dt) => {
        if (!fired && H.classList.contains('done') && sig.getBoundingClientRect().top < innerHeight * .92) go();
        const r = host.getBoundingClientRect(); if (r.bottom < -200) return;
        const a = r.top + r.height / 2 - innerHeight / 2, k = innerWidth < 992 ? .35 : 1;
        y += (a * speed * k - y) * (1 - Math.pow(.8, 60 * Math.min(.1, dt / 1000)));
        sig.style.transform = `translate3d(0,${y.toFixed(1)}px,0)`;
      });
    }
  }
}

// recalc once fonts and images are in
addEventListener('load', () => ScrollTrigger.refresh());
document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
