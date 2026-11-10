// Styles direkt importieren, Vite verarbeitet und injectet das SCSS automatisch
import './assets/scss/style.scss';
// PWA Registrierung
import { registerSW } from 'virtual:pwa-register';
// 1. Geschützten Fragenkatalog laden (wird durch Vite aus dem /assets/data Ordner gebundled)
// Wir nutzen Vites "import" Funktion für JSON Dateien
import questionsData from './assets/data/questions.json';
import UIManager from './modules/UI/UIManager.js';

// 2. App initialisieren, sobald das DOM geladen ist
document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('Kuno Beller App startet...');
    // Den UIManager mit den Fragen füttern, der regelt ab hier den Rest
    const uiManager = new UIManager(questionsData);
    initPWA(); // PWA Features initialisieren
  } catch (error) {
    console.error('Fehler beim Starten der App:', error);
    alert('Es gab einen kritischen Fehler beim Laden der App. Bitte lade die Seite neu.');
  }
});

function initPWA() {
  const pwaBtn = document.getElementById('pwa-action-btn');
  if (!pwaBtn) return;

  let deferredPrompt = null;
  let updateSW = null;

  // 1. EVENT: Browser bietet Installation an (Android, Chrome, Edge)
  window.addEventListener('beforeinstallprompt', (e) => {
    // Verhindert, dass der Browser seine eigene Standard-Leiste anzeigt
    e.preventDefault();
    deferredPrompt = e;

    // Zeigt unseren Button an
    pwaBtn.textContent = 'App installieren';
    pwaBtn.classList.add('c-button--success');
    pwaBtn.classList.remove('is-hidden');
  });

  // 2. EVENT: Service Worker findet neues Update (nach Deployment)
  updateSW = registerSW({
    onNeedRefresh() {
      pwaBtn.textContent = 'Update verfügbar!';
      pwaBtn.classList.remove('c-button--success', 'is-hidden');
      pwaBtn.classList.add('c-button--danger'); // Macht den Button rot
    },
    onOfflineReady() {
      console.log('App ist nun offline verfügbar!');
    },
  });

  // 3. KLICK-LOGIK: Entweder installieren oder updaten
  pwaBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      // Modus: Installation
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        pwaBtn.classList.add('is-hidden'); // Nach Erfolg Button verstecken
      }
      deferredPrompt = null;
    } else if (updateSW) {
      // Modus: Update
      pwaBtn.textContent = 'Aktualisiere...';
      updateSW(true); // Akzeptiert das Update und lädt Seite automatisch neu
    }
  });
}
