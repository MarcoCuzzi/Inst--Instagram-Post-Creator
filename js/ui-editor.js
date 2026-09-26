// ---------- Editor dell'elemento selezionato (pannello laterale) ----------
//
// Il markup dei campi e la loro logica vengono dal registro ELEMENT_TYPES
// (fieldsHTML/wireFields): questo file si occupa solo del "guscio" attorno
// ai campi (titolo, blocco, bottone elimina) e di collegare l'elemento
// selezionato al DOM.

function renderElementEditor() {
  const container = document.getElementById('elementEditor');
  const el = getSelected();
  if (!el) { container.innerHTML = `<div class="editor-empty">${t('editor_empty')}</div>`; return; }

  const def = getElementType(el.type);
  container.innerHTML = `
    <div class="editor-block">
      <div class="editor-kind">${t(def.kindKey)}</div>
      ${def.fieldsHTML(el)}
      <button class="delete-btn" id="edDelete">${t(def.deleteKey)}</button>
    </div>
  `;

  def.wireFields(container, el, {
    pushHistory,
    render,
    onDirty() { renderLayersList(); if (state.allEditMode) syncCardLabel(el.id); },
    afterResize() { syncSizeDisplays(el); },
    refreshFields() { renderElementEditor(); }
  });

  document.getElementById('edDelete').addEventListener('click', () => deleteElement(el.id));
}

function selectElement(id) {
  state.selectedId = id;
  renderElementEditor();
  renderLayersList();
  renderSkeletonOverlay();
  syncAllElementsBarSelection();
}

function deleteElement(id) {
  pushHistory();
  const idx = state.elements.findIndex(e => e.id === id);
  if (idx === -1) return;
  state.elements.splice(idx, 1);
  if (state.selectedId === id) {
    state.selectedId = state.elements.length ? state.elements[state.elements.length - 1].id : null;
  }
  renderElementEditor();
  renderLayersList();
  render();
  if (state.allEditMode) renderAllElementsBar();
}

// Aggiorna gli slider/valori mostrati per un elemento all'interno di un
// qualsiasi contenitore di campi (editor singolo o card "modifica tutti"),
// usando i selettori data-field generati da fieldsHTML(). Usata quando la
// dimensione cambia da un punto diverso dallo slider stesso (es. trascinando
// la maniglia di resize sul canvas).
function syncSizeFields(container, el) {
  const setField = (field, value) => {
    const slider = container.querySelector(`[data-field="${field}"]`);
    const val = container.querySelector(`[data-field="${field}Val"]`);
    if (slider) slider.value = value;
    if (val) val.textContent = value;
  };
  if (el.type === 'text') setField('font', el.fontSize);
  else if (el.type === 'profile') setField('size', el.avatarSize);
  else if (el.type === 'circle') setField('radius', el.radius);
  else if (el.type === 'line') { setField('length', el.length); setField('angle', el.angle); }
  else if (el.type === 'rect' || el.type === 'rhombus') { setField('width', el.width); setField('height', el.height); }
}

// Sincronizza sia l'editor singolo (se questo elemento è quello selezionato)
// sia l'eventuale card nella barra "modifica tutti".
function syncSizeDisplays(el) {
  if (state.selectedId === el.id) {
    syncSizeFields(document.getElementById('elementEditor'), el);
  }
  const card = document.querySelector(`.all-el-card[data-id="${el.id}"]`);
  if (card) syncSizeFields(card, el);
}
