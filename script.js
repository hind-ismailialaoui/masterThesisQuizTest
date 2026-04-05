const questionContainer = document.getElementById("question-container");
const questionElement = document.getElementById("question");
const answerButtons = document.getElementById("answer-buttons");
const nextButton = document.getElementById("next-btn");
const tcsSubmitButton = document.getElementById("tcs-submit-btn");
const restartButton = document.getElementById("restart-btn");
const contentGrid = document.querySelector(".content-grid");
const quizContainer = document.querySelector(".quizz-container");
const tcsScreen = document.getElementById("tcs-screen");
const tcsItems = document.getElementById("tcs-items");
const tcsError = document.getElementById("tcs-error");
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
const chatPanel = document.querySelector(".chat-panel");
const introModalOverlay = document.getElementById("intro-modal-overlay");
const introModalCloseBtn = document.getElementById("intro-modal-close");
const introPrevBtn = document.getElementById("intro-prev-btn");
const introNextBtn = document.getElementById("intro-next-btn");
const introImage = document.getElementById("intro-image");
const introCounter = document.getElementById("intro-counter");


const QUESTION_LIMIT = 1; //null -> all questions
const INTRO_IMAGES = [
  "designs/instruction1.png",
  "designs/instruction2.png",
  "designs/instruction3.png",
  "designs/instruction4.png",
  "designs/instruction5.png",
];
const TCS_SCALE_OPTIONS = [
  { value: -2, label: "Strongly disagree" },
  { value: -1, label: "Disagree" },
  { value: 0, label: "Neutral" },
  { value: 1, label: "Agree" },
  { value: 2, label: "Strongly agree" },
];
const TCS_ITEMS = [
  {
    item_id: "change_initial_answer",
    statement:
      "After seeing the AI answer, I was more likely to change my initial answer.",
  },
  {
    item_id: "increase_confidence",
    statement:
      "The AI answer increased my confidence in the answer I finally selected.",
  },
  {
    item_id: "doubt_reasoning",
    statement: "The AI answer made me doubt my own reasoning.",
  },
  {
    item_id: "move_toward_ai",
    statement:
      "When the AI answer differed from mine, I tended to move toward the AI answer.",
  },
  {
    item_id: "answer_differently_without_ai",
    statement:
      "Without the AI answer, I think I would have answered differently.",
  },
];

let shuffledQuestions, currentQuestionIndex, score;
let questions = [];
let hasConsented = false;
let hasEnteredUsername = false;
let participantUsername = "";
let elapsedSeconds = 0;
let timerIntervalId = null;
let quizResults = [];
let aiInteractions = [];
let tcsResults = [];
let currentIntroImageIndex = 0;

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

function initializeQuizSession() {
  if (!questions || questions.length === 0) {
    console.warn('No questions available.');
    return;
  }
  score = 0;
  quizResults = [];
  aiInteractions = [];
  resetTimer();
  questionContainer.style.display = "flex";
  contentGrid.classList.remove("is-finished");
  quizContainer.classList.remove("is-finished");
  quizContainer.classList.remove("is-survey");
  // Conserver l'ordre original des questions (pas de mélange)
  shuffledQuestions = QUESTION_LIMIT
    ? questions.slice(0, QUESTION_LIMIT)
    : [...questions];
  currentQuestionIndex = 0;
  nextButton.classList.remove("hide");
  tcsSubmitButton.classList.add("hide");
  restartButton.classList.add("hide");
  tcsScreen.classList.add("hide");
  resultDiv.classList.add("hide");
  finalTimeDiv.classList.add("hide");
  timerDisplay.classList.remove("hide");
  aiUsage.classList.remove("hide");
  chatPanel.classList.remove("hide");
  tcsError.classList.add("hide");
  renderTcsItems();
  renderProgressDots();
  setNextQuestion();
}

function startQuiz() {
  initializeQuizSession();
  startTimer();
}

function renderIntroImage() {
  const totalImages = INTRO_IMAGES.length;
  const imageNumber = currentIntroImageIndex + 1;
  introImage.src = INTRO_IMAGES[currentIntroImageIndex];
  introImage.alt = `Quiz instruction ${imageNumber}`;
  introCounter.textContent = `${imageNumber} / ${totalImages}`;
  introPrevBtn.disabled = currentIntroImageIndex === 0;
  introNextBtn.disabled = currentIntroImageIndex === totalImages - 1;
}

function openIntroModal() {
  currentIntroImageIndex = 0;
  renderIntroImage();
  appShell.classList.add("is-modal-open");
  introModalOverlay.classList.remove("hide");
  introModalCloseBtn.focus();
}

function closeIntroModalAndStartQuiz() {
  appShell.classList.remove("is-modal-open");
  introModalOverlay.classList.add("hide");
  if (questions.length > 0) {
    startTimer();
  }
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

function renderTcsItems() {
  tcsItems.innerHTML = "";

  TCS_ITEMS.forEach((item, index) => {
    const itemCard = document.createElement("section");
    itemCard.className = "tcs-item";

    const prompt = document.createElement("p");
    prompt.className = "tcs-statement";
    prompt.textContent = `${index + 1}. ${item.statement}`;
    itemCard.appendChild(prompt);

    const scale = document.createElement("div");
    scale.className = "tcs-scale";

    TCS_SCALE_OPTIONS.forEach((option) => {
      const label = document.createElement("label");
      label.className = "tcs-option";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = item.item_id;
      input.value = String(option.value);
      input.dataset.label = option.label;

      const text = document.createElement("span");
      text.textContent = option.label;

      label.appendChild(input);
      label.appendChild(text);
      scale.appendChild(label);
    });

    itemCard.appendChild(scale);
    tcsItems.appendChild(itemCard);
  });
}

function collectTcsResponses() {
  const responses = [];

  for (const item of TCS_ITEMS) {
    const selectedInput = tcsItems.querySelector(
      `input[name="${item.item_id}"]:checked`
    );

    if (!selectedInput) {
      return null;
    }

    responses.push({
      item_id: item.item_id,
      statement: item.statement,
      value: Number(selectedInput.value),
      label: selectedInput.dataset.label || "",
    });
  }

  return responses;
}

function formatElapsedTime(totalSeconds) {
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function getCurrentDisplayedQuestion() {
  return questionElement?.innerText?.trim() || "";
}

function getCurrentQuestionNumber() {
  return typeof currentQuestionIndex === "number" ? currentQuestionIndex + 1 : null;
}

function recordAiInteraction(userQuestion, aiAnswer, questionNumber = null) {
  aiInteractions.push({
    user_name: participantUsername,
    user_input: userQuestion,
    question_number: questionNumber,
    ia_answer: aiAnswer,
    time: formatElapsedTime(elapsedSeconds),
  });
}

async function saveSessionFiles() {
  const payload = {
    user_name: participantUsername,
    quiz_results: quizResults,
    ai_interactions: aiInteractions,
    tcs_results: {
      user_name: participantUsername,
      submitted_at: new Date().toISOString(),
      responses: tcsResults,
    },
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

function resetQuizSession() {
  stopTimer();
  participantUsername = "";
  hasEnteredUsername = false;
  score = 0;
  currentQuestionIndex = 0;
  shuffledQuestions = [];
  quizResults = [];
  aiInteractions = [];
  tcsResults = [];
  usernameInput.value = "";
  updateUsernameValidation();
  appShell.classList.remove("is-modal-open");
  introModalOverlay.classList.add("hide");
  tcsError.classList.add("hide");
  window.quizChat?.resetChat();
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
  initializeQuizSession();
  openIntroModal();
});

introModalCloseBtn.addEventListener("click", closeIntroModalAndStartQuiz);
introPrevBtn.addEventListener("click", () => {
  if (currentIntroImageIndex === 0) return;
  currentIntroImageIndex -= 1;
  renderIntroImage();
});
introNextBtn.addEventListener("click", () => {
  if (currentIntroImageIndex >= INTRO_IMAGES.length - 1) return;
  currentIntroImageIndex += 1;
  renderIntroImage();
});

window.quizSession = {
  getElapsedSeconds: () => elapsedSeconds,
  getParticipantUsername: () => participantUsername,
  getCurrentQuestionNumber,
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
      showTcsSurvey();
    }
  } else {
    alert("Please select an answer.");
  }
});

tcsSubmitButton.addEventListener("click", async () => {
  const responses = collectTcsResponses();
  if (!responses) {
    tcsError.classList.remove("hide");
    return;
  }

  tcsError.classList.add("hide");
  tcsResults = responses;
  await endQuiz();
});

restartButton.addEventListener("click", () => {
  resetQuizSession();
  showUsernameScreen();
});

async function endQuiz() {
  stopTimer();
  questionContainer.style.display = "none";
  tcsScreen.classList.add("hide");
  contentGrid.classList.add("is-finished");
  quizContainer.classList.add("is-finished");
  quizContainer.classList.remove("is-survey");
  nextButton.classList.add("hide");
  tcsSubmitButton.classList.add("hide");
  restartButton.classList.remove("hide");
  resultDiv.classList.remove("hide");
  finalTimeDiv.classList.remove("hide");
  timerDisplay.classList.add("hide");
  aiUsage.classList.add("hide");
  chatPanel.classList.add("hide");
  resultDiv.innerText = `Your final score: ${score} / ${shuffledQuestions.length}`;
  finalTimeDiv.innerText = `Time spent: ${formatElapsedTime(elapsedSeconds)}`;
  updateProgressDots();

  try {
    await saveSessionFiles();
  } catch (error) {
    console.error(error);
  }
}

function showTcsSurvey() {
  stopTimer();
  questionContainer.style.display = "none";
  tcsScreen.classList.remove("hide");
  contentGrid.classList.add("is-finished");
  quizContainer.classList.add("is-finished");
  quizContainer.classList.add("is-survey");
  nextButton.classList.add("hide");
  tcsSubmitButton.classList.remove("hide");
  timerDisplay.classList.add("hide");
  aiUsage.classList.add("hide");
  chatPanel.classList.add("hide");
}

updateTimerDisplay();
showConsentScreen();
