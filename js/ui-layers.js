// ---------- Pannello livelli ----------
function moveLayer(id, dir) {
  pushHistory();
  const i = state.elements.findIndex(e => e.id === id);
  const j = i + dir;
  if (i === -1 || j < 0 || j >= state.elements.length) return;
  [state.elements[i], state.elements[j]] = [state.elements[j], state.elements[i]];
  renderLayersList();
  render();
  if (state.allEditMode) renderAllElementsBar();
}

function toggleLayerVisibility(id) {
  pushHistory();
  const el = state.elements.find(e => e.id === id);
  if (!el) return;
  el.visible = !el.visible;
  renderLayersList();
  render();
  if (state.allEditMode) renderAllElementsBar();
}

// Etichetta breve per il pannello livelli / card, delegata al tipo nel registro.
function layerLabel(el) { return getElementType(el.type).label(el); }
function layerIcon(el) { return getElementType(el.type).icon; }

function renderLayersList() {
  const layersList = document.getElementById('layersList');
  layersList.innerHTML = '';
  const displayOrder = [...state.elements].reverse();
  displayOrder.forEach(el => {
    const idx = state.elements.indexOf(el);
    const row = document.createElement('div');
    row.className = 'layer-row' + (el.id === state.selectedId ? ' selected' : '');
    row.innerHTML = `
      <button class="layer-btn" data-act="vis" title="${t('title_vis')}">${el.visible ? '👁' : '🙈'}</button>
      <span class="layer-icon">${layerIcon(el)}</span>
      <span class="layer-name">${layerLabel(el)}</span>
      <div class="layer-actions">
        <button class="layer-btn" data-act="up" title="${t('title_up')}">▲</button>
        <button class="layer-btn" data-act="down" title="${t('title_down')}">▼</button>
        <button class="layer-btn" data-act="del" title="${t('title_del')}">🗑</button>
      </div>
    `;
    row.addEventListener('click', () => selectElement(el.id));
    row.querySelector('[data-act="vis"]').addEventListener('click', ev => { ev.stopPropagation(); toggleLayerVisibility(el.id); });
    const upBtn = row.querySelector('[data-act="up"]');
    const downBtn = row.querySelector('[data-act="down"]');
    const delBtn = row.querySelector('[data-act="del"]');
    upBtn.disabled = idx === state.elements.length - 1;
    downBtn.disabled = idx === 0;
    upBtn.addEventListener('click', ev => { ev.stopPropagation(); moveLayer(el.id, 1); });
    downBtn.addEventListener('click', ev => { ev.stopPropagation(); moveLayer(el.id, -1); });
    delBtn.addEventListener('click', ev => { ev.stopPropagation(); deleteElement(el.id); });
    layersList.appendChild(row);
  });
  const bgRow = document.createElement('div');
  bgRow.className = 'layer-row locked';
  bgRow.innerHTML = `<span class="layer-icon">🔒</span><span class="layer-name">${t('bg_layer_label')}</span>`;
  layersList.appendChild(bgRow);
}
