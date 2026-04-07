// Element Selectors
const personalBest = document.getElementById('personal-best');
const wpm = document.getElementById('wpm');
const accuracy = document.getElementById('accuracy');
const time = document.getElementById('time');
const startBtn = document.getElementById('start-test-btn');
const results = document.getElementById('results');
const passage = document.getElementById('passage');
const modeBtns = document.querySelectorAll('[data-mode]');
const difficultyBtns = document.querySelectorAll('[data-difficulty]');
const passageBtn = document.querySelector('[data-mode="passage"]');

// Variables
let currentPassage = "";
let timerInterval = null;
let timeLeft = 30;
let isRunning = false;
let currentDifficulty = "easy";
let currentMode = 30;
let lastKeyTime = null;
let idleSeconds = 0;
let wpmHistory = [];

// Fetch Data
let passages = [];

fetch("data.json")
  .then((response) => response.json())
  .then((data) => {
    passages = data;
    loadPassage();
  });

// Load Passage
function loadPassage() {
  const passageList = passages[currentDifficulty];
  const random = Math.floor(Math.random() * passageList.length);
  currentPassage = passageList[random].text;
  displayPassage();
}

// Display Passage
function displayPassage() {
  passage.hidden = false;
  passage.classList.add("blurred");
  startBtn.style.display = "block";
  passage.innerHTML = currentPassage
    .split("")
    .map((char, index) => `<span data-index="${index}">${char}</span>`)
    .join("");
}

// Difficulty Buttons
difficultyBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (isRunning) return;
    difficultyBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentDifficulty = btn.dataset.difficulty;
    loadPassage();
  });
});

// Mode Buttons
modeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (isRunning) return;
    modeBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;
    timeLeft = currentMode === "passage" ? null : parseInt(currentMode);
    time.textContent = timeLeft ?? "-";
    loadPassage();
  });
});

// Start Test
function startTest() {
  if (isRunning) return;
  isRunning = true;
  results.style.display = "none";
  startBtn.style.display = "none";
  passage.classList.remove("blurred");
  document.querySelector(".results-backdrop").style.display = "none";
  document.getElementById("hidden-input").focus();

  if (currentMode !== "passage") {
    timeLeft = parseInt(currentMode);
    time.textContent = timeLeft;
    startTimer();
  }
}

// Start Button
startBtn.addEventListener("click", () => {
  startTest();
  document.documentElement.focus();
});

// Timer
function startTimer() {
  timerInterval = setInterval(() => {
    timeLeft--;
    time.textContent = timeLeft;
    updateStats();

    if (timeLeft === 0) {
      clearInterval(timerInterval);
      endTest();
    }
  }, 1000);
}

// Update Stats
function updateStats() {
  const correct = document.querySelectorAll(".correct").length;
  const incorrect = document.querySelectorAll(".incorrect").length;
  const total = correct + incorrect;

  const minutesElapsed = (parseInt(currentMode) - timeLeft) / 60;
  if (minutesElapsed === 0) return;

  // raw WPM
  const rawWPM = (total / 5) / minutesElapsed;

  // accuracy
  const accuracyScore = total === 0 ? 0 : Math.round((correct / currentPassage.length) * 100);

  // idle penalty
  const now = Date.now();
  if (lastKeyTime && (now - lastKeyTime) > 2000) {
    idleSeconds = (now - lastKeyTime) / 1000;
  } else {
    idleSeconds = 0;
  }
  const activityFactor = idleSeconds > 2 ? Math.pow(0.95, idleSeconds) : 1;

  // final WPM
  const finalWPM = rawWPM * (correct / (total || 1)) * activityFactor;

  // smooth with rolling average
  wpmHistory.push(finalWPM);
  if (wpmHistory.length > 5) wpmHistory.shift();
  const smoothWPM = Math.round(wpmHistory.reduce((a, b) => a + b, 0) / wpmHistory.length);

  wpm.textContent = smoothWPM;
  accuracy.textContent = accuracyScore;
}

// Keydown Listener
document.addEventListener("keydown", (e) => {
  if (!isRunning) return;
  if (e.key.length > 1) return;

  e.preventDefault(); // Prevent default input behavior

  lastKeyTime = Date.now();

  const spans = document.querySelectorAll("#passage span");
  const currentIndex = document.querySelectorAll(".correct, .incorrect").length;
  const currentSpan = spans[currentIndex];

  if (!currentSpan) return;

  if (e.key === currentPassage[currentIndex]) {
    currentSpan.classList.add("correct");
  } else {
    currentSpan.classList.add("incorrect");
  }

  updateStats();

  // Clear hidden input and keep it focused
  document.getElementById("hidden-input").value = "";
  document.getElementById("hidden-input").focus();

  if (currentIndex + 1 === currentPassage.length) {
    if (currentMode === "passage") {
      endTest();
    }
  }
});

// Mobile Input Listener (for hidden input)
document.getElementById("hidden-input").addEventListener("input", (e) => {
  if (!isRunning) return;

  const inputText = e.target.value;
  if (inputText.length === 0) return;

  const lastChar = inputText[inputText.length - 1];
  if (lastChar.length > 1) return;

  lastKeyTime = Date.now();

  const spans = document.querySelectorAll("#passage span");
  const currentIndex = document.querySelectorAll(".correct, .incorrect").length;
  const currentSpan = spans[currentIndex];

  if (!currentSpan) return;

  if (lastChar === currentPassage[currentIndex]) {
    currentSpan.classList.add("correct");
  } else {
    currentSpan.classList.add("incorrect");
  }

  updateStats();

  // Clear hidden input and keep it focused
  e.target.value = "";
  e.target.focus();

  if (currentIndex + 1 === currentPassage.length) {
    if (currentMode === "passage") {
      endTest();
    }
  }
});

// Refocus hidden input on typing area click (mobile)
document.querySelector(".typing-area").addEventListener("click", (e) => {
  if (!isRunning) return;
  if (e.target.id === "start-test-btn") return; // Don't interfere with button clicks
  document.getElementById("hidden-input").focus();
});

// End Test
function endTest() {
  isRunning = false;
  clearInterval(timerInterval);

  const correct = document.querySelectorAll(".correct").length;
  const incorrect = document.querySelectorAll(".incorrect").length;
  const total = correct + incorrect;

  const accuracyScore = total === 0 ? 0 : Math.round((correct / currentPassage.length) * 100);
  const wpmScore = Math.round(correct / 5 / (parseInt(currentMode) / 60));

  wpm.textContent = wpmScore;
  accuracy.textContent = accuracyScore;
  document.getElementById("result-wpm").textContent = wpmScore;
  document.getElementById("result-accuracy").textContent = accuracyScore;
  document.getElementById("result-chars").textContent = `${correct}/${currentPassage.length}`;

  if (wpmScore > parseInt(personalBest.textContent)) {
    personalBest.textContent = wpmScore;
  }

  results.style.display = "flex";
  document.querySelector(".results-backdrop").style.display = "block";
  document.querySelectorAll(".result-decoration").forEach((el) => {
  el.style.display = "block";
});
}

// Mobile Dropdown Listeners
document.getElementById("difficulty-select").addEventListener("change", (e) => {
  if (isRunning) return;
  currentDifficulty = e.target.value;
  loadPassage();
});

document.getElementById("mode-select").addEventListener("change", (e) => {
  if (isRunning) return;
  currentMode = e.target.value;
  timeLeft = currentMode === "passage" ? null : parseInt(currentMode);
  time.textContent = timeLeft ?? "-";
  loadPassage();
});

// Go Again
document.getElementById("go-again").addEventListener("click", () => {
  clearInterval(timerInterval);
  isRunning = false;
  timeLeft = currentMode === "passage" ? null : parseInt(currentMode);
  time.textContent = timeLeft ?? "-";
  wpm.textContent = 0;
  accuracy.textContent = 0;
  results.style.display = "none";
  document.querySelector(".results-backdrop").style.display = "none";
  document.querySelectorAll(".result-decoration").forEach((el) => {
  el.style.display = "none";
});
  lastKeyTime = null;
  idleSeconds = 0;
  wpmHistory = [];
  loadPassage();
});