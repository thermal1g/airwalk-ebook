/* Calculators: calories (Oana's formula), protein, body fat (US Navy), realistic timeline. Pure estimates, recalculated live. */
(() => {
const sec = document.querySelector('.calc'); if (!sec) return;
const f = sec.querySelector('.cform'), o = k => sec.querySelector(`[data-o="${k}"]`);
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (n, d = 0) => n.toLocaleString('ro-RO', { minimumFractionDigits: d, maximumFractionDigits: d });
const shown = {};
function count(k, to, d = 0) {
  const el = o(k); if (!el) return; const from = shown[k] ?? 0; shown[k] = to;
  if (window.__odo) { window.__odo(el, fmt(to, d)); return; }
  if (RM || !window.gsap) { el.textContent = fmt(to, d); return; }
  const v = { n: from }; gsap.to(v, { n: to, duration: .8, ease: 'power3.out', overwrite: true, onUpdate: () => el.textContent = fmt(v.n, d) });
}
const num = n => { const el = f.elements[n]; const v = parseFloat(String(el.value).replace(',', '.')); const ok = !isNaN(v) && v >= +el.min && v <= +el.max; el.closest('.cin').classList.toggle('bad', !ok && el.value !== ''); return ok ? v : null; };
function run() {
  const sex = f.elements.sex.value; sec.dataset.sex = sex;
  const age = num('age'), h = num('h'), w = num('w'), t = num('t'), waist = num('waist'), neck = num('neck'), hip = num('hip'), act = +f.elements.act.value;
  // calories: target weight in pounds × 11–12 (Oana's formula), never below a safe floor
  if (t) {
    const lb = t * 2.20462, lo = lb * 11, hi = lb * 12, floor = sex === 'f' ? 1200 : 1500;
    const mid = Math.max(floor, Math.round((lo + hi) / 2 / 10) * 10);
    count('kcal', mid); o('kr').textContent = `${fmt(Math.max(floor, Math.round(lo / 10) * 10))}–${fmt(Math.max(floor, Math.round(hi / 10) * 10))} kcal`;
    if (age && h && w) {
      const bmr = 10 * w + 6.25 * h - 5 * age + (sex === 'f' ? -161 : 5), tdee = bmr * act, def = Math.round((tdee - mid) / 10) * 10;
      o('kcheck').textContent = def > 0 ? `Corpul tău consumă acum cam ${fmt(Math.round(tdee / 10) * 10)} kcal pe zi, deci asta înseamnă un deficit de ~${fmt(def)} kcal.` : `Corpul tău consumă acum cam ${fmt(Math.round(tdee / 10) * 10)} kcal pe zi: la ținta asta mănânci cât consumi.`;
    }
    count('prot', Math.round(t)); o('meal').textContent = `~${fmt(Math.round(t / 4))} g`;
  }
  // body fat, US Navy (cm)
  let bf = null;
  if (h && waist && neck && (sex === 'm' || hip)) {
    bf = sex === 'm' ? 495 / (1.0324 - .19077 * Math.log10(waist - neck) + .15456 * Math.log10(h)) - 450
                     : 495 / (1.29579 - .35004 * Math.log10(waist + hip - neck) + .221 * Math.log10(h)) - 450;
    if (!isFinite(bf) || bf < 3 || bf > 60) bf = null;
  }
  if (bf != null) {
    count('bf', bf, 1);
    const cats = sex === 'f' ? [[14, 'Nivel de competiție.'], [21, 'Atletic.'], [25, 'În formă.'], [32, 'Mediu.'], [99, 'Peste medie: aici ghidul face cea mai mare diferență.']]
                             : [[6, 'Nivel de competiție.'], [14, 'Atletic.'], [18, 'În formă.'], [25, 'Mediu.'], [99, 'Peste medie: aici ghidul face cea mai mare diferență.']];
    o('bfcat').textContent = cats.find(([m]) => bf < m)[1];
    sec.querySelector('.gval').style.strokeDashoffset = String(1 - Math.min(1, bf / 45));
  }
  // timeline: 0.5–1% of current weight per week
  if (w && t) {
    const weeks = r => { let x = w, n = 0; while (x > t && n < 520) { x -= x * r; n++; } return n; };
    const fast = weeks(.01), slow = weeks(.005);
    count('wk1', w > t ? fast : 0); count('wk2', w > t ? slow : 0);
    const path = r => { const n = Math.max(1, slow), pts = []; let x = w; for (let i = 0; i <= n; i++) { pts.push([i / n * 300, 10 + (w - Math.max(x, t)) / Math.max(.1, w - t) * 70]); x -= x * r; } return pts; };
    const d = pts => 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join('L');
    const a = path(.01), b = path(.005);
    sec.querySelector('.tline').setAttribute('d', d(a)); sec.querySelector('.tline2').setAttribute('d', d(b));
    sec.querySelector('.tfill').setAttribute('d', d(a) + 'L300 90L0 90Z');
  }
}
f.addEventListener('input', run); f.addEventListener('change', run);
let first = true;
const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && first) { first = false; run(); io.disconnect(); } }, { threshold: .25 });
io.observe(sec);
})();
