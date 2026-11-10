import { v4 as uuidv4 } from 'uuid';

/**
 * Repräsentiert den aktuellen Zustand und die Daten eines Kindes.
 * Verwaltet den Import, Export und die Speicherung im LocalStorage (Auto-Save).
 */
export default class ChildState {
  /**
   * @param {string} name
   * @param {string} date
   * @param {string|null} id
   * @param {Object} answers
   */
  constructor(name, date, id = null, answers = {}) {
    this.id = id || uuidv4();
    this.name = name;
    this.date = date;
    // Datenstruktur: { "Körperpflege": { "PHASE 1": { "1": "yes", "2": "partially" } } }
    this.answers = answers;
  }

  /**
   * Speichert eine Antwort und triggert sofort den Auto-Save.
   * @param {string} category Entwicklungsbereich (z.B. Körperpflege)
   * @param {string} phase Entwicklungsphase (z.B. PHASE 1)
   * @param {number} questionId ID der Frage
   * @param {string} answer Wert ('yes', 'partially', 'no', 'unknown')
   */
  setAnswer(category, phase, questionId, answer) {
    if (!this.answers[category]) {
      this.answers[category] = {};
    }
    if (!this.answers[category][phase]) {
      this.answers[category][phase] = {};
    }
    this.answers[category][phase][questionId] = answer;

    // Echtzeit Auto-Save in den Browser-Cache
    this.saveToStorage();
  }

  /**
   * Ruft eine gespeicherte Antwort ab (nützlich beim Laden eines JSONs).
   * @param {string} category
   * @param {string} phase
   * @param {number} questionId
   * @returns {string|null}
   */
  getAnswer(category, phase, questionId) {
    return this.answers[category]?.[phase]?.[questionId] || null;
  }

  /**
   * Generiert den JSON-String für den Download.
   * @returns {string}
   */
  exportJSON() {
    return JSON.stringify(
      {
        id: this.id,
        name: this.name,
        date: this.date,
        answers: this.answers,
      },
      null,
      2
    );
  }

  /**
   * Fabrikmethode: Erstellt eine ChildState-Instanz aus einem hochgeladenen JSON-String.
   * @param {string} jsonString
   * @returns {ChildState|null}
   */
  static importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.name || !data.answers) {
        throw new Error('Ungültiges JSON-Format: Fehlende Basisdaten.');
      }
      return new ChildState(data.name, data.date, data.id, data.answers);
    } catch (error) {
      console.error('Fehler beim Importieren der JSON:', error);
      alert('Die Datei konnte nicht gelesen werden. Ist es eine gültige Kuno Beller JSON?');
      return null;
    }
  }

  // --- Notfallsicherung (Auto-Save System) ---

  saveToStorage() {
    localStorage.setItem('kuno_backup', this.exportJSON());
  }

  static clearStorage() {
    localStorage.removeItem('kuno_backup');
  }

  static hasBackup() {
    return localStorage.getItem('kuno_backup') !== null;
  }

  static loadFromStorage() {
    const backup = localStorage.getItem('kuno_backup');
    if (backup) {
      return ChildState.importJSON(backup);
    }
    return null;
  }
}
