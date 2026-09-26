// ---------- Registro dei tipi di elemento ----------
//
// QUESTO E' IL FILE DA TOCCARE PER AGGIUNGERE UN NUOVO TIPO DI ELEMENTO
// (es. una freccia, uno sticker, ecc.). Ogni voce di ELEMENT_TYPES descrive
// TUTTO ciò che riguarda un tipo: come validarlo, disegnarlo, etichettarlo,
// ridimensionarlo e come costruire il suo modulo di modifica — sia nel
// pannello laterale singolo, sia nella barra "modifica tutti".
//
// Prima di questo registro, ognuna di queste responsabilità viveva in una
// funzione diversa (render(), renderElementEditor(), buildAllElCard(), ecc.)
// ripetuta per ogni tipo: aggiungere un tipo voleva dire ricordarsi di
// aggiornare 5-6 punti sparsi. Ora basta aggiungere una voce qui e collegarla
// dove serve (menu "Oggetti" in ui-panel.js, se è una nuova forma).
//
// Contratto di ogni voce:
//   kindKey / deleteKey   -> chiavi i18n per titolo editor e bottone elimina
//   fromPlainData(raw, base) -> ricostruisce/valida un elemento a partire da
//                                dati grezzi (localStorage o file importato)
//   draw(el, g)           -> disegna sul canvas; DEVE impostare el._bbox
//                             (e el._endPoint per le linee)
//   label(el)             -> etichetta breve per pannello livelli / card
//   resizeStart(el)        -> { anchor, startSize } quando si inizia un resize
//   resizeUpdate(el, info) -> muta l'elemento durante il drag di resize
//   fieldsHTML(el)         -> markup dei campi di modifica (senza wrapper)
//   wireFields(container, el, api) -> collega gli eventi ai campi generati
//
// fieldsHTML/wireFields usano SEMPRE selettori "data-field" scoperti dentro
// "container": per questo la stessa coppia funziona identica sia nel
// pannello singolo (#elementEditor) sia in una card di "modifica tutti".

const ELEMENT_TYPES = {

  text: {
    icon: '🅣',
    kindKey: 'kind_text',
    deleteKey: 'delete_text_btn',

    fromPlainData(raw, base) {
      return {
        ...base,
        text: (raw && typeof raw.text === 'string' && raw.text) || 'Nuovo testo',
        align: ['left', 'center', 'right'].includes(raw && raw.align) ? raw.align : 'center',
        fontSize: clamp(Number(raw && raw.fontSize) || 48, 24, 100),
        color: (raw && typeof raw.color === 'string' && raw.color) || '#ffffff'
      };
    },

    createNew(count) {
      return {
        id: uid('text'), type: 'text', text: t('new_text_default'), align: 'center',
        fontSize: 48, color: '#ffffff', xFrac: 0.5, yFrac: Math.min(0.75, 0.3 + count * 0.09), visible: true
      };
    },

    draw(el, g) {
      const { scale, W, H, maxTextWidth } = g;
      const fontSize = el.fontSize * scale;
      const lineHeight = fontSize * 1.3;
      ctx.font = `600 ${fontSize}px ${FONT_STACK}`;
      const lines = wrapText(el.text, maxTextWidth);
      const maxLineWidth = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0);
      const anchorX = el.xFrac * W;
      const topY = el.yFrac * H;
      let bboxX;
      if (el.align === 'center') bboxX = anchorX - maxLineWidth / 2;
      else if (el.align === 'right') bboxX = anchorX - maxLineWidth;
      else bboxX = anchorX;
      el._bbox = { x: bboxX, y: topY, w: maxLineWidth, h: lines.length * lineHeight };

      ctx.fillStyle = el.color;
      ctx.textAlign = el.align;
      lines.forEach((line, i) => {
        ctx.fillText(line, anchorX, topY + lineHeight * (i + 1) - lineHeight * 0.22);
      });
    },

    label(el) {
      const s = el.text.replace(/\n/g, ' ').trim();
      return s.length > 16 ? s.slice(0, 16) + '…' : (s || t('empty_text_label'));
    },

    resizeStart(el) { return { anchor: { x: el._bbox.x, y: el._bbox.y }, startSize: el.fontSize }; },
    resizeUpdate(el, { pt, anchor, startDist, startSize }) {
      const dist = Math.hypot(pt.x - anchor.x, pt.y - anchor.y);
      el.fontSize = clamp(Math.round(startSize * (dist / startDist)), 24, 100);
    },

    fieldsHTML(el) {
      return `
        <div class="field">
          <label>${t('label_content')}</label>
          <textarea data-field="text">${el.text.replace(/</g, '&lt;')}</textarea>
        </div>
        <div class="field">
          <label>${t('label_align')}</label>
          <div class="seg" data-field="align">
            <button data-align="left" class="${el.align === 'left' ? 'active' : ''}">${t('align_left')}</button>
            <button data-align="center" class="${el.align === 'center' ? 'active' : ''}">${t('align_center')}</button>
            <button data-align="right" class="${el.align === 'right' ? 'active' : ''}">${t('align_right')}</button>
          </div>
        </div>
        <div class="field">
          <div class="range-label"><span>${t('label_fontsize')}</span><span data-field="fontVal">${el.fontSize}</span></div>
          <input type="range" data-field="font" min="24" max="100" value="${el.fontSize}">
        </div>
        <div class="field" style="margin-bottom:0;">
          <label>${t('label_textcolor')}</label>
          <div class="swatches" data-field="color"></div>
        </div>
      `;
    },

    wireFields(container, el, api) {
      const ta = container.querySelector('[data-field="text"]');
      ta.addEventListener('focus', () => api.pushHistory());
      ta.addEventListener('input', () => { el.text = ta.value; api.onDirty(); api.render(); });

      const alignSeg = container.querySelector('[data-field="align"]');
      alignSeg.addEventListener('click', e => {
        const btn = e.target.closest('button'); if (!btn) return;
        api.pushHistory();
        el.align = btn.dataset.align;
        alignSeg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
        api.render();
      });

      const fontSlider = container.querySelector('[data-field="font"]');
      fontSlider.addEventListener('focus', () => api.pushHistory());
      fontSlider.addEventListener('input', () => {
        el.fontSize = parseInt(fontSlider.value, 10);
        container.querySelector('[data-field="fontVal"]').textContent = el.fontSize;
        api.render();
        api.afterResize();
      });

      const colorContainer = container.querySelector('[data-field="color"]');
      buildSwatches(colorContainer, textColorPalette, el.color, c => {
        api.pushHistory(); el.color = c; api.render(); api.refreshFields();
      });
    }
  },

  profile: {
    icon: '🙂',
    kindKey: 'kind_profile',
    deleteKey: 'delete_profile_btn',

    fromPlainData(raw, base) {
      return {
        ...base,
        name: (raw && typeof raw.name === 'string' && raw.name) || 'nuovo_profilo',
        avatarSize: clamp(Number(raw && raw.avatarSize) || 84, 40, 220),
        avatarImage: null
      };
    },

    createNew(count) {
      return {
        id: uid('profile'), type: 'profile', name: t('new_profile_default'), avatarImage: null,
        avatarSize: 84, xFrac: 0.34, yFrac: Math.min(0.75, 0.18 + count * 0.09), visible: true
      };
    },

    draw(el, g) {
      const { scale } = g;
      const avatarSize = el.avatarSize * scale;
      const nameFontSize = avatarSize * (30 / 84);
      ctx.font = `600 ${nameFontSize}px ${FONT_STACK}`;
      const nameWidth = ctx.measureText(el.name).width;
      const rowWidth = avatarSize + 18 * scale + nameWidth;
      const x = el.xFrac * g.W, y = el.yFrac * g.H;
      el._bbox = { x, y, w: rowWidth, h: avatarSize };

      const cx = x + avatarSize / 2, cy = y + avatarSize / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, avatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      if (el.avatarImage) {
        drawCoverImage(el.avatarImage, x, y, avatarSize, avatarSize);
      } else {
        const grad = ctx.createLinearGradient(x, y, x + avatarSize, y + avatarSize);
        grad.addColorStop(0, '#7c5cff');
        grad.addColorStop(1, '#ff5c8a');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, avatarSize, avatarSize);
      }
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, avatarSize / 2, 0, Math.PI * 2);
      ctx.lineWidth = 2 * scale;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `600 ${nameFontSize}px ${FONT_STACK}`;
      ctx.textAlign = 'left';
      ctx.fillText(el.name, x + avatarSize + 18 * scale, cy + nameFontSize * 0.36);
    },

    label(el) { return el.name.trim() || t('default_profile_label'); },

    resizeStart(el) { return { anchor: { x: el._bbox.x, y: el._bbox.y }, startSize: el.avatarSize }; },
    resizeUpdate(el, { pt, anchor, startDist, startSize }) {
      const dist = Math.hypot(pt.x - anchor.x, pt.y - anchor.y);
      el.avatarSize = clamp(Math.round(startSize * (dist / startDist)), 40, 220);
    },

    fieldsHTML(el) {
      return `
        <div class="field" style="margin-bottom:12px;">
          <label class="file-btn" data-field="avatarLabel">${t('upload_avatar')}</label>
          <input type="file" data-field="avatar" accept="image/*" style="display:none;">
        </div>
        <div class="field">
          <label>${t('label_name')}</label>
          <input type="text" data-field="name" value="${el.name.replace(/"/g, '&quot;')}" placeholder="${t('placeholder_username')}">
        </div>
        <div class="field" style="margin-bottom:0;">
          <div class="range-label"><span>${t('label_size')}</span><span data-field="sizeVal">${el.avatarSize}</span></div>
          <input type="range" data-field="size" min="40" max="220" value="${el.avatarSize}">
        </div>
      `;
    },

    wireFields(container, el, api) {
      const avatarInput = container.querySelector('[data-field="avatar"]');
      container.querySelector('[data-field="avatarLabel"]').addEventListener('click', ev => { ev.stopPropagation(); avatarInput.click(); });
      loadImageFile(avatarInput, img => { el.avatarImage = img; });

      const nameInput = container.querySelector('[data-field="name"]');
      nameInput.addEventListener('focus', () => api.pushHistory());
      nameInput.addEventListener('input', () => { el.name = nameInput.value; api.onDirty(); api.render(); });

      const sizeSlider = container.querySelector('[data-field="size"]');
      sizeSlider.addEventListener('focus', () => api.pushHistory());
      sizeSlider.addEventListener('input', () => {
        el.avatarSize = parseInt(sizeSlider.value, 10);
        container.querySelector('[data-field="sizeVal"]').textContent = el.avatarSize;
        api.render();
        api.afterResize();
      });
    }
  },

  line: {
    icon: '📏',
    kindKey: 'kind_line',
    deleteKey: 'delete_object_btn',

    fromPlainData(raw, base) {
      return {
        ...base,
        length: clamp(Number(raw && raw.length) || 300, 10, 1400),
        angle: clamp(Number(raw && raw.angle) || 0, -360, 360),
        thickness: clamp(Number(raw && raw.thickness) || 6, 1, 60),
        color: (raw && typeof raw.color === 'string' && raw.color) || '#ffffff'
      };
    },

    draw(el, g) {
      const { scale, W, H } = g;
      const x0 = el.xFrac * W, y0 = el.yFrac * H;
      const rad = el.angle * Math.PI / 180;
      const len = el.length * scale;
      const x1 = x0 + Math.cos(rad) * len;
      const y1 = y0 + Math.sin(rad) * len;
      const thickness = Math.max(1, el.thickness * scale);
      ctx.strokeStyle = el.color;
      ctx.lineWidth = thickness;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      const pad = thickness / 2 + 4 * scale;
      el._bbox = {
        x: Math.min(x0, x1) - pad, y: Math.min(y0, y1) - pad,
        w: Math.abs(x1 - x0) + pad * 2, h: Math.abs(y1 - y0) + pad * 2
      };
      el._endPoint = { x: x1, y: y1 };
    },

    label() { return t('shape_line'); },

    resizeStart(el) { return { anchor: { x: el.xFrac * canvas.width, y: el.yFrac * canvas.height }, startSize: null }; },
    resizeUpdate(el, { pt, anchor, scale }) {
      const dx = pt.x - anchor.x, dy = pt.y - anchor.y;
      el.length = Math.min(1400, Math.max(10, Math.round(Math.hypot(dx, dy) / scale)));
      el.angle = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);
    },

    fieldsHTML(el) {
      return `
        <div class="field">
          <div class="range-label"><span>${t('label_length')}</span><span data-field="lengthVal">${el.length}</span></div>
          <input type="range" data-field="length" min="10" max="1400" value="${el.length}">
        </div>
        <div class="field">
          <div class="range-label"><span>${t('label_rotation')}</span><span data-field="angleVal">${el.angle}</span></div>
          <input type="range" data-field="angle" min="-180" max="180" value="${el.angle}">
        </div>
        <div class="field">
          <div class="range-label"><span>${t('label_thickness')}</span><span data-field="thicknessVal">${el.thickness}</span></div>
          <input type="range" data-field="thickness" min="1" max="60" value="${el.thickness}">
        </div>
        <div class="field" style="margin-bottom:0;">
          <label>${t('label_color')}</label>
          <div class="swatches" data-field="color"></div>
        </div>
      `;
    },

    wireFields(container, el, api) {
      const lenSlider = container.querySelector('[data-field="length"]');
      lenSlider.addEventListener('focus', () => api.pushHistory());
      lenSlider.addEventListener('input', () => {
        el.length = parseInt(lenSlider.value, 10);
        container.querySelector('[data-field="lengthVal"]').textContent = el.length;
        api.render(); api.afterResize();
      });
      const angleSlider = container.querySelector('[data-field="angle"]');
      angleSlider.addEventListener('focus', () => api.pushHistory());
      angleSlider.addEventListener('input', () => {
        el.angle = parseInt(angleSlider.value, 10);
        container.querySelector('[data-field="angleVal"]').textContent = el.angle;
        api.render(); api.afterResize();
      });
      const thickSlider = container.querySelector('[data-field="thickness"]');
      thickSlider.addEventListener('focus', () => api.pushHistory());
      thickSlider.addEventListener('input', () => {
        el.thickness = parseInt(thickSlider.value, 10);
        container.querySelector('[data-field="thicknessVal"]').textContent = el.thickness;
        api.render();
      });
      const colorContainer = container.querySelector('[data-field="color"]');
      buildSwatches(colorContainer, textColorPalette, el.color, c => {
        api.pushHistory(); el.color = c; api.render(); api.refreshFields();
      });
    }
  },

  rect: {
    icon: '▭',
    kindKey: 'kind_rect',
    deleteKey: 'delete_object_btn',

    fromPlainData(raw, base) {
      return {
        ...base,
        width: clamp(Number(raw && raw.width) || 300, 30, 1000),
        height: clamp(Number(raw && raw.height) || 200, 30, 1000),
        color: (raw && typeof raw.color === 'string' && raw.color) || '#7c5cff'
      };
    },

    draw(el, g) {
      const w = el.width * g.scale, h = el.height * g.scale;
      const x = el.xFrac * g.W, y = el.yFrac * g.H;
      ctx.fillStyle = el.color;
      ctx.fillRect(x, y, w, h);
      el._bbox = { x, y, w, h };
    },

    label() { return t('shape_rect'); },

    resizeStart(el) { return { anchor: { x: el._bbox.x, y: el._bbox.y }, startSize: { width: el.width, height: el.height } }; },
    resizeUpdate(el, { pt, anchor, scale }) {
      el.width = Math.min(1000, Math.max(30, Math.round((pt.x - anchor.x) / scale)));
      el.height = Math.min(1000, Math.max(30, Math.round((pt.y - anchor.y) / scale)));
    },

    fieldsHTML(el) {
      return `
        <div class="field">
          <div class="range-label"><span>${t('label_width')}</span><span data-field="widthVal">${el.width}</span></div>
          <input type="range" data-field="width" min="30" max="1000" value="${el.width}">
        </div>
        <div class="field">
          <div class="range-label"><span>${t('label_height')}</span><span data-field="heightVal">${el.height}</span></div>
          <input type="range" data-field="height" min="30" max="1000" value="${el.height}">
        </div>
        <div class="field" style="margin-bottom:0;">
          <label>${t('label_color')}</label>
          <div class="swatches" data-field="color"></div>
        </div>
      `;
    },

    wireFields(container, el, api) {
      const widthSlider = container.querySelector('[data-field="width"]');
      widthSlider.addEventListener('focus', () => api.pushHistory());
      widthSlider.addEventListener('input', () => {
        el.width = parseInt(widthSlider.value, 10);
        container.querySelector('[data-field="widthVal"]').textContent = el.width;
        api.render(); api.afterResize();
      });
      const heightSlider = container.querySelector('[data-field="height"]');
      heightSlider.addEventListener('focus', () => api.pushHistory());
      heightSlider.addEventListener('input', () => {
        el.height = parseInt(heightSlider.value, 10);
        container.querySelector('[data-field="heightVal"]').textContent = el.height;
        api.render(); api.afterResize();
      });
      const colorContainer = container.querySelector('[data-field="color"]');
      buildSwatches(colorContainer, colorPalette, el.color, c => {
        api.pushHistory(); el.color = c; api.render(); api.refreshFields();
      });
    }
  },

  circle: {
    icon: '⚪',
    kindKey: 'kind_circle',
    deleteKey: 'delete_object_btn',

    fromPlainData(raw, base) {
      return {
        ...base,
        radius: clamp(Number(raw && raw.radius) || 100, 20, 500),
        color: (raw && typeof raw.color === 'string' && raw.color) || '#7c5cff'
      };
    },

    draw(el, g) {
      const r = el.radius * g.scale;
      const cx = el.xFrac * g.W, cy = el.yFrac * g.H;
      ctx.fillStyle = el.color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      el._bbox = { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
    },

    label() { return t('shape_circle'); },

    resizeStart(el) {
      return { anchor: { x: el._bbox.x + el._bbox.w / 2, y: el._bbox.y + el._bbox.h / 2 }, startSize: el.radius };
    },
    resizeUpdate(el, { pt, anchor, startDist, startSize }) {
      const dist = Math.hypot(pt.x - anchor.x, pt.y - anchor.y);
      el.radius = clamp(Math.round(startSize * (dist / startDist)), 20, 500);
    },

    fieldsHTML(el) {
      return `
        <div class="field">
          <div class="range-label"><span>${t('label_size')}</span><span data-field="radiusVal">${el.radius}</span></div>
          <input type="range" data-field="radius" min="20" max="500" value="${el.radius}">
        </div>
        <div class="field" style="margin-bottom:0;">
          <label>${t('label_color')}</label>
          <div class="swatches" data-field="color"></div>
        </div>
      `;
    },

    wireFields(container, el, api) {
      const radiusSlider = container.querySelector('[data-field="radius"]');
      radiusSlider.addEventListener('focus', () => api.pushHistory());
      radiusSlider.addEventListener('input', () => {
        el.radius = parseInt(radiusSlider.value, 10);
        container.querySelector('[data-field="radiusVal"]').textContent = el.radius;
        api.render(); api.afterResize();
      });
      const colorContainer = container.querySelector('[data-field="color"]');
      buildSwatches(colorContainer, colorPalette, el.color, c => {
        api.pushHistory(); el.color = c; api.render(); api.refreshFields();
      });
    }
  },

  rhombus: {
    icon: '◆',
    kindKey: 'kind_rhombus',
    deleteKey: 'delete_object_btn',

    fromPlainData(raw, base) {
      return {
        ...base,
        width: clamp(Number(raw && raw.width) || 260, 30, 1000),
        height: clamp(Number(raw && raw.height) || 260, 30, 1000),
        color: (raw && typeof raw.color === 'string' && raw.color) || '#ff5c8a'
      };
    },

    draw(el, g) {
      const w = el.width * g.scale, h = el.height * g.scale;
      const x = el.xFrac * g.W, y = el.yFrac * g.H;
      const cx = x + w / 2, cy = y + h / 2;
      ctx.fillStyle = el.color;
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(x + w, cy);
      ctx.lineTo(cx, y + h);
      ctx.lineTo(x, cy);
      ctx.closePath();
      ctx.fill();
      el._bbox = { x, y, w, h };
    },

    label() { return t('shape_rhombus'); },

    resizeStart(el) { return { anchor: { x: el._bbox.x, y: el._bbox.y }, startSize: { width: el.width, height: el.height } }; },
    resizeUpdate(el, { pt, anchor, scale }) {
      el.width = Math.min(1000, Math.max(30, Math.round((pt.x - anchor.x) / scale)));
      el.height = Math.min(1000, Math.max(30, Math.round((pt.y - anchor.y) / scale)));
    },

    fieldsHTML(el) {
      return `
        <div class="field">
          <div class="range-label"><span>${t('label_width')}</span><span data-field="widthVal">${el.width}</span></div>
          <input type="range" data-field="width" min="30" max="1000" value="${el.width}">
        </div>
        <div class="field">
          <div class="range-label"><span>${t('label_height')}</span><span data-field="heightVal">${el.height}</span></div>
          <input type="range" data-field="height" min="30" max="1000" value="${el.height}">
        </div>
        <div class="field" style="margin-bottom:0;">
          <label>${t('label_color')}</label>
          <div class="swatches" data-field="color"></div>
        </div>
      `;
    },

    wireFields(container, el, api) {
      const widthSlider = container.querySelector('[data-field="width"]');
      widthSlider.addEventListener('focus', () => api.pushHistory());
      widthSlider.addEventListener('input', () => {
        el.width = parseInt(widthSlider.value, 10);
        container.querySelector('[data-field="widthVal"]').textContent = el.width;
        api.render(); api.afterResize();
      });
      const heightSlider = container.querySelector('[data-field="height"]');
      heightSlider.addEventListener('focus', () => api.pushHistory());
      heightSlider.addEventListener('input', () => {
        el.height = parseInt(heightSlider.value, 10);
        container.querySelector('[data-field="heightVal"]').textContent = el.height;
        api.render(); api.afterResize();
      });
      const colorContainer = container.querySelector('[data-field="color"]');
      buildSwatches(colorContainer, colorPalette, el.color, c => {
        api.pushHistory(); el.color = c; api.render(); api.refreshFields();
      });
    }
  }
};

// Tipi validi diversi da "text" (usato per l'ordine nel menu Oggetti e per fallback in fromPlainData)
const SHAPE_TYPES = ['line', 'rect', 'circle', 'rhombus'];

function getElementType(type) { return ELEMENT_TYPES[type] || ELEMENT_TYPES.text; }

// Ricostruisce/valida un elemento "pulito" a partire da dati grezzi
// (localStorage o file importato). Non gestisce le immagini: quelle vengono
// ricaricate a parte in modo asincrono, quando previsto (vedi persistence.js).
function elementFromPlainData(raw, { preserveId = false } = {}) {
  const validTypes = ['profile', ...SHAPE_TYPES];
  const type = raw && validTypes.includes(raw.type) ? raw.type : 'text';
  const base = {
    id: preserveId && typeof raw.id === 'string' ? raw.id : uid(type),
    type,
    xFrac: clampFrac(raw && raw.xFrac),
    yFrac: clampFrac(raw && raw.yFrac),
    visible: !(raw && raw.visible === false)
  };
  return getElementType(type).fromPlainData(raw, base);
}
