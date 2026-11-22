/* Palette picker for client previews only: shown with ?preview=1 (kept for the browser session).
   ?paleta=<n> opens the page in that palette. Buyers never see the picker. */
(() => {
  const H = document.documentElement, P = window.PALS || [];
  let prev = H.dataset.preview === '1' || location.hash === '#preview'; try { prev = prev || sessionStorage.getItem('aw_prev') === '1'; } catch (e) {}
  const apply = (n, save) => {
    if (!P.find(p => p[0] === n)) n = '1';
    H.dataset.pal = n;
    document.querySelectorAll('img[data-k]').forEach(i => { const s = `assets/pg/p${n}/${i.dataset.k}.webp`; if (!i.src.endsWith(s)) i.src = s; });
    const m = document.querySelector('meta[name=theme-color]'); const p = P.find(x => x[0] === n); if (m && p) m.content = p[4];
    document.querySelectorAll('.palm button').forEach(b => b.setAttribute('aria-checked', b.dataset.p === n));
    dispatchEvent(new Event('palchange'));
    if (save) { try { sessionStorage.setItem('aw_pal', n); } catch (e) {}
      if (H.dataset.preview !== '1') { const u = new URL(location.href); u.searchParams.set('paleta', n); history.replaceState(null, '', u); } }
  };
  if (H.dataset.pal !== '1') apply(H.dataset.pal, false);
  if (!prev) return;
  const box = document.querySelector('.palp'), btn = box.querySelector('.palb'), menu = box.querySelector('.palm');
  menu.innerHTML = '<div class="tt">Paleta de culori</div>' + P.map(([n, name, main, dark, bg]) =>
    `<button type="button" role="radio" data-p="${n}" aria-checked="${H.dataset.pal === n}"><span class="sw"><i style="background:${main}"></i><i style="background:${dark}"></i><i style="background:${bg}"></i></span>${n} · ${name}</button>`).join('');
  box.hidden = false;
  btn.addEventListener('click', () => { const o = box.classList.toggle('open'); btn.setAttribute('aria-expanded', o); });
  menu.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; apply(b.dataset.p, true); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && box.classList.contains('open')) { box.classList.remove('open'); btn.setAttribute('aria-expanded', false); btn.focus(); } });
  document.addEventListener('click', e => { if (!box.contains(e.target)) { box.classList.remove('open'); btn.setAttribute('aria-expanded', false); } });
})();
