import ChildState from '../ChildDomain/ChildState.js';
import FormBuilder from './FormBuilder.js';

export default class UIManager {
  /**
   * @param {Object} questionsData Parsed questions.json
   */
  constructor(questionsData) {
    this.questionsData = questionsData;
    this.currentChildState = null;
    this.formBuilder = null;

    this.cacheDOM();
    this.bindEvents();
  }

  cacheDOM() {
    this.elements = {
      currentChildName: document.getElementById('current-child-name'),
      uploadJsonInput: document.getElementById('upload-json'),
      saveJsonBtn: document.getElementById('save-json'),

      setupSection: document.getElementById('setup-section'),
      childNameInput: document.getElementById('child-name'),
      childDateInput: document.getElementById('child-date'),
      startAssessmentBtn: document.getElementById('start-assessment'),

      assessmentSection: document.getElementById('assessment-section'),
    };
  }

  bindEvents() {
    // Neues Kind anlegen
    this.elements.startAssessmentBtn.addEventListener('click', () => {
      const name = this.elements.childNameInput.value.trim();
      const date = this.elements.childDateInput.value;

      if (!name || !date) {
        alert('Bitte Vorname und Datum ausfüllen!');
        return;
      }

      this.currentChildState = new ChildState(name, date);
      this.startAssessment();
    });

    // Vorhandenes Kind laden (JSON Upload)
    this.elements.uploadJsonInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const importedState = ChildState.importJSON(e.target.result);
        if (importedState) {
          this.currentChildState = importedState;
          this.startAssessment();
        }
      };
      reader.readAsText(file);
    });

    // Zwischenspeichern (JSON Download)
    this.elements.saveJsonBtn.addEventListener('click', () => {
      if (!this.currentChildState) {
        alert('Es ist aktuell kein Kind zur Bearbeitung geöffnet.');
        return;
      }

      const jsonString = this.currentChildState.exportJSON();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Temporären Link erstellen und Klick simulieren
      const a = document.createElement('a');
      a.href = url;
      a.download = `kuno_beller_${this.currentChildState.name}_${this.currentChildState.date}.json`;
      a.click();

      URL.revokeObjectURL(url);
    });
  }

  startAssessment() {
    // UI umschalten
    this.elements.setupSection.classList.add('hidden');
    this.elements.assessmentSection.classList.remove('hidden');
    this.elements.currentChildName.textContent = this.currentChildState.name;

    // Formular aufbauen
    this.formBuilder = new FormBuilder('question-container', this.currentChildState, this.questionsData);
    this.formBuilder.build();
  }
}
