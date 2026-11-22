/* Oana funnel: interactive layer (approved 22 Nov 2026)
   1 lime cut on primary buttons · 2 shard-cut section headlines · 3 before/after sliders · 4 rolling numbers
   5 tilt cards with light · 6 marquee lean · 7 reactive dot grids · 8 breathing hero title */
(() => {
const $ = (s, c = document) => c.querySelector(s), $$ = (s, c = document) => [...c.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;

// ---- 4 rolling numbers (odometer); exposed for calc.js
const roll = (el, str, delay = 0) => {
  if (!el) return;
  if (RM) { el.textContent = str; return; }
  const prev = el.dataset.odo || '';
  if (prev === str) return; el.dataset.odo = str;
  const shape = t => t.replace(/\d/g, '0');
  if (prev && shape(prev) === shape(str) && el.querySelector('odo-s')) {   // same layout: just roll the digits that changed
    const ds = [...str].filter(c => /\d/.test(c)); el.setAttribute('aria-label', str);
    $$('odo-s', el).forEach((c, i) => { c.style.transitionDelay = '0s'; c.style.transform = `translateY(${-ds[i] * 10}%)`; }); return; }
  el.classList.add('odo');
  el.setAttribute('aria-label', str);
  el.innerHTML = [...str].map(ch => /\d/.test(ch)
    ? `<odo-c aria-hidden="true"><odo-s>${'0123456789'.split('').map(d => `<odo-d>${d}</odo-d>`).join('')}</odo-s></odo-c>`
    : `<odo-x aria-hidden="true">${ch === ' ' ? '&nbsp;' : ch}</odo-x>`).join('');
  const cols = $$('odo-s', el), digits = [...str].filter(c => /\d/.test(c));
  requestAnimationFrame(() => requestAnimationFrame(() => cols.forEach((c, i) => {
    c.style.transitionDelay = (delay + i * .06) + 's'; c.style.transform = `translateY(${-digits[i] * 10}%)`; })));
};
window.__odo = roll;
{ const hs = $$('.hstats b');
  if (hs.length) { const vals = hs.map(b => b.textContent.trim()); hs.forEach(b => { b.dataset.odo = ''; });
    new IntersectionObserver(([e], o) => { if (!e.isIntersecting) return; o.disconnect();
      setTimeout(() => hs.forEach((b, i) => roll(b, vals[i], i * .12)), 400); }, { threshold: .4 }).observe(hs[0]); } }
const price = $('.price b');
if (price && /\d/.test(price.textContent)) { const v = price.textContent.trim();
  new IntersectionObserver(([e], o) => { if (!e.isIntersecting) return; o.disconnect(); roll(price, v); }, { threshold: .6 }).observe(price); }

// ---- 1 lime cut on primary buttons (not ghost buttons)
$$('.btn:not(.ghost)').forEach(b => {
  const s = document.createElement('i'); s.className = 'bcut'; s.setAttribute('aria-hidden', 'true'); b.prepend(s);
  b.addEventListener('pointerdown', () => { if (RM) return; b.classList.remove('cut'); void b.offsetWidth; b.classList.add('cut'); });
  s.addEventListener('animationend', () => b.classList.remove('cut'));
});

// ---- 2 shard-cut section headlines
if (!RM && window.gsap) $$('.sh h2').forEach(h => {
  const w = document.createElement('span'); w.className = 'shw'; h.parentNode.insertBefore(w, h); w.appendChild(h);
  const s = document.createElement('i'); s.className = 'shx'; s.setAttribute('aria-hidden', 'true'); w.appendChild(s);
  gsap.set(h, { clipPath: 'inset(0 100% 0 0)' });
  const tl = gsap.timeline({ paused: true });
  gsap.set(s, { x: 0, skewX: -16, xPercent: -130 });
  tl.to(s, { xPercent: 420, duration: 1.05, ease: 'power3.inOut' })
    .to(h, { clipPath: 'inset(0 0% 0 0)', duration: .9, ease: 'power3.inOut' }, .12);
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { tl.play(); o.disconnect(); } }, { threshold: .5 }).observe(w);
});

// ---- 3 before / after sliders
$$('.ba').forEach(ba => {
  const h = $('.bh', ba);
  const set = p => { p = Math.max(2, Math.min(98, p)); ba.style.setProperty('--p', p + '%'); h.setAttribute('aria-valuenow', Math.round(p)); };
  const at = x => { const r = ba.getBoundingClientRect(); set((x - r.left) / r.width * 100); };
  let drag = false;
  ba.addEventListener('pointerdown', e => { drag = true; ba.setPointerCapture(e.pointerId); at(e.clientX); ba.classList.add('on'); });
  ba.addEventListener('pointermove', e => { if (drag) at(e.clientX); });
  const end = () => { drag = false; ba.classList.remove('on'); }; ba.addEventListener('pointerup', end); ba.addEventListener('pointercancel', end);
  h.addEventListener('keydown', e => { const d = e.key === 'ArrowLeft' ? -5 : e.key === 'ArrowRight' ? 5 : 0; if (!d) return; e.preventDefault(); set(parseFloat(ba.style.getPropertyValue('--p') || 50) + d); });
  // a short demo sweep the first time it is seen, so people know it moves
  if (!RM) new IntersectionObserver(([e], o) => { if (!e.isIntersecting) return; o.disconnect();
    const t0 = performance.now(); const f = t => { const k = Math.min(1, (t - t0) / 1600), p = 50 + Math.sin(k * Math.PI * 2) * 22 * (1 - k); if (!drag) set(p); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f);
  }, { threshold: .6 }).observe(ba);
});

// ---- 5 tilt cards with light (pains + chapter cards)
if (!RM) $$('.pain, .chc').forEach(c => {
  c.classList.add('tlt');
  const go = e => { const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.style.setProperty('--rx', ((.5 - y) * 10).toFixed(2) + 'deg'); c.style.setProperty('--ry', ((x - .5) * 12).toFixed(2) + 'deg');
    c.style.setProperty('--gx', (x * 100).toFixed(1) + '%'); c.style.setProperty('--gy', (y * 100).toFixed(1) + '%'); c.classList.add('tilting'); };
  const off = () => { c.classList.remove('tilting'); c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); };
  c.addEventListener('pointermove', go); c.addEventListener('pointerdown', go);
  c.addEventListener('pointerleave', off); c.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') off(); }); c.addEventListener('pointercancel', off);
});

// ---- 6 marquee leans with scroll speed (speed + direction already follow the scroll in app.js)
{ const mq = $('.mtw') || ($('.mt') && $('.mt').parentElement);
  if (mq && !RM && window.gsap) { const sk = gsap.quickTo(mq, 'skewX', { duration: .5, ease: 'power3' }); let ly = scrollY, lt = performance.now(), tid = 0;
    addEventListener('scroll', () => { const t = performance.now(), v = (scrollY - ly) / Math.max(16, t - lt); ly = scrollY; lt = t;
      sk(Math.max(-9, Math.min(9, -v * 6))); clearTimeout(tid); tid = setTimeout(() => sk(0), 140); }, { passive: true }); } }

// ---- 7 reactive dot grids: dots near the cursor / finger turn Lime and swell
if (!RM) { const dgs = $$('.dg');
  const feel = (x, y) => dgs.forEach(d => { const r = d.getBoundingClientRect(), m = 120;
    if (x < r.left - m || x > r.right + m || y < r.top - m || y > r.bottom + m) { if (d.classList.contains('hot')) d.classList.remove('hot'); return; }
    d.classList.add('hot'); d.style.setProperty('--mx', (x - r.left) + 'px'); d.style.setProperty('--my', (y - r.top) + 'px'); });
  addEventListener('pointermove', e => feel(e.clientX, e.clientY), { passive: true });
  addEventListener('touchmove', e => { const t = e.touches[0]; if (t) feel(t.clientX, t.clientY); }, { passive: true });
  addEventListener('touchend', () => dgs.forEach(d => d.classList.remove('hot')), { passive: true }); }

// ---- 8 breathing hero title: Archivo's width axis follows the cursor (desktop) or the scroll (phones)
{ const ht = $('.ht');
  if (ht && !RM) { let cur = 115, tgt = 115, run = false;
    const tick = () => { cur += (tgt - cur) * .08; ht.style.fontStretch = cur.toFixed(1) + '%'; if (Math.abs(tgt - cur) > .05) requestAnimationFrame(tick); else run = false; };
    const want = v => { tgt = v; if (!run) { run = true; requestAnimationFrame(tick); } };
    if (FINE) { const hero = $('.hero');
      hero.addEventListener('pointermove', e => want(104 + (e.clientX / innerWidth) * 21));
      hero.addEventListener('pointerleave', () => want(115)); }
    else addEventListener('scroll', () => { const k = Math.min(1, scrollY / (innerHeight * .8)); want(115 - k * 15); }, { passive: true });
  } }

// ---- section transition: shard sweep into "Oana" (approved 22 Nov 2026). The brand shard crosses the screen and
// the section is revealed behind it, tied to the scroll.
{ const sec = $('#oana'), inner = sec && $('.abg', sec);
  if (sec && inner && !RM && window.gsap) {
    // a real brand shard (Crimson body, Pink band, Blush edge, Wine wedge), not a flat block; plays once, never parks on screen
    const sw = document.createElement('i'); sw.className = 'secsw'; sw.setAttribute('aria-hidden', 'true');
    sw.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="34,0 100,0 66,100 0,100" style="fill:var(--main);fill-opacity:.94"/><polygon points="26,0 34,0 0,100 -8,100" style="fill:var(--accdark);fill-opacity:.6"/><polygon points="22,0 26,0 -8,100 -12,100" style="fill:var(--hi);fill-opacity:.5"/><polygon points="78,0 100,0 92,34" style="fill:var(--dark);fill-opacity:.85"/></svg>';
    sec.appendChild(sw);
    gsap.set(sw, { xPercent: -130, autoAlpha: 1 }); gsap.set(inner, { clipPath: 'inset(0 100% 0 0)' });
    const tl = gsap.timeline({ paused: true })
      .to(sw, { xPercent: 190, duration: 1.25, ease: 'power3.inOut' }, 0)
      .to(inner, { clipPath: 'inset(0 0% 0 0)', duration: 1.05, ease: 'power3.inOut' }, .18)
      .set(sw, { autoAlpha: 0 });
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { tl.play(); o.disconnect(); } }, { threshold: .25 }).observe(sec);
  } }
})();
