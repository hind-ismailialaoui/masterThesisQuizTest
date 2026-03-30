const questionContainer = document.getElementById("question-container");
const questionElement = document.getElementById("question");
const answerButtons = document.getElementById("answer-buttons");
const nextButton = document.getElementById("next-btn");
const restartButton = document.getElementById("restart-btn");
const resultDiv = document.getElementById("result");
const finalTimeDiv = document.getElementById("final-time");
const progressTrack = document.getElementById("progress-track");
const aiUsage = document.getElementById("ai-usage");
const consentScreen = document.getElementById("consent-screen");
const consentCheckbox = document.getElementById("consent-checkbox");
const consentStartBtn = document.getElementById("consent-start-btn");
const usernameScreen = document.getElementById("username-screen");
const usernameInput = document.getElementById("username-input");
const usernameContinueBtn = document.getElementById("username-continue-btn");
const usernameError = document.getElementById("username-error");
const appShell = document.getElementById("app-shell");
const timerDisplay = document.getElementById("timer-display");

// Set this to 5, 10, 15, 20, etc. Use null to keep all available questions.
const QUESTION_LIMIT = 1; //null -> all questions

let shuffledQuestions, currentQuestionIndex, score;
let questions = [];
let hasConsented = false;
let hasEnteredUsername = false;
let participantUsername = "";
let elapsedSeconds = 0;
let timerIntervalId = null;
let quizResults = [];
let aiInteractions = [];

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
  quizResults = [];
  aiInteractions = [];
  resetTimer();
  startTimer();
  questionContainer.style.display = "flex";
  // Conserver l'ordre original des questions (pas de mélange)
  shuffledQuestions = QUESTION_LIMIT
    ? questions.slice(0, QUESTION_LIMIT)
    : [...questions];
  currentQuestionIndex = 0;
  nextButton.classList.remove("hide");
  restartButton.classList.add("hide");
  resultDiv.classList.add("hide");
  finalTimeDiv.classList.add("hide");
  timerDisplay.classList.remove("hide");
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

function formatElapsedTime(totalSeconds) {
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function recordAiInteraction(userQuestion, aiAnswer) {
  aiInteractions.push({
    user_name: participantUsername,
    user_input: userQuestion,
    ia_answer: aiAnswer,
    time: formatElapsedTime(elapsedSeconds),
  });
}

async function saveSessionFiles() {
  const payload = {
    user_name: participantUsername,
    quiz_results: quizResults,
    ai_interactions: aiInteractions,
  };

  const response = await fetch('/api/save-results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Impossible de sauvegarder les resultats.');
  }
}

function updateTimerDisplay() {
  timerDisplay.textContent = `Time spent: ${formatElapsedTime(elapsedSeconds)}`;
}

function startTimer() {
  stopTimer();
  timerIntervalId = setInterval(() => {
    elapsedSeconds += 1;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (timerIntervalId !== null) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
}

function resetTimer() {
  elapsedSeconds = 0;
  updateTimerDisplay();
}

function showConsentScreen() {
  consentScreen.classList.remove("hide");
  usernameScreen.classList.add("hide");
  appShell.classList.add("hide");
}

function showUsernameScreen() {
  consentScreen.classList.add("hide");
  usernameScreen.classList.remove("hide");
  appShell.classList.add("hide");
}

function showAppShell() {
  consentScreen.classList.add("hide");
  usernameScreen.classList.add("hide");
  appShell.classList.remove("hide");
}

function isValidUsername(value) {
  return /^[A-Za-z0-9._-]+$/.test(value);
}

function updateUsernameValidation() {
  const value = usernameInput.value.trim();
  const isValid = value.length > 0 && isValidUsername(value);

  usernameContinueBtn.disabled = !isValid;
  usernameError.classList.toggle("hide", value.length === 0 || isValid);
}

consentCheckbox.addEventListener("change", () => {
  consentStartBtn.disabled = !consentCheckbox.checked;
});

consentStartBtn.addEventListener("click", () => {
  if (!consentCheckbox.checked) return;

  hasConsented = true;
  showUsernameScreen();
  usernameInput.focus();
});

usernameInput.addEventListener("input", updateUsernameValidation);

usernameContinueBtn.addEventListener("click", () => {
  const value = usernameInput.value.trim();
  if (!isValidUsername(value)) return;

  participantUsername = value;
  hasEnteredUsername = true;
  showAppShell();

  if (questions.length > 0) {
    startQuiz();
  }
});

window.quizSession = {
  getElapsedSeconds: () => elapsedSeconds,
  getParticipantUsername: () => participantUsername,
  recordAiInteraction,
};

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

nextButton.addEventListener("click", async () => {
  const answerIndex = Array.from(
    answerButtons.querySelectorAll("input")
  ).findIndex((radio) => radio.checked);
  if (answerIndex !== -1) {
    const selectedAnswer = shuffledQuestions[currentQuestionIndex].answers[answerIndex];
    const usedIa = document.getElementById("used-ai-checkbox").checked;

    quizResults.push({
      question_number: currentQuestionIndex + 1,
      user_answer: selectedAnswer.text,
      correct: selectedAnswer.correct ? "yes" : "no",
      used_ia: usedIa ? "yes" : "no",
    });

    if (selectedAnswer.correct) {
      score++;
    }
    currentQuestionIndex++;
    if (shuffledQuestions.length > currentQuestionIndex) {
      setNextQuestion();
    } else {
      await endQuiz();
    }
  } else {
    alert("Please select an answer.");
  }
});

restartButton.addEventListener("click", startQuiz);

async function endQuiz() {
  stopTimer();
  questionContainer.style.display = "none";
  nextButton.classList.add("hide");
  restartButton.classList.remove("hide");
  resultDiv.classList.remove("hide");
  finalTimeDiv.classList.remove("hide");
  timerDisplay.classList.add("hide");
  aiUsage.classList.add("hide");
  resultDiv.innerText = `Your final score: ${score} / ${shuffledQuestions.length}`;
  finalTimeDiv.innerText = `Time spent: ${formatElapsedTime(elapsedSeconds)}`;
  updateProgressDots();

  try {
    await saveSessionFiles();
  } catch (error) {
    console.error(error);
  }
}

updateTimerDisplay();
showConsentScreen();
