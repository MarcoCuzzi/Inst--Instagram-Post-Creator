// ---------- Download PNG + esporta/importa struttura layout (solo dati, niente immagini) ----------
function buildStructureExport() {
  return {
    app: 'ig-post-creator-struttura',
    version: 1,
    exportedAt: new Date().toISOString(),
    format: state.format,
    bgMode: state.bgMode === 'image' ? 'color' : state.bgMode,
    bgColor: state.bgColor,
    elements: state.elements.map(el => {
      const { _bbox, _handle, _endPoint, avatarImage, ...rest } = el;
      return rest;
    })
  };
}

function importStructure(data) {
  pushHistory();
  state.format = FORMATS[data.format] ? data.format : state.format;
  state.bgColor = typeof data.bgColor === 'string' ? data.bgColor : state.bgColor;
  state.bgMode = 'color'; // la struttura esportata non include immagini di sfondo
  state.bgImage = null;

  const rawElements = Array.isArray(data.elements) ? data.elements : [];
  const imported = rawElements.map(raw => elementFromPlainData(raw, { preserveId: false }));
  if (imported.length) {
    state.elements = imported;
    state.selectedId = imported[0].id;
  }

  syncTopLevelUI();
  renderElementEditor();
  renderLayersList();
  if (state.allEditMode) renderAllElementsBar();
  render();
}

// Collega download PNG, export/import struttura e reset autosave. Chiamata da main.js.
function wireIo() {
  document.getElementById('downloadBtn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `post-${state.format}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  document.getElementById('exportStructBtn').addEventListener('click', () => {
    const data = buildStructureExport();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `post-layout-${state.format}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('importStructInput').addEventListener('change', e => {
    const file = e.target.files[0];
    e.target.value = ''; // permette di reimportare lo stesso file una seconda volta
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        importStructure(data);
      } catch (err) {
        alert(t('alert_invalid_json'));
      }
    };
    reader.onerror = () => alert(t('alert_read_error'));
    reader.readAsText(file);
  });

  document.getElementById('clearAutosaveBtn').addEventListener('click', () => {
    const ok = confirm(t('confirm_clear'));
    if (!ok) return;
    try { localStorage.removeItem(AUTOSAVE_KEY); } catch (err) { /* storage non disponibile: nulla da fare */ }
    location.reload();
  });
}
