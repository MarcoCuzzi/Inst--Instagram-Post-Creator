// ---------- Drag interaction (sposta/ridimensiona sul canvas) ----------
let dragAction = null; // 'move' | 'resize'
let dragTarget = null;
let dragStart = null;
let dragStartFrac = null;
let dragAnchor = null;
let dragStartDist = null;
let dragStartSize = null;

function pointFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}
function inBox(pt, box) { return box && pt.x >= box.x && pt.x <= box.x + box.w && pt.y >= box.y && pt.y <= box.y + box.h; }
function nearHandle(pt, handle) { return handle && Math.hypot(pt.x - handle.x, pt.y - handle.y) <= handle.r * 1.8; }

function startDrag(e) {
  if (!state.dragMode) return;
  const pt = pointFromEvent(e);
  const sel = getSelected();

  if (sel && sel.visible && sel._handle && nearHandle(pt, sel._handle)) {
    pushHistory();
    dragAction = 'resize';
    dragTarget = sel;
    const { anchor, startSize } = getElementType(sel.type).resizeStart(sel);
    dragAnchor = anchor;
    dragStartSize = startSize;
    dragStartDist = Math.max(1, Math.hypot(pt.x - dragAnchor.x, pt.y - dragAnchor.y));
    dragStart = pt;
    canvas.style.cursor = sel.type === 'line' ? 'crosshair' : 'nwse-resize';
    e.preventDefault();
    return;
  }

  const frontToBack = [...state.elements].reverse();
  for (const el of frontToBack) {
    if (el.visible && inBox(pt, el._bbox)) {
      pushHistory();
      dragAction = 'move';
      dragTarget = el;
      dragStartFrac = { x: el.xFrac, y: el.yFrac };
      selectElement(el.id);
      break;
    }
  }
  if (!dragTarget) return;
  dragStart = pt;
  canvas.style.cursor = 'grabbing';
  e.preventDefault();
}

function moveDrag(e) {
  if (!dragTarget) return;
  const pt = pointFromEvent(e);
  if (dragAction === 'resize') {
    const scale = canvas.width / 1080;
    getElementType(dragTarget.type).resizeUpdate(dragTarget, {
      pt, anchor: dragAnchor, startDist: dragStartDist, startSize: dragStartSize, scale
    });
    render();
    syncSizeDisplays(dragTarget);
    e.preventDefault();
    return;
  }
  const dxFrac = (pt.x - dragStart.x) / canvas.width;
  const dyFrac = (pt.y - dragStart.y) / canvas.height;
  dragTarget.xFrac = dragStartFrac.x + dxFrac;
  dragTarget.yFrac = dragStartFrac.y + dyFrac;
  render();
  e.preventDefault();
}

function endDrag() {
  if (dragTarget && state.dragMode) canvas.style.cursor = dragAction === 'resize' ? 'nwse-resize' : 'grab';
  dragTarget = null;
  dragAction = null;
}

// Collega gli eventi mouse/touch sul canvas. Chiamata da main.js in fase di init.
function wireInteraction() {
  canvas.addEventListener('mousedown', startDrag);
  window.addEventListener('mousemove', moveDrag);
  window.addEventListener('mouseup', endDrag);
  canvas.addEventListener('touchstart', startDrag, { passive: false });
  window.addEventListener('touchmove', moveDrag, { passive: false });
  window.addEventListener('touchend', endDrag);
}
