// ---------- Toolbar sopra al canvas ----------
const toolSelect = document.getElementById('toolSelect');
const toolMove = document.getElementById('toolMove');
const toolLayers = document.getElementById('toolLayers');
const toolUndo = document.getElementById('toolUndo');
const toolSkeleton = document.getElementById('toolSkeleton');
const toolEditAll = document.getElementById('toolEditAll');
const layersPanel = document.getElementById('layersPanel');
const canvasWrap = document.querySelector('.canvas-wrap');
const skeletonOverlay = document.getElementById('skeletonOverlay');
const allElementsBar = document.getElementById('allElementsBar');
const allElementsScroll = document.getElementById('allElementsScroll');

function setDragMode(on) {
  state.dragMode = on;
  toolMove.classList.toggle('active', on);
  toolSelect.classList.toggle('active', !on);
  canvas.style.cursor = on ? 'grab' : 'default';
  render();
}

function setSkeletonMode(on) {
  state.skeletonMode = on;
  toolSkeleton.classList.toggle('active', on);
  canvasWrap.classList.toggle('skeleton-active', on);
  renderSkeletonOverlay();
}

function renderSkeletonOverlay() {
  if (!state.skeletonMode) {
    skeletonOverlay.classList.remove('active');
    skeletonOverlay.innerHTML = '';
    return;
  }
  skeletonOverlay.classList.add('active');
  skeletonOverlay.innerHTML = '';
  const scaleX = canvas.clientWidth / canvas.width;
  const scaleY = canvas.clientHeight / canvas.height;
  const margin = 10 * (canvas.width / 1080);

  state.elements.forEach(el => {
    if (!el.visible || !el._bbox) return;
    const b = el._bbox;
    const box = document.createElement('div');
    box.className = 'skeleton-box' + (el.id === state.selectedId ? ' selected' : '');
    box.style.left = ((b.x - margin) * scaleX) + 'px';
    box.style.top = ((b.y - margin) * scaleY) + 'px';
    box.style.width = ((b.w + margin * 2) * scaleX) + 'px';
    box.style.height = ((b.h + margin * 2) * scaleY) + 'px';

    const label = document.createElement('span');
    label.className = 'skeleton-label';
    label.textContent = `${layerIcon(el)} ${layerLabel(el)}`;
    box.appendChild(label);

    box.addEventListener('click', ev => {
      ev.stopPropagation();
      selectElement(el.id);
      renderSkeletonOverlay();
    });

    skeletonOverlay.appendChild(box);
  });
}

function setAllEditMode(on) {
  state.allEditMode = on;
  toolEditAll.classList.toggle('active', on);
  allElementsBar.classList.toggle('open', on);
  if (on) renderAllElementsBar();
}

// Collega tutti i pulsanti della toolbar. Chiamata da main.js in fase di init.
function wireToolbar() {
  toolSkeleton.addEventListener('click', () => setSkeletonMode(!state.skeletonMode));
  toolEditAll.addEventListener('click', () => setAllEditMode(!state.allEditMode));
  toolMove.addEventListener('click', () => setDragMode(true));
  toolSelect.addEventListener('click', () => setDragMode(false));
  toolLayers.addEventListener('click', () => {
    layersPanel.classList.toggle('open');
    toolLayers.classList.toggle('active', layersPanel.classList.contains('open'));
    if (layersPanel.classList.contains('open')) renderLayersList();
  });
  toolUndo.addEventListener('click', undo);
  window.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
  });
  window.addEventListener('resize', () => { if (state.skeletonMode) renderSkeletonOverlay(); });
}
