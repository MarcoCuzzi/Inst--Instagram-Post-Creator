const path = require('path');
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const errors = [];

function makeCtxStub() {
  const noop = () => {};
  return {
    save: noop, restore: noop, beginPath: noop, closePath: noop, clip: noop,
    moveTo: noop, lineTo: noop, stroke: noop, fill: noop, fillRect: noop,
    strokeRect: noop, arc: noop, drawImage: noop, setLineDash: noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    measureText: (s) => ({ width: (s || '').length * 8 }),
    fillText: noop,
    set fillStyle(v) {}, get fillStyle() { return '#000'; },
    set strokeStyle(v) {}, get strokeStyle() { return '#000'; },
    set lineWidth(v) {}, get lineWidth() { return 1; },
    set font(v) {}, get font() { return '10px sans-serif'; },
    set textAlign(v) {}, get textAlign() { return 'left'; },
    set textBaseline(v) {}, get textBaseline() { return 'alphabetic'; },
    set lineCap(v) {}, get lineCap() { return 'butt'; }
  };
}

(async () => {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => errors.push('jsdomError: ' + e.message));
  virtualConsole.on('error', (...args) => errors.push('console.error: ' + args.map(String).join(' ')));

  const indexPath = path.join(__dirname, '..', 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  // Ponte diagnostico: espone su window gli identificatori globali dell'app
  // (dichiarati con const/let/function nei vari script) per poterli ispezionare
  // da Node. Le dichiarazioni top-level a livello di <script> non diventano
  // proprietà di `window` per specifica: questo script, essendo nello stesso
  // documento, le vede come identificatori "bare" ed è l'unico modo pulito
  // per portarle fuori senza modificare i file dell'app.
  const bridge = `
<script>
window.__APP__ = {
  get state() { return state; },
  get currentLang() { return currentLang; },
  ELEMENT_TYPES, getElementType, getSelected, selectElement, deleteElement,
  addTextElement, addProfileElement, addShapeElement,
  applyLanguage, setAllEditMode, setSkeletonMode, undo, render,
  buildStructureExport, importStructure, renderElementEditor
};
</script>`;
  html = html.replace('</body>', bridge + '\n</body>');

  const dom = new JSDOM(html, {
    url: 'file://' + indexPath,
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.HTMLCanvasElement.prototype.getContext = () => makeCtxStub();
      window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,AA==';
    }
  });

  const { window } = dom;
  window.onerror = (msg, src, line, col) => errors.push(`onerror: ${msg} @ ${line}:${col}`);
  Array.from(window.document.scripts).forEach(s => {
    if (s.src) s.addEventListener('error', () => errors.push('script load error: ' + s.src));
  });

  await new Promise(resolve => setTimeout(resolve, 1500));

  const bail = (msg) => {
    console.error(msg);
    if (errors.length) { console.error('Errori raccolti:'); errors.forEach(e => console.error(' -', e)); }
    process.exit(1);
  };

  const A = window.__APP__;
  if (!A || !A.state) return bail('FALLITO: window.__APP__.state non definito dopo il caricamento.');

  console.log('Elementi iniziali:', A.state.elements.map(e => e.type));

  A.addTextElement();
  A.addProfileElement();
  ['line', 'rect', 'circle', 'rhombus'].forEach(t => A.addShapeElement(t));
  console.log('Dopo aggiunte:', A.state.elements.map(e => e.type), '(attesi 8: text, profile, text, profile, line, rect, circle, rhombus)');
  if (A.state.elements.length !== 8) errors.push(`Numero elementi inatteso dopo le aggiunte: ${A.state.elements.length}`);

  A.applyLanguage('en');
  const h1 = window.document.querySelector('h1');
  console.log('Lingua corrente:', A.currentLang, '- <h1>:', h1 ? h1.textContent : '(non trovato)');

  A.state.elements.forEach(el => {
    A.selectElement(el.id);
    const html2 = window.document.getElementById('elementEditor').innerHTML;
    if (!html2 || html2.includes('undefined')) errors.push(`Editor sospetto per tipo "${el.type}": vuoto o contiene 'undefined'`);
  });
  console.log('Editor singolo: generato senza "undefined" per tutti i', A.state.elements.length, 'tipi presenti.');

  A.setAllEditMode(true);
  const cards = window.document.querySelectorAll('.all-el-card');
  console.log('Card in "modifica tutti":', cards.length, '(attese', A.state.elements.length, ')');
  if (cards.length !== A.state.elements.length) errors.push('Numero di card in "modifica tutti" non corrisponde al numero di elementi');
  cards.forEach(c => { if (c.innerHTML.includes('undefined')) errors.push('Card "modifica tutti" con contenuto "undefined": ' + c.dataset.id); });

  A.render();
  A.setSkeletonMode(true);
  const boxes = window.document.querySelectorAll('.skeleton-box');
  console.log('Skeleton boxes:', boxes.length, '(attese', A.state.elements.filter(e => e.visible).length, ')');

  const countBefore = A.state.elements.length;
  A.deleteElement(A.state.elements[0].id);
  const afterDelete = A.state.elements.length;
  A.undo();
  const afterUndo = A.state.elements.length;
  console.log('Delete+Undo:', countBefore, '->', afterDelete, '->', afterUndo);
  if (afterDelete !== countBefore - 1) errors.push('Delete non ha rimosso esattamente un elemento');
  if (afterUndo !== countBefore) errors.push('Undo non ha ripristinato il conteggio elementi corretto');

  const exported = A.buildStructureExport();
  console.log('Export struttura: OK,', exported.elements.length, 'elementi,', JSON.stringify(exported).length, 'byte');

  A.importStructure(exported);
  console.log('Dopo import:', A.state.elements.length, '(atteso', exported.elements.length, ')');
  if (A.state.elements.length !== exported.elements.length) errors.push('Import struttura non ha ripristinato il numero corretto di elementi');

  // Esercita resizeStart/resizeUpdate del registro per ogni tipo (simulando un drag di resize)
  ['text', 'profile', 'line', 'rect', 'circle', 'rhombus'].forEach(type => {
    const el = A.state.elements.find(e => e.type === type);
    if (!el || !el._bbox) { errors.push(`Nessun elemento visibile di tipo "${type}" con bbox per testare il resize`); return; }
    const def = A.getElementType(type);
    const before = JSON.stringify(el);
    const { anchor, startSize } = def.resizeStart(el);
    const farPoint = { x: anchor.x + 300, y: anchor.y + 300 };
    def.resizeUpdate(el, { pt: farPoint, anchor, startDist: 50, startSize, scale: 1 });
    if (JSON.stringify(el) === before) errors.push(`resizeUpdate non ha modificato l'elemento di tipo "${type}"`);
  });
  console.log('Resize per tipo: eseguito su tutti i tipi senza eccezioni.');

  if (errors.length) {
    console.error('\nERRORI TROVATI:');
    errors.forEach(e => console.error(' -', e));
    process.exit(1);
  }
  console.log('\nTUTTI I CONTROLLI SONO PASSATI.');
  process.exit(0);
})().catch(err => {
  console.error('ECCEZIONE NON GESTITA:', err);
  process.exit(1);
});
