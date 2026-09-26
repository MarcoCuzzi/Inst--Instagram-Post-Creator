// ---------- Init ----------
// Tutti i file precedenti definiscono solo costanti/funzioni; qui vengono
// collegati gli eventi (una volta sola, a script tutti caricati) e avviato
// il bootstrap asincrono dell'app.
wireLanguageSelect();
wirePanel();
wireToolbar();
wireInteraction();
wireIo();

(async function initApp() {
  applyLanguage(detectLang());
  await loadAutosaveIfPresent();
  syncTopLevelUI();
  renderElementEditor();
  renderLayersList();
  render();
})();
