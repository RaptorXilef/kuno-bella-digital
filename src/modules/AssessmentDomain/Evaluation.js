/**
 * Verarbeitet den ChildState und berechnet die Entwicklungswerte
 * strikt nach dem Kuno Beller Regelwerk.
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
   * Berechnet alle Metriken (Score, Basis, Decke) für alle Kategorien.
   * @returns {Object}
   */
  calculateAllMetrics() {
    const results = {};

    for (const [categoryName, phases] of Object.entries(this.questionsData)) {
      const phaseKeys = Object.keys(phases);
      const phaseScores = []; // Speichert die Punkte [Phase 1, Phase 2, ...]

      // 1. Punkte pro Phase berechnen
      phaseKeys.forEach((p) => {
        const questions = phases[p];
        const answersInPhase = questions.map((q) => this.childState.getAnswer(categoryName, p, q.id));
        phaseScores.push(this.calculatePhasePoints(answersInPhase));
      });

      // 2. Basis finden (Die HÖCHSTE Phase, die den Wert 1.0 hat)
      // Wir suchen von hinten (höchste Phase) nach vorne.
      let basisIndex = -1;
      for (let i = phaseScores.length - 1; i >= 0; i--) {
        if (phaseScores[i] === 1.0) {
          basisIndex = i;
          break;
        }
      }

      // Regel: Alle Phasen unter der Basis erhalten automatisch den Wert 1.0
      if (basisIndex > -1) {
        for (let i = 0; i < basisIndex; i++) {
          phaseScores[i] = 1.0;
        }
      }

      // 3. Decke finden (Die ERSTE Phase nach der Basis, die 0.0 hat)
      let deckeIndex = phaseScores.length; // Default: ganz oben (Phase 14)
      const startIndex = basisIndex > -1 ? basisIndex + 1 : 0;
      for (let i = startIndex; i < phaseScores.length; i++) {
        if (phaseScores[i] === 0.0) {
          deckeIndex = i; // Sobald 0 erreicht ist, ist das die Decke
          break;
        }
      }

      // 4. Den finalen Durchschnittswert berechnen (Summe aller Phasen bis zur Decke)
      let totalScore = 0;
      for (let i = 0; i <= deckeIndex && i < phaseScores.length; i++) {
        totalScore += phaseScores[i];
      }

      // In Beller-Diagramm wird Phase 1 bei Y=1 eingetragen.
      // Die "Basis" ist basisIndex + 1 (da Array bei 0 startet).
      // Die "Decke" (der Bereich in dem 0 beginnt) ist deckeIndex (da deckeIndex = 8 bedeutet Phase 9, der Wert wird bei 8 eingetragen).
      results[categoryName] = {
        score: this.roundScore(totalScore),
        basis: basisIndex > -1 ? basisIndex + 1 : 0,
        decke: deckeIndex,
        rawPhaseScores: phaseScores, // Für die Tabelle
      };
    }

    return results;
  }

  /**
   * Berechnet die Punkte für eine einzelne Phase.
   * "Weiß nicht" Antworten fallen komplett aus der Berechnung!
   *
   * @param {Array<string|null>} answers
   * @returns {number} Punkte (z.B. 1.0, 0.5)
   */
  calculatePhasePoints(answers) {
    let yes = 0,
      partially = 0,
      unknownOrNull = 0;
    answers.forEach((answer) => {
      if (answer === 'yes') yes++;
      else if (answer === 'partially') partially++;
      else if (answer === 'unknown' || !answer) unknownOrNull++;
    });

    const totalValidQuestions = answers.length - unknownOrNull;
    if (totalValidQuestions === 0) return 0; // Wenn alles "weiß nicht" ist
    return (yes * 1 + partially * 0.5) / totalValidQuestions;
  }

  roundScore(value) {
    return Math.round(value * 100) / 100; // Zwei Nachkommastellen für die Genauigkeit
  }

  /**
   * Konvertiert Kalendermonate exakt in den Beller-Phasen-Wert.
   * Nach Handbuch:
   * Phase 1-4 = Jeweils 3 Monate (0 bis 12)
   * Phase 5-14 = Jeweils 6 Monate (13 bis 72)
   */
  static convertMonthsToPhase(months) {
    if (months <= 0) return 0;

    // Erstes Lebensjahr: Jede Phase ist 3 Monate lang
    if (months <= 12) {
      return months / 3;
    }

    // Ab dem 13. Monat: Jede Phase ist 6 Monate lang
    // Da wir bei 12 Monaten in Phase 4.0 sind, rechnen wir von dort weiter.
    if (months <= 72) {
      return 4 + (months - 12) / 6;
    }

    // Alles über 72 Monaten wird bei 14 gedeckelt
    return 14;
  }
}
