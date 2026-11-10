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
   * Konvertiert Kalendermonate in den Beller-Phasen-Wert,
   * damit die Durchschnittslinie exakt ins Skalen-Fenster (1-14) passt.
   */
  static convertMonthsToPhase(months) {
    if (months <= 1) return 1;
    if (months <= 2) return 2;
    if (months <= 3) return 3;
    if (months <= 4) return 4;
    if (months <= 5) return 5;
    // Approximation der Phasen 6-12 (immer größere Sprünge)
    if (months <= 7) return 6 + (months - 5) / 2;
    if (months <= 9) return 7 + (months - 7) / 2;
    if (months <= 11) return 8 + (months - 9) / 2;
    if (months <= 15) return 9 + (months - 11) / 4;
    if (months <= 21) return 10 + (months - 15) / 6;
    if (months <= 28) return 11 + (months - 21) / 7;
    if (months <= 36) return 12 + (months - 28) / 8;
    // Phase 13 = 37 bis 48 Monate
    if (months <= 48) return 13 + (months - 36) / 12;
    // Phase 14 = ab 49 Monaten (bis 72). Wenn Kind 5 Jahre (60 Monate) ist,
    // wird es hier korrekt in Phase 14 einsortiert!
    if (months > 48) {
      const phase = 14 + (months - 48) / 24;
      return phase > 14.9 ? 14.9 : phase; // Maximal Phase 14.9 zeichnen, damit die Linie nicht aus dem Canvas springt
    }
    return 14;
  }
}
