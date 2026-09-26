# Creatore di Post Instagram — versione modulare

Stessa app del file HTML unico originale, riorganizzata in più file per
essere facile da modificare (anche "vibecodando" con un assistente AI) e
da far crescere nel tempo. Nessuna build necessaria: apri `index.html` in
un browser e funziona, esattamente come prima.

## Struttura

```
index.html              markup (invariato nella sostanza)
css/style.css            tutto lo stile

js/i18n/<lang>.js        un dizionario per lingua (it, en, es, fr, de)
js/i18n/index.js         motore di traduzione: t(), detectLang(), applyLanguage()

js/utils.js              helper generici (uid, clamp)
js/canvas-utils.js       riferimenti canvas/ctx, FORMATS, disegno immagine "cover", wrap del testo

js/element-types.js      ⭐ IL REGISTRO DEI TIPI DI ELEMENTO — vedi sotto

js/state.js              stato dell'app + elementi di default
js/persistence.js        autosalvataggio su localStorage + undo/history

js/ui-panel.js           pannello sinistro: formato, sfondo, pulsanti "aggiungi"
js/ui-editor.js          editor del singolo elemento selezionato
js/ui-layers.js          pannello livelli
js/ui-toolbar.js         toolbar sopra al canvas + overlay "scheletro"
js/ui-edit-all.js        barra "modifica tutti gli elementi"

js/canvas-render.js      il ciclo di disegno principale (render())
js/interaction.js        drag & drop / resize sul canvas (mouse e touch)
js/io.js                 download PNG, esporta/importa struttura layout in JSON

js/main.js               collega tutti gli eventi e avvia l'app (ultimo file caricato)

test/run-jsdom-test.js   test automatico headless (vedi sezione Test)
```

L'ordine degli script in `index.html` è importante: ogni file usa
funzioni/costanti definite nei file caricati prima di lui. `main.js` è
sempre l'ultimo: si limita a collegare gli eventi (`wireXxx()`) e ad
avviare l'app, quando tutto il resto è già stato definito.

## Il pezzo più importante: `element-types.js`

Prima dello split, ogni tipo di elemento (testo, profilo, linea,
rettangolo, cerchio, rombo) era gestito da codice ripetuto in 5-6 punti
diversi: la validazione dati, il disegno su canvas, l'etichetta nel
pannello livelli, il resize, il modulo di modifica nel pannello laterale
e di nuovo nella barra "modifica tutti". Aggiungere un tipo nuovo voleva
dire ricordarsi di toccare tutti quei punti.

Ora ogni tipo è un'unica voce dentro `ELEMENT_TYPES`, con:

- `fromPlainData(raw, base)` — valida i dati grezzi (import/autosave)
- `draw(el, geo)` — disegna sul canvas e imposta `el._bbox`
- `label(el)` — etichetta per pannello livelli / card
- `resizeStart(el)` / `resizeUpdate(el, info)` — logica di ridimensionamento
- `fieldsHTML(el)` / `wireFields(container, el, api)` — i campi del modulo
  di modifica, **usati sia dall'editor singolo che dalla barra "modifica
  tutti"**: stesso codice, zero duplicazione.

### Come aggiungere un nuovo tipo (es. una "freccia")

1. Aggiungi una voce `arrow: { ... }` in `ELEMENT_TYPES` dentro
   `js/element-types.js`, seguendo lo schema di un tipo simile (es. `line`).
2. Se deve comparire nel menu "➕ Oggetti", aggiungi un bottone
   `<button data-shape="arrow">...</button>` in `index.html` e le relative
   chiavi di traduzione (`shape_arrow`, `kind_arrow`, ...) in ogni file
   `js/i18n/<lang>.js`.

Non serve toccare `canvas-render.js`, `ui-editor.js`, `ui-edit-all.js` o
`ui-layers.js`: leggono tutti dal registro.

## Test

`test/run-jsdom-test.js` è un test headless (usa `jsdom`, non un vero
browser) che carica l'app, aggiunge elementi di ogni tipo, cambia lingua,
apre l'editor e la barra "modifica tutti", simula undo/redo, esporta e
reimporta la struttura, e simula un resize per ogni tipo — verificando
che non ci siano errori ed eccezioni.

Per rilanciarlo dopo una modifica:

```
cd webapp
npm install jsdom --no-save
node test/run-jsdom-test.js
```

Non sostituisce un test manuale nel browser (il canvas è simulato con
funzioni "finte" che non disegnano davvero), ma intercetta rapidamente
errori di collegamento tra i file dopo una modifica.
