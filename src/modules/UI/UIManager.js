import Chart from 'chart.js/auto';
import html2pdf from 'html2pdf.js';
import Evaluation from '../AssessmentDomain/Evaluation.js';
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
    this.chartInstance = null;

    this.cacheDOM();
    this.bindEvents();
    this.checkRecovery();
  }

  cacheDOM() {
    this.elements = {
      currentChildName: document.getElementById('current-child-name'),
      uploadJsonInput: document.getElementById('upload-json'),
      saveJsonBtn: document.getElementById('save-json'),
      exportPdfBtn: document.getElementById('export-pdf'),
      newAssessmentBtn: document.getElementById('new-assessment'),
      endSessionBtn: document.getElementById('end-session'),

      setupSection: document.getElementById('setup-section'),
      childNameInput: document.getElementById('child-name'),
      childDateInput: document.getElementById('child-date'),
      startAssessmentBtn: document.getElementById('start-assessment'),

      assessmentSection: document.getElementById('assessment-section'),
      evaluationSection: document.getElementById('evaluation-section'),
      chartCanvas: document.getElementById('kuno-chart'),

      pdfContentArea: document.getElementById('pdf-content'),
    };
  }

  /**
   * Prüft beim Start, ob ein Auto-Save (Absturz, Reload) vorliegt
   */
  checkRecovery() {
    if (ChildState.hasBackup()) {
      if (confirm('Es wurde ein ungespeicherter Zwischenstand gefunden. Möchtest du ihn wiederherstellen?')) {
        const recoveredState = ChildState.loadFromStorage();
        if (recoveredState) {
          this.currentChildState = recoveredState;
          this.startAssessment();
        }
      } else {
        ChildState.clearStorage();
      }
    }
  }

  bindEvents() {
    // Neues Kind anlegen (Setup starten)
    this.elements.startAssessmentBtn.addEventListener('click', () => {
      const name = this.elements.childNameInput.value.trim();
      const date = this.elements.childDateInput.value;

      if (!name || !date) {
        alert('Bitte Vorname und Datum ausfüllen!');
        return;
      }

      this.currentChildState = new ChildState(name, date);
      this.currentChildState.saveToStorage(); // Initiales Auto-Save
      this.startAssessment();
    });

    // Laufende Arbeit verwerfen und Neu Starten
    this.elements.newAssessmentBtn.addEventListener('click', () => {
      if (this.currentChildState) {
        if (
          !confirm('Achtung: Dein aktueller Verlauf geht verloren! Hast du ihn als JSON heruntergeladen? Fortfahren?')
        ) {
          return;
        }
      }
      this.resetToSetup();
    });

    // Sitzung beenden (Löscht den Cache und geht zum Setup)
    this.elements.endSessionBtn.addEventListener('click', () => {
      if (confirm('Möchtest du die Sitzung wirklich beenden? Alle Daten werden vom Gerät gelöscht.')) {
        this.resetToSetup();
      }
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
          this.currentChildState.saveToStorage(); // Geladene JSON in den Cache legen
          this.startAssessment();
        }
      };
      reader.readAsText(file);
      // Input zurücksetzen, falls die gleiche Datei nochmals gewählt wird
      event.target.value = '';
    });

    // Zwischenspeichern (JSON Download)
    this.elements.saveJsonBtn.addEventListener('click', () => {
      if (!this.currentChildState) return;

      const jsonString = this.currentChildState.exportJSON();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `kuno_beller_${this.currentChildState.name}_${this.currentChildState.date}.json`;
      a.click();

      URL.revokeObjectURL(url);

      // Da der Nutzer aktiv gespeichert hat, können wir das Backup leeren
      ChildState.clearStorage();
    });

    // Auswerten & PDF Export
    this.elements.exportPdfBtn.addEventListener('click', () => {
      this.generateEvaluationAndPdf();
    });
  }

  startAssessment() {
    // UI umschalten (is-hidden nach BEM)
    this.elements.setupSection.classList.add('is-hidden');
    this.elements.assessmentSection.classList.remove('is-hidden');

    // Aktions-Buttons einblenden
    this.elements.saveJsonBtn.classList.remove('is-hidden');
    this.elements.exportPdfBtn.classList.remove('is-hidden');
    this.elements.endSessionBtn.classList.remove('is-hidden');

    this.elements.currentChildName.textContent = this.currentChildState.name;

    // Formular aufbauen
    this.formBuilder = new FormBuilder('question-container', this.currentChildState, this.questionsData);
    this.formBuilder.build();
  }

  resetToSetup() {
    this.currentChildState = null;
    ChildState.clearStorage();

    // UI zurücksetzen
    this.elements.currentChildName.textContent = 'Keines ausgewählt';
    this.elements.setupSection.classList.remove('is-hidden');
    this.elements.assessmentSection.classList.add('is-hidden');
    this.elements.evaluationSection.classList.add('is-hidden');

    // Aktions-Buttons ausblenden
    this.elements.saveJsonBtn.classList.add('is-hidden');
    this.elements.exportPdfBtn.classList.add('is-hidden');
    this.elements.endSessionBtn.classList.add('is-hidden');

    // Formular-Felder leeren
    this.elements.childNameInput.value = '';
    this.elements.childDateInput.value = '';
    document.getElementById('question-container').innerHTML = '';

    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
  }

  generateEvaluationAndPdf() {
    if (!this.currentChildState) return;

    // 1. Auswertung berechnen
    const evalLogic = new Evaluation(this.currentChildState, this.questionsData);
    const chartData = evalLogic.getChartData();

    // 2. Diagramm-Bereich sichtbar machen
    this.elements.evaluationSection.classList.remove('is-hidden');

    // 3. Altes Diagramm zerstören (falls mehrfach geklickt wird)
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    // 4. Neues Balkendiagramm zeichnen
    this.chartInstance = new Chart(this.elements.chartCanvas, {
      type: 'bar',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: 'Entwicklungsalter (in Phasen/Monaten)',
            data: chartData.dataset,
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 14, // Da wir 14 Phasen haben
          },
        },
      },
    });

    // PDF Generierung (Timeout für die Canvas-Animation)
    setTimeout(() => {
      const opt = {
        margin: 10,
        filename: `kuno_beller_${this.currentChildState.name}_${this.currentChildState.date}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 }, // Hohe Auflösung
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      // Nimmt NUR den main#pdf-content Bereich
      html2pdf().set(opt).from(this.elements.pdfContentArea).save();
    }, 800);
  }
}
