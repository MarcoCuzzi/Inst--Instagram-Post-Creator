// ---------- Canvas: riferimenti condivisi e helper di disegno generici ----------
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const FORMATS = {
  square: { w: 1080, h: 1080 },
  portrait: { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920 }
};

// Disegna un'immagine "cover" (come background-size: cover) dentro un box.
function drawCoverImage(img, x, y, w, h) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx, sy, sw, sh;
  if (imgRatio > boxRatio) { sh = img.height; sw = sh * boxRatio; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / boxRatio; sx = 0; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// Va a capo automaticamente rispettando gli "a capo" manuali (\n) nel testo.
// Richiede che ctx.font sia già impostato dal chiamante.
function wrapText(text, maxWidth) {
  const paragraphs = text.split('\n');
  const lines = [];
  paragraphs.forEach(p => {
    if (p.trim() === '') { lines.push(''); return; }
    const words = p.split(' ');
    let line = '';
    words.forEach(word => {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
      else { line = test; }
    });
    if (line) lines.push(line);
  });
  return lines;
}
