/**
 * Verarbeitet den ChildState und berechnet die Entwicklungswerte
 * für das finale Kuno Beller Diagramm.
 */
export default class Evaluation {
  /**
   * @param {Object} childState Aktueller Zustand des Kindes
   * @param {Object} questionsData Basisdaten der Fragenstruktur
   */
  constructor(childState, questionsData) {
    this.childState = childState;
    this.questionsData = questionsData;
  }

  /**
   * Berechnet den finalen Score für alle Kategorien.
   * @returns {Object} Ein Objekt mit den Scores pro Kategorie { "Körperpflege": 8.5, "Sprache": 10.0 }
   */
  calculateScores() {
    const scores = {};

    for (const [categoryName, phases] of Object.entries(this.questionsData)) {
      let categoryScore = 0;

      for (const [phaseName, questions] of Object.entries(phases)) {
        // Ein Array mit den gegebenen Antworten für diese Phase
        const answersInPhase = questions.map((q) => this.childState.getAnswer(categoryName, phaseName, q.id));

        // Berechne die Punkte für diese Phase
        const phasePoints = this.calculatePhasePoints(answersInPhase, questions.length);
        categoryScore += phasePoints;
      }

      // Der Score repräsentiert näherungsweise das Entwicklungsalter in "Phasen/Monaten"
      scores[categoryName] = this.roundScore(categoryScore);
    }

    return scores;
  }

  /**
   * Berechnet die Punkte für eine einzelne Phase.
   * Wenn alle Fragen mit "Tut es" beantwortet wurden, gibt es 1 vollen Punkt (1 Entwicklungsphase).
   * Wenn nicht, gibt es anteilig Punkte.
   *
   * @param {Array<string|null>} answers
   * @param {number} totalQuestionsInPhase
   * @returns {number} Punkte (z.B. 1.0, 0.5, 0.75)
   */
  calculatePhasePoints(answers, totalQuestionsInPhase) {
    if (totalQuestionsInPhase === 0) return 0;

    let rawPoints = 0;

    answers.forEach((answer) => {
      if (answer === 'yes') {
        rawPoints += 1;
      } else if (answer === 'partially') {
        rawPoints += 0.5;
      }
      // 'no', 'unknown' und null geben 0 Punkte
    });

    // Die erreichten Punkte werden durch die Anzahl der Fragen geteilt.
    // Bsp: 4 Fragen in der Phase, 3 mal "yes", 1 mal "no" -> 3/4 = 0.75 Punkte für diese Phase
    return rawPoints / totalQuestionsInPhase;
  }

  /**
   * Rundet den Score auf eine Nachkommastelle für das Diagramm.
   * @param {number} value
   * @returns {number}
   */
  roundScore(value) {
    return Math.round(value * 10) / 10;
  }

  /**
   * Generiert die Labels und Daten für Chart.js
   * @returns {Object} { labels: [...], dataset: [...] }
   */
  getChartData() {
    const scores = this.calculateScores();
    return {
      labels: Object.keys(scores),
      dataset: Object.values(scores),
    };
  }
}
