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
    this.container.innerHTML = ''; // Container leeren (falls neu geladen wird)

    for (const [categoryName, phases] of Object.entries(this.questionsData)) {
      const categorySection = this.createCategorySection(categoryName, phases);
      this.container.appendChild(categorySection);
    }
  }

  /**
   * Baut einen Bereich für eine Kategorie (z.B. Körperpflege).
   */
  createCategorySection(categoryName, phases) {
    const section = document.createElement('section');
    section.className = 'c-category';

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

    // Den Text am "Bsp.:" Umbruch splitten, damit das Beispiel kleiner dargestellt wird
    const parts = question.text.split('\n');
    let htmlText = `<strong>${question.id}. ${parts[0]}</strong>`;
    if (parts.length > 1) {
      htmlText += `<br><small class="c-question__example">${parts.slice(1).join('<br>')}</small>`;
    }
    textDiv.innerHTML = htmlText;
    row.appendChild(textDiv);

    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'c-question__options';

    // Die festgelegten Antwortmöglichkeiten
    const options = [
      { value: 'yes', label: 'Tut es' },
      { value: 'partially', label: 'Teilweise' },
      { value: 'no', label: 'Tut es nicht' },
      { value: 'unknown', label: 'Weiß nicht' },
    ];

    const currentAnswer = this.childState.getAnswer(categoryName, phaseName, question.id);

    options.forEach((opt) => {
      const btn = document.createElement('button');
      const isSelected = currentAnswer === opt.value ? 'is-selected' : '';
      // Nutzung des BEM-Modifiers "--option" und State "is-selected"
      btn.className = `btn btn--option ${isSelected}`;
      btn.textContent = opt.label;
      btn.dataset.value = opt.value;

      // Klick-Event für die Auswahl
      btn.addEventListener('click', () => {
        // 1. Visuelles Update: "is-selected" bei allen Geschwistern entfernen
        const siblingButtons = optionsDiv.querySelectorAll('.btn--option');
        for (const sibling of siblingButtons) {
          sibling.classList.remove('is-selected');
        }
        // Bei sich selbst setzen
        btn.classList.add('is-selected');

        // 2. Im Arbeitsspeicher (ChildState) speichern
        this.childState.setAnswer(categoryName, phaseName, question.id, opt.value);
      });

      optionsDiv.appendChild(btn);
    });

    row.appendChild(optionsDiv);
    return row;
  }
}
