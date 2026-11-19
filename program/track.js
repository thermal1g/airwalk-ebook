/* Airwalk: traffic source + Google Analytics 4 behind consent.
   - Remembers where the visitor first came from (UTM tags, else referring site, else "direct")
     and hands it to the application form (window.awSource()).
   - Google Analytics loads ONLY after the visitor clicks Accept. No cookies before that.
   - GA4 ID comes from data-ga on this script tag; empty = no banner, no analytics. */
(() => {
  const S = document.currentScript, GA = (S && S.dataset.ga || '').trim(), POL = S && S.dataset.policy;
  const RO = (document.documentElement.lang || 'ro').startsWith('ro');
  const store = {
    get: k => { try { return localStorage.getItem(k) } catch (e) { return null } },
    set: (k, v) => { try { localStorage.setItem(k, v) } catch (e) {} }
  };

  // ---- traffic source (first touch, kept 30 days; a new UTM link overrides it)
  const q = new URLSearchParams(location.search);
  const utm = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].map(k => q.get(k)).filter(Boolean);
  let src = null;
  if (utm.length) src = utm.join(' / ');
  else {
    try { const r = document.referrer && new URL(document.referrer); if (r && r.host !== location.host) src = 'referral / ' + r.host.replace(/^www\./, ''); } catch (e) {}
  }
  // Remembered across pages/visits only after the visitor accepts (Cookie Policy). Without consent: this page's source only, nothing stored.
  const here = { s: src || 'direct', t: Date.now(), p: location.pathname };
  const persist = () => { try {
    const old = JSON.parse(store.get('aw_src') || 'null'); const fresh = old && Date.now() - old.t < 30 * 864e5;
    if (!fresh || utm.length) store.set('aw_src', JSON.stringify(here));
  } catch (e) {} };
  if (store.get('aw_consent') === 'yes') persist();
  window.awSource = () => { try { const o = store.get('aw_consent') === 'yes' ? JSON.parse(store.get('aw_src') || 'null') : here; return o ? o.s + ' (landed on ' + o.p + ')' : 'direct' } catch (e) { return 'unknown' } };

  // ---- Google Analytics 4, only after consent
  window.awTrack = () => {};
  if (!GA) return;
  let loaded = false;
  const load = () => {
    if (loaded) return; loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments) };
    gtag('js', new Date());
    gtag('config', GA, { anonymize_ip: true });
    const s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA);
    document.head.appendChild(s);
    window.awTrack = (ev, p) => gtag('event', ev, p || {});
  };

  const css = `#awc{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin-left:auto;background:#0c0c0c;color:#F5F5F1;border:1px solid #2a2a2a;box-shadow:0 30px 80px rgba(0,0,0,.6);padding:22px 24px;font:15px/1.5 A,"Archivo",system-ui,sans-serif}
#awc p{margin:0 0 16px}#awc p a{color:#fff;text-decoration:underline}#awc .r{display:flex;gap:10px;flex-wrap:wrap}
#awc button{cursor:pointer;border:0;padding:12px 20px;font:800 13px/1 G,"Wide","Archivo",system-ui,sans-serif;font-stretch:130%;letter-spacing:.08em;text-transform:uppercase}
#awc .y{background:#E50914;color:#fff}#awc .n{background:transparent;color:#F5F5F1;border:1px solid #444}
#awc button:focus-visible{outline:2px solid #fff;outline-offset:2px}`;
  const T = RO
    ? { p: `Folosim Google Analytics și reținem de unde ai ajuns pe site, doar dacă accepți. Detalii în <a href="${POL || '/cookie-uri/'}">Politica de cookie-uri</a>.`, y: 'Accept', n: 'Refuz' }
    : { p: `We use Google Analytics and remember where you came from, only if you accept. Details in our <a href="${POL || '/en/cookies/'}">Cookie Policy</a>.`, y: 'Accept', n: 'Decline' };
  const banner = () => {
    if (document.getElementById('awc')) return;
    if (!document.getElementById('awcs')) { const st = document.createElement('style'); st.id = 'awcs'; st.textContent = css; document.head.appendChild(st); }
    const d = document.createElement('div'); d.id = 'awc'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Cookies');
    d.innerHTML = `<p>${T.p}</p><div class=r><button class=y type=button>${T.y}</button><button class=n type=button>${T.n}</button></div>`;
    d.querySelector('.y').onclick = () => { store.set('aw_consent', 'yes'); persist(); d.remove(); load(); };
    d.querySelector('.n').onclick = () => {
      const was = store.get('aw_consent'); store.set('aw_consent', 'no'); try { localStorage.removeItem('aw_src') } catch (e) {} d.remove();
      if (was === 'yes') { document.cookie.split(';').forEach(c => { const n = c.split('=')[0].trim(); if (/^_ga/.test(n)) document.cookie = n + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.' + location.hostname.replace(/^www\./, ''); }); location.reload(); }
    };
    document.body.appendChild(d);
  };
  window.awConsent = banner; // footer link "Cookie-uri" reopens the choice
  const c = store.get('aw_consent');
  if (c === 'yes') load();
  else if (c !== 'no') {
    const go = () => setTimeout(banner, document.querySelector('script[src*="loader.js"]') ? 5200 : 600); // wait for the phone loader to finish
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', go) : go();
  }
})();
