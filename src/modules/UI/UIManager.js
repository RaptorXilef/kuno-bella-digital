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
      childBirthdateInput: document.getElementById('child-birthdate'),
      childDateInput: document.getElementById('child-date'),
      startAssessmentBtn: document.getElementById('start-assessment'),

      assessmentSection: document.getElementById('assessment-section'),
      evaluationSection: document.getElementById('evaluation-section'),
      evalMeta: document.getElementById('eval-meta'),
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
      const birthdate = this.elements.childBirthdateInput.value;
      const date = this.elements.childDateInput.value;

      if (!name || !birthdate || !date) {
        alert('Bitte Vorname und beide Daten ausfüllen!');
        return;
      }

      this.currentChildState = new ChildState(name, birthdate, date);
      this.currentChildState.saveToStorage(); // Initiales Auto-Save
      this.startAssessment();
    });

    // Laufende Arbeit verwerfen und Neu Starten
    this.elements.newAssessmentBtn.addEventListener('click', () => {
      if (this.currentChildState) {
        if (!confirm('Achtung: Dein aktueller Verlauf geht verloren! Fortfahren?')) return;
      }
      this.resetToSetup();
    });

    // Sitzung beenden (Löscht den Cache und geht zum Setup)
    this.elements.endSessionBtn.addEventListener('click', () => {
      if (confirm('Sitzung beenden? Alle Daten werden vom Gerät gelöscht.')) {
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

      const encodedString = this.currentChildState.exportJSON();
      const blob = new Blob([encodedString], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      // Format: YYYYMMDD-HHMMSS
      const now = new Date();
      const timestamp = now.toISOString().replace(/T/, '-').replace(/:/g, '').split('.')[0];

      const a = document.createElement('a');
      a.href = url;
      a.download = `kuno_beller_${this.currentChildState.name}_${timestamp}.kuno`;
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
    this.elements.childBirthdateInput.value = '';
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
    const ageInMonths = this.currentChildState.getAgeInMonths();

    // Metadaten anzeigen
    this.elements.evalMeta.innerHTML = `
            <strong>Kind:</strong> ${this.currentChildState.name}<br>
            <strong>Lebensalter (bei Beobachtung):</strong> ${ageInMonths} Monate
        `;

    // 2. Diagramm-Bereich sichtbar machen
    this.elements.evaluationSection.classList.remove('is-hidden');

    // 3. Altes Diagramm zerstören (falls mehrfach geklickt wird)
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    // Basis = Durchschnitt - 20%, Decke = Durchschnitt + 20% (als grobe visuelle Hilfslinien)
    const ageLine = Array(chartData.labels.length).fill(ageInMonths);

    // 4. Neues Balkendiagramm zeichnen
    this.chartInstance = new Chart(this.elements.chartCanvas, {
      type: 'bar',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: 'Entwicklungsalter (Phasen/Monate)',
            data: chartData.dataset,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            order: 2,
            barPercentage: 0.6,
          },
          {
            type: 'line',
            label: 'Lebensalter (Durchschnitt)',
            data: ageLine,
            borderColor: 'rgba(255, 99, 132, 1)',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0, // Keine Punkte auf der Linie
            fill: false,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 14, // Da wir 14 Phasen haben
            title: { display: true, text: 'Phasen (ca. Monate)', font: { size: 14, weight: 'bold' } },
            ticks: {
              // Zwingt Chart.js, in 0.1er Schritten zu arbeiten
              stepSize: 0.1,
              callback: (value) => {
                // Zeige nur volle Zahlen (1, 2, 3...) an der Achse an
                if (Number.isInteger(value)) {
                  return value;
                }
                return null;
              },
            },
            grid: {
              // Zeichnet die Linien im Hintergrund (0.1 bis 0.9)
              color: (context) => {
                if (context.tick.value === 0) return 'rgba(0, 0, 0, 0.5)';
                if (Number.isInteger(context.tick.value)) return 'rgba(0, 0, 0, 0.3)';
                // Die .5er Mitte (Halbe Phase) etwas dunkler hervorheben
                if ((context.tick.value * 10) % 10 === 5) return 'rgba(0, 0, 0, 0.15)';
                // Die 9 kleinen Zwischenstriche (0.1, 0.2...) sehr dezent
                return 'rgba(0, 0, 0, 0.05)';
              },
            },
          },
        },
      },
    });

    // HTML2PDF WORKAROUND:
    // Setze für den Druck die Root-Styles auf Standard RGB-Werte (html2pdf crasht bei CSS-Variablen + oklch)
    const root = document.documentElement;
    root.style.cssText = `
            --color-bg: #f9f9fa;
            --color-surface: #ffffff;
            --color-text-main: #333333;
            --color-primary: #3b82f6;
            --color-success: #22c55e;
            --color-danger: #ef4444;
            --color-border: #e5e7eb;
        `;

    // Kurzer Timeout für das Diagramm-Rendering, dann drucken
    setTimeout(() => {
      const opt = {
        margin: [15, 10, 15, 10], // Etwas mehr Margin oben und unten
        filename: `kuno_beller_${this.currentChildState.name}_${this.currentChildState.date}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: 'css', avoid: ['.c-phase', '.c-category'] }, // Versucht, Phasen auf Seiten nicht zu durchschneiden
      };

      // Nimmt NUR den main#pdf-content Bereich
      html2pdf()
        .set(opt)
        .from(this.elements.pdfContentArea)
        .save()
        .then(() => {
          // PDF fertig -> OKLCH Farben wiederherstellen
          root.style.cssText = '';
        });
    }, 1000);
  }
}
