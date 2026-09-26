// ---------- Stato applicativo ----------
const state = {
  format: 'square',
  bgMode: 'color',
  bgColor: '#7c5cff',
  bgImage: null,
  dragMode: false,
  skeletonMode: false,
  allEditMode: false,
  elements: [
    { id: uid('text'), type: 'text', text: 'La cosa più difficile non è iniziare.\nÈ continuare quando nessuno guarda.', align: 'center', fontSize: 54, color: '#ffffff', xFrac: 0.5, yFrac: 0.52, visible: true },
    { id: uid('profile'), type: 'profile', name: 'il_tuo_profilo', avatarImage: null, avatarSize: 84, xFrac: 0.34, yFrac: 0.40, visible: true }
  ],
  selectedId: null
};
state.selectedId = state.elements[0].id;

function getSelected() { return state.elements.find(e => e.id === state.selectedId) || null; }
