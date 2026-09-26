// ---------- Salvataggio automatico (localStorage) ----------
const AUTOSAVE_KEY = 'ig-post-creator-autosave-v1';
let autosaveTimer = null;

function imageFromSrc(src) {
  return new Promise(resolve => {
    if (!src || typeof src !== 'string') { resolve(null); return; }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function serializeElementForStorage(el) {
  const { _bbox, _handle, _endPoint, ...rest } = el;
  if (rest.type === 'profile') rest.avatarImage = el.avatarImage ? el.avatarImage.src : null;
  return rest;
}

function buildAutosavePayload() {
  return {
    version: 1,
    format: state.format,
    bgMode: state.bgMode,
    bgColor: state.bgColor,
    bgImage: state.bgImage ? state.bgImage.src : null,
    elements: state.elements.map(serializeElementForStorage),
    selectedId: state.selectedId
  };
}

function saveAutosave() {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(buildAutosavePayload()));
  } catch (err) {
    // Probabile quota di storage superata (es. immagini molto pesanti): riprova senza immagini
    // così almeno testo, posizioni e colori restano salvati.
    try {
      const payload = buildAutosavePayload();
      payload.bgImage = null;
      payload.elements = payload.elements.map(el => ({ ...el, avatarImage: null }));
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
    } catch (err2) {
      console.warn('Salvataggio automatico non riuscito:', err2);
    }
  }
}

function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(saveAutosave, 500);
}

async function applyAutosavePayload(data) {
  state.format = FORMATS[data.format] ? data.format : state.format;
  state.bgMode = data.bgMode === 'image' ? 'image' : 'color';
  state.bgColor = typeof data.bgColor === 'string' ? data.bgColor : state.bgColor;
  state.bgImage = await imageFromSrc(data.bgImage);

  const rawElements = Array.isArray(data.elements) ? data.elements : [];
  const restored = [];
  for (const raw of rawElements) {
    const el = elementFromPlainData(raw, { preserveId: true });
    if (el.type === 'profile') el.avatarImage = await imageFromSrc(raw && raw.avatarImage);
    restored.push(el);
  }
  if (restored.length) state.elements = restored;
  state.selectedId = (data.selectedId && state.elements.some(e => e.id === data.selectedId))
    ? data.selectedId
    : (state.elements[0] ? state.elements[0].id : null);
}

async function loadAutosaveIfPresent() {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    await applyAutosavePayload(data);
    return true;
  } catch (err) {
    console.warn('Impossibile ripristinare il salvataggio automatico:', err);
    return false;
  }
}

// ---------- Undo/history ----------
let history = [];
const MAX_HISTORY = 40;

function cloneState() {
  return {
    format: state.format,
    bgMode: state.bgMode,
    bgColor: state.bgColor,
    bgImage: state.bgImage,
    elements: state.elements.map(el => ({ ...el })),
    selectedId: state.selectedId
  };
}
function pushHistory() {
  history.push(cloneState());
  if (history.length > MAX_HISTORY) history.shift();
  updateUndoButton();
}
function updateUndoButton() {
  document.getElementById('toolUndo').disabled = history.length === 0;
}
function undo() {
  if (!history.length) return;
  const prev = history.pop();
  state.format = prev.format;
  state.bgMode = prev.bgMode;
  state.bgColor = prev.bgColor;
  state.bgImage = prev.bgImage;
  state.elements = prev.elements;
  state.selectedId = prev.selectedId;
  syncTopLevelUI();
  renderLayersList();
  renderElementEditor();
  render();
  updateUndoButton();
  if (state.allEditMode) renderAllElementsBar();
  syncAllElementsBarSelection();
}
