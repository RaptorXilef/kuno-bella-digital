/**
 * Baut das Formular aus der questions.json dynamisch auf.
 * Verbindet die UI-Eingaben direkt mit dem ChildState.
 */
export default class FormBuilder {
  /**
   * @param {string} containerId ID des HTML-Containers
   * @param {Object} childState Instanz von ChildState
   * @param {Object} questionsData Parsed questions.json
   */
  constructor(containerId, childState, questionsData) {
    this.container = document.getElementById(containerId);
    this.childState = childState;
    this.questionsData = questionsData;
  }

  /**
   * Generiert das komplette HTML und hängt es ins DOM ein.
   */
  build() {
    this.container.innerHTML = ''; // Container leeren, falls wir neu laden

    for (const [categoryName, phases] of Object.entries(this.questionsData)) {
      const categorySection = this.createCategorySection(categoryName, phases);
      this.container.appendChild(categorySection);
    }
  }

  /**
   * Baut einen Bereich für eine Kategorie (z.B. Körperpflege).
   */
  createCategorySection(categoryName, phases) {
    // Flaches, stabiles Layout (kein Akkordeon)
    const section = document.createElement('section');
    section.className = 'c-category';
    // Attribut für das farbige Styling der jeweiligen Kategorie
    section.setAttribute('data-category', categoryName);

    const title = document.createElement('h2');
    title.className = 'c-category__title';
    title.textContent = categoryName;
    section.appendChild(title);

    for (const [phaseName, questions] of Object.entries(phases)) {
      const phaseSection = this.createPhaseSection(categoryName, phaseName, questions);
      section.appendChild(phaseSection);
    }

    return section;
  }

  /**
   * Baut einen Phasen-Bereich innerhalb einer Kategorie.
   */
  createPhaseSection(categoryName, phaseName, questions) {
    const phaseDiv = document.createElement('div');
    phaseDiv.className = 'c-phase';

    const title = document.createElement('h3');
    title.className = 'c-phase__title';
    title.textContent = phaseName;
    phaseDiv.appendChild(title);

    const questionList = document.createElement('div');
    questionList.className = 'c-phase__questions';

    questions.forEach((question) => {
      const questionRow = this.createQuestionRow(categoryName, phaseName, question);
      questionList.appendChild(questionRow);
    });

    phaseDiv.appendChild(questionList);
    return phaseDiv;
  }

  /**
   * Generiert eine einzelne Frage inkl. der Auswahl-Buttons.
   */
  createQuestionRow(categoryName, phaseName, question) {
    const row = document.createElement('div');
    row.className = 'c-question';

    const textDiv = document.createElement('div');
    textDiv.className = 'c-question__text';

    // Den Text am Zeilenumbruch splitten, um das "Bsp.:" kleiner darzustellen
    const parts = question.text.split('\n');
    let htmlText = `<strong>${question.id}. ${parts[0]}</strong>`;
    if (parts.length > 1) {
      htmlText += `<br><small class="c-question__example">${parts.slice(1).join('<br>')}</small>`;
    }
    textDiv.innerHTML = htmlText;
    row.appendChild(textDiv);

    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'c-question__options';

    // Die festgelegten Antwortmöglichkeiten nach Beller
    const options = [
      { value: 'yes', label: 'Tut es' },
      { value: 'partially', label: 'Teilweise' },
      { value: 'no', label: 'Tut es nicht' },
      { value: 'unknown', label: 'Weiß nicht' },
    ];

    // Falls wir eine JSON geladen haben, prüfen wir, ob schon etwas ausgewählt war
    const currentAnswer = this.childState.getAnswer(categoryName, phaseName, question.id);

    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button'; // Fixt den Biome Fehler

      const isSelectedClass = currentAnswer === opt.value ? 'is-selected' : '';
      btn.className = `c-button c-button--option ${isSelectedClass}`.trim();
      btn.textContent = opt.label;

      // WICHTIG für SCSS: Data-Value steuert die Farbe (rot, grün, blau, grau)
      btn.dataset.value = opt.value;

      // Klick-Event für die Auswahl
      btn.addEventListener('click', () => {
        // 1. Visuelles Update: "is-selected" bei allen Geschwistern entfernen
        const siblingButtons = optionsDiv.querySelectorAll('.c-button--option');
        for (const sibling of siblingButtons) {
          sibling.classList.remove('is-selected');
        }
        // 2. Bei sich selbst setzen
        btn.classList.add('is-selected');

        // Das speichert den Wert und löst automatisch das LocalStorage-Auto-Save aus!
        this.childState.setAnswer(categoryName, phaseName, question.id, opt.value);
      });

      optionsDiv.appendChild(btn);
    });

    row.appendChild(optionsDiv);
    return row;
  }
}
