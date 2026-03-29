const questionContainer = document.getElementById("question-container");
const questionElement = document.getElementById("question");
const answerButtons = document.getElementById("answer-buttons");
const nextButton = document.getElementById("next-btn");
const restartButton = document.getElementById("restart-btn");
const resultDiv = document.getElementById("result");
const progressTrack = document.getElementById("progress-track");
const aiUsage = document.getElementById("ai-usage");
const consentScreen = document.getElementById("consent-screen");
const consentCheckbox = document.getElementById("consent-checkbox");
const consentStartBtn = document.getElementById("consent-start-btn");
const appShell = document.getElementById("app-shell");

let shuffledQuestions, currentQuestionIndex, score;
let questions = [];
let hasConsented = false;

async function loadQuestions() {
  try {
    const res = await fetch('questions.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    questions = await res.json();
    if (hasConsented) {
      startQuiz();
    }
  } catch (err) {
    console.error('Impossible de charger questions.json', err);
    alert('Impossible de charger questions.json (voir la console).');
  }
}

loadQuestions();

function startQuiz() {
  if (!questions || questions.length === 0) {
    console.warn('No questions available.');
    return;
  }
  score = 0;
  questionContainer.style.display = "flex";
  // Conserver l'ordre original des questions (pas de mélange)
  shuffledQuestions = [...questions];
  currentQuestionIndex = 0;
  nextButton.classList.remove("hide");
  restartButton.classList.add("hide");
  resultDiv.classList.add("hide");
  aiUsage.classList.remove("hide");
  renderProgressDots();
  setNextQuestion();
}

function setNextQuestion() {
  resetState();
  updateProgressDots();
  showQuestion(shuffledQuestions[currentQuestionIndex]);
}

function showQuestion(question) {
  questionElement.innerText = question.question;
  question.answers.forEach((answer, index) => {
    const inputGroup = document.createElement("div");
    inputGroup.classList.add("input-group");

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.id = "answer" + index;
    radio.name = "answer";
    radio.value = index;

    const label = document.createElement("label");
    label.htmlFor = "answer" + index;
    label.innerText = answer.text;

    inputGroup.appendChild(radio);
    inputGroup.appendChild(label);
    answerButtons.appendChild(inputGroup);
  });
}

function resetState() {
  while (answerButtons.firstChild) {
    answerButtons.removeChild(answerButtons.firstChild);
  }
}

function renderProgressDots() {
  progressTrack.innerHTML = "";

  shuffledQuestions.forEach((_, index) => {
    const dot = document.createElement("span");
    dot.classList.add("progress-dot");
    dot.dataset.index = index;
    progressTrack.appendChild(dot);
  });
}

function showConsentScreen() {
  consentScreen.classList.remove("hide");
  appShell.classList.add("hide");
}

function showAppShell() {
  consentScreen.classList.add("hide");
  appShell.classList.remove("hide");
}

consentCheckbox.addEventListener("change", () => {
  consentStartBtn.disabled = !consentCheckbox.checked;
});

consentStartBtn.addEventListener("click", () => {
  if (!consentCheckbox.checked) return;

  hasConsented = true;
  showAppShell();

  if (questions.length > 0) {
    startQuiz();
  }
});

function updateProgressDots() {
  const dots = progressTrack.querySelectorAll(".progress-dot");

  dots.forEach((dot, index) => {
    dot.classList.remove("is-current", "is-completed");

    if (index < currentQuestionIndex) {
      dot.classList.add("is-completed");
    } else if (index === currentQuestionIndex) {
      dot.classList.add("is-current");
    }
  });
}

nextButton.addEventListener("click", () => {
  const answerIndex = Array.from(
    answerButtons.querySelectorAll("input")
  ).findIndex((radio) => radio.checked);
  if (answerIndex !== -1) {
    if (shuffledQuestions[currentQuestionIndex].answers[answerIndex].correct) {
      score++;
    }
    currentQuestionIndex++;
    if (shuffledQuestions.length > currentQuestionIndex) {
      setNextQuestion();
    } else {
      endQuiz();
    }
  } else {
    alert("Please select an answer.");
  }
});

restartButton.addEventListener("click", startQuiz);

function endQuiz() {
  questionContainer.style.display = "none";
  nextButton.classList.add("hide");
  restartButton.classList.remove("hide");
  resultDiv.classList.remove("hide");
  aiUsage.classList.add("hide");
  resultDiv.innerText = `Your final score: ${score} / ${shuffledQuestions.length}`;
  updateProgressDots();
}

showConsentScreen();
