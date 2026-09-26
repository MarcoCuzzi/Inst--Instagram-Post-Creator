// ---------- Render del canvas ----------
function render() {
  const fmt = FORMATS[state.format];
  canvas.width = fmt.w;
  canvas.height = fmt.h;
  const W = fmt.w, H = fmt.h;
  const scale = W / 1080;
  const paddingX = W * 0.09;
  const maxTextWidth = W - paddingX * 2;

  if (state.bgMode === 'image' && state.bgImage) {
    drawCoverImage(state.bgImage, 0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = state.bgMode === 'color' ? state.bgColor : '#111318';
    ctx.fillRect(0, 0, W, H);
  }

  ctx.textBaseline = 'alphabetic';

  const geo = { scale, W, H, maxTextWidth };
  state.elements.forEach(el => {
    if (!el.visible) { el._bbox = null; return; }
    getElementType(el.type).draw(el, geo);
  });

  if (state.dragMode) {
    ctx.save();
    ctx.setLineDash([10 * scale, 8 * scale]);
    ctx.lineWidth = 2 * scale;
    state.elements.forEach(el => {
      if (!el.visible || !el._bbox) { el._handle = null; return; }
      const b = el._bbox;
      const isSel = el.id === state.selectedId;
      ctx.strokeStyle = isSel ? 'rgba(124,92,255,0.9)' : 'rgba(255,255,255,0.5)';
      ctx.strokeRect(b.x - 10 * scale, b.y - 10 * scale, b.w + 20 * scale, b.h + 20 * scale);
      if (isSel) {
        const hx = el.type === 'line' ? el._endPoint.x : b.x + b.w + 10 * scale;
        const hy = el.type === 'line' ? el._endPoint.y : b.y + b.h + 10 * scale;
        const hr = 11 * scale;
        el._handle = { x: hx, y: hy, r: hr };
        ctx.save();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#7c5cff';
        ctx.lineWidth = 2.5 * scale;
        ctx.beginPath();
        ctx.arc(hx, hy, hr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else {
        el._handle = null;
      }
    });
    ctx.restore();
  }

  renderSkeletonOverlay();
  scheduleAutosave();
}
