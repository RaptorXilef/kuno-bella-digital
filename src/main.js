// Styles direkt importieren, Vite verarbeitet und injectet das SCSS automatisch
import './assets/scss/style.scss';

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
  } catch (error) {
    console.error('Fehler beim Starten der App:', error);
    alert('Es gab einen kritischen Fehler beim Laden der App. Bitte lade die Seite neu.');
  }
});
