/*
 * Languages.
 *
 *  - English lives in data.js and below (UI). Every other language is a file in
 *    locales/<code>.js that only needs the strings it translates; anything
 *    missing falls back to English.
 *  - The choice comes from ?lang=xx, then the visitor's last choice, then the
 *    browser's language, then English.
 *  - Qur'anic Arabic and hadith references are never translated.
 *  - Switching language reloads the page at the same point of the journey.
 *
 * window.I18N = { lang, dir, langs, ui(key, vars), t(key, fallback), ready }
 */
(() => {
  'use strict';

  // Native name, direction, and the fonts each script needs (Google Fonts)
  const LANGS = {
    en: { name: 'English', dir: 'ltr' },
    ar: { name: 'العربية', dir: 'rtl', fonts: 'Noto+Naskh+Arabic:wght@400;500;600', serif: "'Amiri'", sans: "'Noto Naskh Arabic'" },
    bn: { name: 'বাংলা', dir: 'ltr', fonts: 'Anek+Bangla:wght@300;400;500;600', serif: "'Anek Bangla'", sans: "'Anek Bangla'" },
    ur: { name: 'اردو', dir: 'rtl', fonts: 'Noto+Nastaliq+Urdu:wght@400;500;600', serif: "'Noto Nastaliq Urdu'", sans: "'Noto Nastaliq Urdu'" },
    hi: { name: 'हिन्दी', dir: 'ltr', fonts: 'Noto+Serif+Devanagari:wght@400;500;600&family=Noto+Sans+Devanagari:wght@400;500', serif: "'Noto Serif Devanagari'", sans: "'Noto Sans Devanagari'" },
    id: { name: 'Bahasa Indonesia', dir: 'ltr' },
    tr: { name: 'Türkçe', dir: 'ltr' },
    fr: { name: 'Français', dir: 'ltr' },
    es: { name: 'Español', dir: 'ltr' },
    pt: { name: 'Português', dir: 'ltr' },
    ru: { name: 'Русский', dir: 'ltr' },
    zh: { name: '中文', dir: 'ltr', fonts: 'Noto+Serif+SC:wght@400;500;600&family=Noto+Sans+SC:wght@400;500', serif: "'Noto Serif SC'", sans: "'Noto Sans SC'" },
  };

  const UI_EN = {
    title: 'Al‑Isra’ wal‑Mi‘raj',
    subtitle: 'The Night Journey and the Ascension — from the earth of Makkah up to Sidrat al-Muntaha, and beneath it the warning of the Fire, as described in the Qur’an and authentic hadith.',
    scrollUp: 'Scroll up · ascend',
    scrollDown: 'Scroll down · the warning of the Fire',
    beginSound: 'Begin with sound',
    soundOn: 'Sound on',
    sound: 'Sound',
    sources: 'Sources',
    sourcesLede: 'Every scene is drawn from the Qur’an and from narrations in Sahih al-Bukhari and Sahih Muslim, with two further narrations graded sahih (Abu Dawud, at-Tirmidhi). The English is a careful paraphrase; please return to the full texts and to scholars for study.',
    sourcesNote: 'The visuals are symbolic light and geometry. No prophet, angel or person is depicted. Hadith numbers follow sunnah.com.',
    translationNote: '',
    close: 'Close',
    language: 'Language',
    earth: 'Earth',
    metHere: 'Met in this heaven',
    pbuh: 'peace be upon him',
    pbut: 'peace be upon them',
    atGate: 'At the gate',
    gatekeeper: 'Gatekeeper',
    jibril: 'Jibril',
    wine: 'Wine',
    declined: 'declined',
    milk: 'Milk',
    fitrah: 'al-fitrah ✓',
    dailyPrayers: 'daily prayers',
    enjoined: 'enjoined at first',
    returns: 'after {n} returns, at Musa’s urging',
    return1: 'after 1 return, at Musa’s urging',
    fiveFifty: 'five in deed — fifty in reward',
    riseEarth: 'Rise back to the Earth ↑',
    descendEarth: 'Descend to Earth ↓',
    nile: 'Nile',
    euphrates: 'Euphrates',
    paradiseRivers: 'rivers of Paradise',
  };

  window.LOCALES = window.LOCALES || {};

  function choose() {
    const q = new URLSearchParams(location.search).get('lang');
    if (q && LANGS[q]) return q;
    try { const s = localStorage.getItem('miraj-lang'); if (s && LANGS[s]) return s; } catch (_) { /* no storage */ }
    for (const l of navigator.languages || [navigator.language]) {
      const code = String(l || '').toLowerCase().split('-')[0];
      if (LANGS[code]) return code;
    }
    return 'en';
  }

  const lang = choose();
  const meta = LANGS[lang];
  const root = document.documentElement;
  root.lang = lang;
  root.dir = meta.dir;

  if (meta.fonts) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${meta.fonts}&display=swap`;
    document.head.append(link);
    if (meta.serif) root.style.setProperty('--serif', `${meta.serif}, var(--serif-fallback)`);
    if (meta.sans) root.style.setProperty('--sans', `${meta.sans}, var(--sans-fallback)`);
  }

  const ready = lang === 'en'
    ? Promise.resolve()
    : new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = `locales/${lang}.js`;
      s.onload = resolve;
      s.onerror = resolve; // fall back to English rather than a blank page
      document.head.append(s);
    });

  const pack = () => window.LOCALES[lang] || {};
  const I18N = {
    lang, dir: meta.dir, langs: LANGS, ready,
    ui(key, vars) {
      let s = pack().ui?.[key] ?? UI_EN[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
      return s;
    },
    t(key, fallback) { return pack().t?.[key] ?? fallback; },
    num(n) { try { return new Intl.NumberFormat(lang === 'ur' ? 'ur-PK' : lang).format(n); } catch (_) { return String(n); } },
  };
  window.I18N = I18N;

  /* ---------- the language menu ---------- */

  function buildMenu() {
    const controls = document.querySelector('.controls');
    if (!controls) return;
    const wrap = document.createElement('div');
    wrap.className = 'lang';
    wrap.innerHTML = `
      <button class="lang-btn" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="${I18N.ui('language')}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z"/></svg>
        <span>${meta.name}</span>
      </button>
      <ul class="lang-menu" role="listbox" aria-label="${I18N.ui('language')}" hidden>
        ${Object.entries(LANGS).map(([code, l]) => `<li><button type="button" role="option" lang="${code}" dir="${l.dir}" data-lang="${code}" aria-selected="${code === lang}">${l.name}</button></li>`).join('')}
      </ul>`;
    controls.prepend(wrap);
    const btn = wrap.querySelector('.lang-btn'), menu = wrap.querySelector('.lang-menu');
    const open = (on) => { menu.hidden = !on; btn.setAttribute('aria-expanded', String(on)); if (on) menu.querySelector('[aria-selected="true"]')?.focus(); };
    btn.addEventListener('click', () => open(menu.hidden));
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) open(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { open(false); btn.focus(); } });
    menu.addEventListener('click', (e) => {
      const code = e.target.closest('[data-lang]')?.dataset.lang;
      if (!code) return;
      if (code === lang) return open(false);
      try { localStorage.setItem('miraj-lang', code); } catch (_) { /* no storage */ }
      // come back to the same point of the journey
      try { sessionStorage.setItem('miraj-anchor', JSON.stringify(window.MirajNav?.anchor() || null)); } catch (_) { /* no storage */ }
      const url = new URL(location.href);
      url.searchParams.set('lang', code);
      location.replace(url);
    });
  }

  // Static text in index.html
  function translateStatic() {
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = I18N.ui(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-label]').forEach((el) => el.setAttribute('aria-label', I18N.ui(el.dataset.i18nLabel)));
    const note = I18N.ui('translationNote');
    const noteEl = document.querySelector('.sources__translation');
    if (noteEl) { noteEl.textContent = note; noteEl.hidden = !note; }
  }

  ready.then(() => {
    translateStatic();
    buildMenu();
  });
})();
