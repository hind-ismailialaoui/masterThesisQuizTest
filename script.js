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
const groupMessage = document.getElementById("group-message");
const appShell = document.getElementById("app-shell");
const timerDisplay = document.getElementById("timer-display");
const chatPanel = document.querySelector(".chat-panel");
const introModalOverlay = document.getElementById("intro-modal-overlay");
const introModalCloseBtn = document.getElementById("intro-modal-close");
const introPrevBtn = document.getElementById("intro-prev-btn");
const introNextBtn = document.getElementById("intro-next-btn");
const introImage = document.getElementById("intro-image");
const introCounter = document.getElementById("intro-counter");


const QUESTION_LIMIT = null; // null -> all questions
const GROUP_CONFIG = {
  1: { groupNumber: 1, isAware: true, isWeakened: true },
  2: { groupNumber: 2, isAware: true, isWeakened: false },
  3: { groupNumber: 3, isAware: false, isWeakened: true },
  4: { groupNumber: 4, isAware: false, isWeakened: false },
};
const FORCED_ANSWERS = {
  1: { index: 3, text: "All birds are sparrows." },
  2: { index: 1, text: "Some parks are located in unsafe areas." },
  3: { index: 1, text: "Some mammals are dogs." },
  4: { index: 1, text: "Remote work always improves productivity." },
  5: { index: 1, text: "It assumes that all good cooks must be professional chefs." },
  6: { index: 1, text: "Alertness levels vary during the day." },
  7: { index: 1, text: "False cause" },
  8: { index: 1, text: "If school closes, it snowed." },
  9: { index: 0, text: "It appeals to authority." },
  10: { index: 0, text: "Invalid, because not all athletes are musicians." },
  11: { index: 1, text: "Productivity was already rising." },
  12: { index: 1, text: "All cats are animals." },
  13: { index: 2, text: "Nighttime study sessions are more effective than daytime ones." },
  14: { index: 2, text: "If someone is educated, then they are a teacher." },
  15: { index: 1, text: "Training is optional for Sarah." },
  16: { index: 3, text: "Some books on this shelf are fiction." },
  17: { index: 0, text: "All doctors are scientists. Emily is a scientist. Therefore, Emily is a doctor." },
  18: { index: 0, text: "Competitors lowered prices significantly." },
  19: { index: 1, text: "Typing notes saves time." },
  20: { index: 3, text: "Faulty generalization" },
  21: { index: 3, text: "Some lawyers are teachers." },
  22: { index: 4, text: "All mammals are animals. Some animals are large. Therefore, some mammals are large." },
  23: { index: 1, text: "Other cities have used similar programs." },
  24: { index: 0, text: "Doctors recommend eating vegetables." },
  25: { index: 2, text: "The exam was difficult for everyone." },
  26: { index: 0, text: "This medicine worked for my friend, so it must work for me." },
  27: { index: 0, text: "Confusing cause with correlation" },
  28: { index: 2, text: "Some students who received an A failed the exam." },
  29: { index: 0, text: "Some painters are actors." },
  30: { index: 1, text: "If there is no fuel, the battery must be dead." },
};
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
let sessionId = "";
let groupState = { ...GROUP_CONFIG[4] };
let elapsedSeconds = 0;
let timerIntervalId = null;
let quizResults = [];
let aiInteractions = [];
let tcsResults = [];
let currentIntroImageIndex = 0;

function generateSessionId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  const randomPart = Math.random().toString(36).slice(2, 10);
  return `session_${Date.now()}_${randomPart}`;
}

function parseGroupFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const rawGroup = Number(params.get("group"));
  const storedGroup = Number(localStorage.getItem("quiz_group"));
  const validGroup = GROUP_CONFIG[rawGroup]
    ? rawGroup
    : GROUP_CONFIG[storedGroup]
      ? storedGroup
      : 4;

  localStorage.setItem("quiz_group", String(validGroup));
  groupState = { ...GROUP_CONFIG[validGroup] };
}

function updateConsentMessage() {
  if (!groupMessage) {
    return;
  }

  if (groupState.isAware) {
    groupMessage.textContent = groupState.isWeakened
      ? "Important: In this variant, the AI assistant may provide confident but intentionally incorrect answers to LSAT questions. Use the assistant as you see fit during the quiz."
      : "Important: In this variant, the AI assistant is intended to provide correct and helpful answers to LSAT questions during the quiz.";
    groupMessage.classList.remove("hide");
    return;
  }

  groupMessage.textContent =
    "Important: During the quiz, you may use the AI assistant to support your reasoning and answer the questions as you see fit.";
  groupMessage.classList.remove("hide");
}

function getCurrentForcedAnswer() {
  return FORCED_ANSWERS[currentQuestionIndex + 1] || null;
}

parseGroupFromUrl();

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
  window.quizSession.currentForcedAnswer = getCurrentForcedAnswer();
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

function recordAiInteraction(
  userQuestion,
  aiAnswer,
  questionNumber = null,
  usage = null
) {
  aiInteractions.push({
    user_name: participantUsername,
    session_id: sessionId,
    user_input: userQuestion,
    question_number: questionNumber,
    ia_answer: aiAnswer,
    time: formatElapsedTime(elapsedSeconds),
    forced_answer: window.quizSession.currentForcedAnswer?.text ?? null,
    forced_answer_index: window.quizSession.currentForcedAnswer?.index ?? null,
    prompt_tokens: usage?.prompt_tokens ?? null,
    completion_tokens: usage?.completion_tokens ?? null,
    total_tokens: usage?.total_tokens ?? null,
  });
}

async function saveSessionFiles() {
  const payload = {
    user_name: participantUsername,
    session_id: sessionId,
    group_number: groupState.groupNumber,
    is_aware: groupState.isAware,
    is_weakened: groupState.isWeakened,
    quiz_results: quizResults,
    ai_interactions: aiInteractions,
    tcs_results: {
      user_name: participantUsername,
      session_id: sessionId,
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
  updateConsentMessage();
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
  sessionId = "";
  hasEnteredUsername = false;
  score = 0;
  currentQuestionIndex = 0;
  shuffledQuestions = [];
  quizResults = [];
  aiInteractions = [];
  tcsResults = [];
  usernameInput.value = "";
  updateUsernameValidation();
  window.quizSession.currentForcedAnswer = null;
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
  sessionId = generateSessionId();
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
  currentForcedAnswer: null,
  getElapsedSeconds: () => elapsedSeconds,
  getParticipantUsername: () => participantUsername,
  getCurrentDisplayedQuestion,
  getCurrentQuestionNumber,
  getGroupState: () => groupState,
  getSessionId: () => sessionId,
  getForcedAnswer: getCurrentForcedAnswer,
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
      user_name: participantUsername,
      session_id: sessionId,
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
