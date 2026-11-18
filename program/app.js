(() => {
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
gsap.registerPlugin(ScrollTrigger, SplitText);

// ---------- smooth scroll ----------
let lenis = null;
if (!RM) {
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(500, 33);
  lenis.stop();
}
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const t = $(a.getAttribute('href')); if (!t) return; e.preventDefault();
  lenis ? lenis.scrollTo(t, { offset: -20, duration: 1.6 }) : t.scrollIntoView();
}));

// ---------- cursor ----------
const cur = $('.cur'), dot = $('.cdot');
if (cur && matchMedia('(hover:hover)').matches) {
  const xc = gsap.quickTo(cur, 'x', { duration: .45, ease: 'power3' }), yc = gsap.quickTo(cur, 'y', { duration: .45, ease: 'power3' });
  const xd = gsap.quickTo(dot, 'x', { duration: .08 }), yd = gsap.quickTo(dot, 'y', { duration: .08 });
  addEventListener('pointermove', e => { xc(e.clientX); yc(e.clientY); xd(e.clientX); yd(e.clientY); });
  $$('[data-cur]').forEach(el => {
    el.addEventListener('mouseenter', () => { cur.classList.add('on'); $('span', cur).textContent = el.dataset.cur; });
    el.addEventListener('mouseleave', () => cur.classList.remove('on'));
  });
}
// magnetic
$$('.mag').forEach(el => {
  const xs = gsap.quickTo(el, 'x', { duration: .6, ease: 'elastic.out(1,.4)' }), ys = gsap.quickTo(el, 'y', { duration: .6, ease: 'elastic.out(1,.4)' });
  el.addEventListener('mousemove', e => { const r = el.getBoundingClientRect(); xs((e.clientX - r.left - r.width / 2) * .35); ys((e.clientY - r.top - r.height / 2) * .35); });
  el.addEventListener('mouseleave', () => { xs(0); ys(0); });
});

// ---------- nav ----------
ScrollTrigger.create({ start: 80, onToggle: s => $('nav').classList.toggle('solid', s.isActive) });

// ---------- 3D book: hero -> the book opens -> the next heading is printed on its page and lifts off into the section ----------
const stage = $('#stage'), cv = $('#book'), inside = $('.inside');
let book = null;
const S = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const E3 = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function wrap(g, text, maxW) { const words = text.split(' '), lines = []; let l = '';
  words.forEach(w => { const t = l ? l + ' ' + w : w; if (g.measureText(t).width > maxW && l) { lines.push(l); l = w; } else l = t; }); if (l) lines.push(l); return lines; }
function pageTex(kind) {
  return AW.canvasTex(1024, 1820, (g, w, h) => {
    const bg = g.createRadialGradient(w * .5, h * .45, 10, w * .5, h * .45, h * .7);
    bg.addColorStop(0, kind === 'final' ? '#2a0306' : '#5a070d'); bg.addColorStop(.55, kind === 'final' ? '#0b0102' : '#1d0204'); bg.addColorStop(1, '#000');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .025})`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    if (kind === 'final') { g.strokeStyle = 'rgba(229,9,20,.35)'; g.lineWidth = 2; g.strokeRect(60, 60, w - 120, h - 120); return; }
    g.font = '800 extra-expanded 64px G'; const wa = g.measureText('AIR').width, ww = g.measureText('WALK').width, x0 = w / 2 - (wa + ww) / 2; g.textAlign = 'left';
    g.fillStyle = '#f4f1ec'; g.fillText('AIR', x0, h * .44); g.fillStyle = '#e50914'; g.fillText('WALK', x0 + wa, h * .44); g.textAlign = 'center';
    g.font = '500 extra-expanded 24px G'; g.letterSpacing = '8px'; g.fillStyle = 'rgba(244,241,236,.7)';
    wrap(g, $('.hero .copy .k').textContent.trim().toUpperCase(), w * .7).forEach((l, i) => g.fillText(l, w / 2, h * .44 + 80 + i * 40));
    g.strokeStyle = 'rgba(229,9,20,.6)'; g.lineWidth = 2; g.strokeRect(60, 60, w - 120, h - 120);
  });
}
// the heading lives in .ink; at first it is scaled onto the projected right page, then lifts off into its own layout
const ink = $('.ink', inside); let inkChars = [], inkBox = null;
function measureInk() { gsap.set(ink, { clearProps: 'transform' }); const r = ink.getBoundingClientRect(); inkBox = { x: r.left, y: r.top, w: r.width, h: r.height }; }
function inkFrame(rc) {
  if (!inkBox) measureInk();
  const p = rc.p, print = S(p, .42, .52), lift = E3(S(p, .58, .86));
  const sPage = (rc.w * .8) / inkBox.w;
  const cxP = rc.x + rc.w / 2, cyP = rc.y + rc.h * .46, cxF = inkBox.x + inkBox.w / 2, cyF = inkBox.y + inkBox.h / 2;
  const sc = sPage + (1 - sPage) * lift;
  gsap.set(ink, { x: (cxP - cxF) * (1 - lift), y: (cyP - cyF) * (1 - lift), scale: sc, transformOrigin: '50% 50%' });
  gsap.set(inside, { opacity: 1 });
  const n = inkChars.length;
  inkChars.forEach((c, i) => {
    const pr = S(print * 1.35 - (i / n) * .35, 0, 1);               // printed letter by letter
    const lt = S(lift * 1.5 - (i / n) * .5, 0, 1);                  // lifted letter by letter
    const arc = Math.sin(lt * Math.PI);
    gsap.set(c, { opacity: pr, filter: `blur(${(1 - pr) * 6}px)`, y: -arc * 36, rotationX: arc * -38, z: arc * 60 });
  });
}
function stageProgress(p) {
  const out = S(p, .02, .13);
  gsap.set('.hero .copy', { opacity: 1 - out, x: -out * 140, filter: `blur(${out * 10}px)` });
  gsap.set('.cue', { opacity: 1 - S(p, 0, .05) }); gsap.set('.bhint', { opacity: 1 - S(p, 0, .04) });
  gsap.set('.hero > .glow', { opacity: 1 - S(p, .5, .8) });
  gsap.set('.bglow', { opacity: S(p, .17, .3) * (1 - S(p, .6, .85)), scale: .6 + S(p, .17, .4) * .7 });
  gsap.set(cv, { opacity: (innerWidth < 900 ? .28 + .72 * S(p, .02, .1) : 1) * (1 - S(p, .8, .92)) });
  if (p < .4) gsap.set(inside, { opacity: 0 });
}
async function initBook() {
  if (!cv || !window.AW || RM) throw 0;
  try { await Promise.all([document.fonts.load('800 40px G'), document.fonts.load('300 40px G'), document.fonts.load('600 20px G')]); } catch (e) {}
  const lp = pageTex('left'), fp = pageTex('final');
  inkChars = new SplitText($('h2', ink), { aria: 'none', type: 'words,chars', wordsClass: 'w', charsClass: 'c' }).chars;
  gsap.set(ink, { transformPerspective: 900 });
  book = AW.HeroBook(cv, { front: cv.dataset.front, back: cv.dataset.back, pages: JSON.parse(cv.dataset.pages), finalPage: fp, leftPage: lp, insideTex: lp, lastBack: lp });
  book.onFrame(rc => { if (rc.p > .4) inkFrame(rc); });
  const curEl = $('.cur'); if (curEl) book.onHover(h => { curEl.classList.toggle('on', h); $('span', curEl).textContent = cv.dataset.cur; });
  addEventListener('resize', () => { inkBox = null; });
  window.__book = book; book.set(stageST.progress); if (stageST.progress >= 1) book.pause();
}
// the pin is created first (synchronously) so every later trigger is measured after its spacer
const stageST = (!RM && cv) ? ScrollTrigger.create({ trigger: stage, pin: true, start: 'top top', end: () => '+=' + innerHeight * 5, scrub: true,
  onUpdate: s => { book && book.set(s.progress); stageProgress(s.progress); },
  onLeave: () => { book && book.pause(); if (inkBox) { gsap.set(ink, { x: 0, y: 0, scale: 1 }); inkChars.forEach(c => gsap.set(c, { opacity: 1, filter: 'none', y: 0, rotationX: 0, z: 0 })); } },
  onEnterBack: () => book && book.play() }) : { progress: 0 };
if (!RM && cv) stageProgress(0);
const bookReady = initBook().catch(() => {
  cv && cv.remove(); stageST.kill && stageST.kill(true); gsap.set('.hero .copy', { clearProps: 'all' });
  $('#scurt').prepend(inside); inside.classList.add('flat'); gsap.set(inside, { clearProps: 'all' }); ScrollTrigger.refresh(); });
addEventListener('resize', () => {});
// ---------- split helpers ----------
const splitChars = el => new SplitText(el, { aria: 'none', type: 'words,chars', wordsClass: 'w', charsClass: 'c' });
function titleIn(el, trig, delay = 0) {
  const s = splitChars(el);
  return gsap.from(s.chars, { yPercent: 115, rotate: 8, opacity: 0, duration: 1, ease: 'expo.out', stagger: .018, delay,
    scrollTrigger: trig ? { trigger: trig, start: 'top 82%' } : undefined });
}

// ---------- preloader + hero intro ----------
const heroIn = () => {
  const tl = gsap.timeline();
  const h1 = $('.hero h1'); const s1 = splitChars($('.t1', h1)), s2 = splitChars($('.t2', h1));
  tl.from(s1.chars, { yPercent: 120, rotate: 10, duration: 1.2, ease: 'expo.out', stagger: .025 })
    .from(s2.chars, { yPercent: 120, opacity: 0, duration: 1, ease: 'expo.out', stagger: .015 }, '-=.9')
    .from('.hero .k', { x: -30, opacity: 0, duration: .8 }, '-=.9')
    .from('.hero .p', { y: 30, opacity: 0, duration: .9 }, '-=.6')
    .from('.hero .chip', { y: 20, opacity: 0, stagger: .08, duration: .6 }, '-=.6')
    .from('.hero .ctas > *', { y: 20, opacity: 0, stagger: .1, duration: .6 }, '-=.4')
    .from('#book', { opacity: 0, duration: 1.6, ease: 'power2.out' }, 0)
    .from('nav', { y: -80, opacity: 0, duration: .8 }, .3)
    .from('.cue', { opacity: 0, duration: .6 }, '-=.2');
  return tl;
};
// ---------- preloader: process chart (5 bars rise like a stats chart, then exit as a curtain) ----------
const pre = $('#pre');
function runLoader() {
  const steps = JSON.parse(pre.dataset.steps), head = pre.dataset.head, tl = gsap.timeline({ paused: true });
  const tot = { v: 0 }; const pad = n => String(n).padStart(2, '0');
  pre.classList.add('v3');
  const hs = [46, 64, 52, 70, 58];
  pre.innerHTML = `<div class='l3'><div class='hd'><span class='logo'>AIR<i>WALK</i></span><span>${head}</span><span class='tot'><b>0</b>%</span></div><div class='ch'>${steps.map((s, i) => `<div class='c'><div class='col'><i><b class='v'>0</b></i></div><span>${pad(i + 1)} · ${s}</span></div>`).join('')}</div></div>`;
  const cols = $$('.c', pre);
  tl.from('.l3 .hd', { y: 20, opacity: 0, duration: .5 }).from($$('.c span', pre), { y: 20, opacity: 0, stagger: .06, duration: .4 }, '<');
  cols.forEach((c, i) => tl.fromTo($('i', c), { height: '0%' }, { height: hs[i] + '%', duration: 1, ease: 'expo.out', onUpdate: () => { const v = parseFloat($('i', c).style.height); $('.v', c).textContent = Math.round(v) + '%'; $('.v', c).style.opacity = Math.min(1, v / 10); } }, .45 + i * .14));
  tl.to(tot, { v: 100, duration: 1.5, ease: 'power2.out', onUpdate: () => $('.tot b', pre).textContent = Math.round(tot.v) }, .45);
  tl.to($$('.c i', pre), { height: '100%', duration: .5, ease: 'power3.inOut', stagger: .04 }, '+=.25').to($$('.c .v, .c span, .l3 .hd', pre), { opacity: 0, duration: .25 }, '<')
    .set(pre, { background: 'transparent' })
    .to($$('.c i', pre), { yPercent: -102, duration: .85, ease: 'expo.inOut', stagger: .06 });
  tl.add(() => { lenis && lenis.start(); heroIn(); }, '-=.55').set(pre, { display: 'none' });
  // start once the 3D book is built (shader compile can block the main thread); never wait more than 4 s
  Promise.race([bookReady, new Promise(r => setTimeout(r, 4000))]).then(() => requestAnimationFrame(() => tl.play()));
  tl.eventCallback('onComplete', () => gsap.ticker.lagSmoothing(0));
}
if (RM) { pre.remove(); bookReady.then(() => {}); }
else runLoader();
// ---------- marquee (scroll velocity) ----------
$$('.band').forEach((b, i) => {
  const dir = i % 2 ? 1 : -1;
  const tw = gsap.fromTo(b, { xPercent: dir < 0 ? 0 : -50 }, { xPercent: dir < 0 ? -50 : 0, duration: 26, ease: 'none', repeat: -1 });
  ScrollTrigger.create({ onUpdate: s => { const v = Math.min(Math.abs(s.getVelocity()) / 300, 6); gsap.to(tw, { timeScale: 1 + v, duration: .2, overwrite: true }); gsap.to(tw, { timeScale: 1, duration: 1.2, delay: .2 }); } });
});

if (!RM) {
// ---------- section titles ----------
$$('[data-title]').forEach(el => titleIn(el, el));
$$('.k').forEach(k => { if (!k.closest('.hero') && !k.closest('.phonebig')) gsap.from(k, { x: -40, opacity: 0, duration: .8, scrollTrigger: { trigger: k, start: 'top 88%' } }); });
$$('[data-fade]').forEach(el => gsap.from(el, { y: 50, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } }));

// statement word fill
$$('.statement').forEach(el => {
  const s = new SplitText(el, { aria: 'none', type: 'words', wordsClass: 'w' });
  gsap.to(s.words, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true } });
});
// counters
$$('[data-count]').forEach(el => {
  const to = +el.dataset.count, o = { v: 0 };
  gsap.to(o, { v: to, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' }, onUpdate: () => el.textContent = Math.round(o.v) });
});
gsap.from('.stat', { y: 60, opacity: 0, stagger: .12, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.stats', start: 'top 85%' } });

// who list + phone parallax
gsap.from('.who .ls li', { x: -60, opacity: 0, stagger: .12, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: '.who .ls', start: 'top 80%' } });
gsap.fromTo('.who .phone', { y: 120, rotate: 6 }, { y: -80, rotate: -3, ease: 'none', scrollTrigger: { trigger: '.who', start: 'top bottom', end: 'bottom top', scrub: true } });

// ---------- horizontal steps ----------
ScrollTrigger.matchMedia({
  '(min-width: 901px)': () => {
    const track = $('.htrack'), wrap = $('.hwrap');
    const dist = () => track.scrollWidth - innerWidth;
    const tw = gsap.to(track, { x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: wrap, pin: true, start: 'center center', end: () => '+=' + dist(), scrub: 1, invalidateOnRefresh: true,
        onUpdate: s => $('.hprog b').style.width = (s.progress * 100) + '%' } });
    $$('.step').forEach(st => {
      gsap.from($('.vis img, .vis .two', st), { y: 80, rotate: 10, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: st, containerAnimation: tw, start: 'left 75%' } });
      gsap.fromTo($('.num', st), { x: 140 }, { x: -60, ease: 'none', scrollTrigger: { trigger: st, containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } });
      gsap.from($$('.blk div', st), { y: 30, opacity: 0, stagger: .1, duration: .7, scrollTrigger: { trigger: st, containerAnimation: tw, start: 'left 65%' } });
    });
  },
  '(max-width: 900px)': () => {
    $$('.step').forEach(st => gsap.from(st, { y: 80, opacity: 0, duration: 1, scrollTrigger: { trigger: st, start: 'top 85%' } }));
  }
});

// ---------- design fan ----------
const fan = $$('.fan img'), n = fan.length;
const ftl = gsap.timeline({ scrollTrigger: { trigger: '.fan', start: 'top 85%', end: 'center 45%', scrub: 1 } });
fan.forEach((im, i) => {
  const k = i - (n - 1) / 2;
  ftl.fromTo(im, { xPercent: -50, yPercent: -50, x: 0, y: 60, rotate: 0, scale: .8 },
    { x: () => k * Math.min(innerWidth * .15, 270), y: Math.abs(k) * 30, rotate: k * 6, scale: 1, ease: 'power2.out' }, 0);
});

// ---------- sales page scroll inside the browser ----------
const shot = $('.browser .vp img');
if (shot) gsap.to(shot, { y: () => -(shot.offsetHeight - shot.parentNode.offsetHeight), ease: 'none', scrollTrigger: { trigger: '.pp', start: 'top 70%', end: 'bottom 20%', scrub: 1, invalidateOnRefresh: true } });
gsap.fromTo('.pp .side .phone', { y: 140 }, { y: -40, stagger: .15, ease: 'none', scrollTrigger: { trigger: '.pp', start: 'top bottom', end: 'bottom top', scrub: true } });
gsap.from('.feat div', { y: 50, opacity: 0, stagger: .12, duration: .9, scrollTrigger: { trigger: '.feat', start: 'top 85%' } });

// ---------- kit columns ----------
$$('.cols .col').forEach((c, i) => gsap.fromTo(c, { y: i % 2 ? '-30%' : '0%' }, { y: i % 2 ? '0%' : '-30%', ease: 'none', scrollTrigger: { trigger: '.kit', start: 'top bottom', end: 'bottom top', scrub: true } }));
gsap.from('.kit .ls li', { x: -40, opacity: 0, stagger: .1, duration: .8, scrollTrigger: { trigger: '.kit .ls', start: 'top 85%' } });

// ---------- launch day ----------
const ld = splitChars($('.ldbig'));
gsap.from(ld.chars, { yPercent: 100, scale: 1.6, filter: 'blur(14px)', opacity: 0, stagger: { each: .04, from: 'center' }, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.ldbig', start: 'top 80%' } });
gsap.to('.badge .spin', { rotate: 360, transformOrigin: '50% 50%', duration: 14, repeat: -1, ease: 'none' });
gsap.fromTo('.badge', { rotate: -40 }, { rotate: 20, ease: 'none', scrollTrigger: { trigger: '#lansare', start: 'top bottom', end: 'bottom top', scrub: true } });
gsap.from('.ldrow .post', { x: -120, rotate: -14, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.ldrow', start: 'top 80%' } });
gsap.from('.ldrow .phone', { x: 120, rotate: 12, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.ldrow', start: 'top 80%' } });

// ---------- who does what: hover reveal ----------
const rv = $('.reveal-img');
if (rv && matchMedia('(hover:hover)').matches) {
  const rx = gsap.quickTo(rv, 'x', { duration: .5, ease: 'power3' }), ry = gsap.quickTo(rv, 'y', { duration: .5, ease: 'power3' });
  $$('[data-img]').forEach(li => {
    li.addEventListener('mouseenter', () => { $('img', rv).src = li.dataset.img; gsap.to(rv, { opacity: 1, scale: 1, rotate: gsap.utils.random(-6, 6), duration: .35 }); });
    li.addEventListener('mouseleave', () => gsap.to(rv, { opacity: 0, scale: .8, duration: .3 }));
    li.addEventListener('mousemove', e => { rx(e.clientX + 140); ry(e.clientY); });
  });
  const hideRv = () => gsap.to(rv, { opacity: 0, scale: .8, duration: .25, overwrite: true });
  $$('[data-img]').forEach(li => li.closest('ul').addEventListener('mouseleave', hideRv));
  addEventListener('scroll', hideRv, { passive: true }); lenis && lenis.on('scroll', () => { if (+getComputedStyle(rv).opacity > 0) hideRv(); });
}
gsap.from('.wdw > *', { y: 60, opacity: 0, stagger: .15, duration: 1, scrollTrigger: { trigger: '.wdw', start: 'top 80%' } });

// ---------- case ----------
gsap.from('.cvis > *', { y: 140, opacity: 0, rotate: 0, stagger: .15, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.cvis', start: 'top 80%' } });
gsap.to('.cvis .c1', { y: -60, ease: 'none', scrollTrigger: { trigger: '.case', scrub: true } });
gsap.to('.cvis .phone', { y: -120, ease: 'none', scrollTrigger: { trigger: '.case', scrub: true } });

// ---------- 3D presentation deck ----------
const dcv = $('#deck');
if (dcv && window.AW && !RM) { let dk = null;
  const dl = () => $('.dl .ctas a').click();
  ScrollTrigger.create({ trigger: '.deck3d', start: 'top 150%', end: 'bottom -50%',
    onToggle: s => { if (!dk) { dk = AW.Deck(dcv, JSON.parse(dcv.dataset.pages), { onClick: dl }); dcv.parentElement.classList.add('ok'); } s.isActive ? dk.play() : dk.pause(); } });
  ScrollTrigger.create({ trigger: '.deck3d', start: 'top 85%', end: 'center 40%', scrub: true, onUpdate: s => dk && dk.set(s.progress) });
  const curEl = $('.cur'); if (curEl) { dcv.addEventListener('mouseenter', () => { curEl.classList.add('on'); $('span', curEl).textContent = dcv.dataset.cur; }); dcv.addEventListener('mouseleave', () => curEl.classList.remove('on')); }
}
// ---------- download tilt ----------
const th = $('.dl .thumb img');
if (th) { const ox = gsap.quickTo(th, 'rotationY', { duration: .6 }), oy = gsap.quickTo(th, 'rotationX', { duration: .6 });
  $('.dl .thumb').addEventListener('mousemove', e => { const r = e.currentTarget.getBoundingClientRect(); ox(((e.clientX - r.left) / r.width - .5) * 22); oy(-((e.clientY - r.top) / r.height - .5) * 18); });
  $('.dl .thumb').addEventListener('mouseleave', () => { ox(0); oy(0); });
  gsap.from(th, { y: 120, rotationX: 30, opacity: 0, duration: 1.3, ease: 'power3.out', scrollTrigger: { trigger: '.dl', start: 'top 80%' } }); }

// ---------- contact ----------
gsap.from('.phonebig', { clipPath: 'inset(0 100% 0 0)', duration: 1.2, ease: 'expo.inOut', scrollTrigger: { trigger: '.ct', start: 'top 80%' } });
gsap.from('.cl > *', { y: 30, opacity: 0, stagger: .08, duration: .7, scrollTrigger: { trigger: '.cl', start: 'top 85%' } });
} // !RM
// ---------- warp carousel: Aron's launch kit (stories, carousel slides, reels, launch-day set) ----------
const warpEl = $('.warp');
const GLOWS = ['#ff2b2b', '#ff5a3c', '#e50914', '#ff3d55', '#ff7a24', '#d10a14'];
if (warpEl && window.AW) {
  const cards = JSON.parse(warpEl.dataset.cards); let warp = null;
  const cnt = $('.wc b', warpEl), cap = $('.wcap', warpEl);
  const make = () => {
    warp = AW.Warp($('#warp'), cards.map((c, i) => ({ src: c.src, video: !!c.video, aspect: c.aspect, glow: GLOWS[i % GLOWS.length] })),
      { onChange: i => { cnt.textContent = String(i + 1).padStart(2, '0'); cap.textContent = cards[i].cap; warpEl.style.setProperty('--wg', GLOWS[i % GLOWS.length]); } });
    warpEl.style.setProperty('--wg', GLOWS[0]);
    $('.wb.prev', warpEl).addEventListener('click', () => warp.prev()); $('.wb.next', warpEl).addEventListener('click', () => warp.next());
    warpEl.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { warp.next(); e.preventDefault(); } if (e.key === 'ArrowLeft') { warp.prev(); e.preventDefault(); } });
  };
  ScrollTrigger.create({ trigger: warpEl, start: 'top 140%', end: 'bottom -40%',
    onToggle: s => { if (!warp) make(); s.isActive ? warp.play() : warp.pause(); } });
  if (!RM) gsap.from(warpEl, { scale: .9, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: warpEl, start: 'top 80%' } });
}

// ---------- footer: the book in a vortex of pages ----------
const fcan = $('#fcan');
if (fcan && window.AW && !RM) {
  let foot = null;
  ScrollTrigger.create({ trigger: '#foot', start: 'top 160%', end: 'bottom top',
    onToggle: s => { if (!foot) { const fl = JSON.parse(fcan.dataset.fly), lp = pageTex('left');
      foot = AW.Footer(fcan, { front: fcan.dataset.front, back: fcan.dataset.back, flyers: fl, pages: [[fl[1], fl[2]], [fl[3], fl[4]]], finalUrl: fl[5], insideTex: lp, leftPage: lp }); } s.isActive ? foot.play() : foot.pause(); },
    onUpdate: s => foot && foot.set(s.progress) });
  const fs = new SplitText('.fbig span', { aria: 'none', type: 'chars', charsClass: 'c' });
  gsap.from(fs.chars, { yPercent: 100, opacity: 0, stagger: .05, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '#foot', start: 'top 70%' } });
  gsap.fromTo('.fbig span:first-child', { xPercent: -8 }, { xPercent: 4, ease: 'none', scrollTrigger: { trigger: '#foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  gsap.fromTo('.fbig span:last-child', { xPercent: 8 }, { xPercent: -4, ease: 'none', scrollTrigger: { trigger: '#foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  titleIn($('.ft .f1'), '#foot');
  gsap.from('.fcols > div, .fbar', { y: 40, opacity: 0, stagger: .1, duration: .9, scrollTrigger: { trigger: '.fcols', start: 'top 92%' } });
} else if (fcan) fcan.remove();

// ---------- live devices: the real sales page and thank-you page run inside the laptop and phones ----------
$$('.live').forEach(box => {
  const fr = $('iframe', box), w = +box.dataset.w;
  const fit = () => { const s = box.clientWidth / w; fr.style.width = w + 'px'; fr.style.height = box.clientHeight / s + 'px'; fr.style.transform = `scale(${s})`; };
  new ResizeObserver(fit).observe(box); fit();
  fr.addEventListener('load', () => { if (fr.src) box.classList.add('loaded'); });
  ScrollTrigger.create({ trigger: box, start: 'top 160%', once: true, onEnter: () => { fr.src = box.dataset.src; } });
  $('.try', box).addEventListener('click', () => { box.classList.add('on'); fr.tabIndex = 0; fr.focus(); });
  box.addEventListener('mouseleave', () => { box.classList.remove('on'); fr.tabIndex = -1; });
});
// devices lean toward the cursor
const pp = $('.pp');
if (pp && !RM && matchMedia('(hover:hover)').matches) {
  const devs = [$('.laptop', pp), ...$$('.side .phone', pp)].map((el, i) => ({ el, rx: gsap.quickTo(el, 'rotationX', { duration: .8, ease: 'power3' }), ry: gsap.quickTo(el, 'rotationY', { duration: .8, ease: 'power3' }), k: i ? 1.3 : .7 }));
  pp.addEventListener('mousemove', e => { const b = pp.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5; devs.forEach(d => { d.ry(x * 14 * d.k); d.rx(-y * 10 * d.k); }); });
  pp.addEventListener('mouseleave', () => devs.forEach(d => { d.ry(0); d.rx(0); }));
}
// order simulation: Apple Pay sheet -> thank-you email -> new-sale notification
const simb = $('.simb');
if (simb) { let n = 0, busy = false;
  gsap.set('.p1 .sheet', { yPercent: 105, visibility: 'visible' }); gsap.set('.p2 .banner', { yPercent: -160, visibility: 'visible' }); gsap.set('.toast', { xPercent: 130, visibility: 'visible' });
  simb.addEventListener('click', () => { if (busy) return; busy = true;
    const sh = $('.p1 .sheet'), ok = $('.sh-ok', sh), btn = $('.sh-btn', sh), bn = $('.p2 .banner'), to = $('.toast');
    const p1 = $('.p1'), tl = gsap.timeline({ onComplete: () => { busy = false; } });
    tl.to(p1, { scale: 1.04, duration: .4, ease: 'power2.out' })
      .to(sh, { yPercent: 0, duration: .55, ease: 'expo.out' }, '<')
      .to(btn, { scale: 1.25, duration: .18, repeat: 3, yoyo: true }, '+=.5')
      .to(ok, { opacity: 1, duration: .3 })
      .from($('i', ok), { scale: 0, duration: .5, ease: 'back.out(3)' }, '<')
      .to(sh, { yPercent: 105, duration: .5, ease: 'expo.in' }, '+=.8').set(ok, { opacity: 0 })
      .to(p1, { scale: 1, duration: .4 }, '<')
      .to(bn, { yPercent: 0, duration: .6, ease: 'back.out(1.6)' }, '-=.1')
      .to(to, { xPercent: 0, duration: .6, ease: 'back.out(1.4)' }, '-=.3')
      .add(() => { n++; $('.simc b').textContent = n; })
      .from('.simc b', { scale: 1.8, color: '#e50914', duration: .5 })
      .to(bn, { yPercent: -160, duration: .5, ease: 'power3.in' }, '+=2.2')
      .to(to, { xPercent: 130, duration: .5, ease: 'power3.in' }, '<');
  });
}

// ---------- step cards: inspection lamp. The card tilts toward the cursor, a lamp follows it,
// the frame lights up where you point and the outline number fills with red under the lamp ----------
if (!RM && matchMedia('(hover:hover) and (pointer:fine)').matches) {
  $$('.step').forEach(st => {
    const num = $('.num', st);
    if (num) { const f = num.cloneNode(true); f.className = 'num fill'; f.setAttribute('aria-hidden', 'true'); num.after(f); }
    const lamp = document.createElement('i'); lamp.className = 'lamp'; st.prepend(lamp);
    const edge = document.createElement('i'); edge.className = 'edge'; st.appendChild(edge);
    gsap.set(st, { transformPerspective: 1400 });
    const rx = gsap.quickTo(st, 'rotationX', { duration: .7, ease: 'power3' }), ry = gsap.quickTo(st, 'rotationY', { duration: .7, ease: 'power3' });
    const tx = $('.tx', st), vis = $('.vis', st);
    const px = gsap.quickTo([tx, vis], 'x', { duration: .9, ease: 'power3' }), py = gsap.quickTo([tx, vis], 'y', { duration: .9, ease: 'power3' });
    const v = { x: 50, y: 50, a: 0 };
    const fill = $('.num.fill', st);
    const paint = () => { st.style.setProperty('--mx', v.x + '%'); st.style.setProperty('--my', v.y + '%'); st.style.setProperty('--la', v.a);
      if (fill) { fill.style.setProperty('--fx', (v.x / 100 * st.clientWidth - fill.offsetLeft) + 'px'); fill.style.setProperty('--fy', (v.y / 100 * st.clientHeight - fill.offsetTop) + 'px'); } };
    st.addEventListener('pointermove', e => {
      const r = st.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
      gsap.to(v, { x: nx * 100, y: ny * 100, a: 1, duration: .45, ease: 'power3', overwrite: true, onUpdate: paint });
      rx((.5 - ny) * 7); ry((nx - .5) * 9); px((nx - .5) * -14); py((ny - .5) * -10);
    });
    st.addEventListener('pointerleave', () => { gsap.to(v, { a: 0, duration: .8, ease: 'power2.out', overwrite: true, onUpdate: paint }); rx(0); ry(0); px(0); py(0); });
  });
}

// ---------- design fan: point at a page and it comes into focus, the others step back and blur ----------
{
  const fp = $$('.fan img'), wrap = $('.fan'), c = (fp.length - 1) / 2;
  if (wrap) {
    fp.forEach((im, i) => im.style.setProperty('--k', i - c));
    const focus = h => {
      wrap.classList.toggle('focus', h >= 0);
      fp.forEach((im, i) => { const d = h < 0 ? 0 : i - h; im.classList.toggle('on', i === h); im.style.setProperty('--push', h < 0 || !d ? 0 : Math.sign(d) * (60 - Math.min(Math.abs(d), 3) * 8)); im.style.setProperty('--d', Math.abs(d)); });
    };
    fp.forEach((im, i) => { im.addEventListener('pointerenter', () => focus(i)); });
    wrap.addEventListener('pointerleave', () => focus(-1));
    if (!matchMedia('(hover:hover)').matches) document.addEventListener('pointerdown', e => { if (!wrap.contains(e.target)) focus(-1); });
  }
}

// ---------- transitions between sections ----------
if (!RM) {
  // 1) bar wipe (the loader's chart bars return as a curtain)
  [['#pasi', '.w1'], ['#kit', '.w2']].forEach(([sel, w]) => {
    const bars = $$(w + ' i'), n = bars.length;
    const paint = t => bars.forEach((b, i) => { const l = Math.min(1, Math.max(0, t * 1.3 - i * .075)); b.style.transform = `translateY(${101 - 202 * E3(l)}%)`; });
    paint(0);
    ScrollTrigger.create({ trigger: sel, start: 'top 80%', end: 'top 20%', scrub: true, onUpdate: s => paint(s.progress), onLeave: () => paint(1), onLeaveBack: () => paint(0) });
  });
  // 2) launch day blooms open from its centre
  gsap.fromTo('#lansare', { clipPath: 'circle(12% at 50% 55%)' }, { clipPath: 'circle(80% at 50% 50%)', ease: 'none',
    scrollTrigger: { trigger: '#lansare', start: 'top bottom', end: 'top 15%', scrub: true } });
  // 3) the case study stays put and sinks back while the FAQ slides over it
  ScrollTrigger.matchMedia({ '(min-width: 901px)': () => {
    gsap.to('#caz', { scale: .9, opacity: .25, borderRadius: 40, ease: 'none',
      scrollTrigger: { trigger: '#caz', start: 'bottom bottom', end: '+=' + innerHeight, scrub: true, pin: true, pinSpacing: false } });
  } });
}

// ---------- FAQ ----------
$$('.q').forEach(q => $('button', q).addEventListener('click', () => {
  const open = q.classList.toggle('open'), a = $('.a', q);
  gsap.to(a, { height: open ? 'auto' : 0, duration: .55, ease: 'power3.inOut', onComplete: () => ScrollTrigger.refresh() });
}));

addEventListener('load', () => ScrollTrigger.refresh());
document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
