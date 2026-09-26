// ---------- Barra "modifica tutti" ----------
//
// Usa lo stesso registro ELEMENT_TYPES (fieldsHTML/wireFields) dell'editor
// singolo in ui-editor.js: i campi per ciascun tipo sono definiti una sola
// volta, qui viene solo costruita la card con intestazione ed azioni.

function buildAllElCard(el) {
  const card = document.createElement('div');
  card.className = 'all-el-card' + (el.id === state.selectedId ? ' selected' : '');
  card.dataset.id = el.id;
  card.addEventListener('click', () => { if (state.selectedId !== el.id) selectElement(el.id); });
  card.addEventListener('focusin', () => { if (state.selectedId !== el.id) selectElement(el.id); });

  const head = document.createElement('div');
  head.className = 'all-el-card-head';
  head.innerHTML = `
    <span class="editor-kind" style="margin:0;">${layerIcon(el)} ${layerLabel(el).replace(/</g, '&lt;')}</span>
    <div class="all-el-card-actions">
      <button class="layer-btn" data-act="vis" title="${t('title_vis')}">${el.visible ? '👁' : '🙈'}</button>
      <button class="layer-btn" data-act="del" title="${t('title_del')}">🗑</button>
    </div>
  `;
  card.appendChild(head);
  head.querySelector('[data-act="vis"]').addEventListener('click', ev => { ev.stopPropagation(); toggleLayerVisibility(el.id); });
  head.querySelector('[data-act="del"]').addEventListener('click', ev => { ev.stopPropagation(); deleteElement(el.id); });

  const body = document.createElement('div');
  card.appendChild(body);

  const renderBody = () => {
    const def = getElementType(el.type);
    body.innerHTML = def.fieldsHTML(el);
    def.wireFields(body, el, {
      pushHistory,
      render,
      onDirty() {
        head.querySelector('.editor-kind').textContent = `${layerIcon(el)} ${layerLabel(el)}`;
        renderLayersList();
        if (el.id === state.selectedId) renderElementEditor();
      },
      afterResize() { syncSizeDisplays(el); },
      refreshFields: renderBody
    });
  };
  renderBody();

  return card;
}

function syncCardLabel(id) {
  const card = allElementsScroll && allElementsScroll.querySelector(`.all-el-card[data-id="${id}"]`);
  if (!card) return;
  const el = state.elements.find(e => e.id === id);
  if (!el) return;
  card.querySelector('.editor-kind').textContent = `${layerIcon(el)} ${layerLabel(el)}`;
}

function renderAllElementsBar() {
  allElementsScroll.innerHTML = '';
  if (!state.elements.length) {
    allElementsScroll.innerHTML = `<div class="editor-empty">${t('all_elements_empty')}</div>`;
    return;
  }
  [...state.elements].reverse().forEach(el => allElementsScroll.appendChild(buildAllElCard(el)));
}

function syncAllElementsBarSelection() {
  document.querySelectorAll('.all-el-card').forEach(c => c.classList.toggle('selected', c.dataset.id === state.selectedId));
}
