// ---------- Utility generiche ----------
function uid(prefix) { return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function clampFrac(v) { const n = Number(v); return Number.isFinite(n) ? clamp(n, -0.2, 1.2) : 0.5; }
