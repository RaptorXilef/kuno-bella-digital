import Chart from 'chart.js/auto';
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
      evaluateBtn: document.getElementById('evaluate-btn'),
      exportPdfEvalBtn: document.getElementById('export-pdf-eval'),
      exportPdfQuestBtn: document.getElementById('export-pdf-quest'),
      newAssessmentBtn: document.getElementById('new-assessment'),
      endSessionBtn: document.getElementById('end-session'),
      editMetaBtn: document.getElementById('edit-meta-btn'),

      setupSection: document.getElementById('setup-section'),
      setupTitle: document.getElementById('setup-title'),
      childNameInput: document.getElementById('child-name'),
      childBirthdateInput: document.getElementById('child-birthdate'),
      childDateInput: document.getElementById('child-date'),
      startAssessmentBtn: document.getElementById('start-assessment'),

      assessmentSection: document.getElementById('assessment-section'),
      evaluationSection: document.getElementById('evaluation-section'),
      overviewSection: document.getElementById('quick-overview-section'),
      evalMeta: document.getElementById('eval-meta'),
      chartCanvas: document.getElementById('kuno-chart'),
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
          // FIX: FormBuilder muss hier zwingend aufgerufen werden!
          this.formBuilder = new FormBuilder('question-container', this.currentChildState, this.questionsData);
          this.formBuilder.build();
          this.startAssessment();
        }
      } else {
        ChildState.clearStorage();
      }
    }
  }

  /**
   * Injiziert dynamisch eine Print-Style-Regel, um zwischen Hoch- und Querformat zu wechseln
   */
  injectPrintStyle(cssRule) {
    let style = document.getElementById('dynamic-print-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'dynamic-print-style';
      document.head.appendChild(style);
    }
    style.innerHTML = cssRule;
  }

  bindEvents() {
    // Bereinigt die Print-Klassen, wenn der native PDF Dialog geschlossen wird
    window.addEventListener('afterprint', () => {
      document.body.classList.remove('print-eval', 'print-quest');
      const printStyle = document.getElementById('dynamic-print-style');
      if (printStyle) printStyle.remove();
    });

    // Neues Kind anlegen (Setup starten)
    this.elements.startAssessmentBtn.addEventListener('click', () => {
      const name = this.elements.childNameInput.value.trim();
      const birthdate = this.elements.childBirthdateInput.value;
      const date = this.elements.childDateInput.value;

      if (!name || !birthdate || !date) {
        alert('Bitte Vorname und beide Daten ausfüllen!');
        return;
      }

      // Wenn bereits ein ChildState existiert (Edit-Modus), patchen wir ihn nur,
      // anstatt ihn neu zu überschreiben, damit die Antworten erhalten bleiben!
      if (this.currentChildState) {
        this.currentChildState.name = name;
        this.currentChildState.birthdate = birthdate;
        this.currentChildState.date = date;
        // Wenn wir vom Diagramm aus bearbeiten, updaten wir das Diagramm sofort!
        if (!this.elements.evaluationSection.classList.contains('is-hidden')) {
          this.generateEvaluation();
        }
      } else {
        this.currentChildState = new ChildState(name, birthdate, date);
        this.formBuilder = new FormBuilder('question-container', this.currentChildState, this.questionsData);
        this.formBuilder.build();
      }

      this.currentChildState.saveToStorage();
      this.startAssessment();
    });

    // "Metadaten bearbeiten" Button im Diagramm
    this.elements.editMetaBtn.addEventListener('click', () => {
      this.elements.setupTitle.textContent = 'Metadaten bearbeiten';
      this.elements.childNameInput.value = this.currentChildState.name;
      this.elements.childBirthdateInput.value = this.currentChildState.birthdate;
      this.elements.childDateInput.value = this.currentChildState.date;

      this.elements.setupSection.classList.remove('is-hidden');
      // Wir scrollen smooth nach oben zum Bearbeiten
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Laufende Arbeit verwerfen und Neu Starten
    this.elements.newAssessmentBtn.addEventListener('click', () => {
      if (this.currentChildState && !confirm('Achtung: Dein Verlauf geht verloren! Fortfahren?')) return;
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
          this.formBuilder = new FormBuilder('question-container', this.currentChildState, this.questionsData);
          this.formBuilder.build();
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

    // 1. Klick auf Auswerten generiert die Daten im Browser
    this.elements.evaluateBtn.addEventListener('click', () => {
      this.generateEvaluation();
    });

    // 2. Klick auf "PDF: Auswertung" -> QUERFORMAT
    this.elements.exportPdfEvalBtn.addEventListener('click', () => {
      this.injectPrintStyle('@page { size: A4 landscape; margin: 1cm; }');
      document.body.classList.add('print-eval');

      // Chart muss sich auf das neue Querformat-Verhältnis anpassen
      if (this.chartInstance) this.chartInstance.resize();

      setTimeout(() => window.print(), 300);
    });

    // 3. Klick auf "PDF: Katalog" -> HOCHFORMAT
    this.elements.exportPdfQuestBtn.addEventListener('click', () => {
      this.injectPrintStyle('@page { size: A4 portrait; margin: 1cm; }');
      document.body.classList.add('print-quest');
      window.print();
    });
  }

  startAssessment() {
    // UI umschalten (is-hidden nach BEM)
    this.elements.setupSection.classList.add('is-hidden');
    this.elements.assessmentSection.classList.remove('is-hidden');

    // Aktions-Buttons einblenden
    this.elements.editMetaBtn.classList.remove('is-hidden');
    this.elements.saveJsonBtn.classList.remove('is-hidden');
    this.elements.evaluateBtn.classList.remove('is-hidden');
    this.elements.endSessionBtn.classList.remove('is-hidden');

    this.elements.currentChildName.textContent = this.currentChildState.name;
  }

  resetToSetup() {
    this.currentChildState = null;
    ChildState.clearStorage();

    // UI zurücksetzen
    this.elements.currentChildName.textContent = 'Keines ausgewählt';
    this.elements.setupTitle.textContent = 'Kind anlegen';

    this.elements.setupSection.classList.remove('is-hidden');
    this.elements.assessmentSection.classList.add('is-hidden');
    this.elements.evaluationSection.classList.add('is-hidden');
    this.elements.overviewSection.classList.add('is-hidden');

    // Aktions-Buttons ausblenden
    this.elements.editMetaBtn.classList.add('is-hidden');
    this.elements.saveJsonBtn.classList.add('is-hidden');
    this.elements.evaluateBtn.classList.add('is-hidden');
    this.elements.exportPdfEvalBtn.classList.add('is-hidden');
    this.elements.exportPdfQuestBtn.classList.add('is-hidden');
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

  generateOverviewGrid() {
    const evalLogic = new Evaluation(this.currentChildState, this.questionsData);
    const metrics = evalLogic.calculateAllMetrics(); // Die neuen Metriken laden
    let html = '<h2 class="c-overview__title">Schnellübersicht</h2>';

    for (const [categoryName, phases] of Object.entries(this.questionsData)) {
      html += `<div class="c-overview__category">`;
      html += `<h3 class="c-overview__category-title">${categoryName} (Score: ${metrics[categoryName].score} | Basis: ${metrics[categoryName].basis} | Decke: ${metrics[categoryName].decke})</h3>`;
      html += `<table class="c-overview__table">`;

      // Finde max. Fragenanzahl
      const phaseKeys = Object.keys(phases);
      const maxQ = Math.max(...phaseKeys.map((p) => phases[p].length));

      // THEAD
      html += '<thead><tr><th>Phase</th>';
      phaseKeys.forEach((p) => (html += `<th>${p.replace('PHASE ', '')}</th>`));
      html += '</tr></thead><tbody>';

      // PUNKTZAHL REIHE (bereinigte Werte)
      html += '<tr class="is-score"><td>Punkte</td>';
      phaseKeys.forEach((p, index) => {
        const phaseVal = metrics[categoryName].rawPhaseScores[index];
        html += `<td>${phaseVal > 0 ? evalLogic.roundScore(phaseVal) : '0'}</td>`;
      });
      html += '</tr>';

      // FRAGEN REIHEN
      const aMap = { yes: '1', partially: '0.5', no: '0', unknown: 'W' };
      for (let i = 0; i < maxQ; i++) {
        html += `<tr><td>F ${i + 1}</td>`;
        phaseKeys.forEach((p) => {
          const q = phases[p][i];
          if (q) {
            const ans = this.currentChildState.getAnswer(categoryName, p, q.id);
            html += `<td>${ans ? aMap[ans] : ''}</td>`;
          } else {
            html += `<td class="is-empty"></td>`;
          }
        });
        html += '</tr>';
      }

      html += '</tbody></table></div>';
    }

    this.elements.overviewSection.innerHTML = html;
    this.elements.overviewSection.classList.remove('is-hidden');
  }

  generateEvaluation() {
    if (!this.currentChildState) return;

    // Button bleibt stehen für Updates, Export-Buttons tauchen rechts daneben auf!
    this.elements.exportPdfEvalBtn.classList.remove('is-hidden');
    this.elements.exportPdfQuestBtn.classList.remove('is-hidden');

    // Render Schnellübersicht
    this.generateOverviewGrid();

    // Render Chart
    const evalLogic = new Evaluation(this.currentChildState, this.questionsData);
    const metrics = evalLogic.calculateAllMetrics();

    const ageInMonths = this.currentChildState.getAgeInMonths();
    // Hier greift nun die reparierte Logik, die 5 Jahre alt = Phase 14 liefert!
    const bellerPhaseAge = Evaluation.convertMonthsToPhase(ageInMonths);

    // Metadaten anzeigen
    this.elements.evalMeta.innerHTML = `
            <strong>Kind:</strong> ${this.currentChildState.name}<br>
            <strong>Lebensalter (bei Beobachtung):</strong> ${ageInMonths} Monate
            <small>(entspricht ca. Phase ${evalLogic.roundScore(bellerPhaseAge)})</small>
        `;

    // 2. Diagramm-Bereich sichtbar machen
    this.elements.evaluationSection.classList.remove('is-hidden');

    // 3. Altes Diagramm zerstören (falls mehrfach geklickt wird)
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const labels = Object.keys(metrics);

    // Die 4 separaten Metriken für die 4 Linien!
    const dataDurchschnitt = labels.map((l) => metrics[l].score);
    const dataBasis = labels.map((l) => metrics[l].basis);
    const dataDecke = labels.map((l) => metrics[l].decke);

    // Lebensalter ist eine gerade Konstante durch alle Kategorien
    const lineLebensalter = Array(labels.length).fill(bellerPhaseAge);

    this.chartInstance = new Chart(this.elements.chartCanvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Erreicht (Balken)',
            data: dataDurchschnitt,
            backgroundColor: 'rgba(54, 162, 235, 0.3)',
            borderColor: 'rgba(54, 162, 235, 0)',
            borderWidth: 0,
            order: 5,
            barPercentage: 0.6,
          },
          {
            type: 'line',
            label: 'Durchschnitt',
            data: dataDurchschnitt,
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: 'rgba(54, 162, 235, 1)',
            fill: false,
            order: 2,
          },
          {
            type: 'line',
            label: 'Basis',
            data: dataBasis,
            borderColor: 'rgba(255, 159, 64, 1)',
            borderDash: [2, 2],
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: 'rgba(255, 159, 64, 1)',
            fill: false,
            order: 3,
          },
          {
            type: 'line',
            label: 'Decke',
            data: dataDecke,
            borderColor: 'rgba(75, 192, 192, 1)',
            borderDash: [2, 2],
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: 'rgba(75, 192, 192, 1)',
            fill: false,
            order: 1,
          },
          {
            type: 'line',
            label: 'Lebensalter',
            data: lineLebensalter,
            borderColor: 'rgba(255, 99, 132, 1)',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            order: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 15,
            title: { display: true, text: 'Phasen', font: { size: 14, weight: 'bold' } },
            ticks: {
              stepSize: 0.1, // 0.1er Schritte erzwingen
              callback: (value) => {
                // Die Achse soll nur Zahlen beschriften, bei 1.0, 2.0, 3.0 etc.
                // Um float-math-Fehler zu umgehen (1.000000001), runden wir auf 1 Nachkommastelle
                const rounded = Math.round(value * 10) / 10;
                return Number.isInteger(rounded) ? rounded : null;
              },
            },
            grid: {
              // Zeichnet die Linien im Hintergrund (0.1 bis 0.9)
              color: (context) => {
                const rounded = Math.round(context.tick.value * 10) / 10;
                if (rounded === 0) return 'rgba(0, 0, 0, 0.5)'; // Dicke 0 Linie
                if (Number.isInteger(rounded)) return 'rgba(0, 0, 0, 0.4)'; // Dickere Linie bei 1, 2, 3...

                // Super feine Hilfslinien bei 0.1, 0.2, 0.3...
                return 'rgba(0, 0, 0, 0.05)';
              },
            },
          },
        },
      },
    });
  }
}
