(() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches, G = window.gsap;
// entrance
if (G && !RM) {
  G.from('.jhero .k, .jhero .j1, .jhero .j2, .jhero .p', { y: 40, opacity: 0, stagger: .12, duration: 1, ease: 'expo.out', delay: .1 });
  G.from('.cr', { y: 30, opacity: 0, stagger: .08, duration: .8, ease: 'power3.out', delay: .5 });
}
// criteria self-check
const ans = [null, null, null, null], bars = $$('.meter i'), cnt = $('.meter b'), nope = $('.nope'), sec = $('.jform');
let opened = false;
function update() {
  const ok = ans.filter(a => a === 1).length, anyNo = ans.some(a => a === 0);
  cnt.textContent = ok;
  bars.forEach((b, i) => b.classList.toggle('on', i < ok));
  nope.hidden = !anyNo;
  if (ok === 4 && !opened) { opened = true; sec.classList.add('open'); sec.setAttribute('aria-hidden', 'false');
    if (G && !RM) G.fromTo(sec, { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out' });
    setTimeout(() => sec.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }), 350);
    setTimeout(() => { const f = $('#jf input:not([type=hidden]):not(.hp)'); f && f.focus({ preventScroll: true }); }, 1100); }
  if (ok < 4 && opened) { opened = false; sec.classList.remove('open'); sec.setAttribute('aria-hidden', 'true'); }
}
$$('.cr').forEach(li => {
  const i = +li.dataset.i;
  $$('.yn button', li).forEach(b => b.addEventListener('click', () => {
    ans[i] = +b.dataset.v;
    $$('.yn button', li).forEach(x => x.setAttribute('aria-checked', x === b ? 'true' : 'false'));
    li.classList.toggle('yes', ans[i] === 1); li.classList.toggle('no', ans[i] === 0);
    if (G && !RM) G.fromTo($('.crn', li), { scale: .7 }, { scale: 1, duration: .6, ease: 'back.out(3)' });
    update();
  }));
});
// form
const form = $('#jf'), err = $('.ferr'), okBox = $('.jok');
form.addEventListener('submit', async e => {
  e.preventDefault(); err.textContent = '';
  if (!form.checkValidity()) { form.classList.add('tried'); const bad = $(':invalid', form); bad && bad.focus(); return; }
  if ($('.hp', form).checked) return;
  const btn = $('button[type=submit]', form), label = $('span', btn), was = label.textContent;
  btn.disabled = true; label.textContent = form.dataset.sending;
  const data = Object.fromEntries(new FormData(form)); delete data.botcheck;
  data.subject = `${data.subject}: ${data.Nume} (${data.Platforma}, ${data.Urmaritori})`; data.replyto = data.Email;
  try {
    const r = await fetch(form.dataset.to, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.success !== true) throw new Error(j.message || r.status);
    form.hidden = true; okBox.hidden = false;
    if (G && !RM) G.from(okBox.children, { y: 30, opacity: 0, stagger: .1, duration: .8, ease: 'expo.out' });
  } catch (x) {
    // never lose an application: offer the same data as a ready-written email
    const body = Object.entries(data).filter(([k]) => !['access_key','subject','from_name','replyto'].includes(k)).map(([k, v]) => `${k}: ${v}`).join('\n');
    err.innerHTML = '';
    err.append(form.dataset.err + ' ');
    const a = document.createElement('a'); a.href = `mailto:studioairwalk@gmail.com?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(body)}`;
    a.textContent = form.dataset.mail; a.style.textDecoration = 'underline'; err.append(a);
    btn.disabled = false; label.textContent = was; }
});
})();
