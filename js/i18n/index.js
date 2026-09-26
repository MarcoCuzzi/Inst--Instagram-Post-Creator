// ---------- i18n: motore di traduzione ----------
// I dizionari delle singole lingue (I18N_IT, I18N_EN, ...) sono definiti
// nei rispettivi file js/i18n/<lang>.js, caricati PRIMA di questo file.
// Per aggiungere una lingua: crea js/i18n/xx.js con "const I18N_XX = {...}",
// includilo in index.html e aggiungi la riga qui sotto.
const T = {
  it: I18N_IT,
  en: I18N_EN,
  es: I18N_ES,
  fr: I18N_FR,
  de: I18N_DE
};

const LANG_KEY = 'ig-post-creator-lang';
const SUPPORTED_LANGS = Object.keys(T);
let currentLang = 'it';

function t(key) { return (T[currentLang] && T[currentLang][key]) || T.it[key] || key; }

function detectLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
  } catch (err) { /* localStorage non disponibile */ }
  const nav = (navigator.language || navigator.userLanguage || 'it').slice(0, 2).toLowerCase();
  return SUPPORTED_LANGS.includes(nav) ? nav : 'en';
}

function applyLanguage(lang) {
  currentLang = SUPPORTED_LANGS.includes(lang) ? lang : 'en';
  document.documentElement.lang = currentLang;
  try { localStorage.setItem(LANG_KEY, currentLang); } catch (err) { /* storage non disponibile */ }
  document.querySelectorAll('[data-i18n]').forEach(elm => {
    const key = elm.getAttribute('data-i18n');
    if (T[currentLang][key] != null) elm.innerHTML = T[currentLang][key];
  });
  document.querySelectorAll('[data-i18n-tooltip]').forEach(elm => {
    const key = elm.getAttribute('data-i18n-tooltip');
    if (T[currentLang][key] != null) elm.setAttribute('data-tooltip', T[currentLang][key]);
  });
  const sel = document.getElementById('langSelect');
  if (sel) sel.value = currentLang;
  if (typeof renderElementEditor === 'function') renderElementEditor();
  if (typeof renderLayersList === 'function') renderLayersList();
  if (typeof state !== 'undefined' && state.allEditMode && typeof renderAllElementsBar === 'function') renderAllElementsBar();
}

// Collega la <select> della lingua. Chiamata da main.js in fase di init.
function wireLanguageSelect() {
  document.getElementById('langSelect').addEventListener('change', e => applyLanguage(e.target.value));
}
