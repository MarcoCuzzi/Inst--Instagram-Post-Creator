// ---------- Pannello sinistro: formato, sfondo, aggiunta elementi ----------
const colorPalette = ['#7c5cff', '#ff5c8a', '#111318', '#ffffff', '#f4a940', '#2fbf71', '#2f7bbf', '#e63946', '#1d1d29'];
const textColorPalette = ['#ffffff', '#111318', '#7c5cff', '#ff5c8a', '#f4a940', '#2fbf71'];

function buildSwatches(container, palette, activeVal, onPick) {
  container.innerHTML = '';
  palette.forEach(c => {
    const el = document.createElement('div');
    el.className = 'swatch' + (c === activeVal ? ' active' : '');
    el.style.background = c;
    el.style.border = c === '#ffffff' ? '2px solid #444' : '2px solid transparent';
    el.addEventListener('click', () => onPick(c));
    container.appendChild(el);
  });
}

function findFormatBtnActive() {
  document.querySelectorAll('#formatSeg button').forEach(b => b.classList.toggle('active', b.dataset.fmt === state.format));
}

function syncTopLevelUI() {
  findFormatBtnActive();
  document.querySelectorAll('#bgModeSeg button').forEach(b => b.classList.toggle('active', b.dataset.mode === state.bgMode));
  document.getElementById('bgColorField').style.display = state.bgMode === 'color' ? 'block' : 'none';
  document.getElementById('bgImageField').style.display = state.bgMode === 'image' ? 'block' : 'none';
  document.getElementById('customColor').value = state.bgColor;
  buildSwatches(document.getElementById('colorSwatches'), colorPalette, state.bgColor, c => {
    pushHistory(); state.bgColor = c; document.getElementById('customColor').value = c; render();
  });
}

// Carica un file immagine (input[type=file]) e richiama cb(img) con l'Image pronta.
function loadImageFile(input, cb) {
  input.addEventListener('change', () => {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => { pushHistory(); cb(img); render(); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Aggiunge una forma (linea/rettangolo/cerchio/rombo) usando i valori di default
// definiti in element-types.js per quel tipo (via elementFromPlainData con dati vuoti).
function addShapeElement(type) {
  pushHistory();
  const count = state.elements.filter(el => el.type === type).length;
  const yFrac = Math.min(0.75, 0.28 + count * 0.09);
  const xFrac = type === 'circle' ? 0.5 : 0.3;
  const el = elementFromPlainData({ type, xFrac, yFrac }, { preserveId: false });
  state.elements.push(el);
  state.selectedId = el.id;
  renderElementEditor();
  renderLayersList();
  render();
  if (state.allEditMode) renderAllElementsBar();
}

function addTextElement() {
  pushHistory();
  const count = state.elements.filter(e => e.type === 'text').length;
  const el = ELEMENT_TYPES.text.createNew(count);
  state.elements.push(el);
  state.selectedId = el.id;
  renderElementEditor();
  renderLayersList();
  render();
  if (state.allEditMode) renderAllElementsBar();
}

function addProfileElement() {
  pushHistory();
  const count = state.elements.filter(e => e.type === 'profile').length;
  const el = ELEMENT_TYPES.profile.createNew(count);
  state.elements.push(el);
  state.selectedId = el.id;
  renderElementEditor();
  renderLayersList();
  render();
  if (state.allEditMode) renderAllElementsBar();
}

// Collega tutti gli eventi del pannello sinistro. Chiamata da main.js in fase di init.
function wirePanel() {
  document.getElementById('formatSeg').addEventListener('click', e => {
    const btn = e.target.closest('button'); if (!btn) return;
    pushHistory();
    state.format = btn.dataset.fmt;
    findFormatBtnActive();
    render();
  });

  document.getElementById('bgModeSeg').addEventListener('click', e => {
    const btn = e.target.closest('button'); if (!btn) return;
    pushHistory();
    state.bgMode = btn.dataset.mode;
    syncTopLevelUI();
    render();
  });

  document.getElementById('customColor').addEventListener('focus', () => pushHistory());
  document.getElementById('customColor').addEventListener('input', e => {
    state.bgColor = e.target.value;
    buildSwatches(document.getElementById('colorSwatches'), colorPalette, state.bgColor, c => {
      pushHistory(); state.bgColor = c; document.getElementById('customColor').value = c; render();
    });
    render();
  });

  loadImageFile(document.getElementById('bgImageInput'), img => { state.bgImage = img; });

  document.getElementById('addTextBtn').addEventListener('click', addTextElement);
  document.getElementById('addProfileBtn').addEventListener('click', addProfileElement);

  const objectsMenu = document.getElementById('objectsMenu');
  document.getElementById('addObjectBtn').addEventListener('click', e => {
    e.stopPropagation();
    objectsMenu.classList.toggle('open');
  });
  document.addEventListener('click', () => objectsMenu.classList.remove('open'));
  objectsMenu.addEventListener('click', e => e.stopPropagation());
  objectsMenu.querySelectorAll('button[data-shape]').forEach(btn => {
    btn.addEventListener('click', () => {
      addShapeElement(btn.getAttribute('data-shape'));
      objectsMenu.classList.remove('open');
    });
  });
}
