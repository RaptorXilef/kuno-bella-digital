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
  constructor(name, birthdate, date, id = null, answers = {}, version = '1.0') {
    this.id = id || uuidv4();
    this.name = name;
    this.birthdate = birthdate;
    this.date = date; // Beobachtungsdatum
    // Datenstruktur: { "Körperpflege": { "PHASE 1": { "1": "yes", "2": "partially" } } }
    this.answers = answers;
    this.version = version;
  }

  /**
   * Speichert eine Antwort und triggert sofort den Auto-Save.
   * @param {string} category Entwicklungsbereich (z.B. Körperpflege)
   * @param {string} phase Entwicklungsphase (z.B. PHASE 1)
   * @param {number} questionId ID der Frage
   * @param {string} answer Wert ('yes', 'partially', 'no', 'unknown')
   */
  setAnswer(category, phase, questionId, answer) {
    if (!this.answers[category]) this.answers[category] = {};
    if (!this.answers[category][phase]) this.answers[category][phase] = {};

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
   * Berechnet das genaue Alter des Kindes in Monaten
   * zum Zeitpunkt der Beobachtung (nicht zum heutigen Tag!).
   */
  getAgeInMonths() {
    const birth = new Date(this.birthdate);
    const observation = new Date(this.date);

    let months = (observation.getFullYear() - birth.getFullYear()) * 12;
    months -= birth.getMonth();
    months += observation.getMonth();

    if (observation.getDate() < birth.getDate()) {
      months--;
    }

    return months <= 0 ? 0 : months;
  }

  /**
   * UTF-8 sicherer Base64 Export
   * Generiert den JSON-String für den Download.
   * @returns {string}
   */
  exportJSON() {
    const data = {
      version: this.version,
      id: this.id,
      name: this.name,
      birthdate: this.birthdate,
      date: this.date,
      answers: this.answers,
    };
    const jsonStr = JSON.stringify(data);
    // Konvertiert String zu Uint8Array und dann zu Base64 (UTF-8 safe)
    const bytes = new TextEncoder().encode(jsonStr);
    const binString = String.fromCodePoint(...bytes);
    // Macht die Datei unleserlich für "Laien" (Base64 Encode)
    return btoa(binString);
  }

  /**
   * UTF-8 sicherer Base64 Import
   * Fabrikmethode: Erstellt eine ChildState-Instanz aus einem hochgeladenen JSON-String.
   * @param {string} jsonString
   * @returns {ChildState|null}
   */
  static importJSON(encodedString) {
    try {
      const binString = atob(encodedString);
      const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0));
      const jsonString = new TextDecoder().decode(bytes);

      const data = JSON.parse(jsonString);

      if (!data.name || !data.version || !data.birthdate) {
        throw new Error('Ungültiges oder veraltetes Format.');
      }
      return new ChildState(data.name, data.birthdate, data.date, data.id, data.answers, data.version);
    } catch (error) {
      console.error('Fehler beim Importieren:', error);
      alert('Die Datei konnte nicht gelesen werden. Ist es eine gültige Kuno-Datei?');
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
    if (backup) return ChildState.importJSON(backup);
    return null;
  }
}
