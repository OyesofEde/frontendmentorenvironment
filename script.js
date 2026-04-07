// Element Selectors
const personalBest = document.getElementById('personal-best'); // Display for personal best WPM
const wpm = document.getElementById('wpm'); // Current WPM display
const accuracy = document.getElementById('accuracy'); // Current accuracy display
const time = document.getElementById('time'); // Current timer display
const startBtn = document.getElementById('start-test-btn'); // Start test button
const results = document.getElementById('results'); // Results modal container
const passage = document.getElementById('passage'); // Passage text container
const modeBtns = document.querySelectorAll('[data-mode]'); // Mode buttons
const difficultyBtns = document.querySelectorAll('[data-difficulty]'); // Difficulty buttons
const passageBtn = document.querySelector('[data-mode="passage"]'); // Passage mode button
const restartBtn = document.getElementById('restart-btn'); // Restart button during test

// Variables
let currentPassage = ""; // Holds the current passage text
let timerInterval = null; // Reference for the timer interval
let timeLeft = 30; // Current timer value
let isRunning = false; // Tracks whether a test is active
let currentDifficulty = "easy"; // Current difficulty
let currentMode = 30; // Current mode value
let lastKeyTime = null; // Last keystroke timestamp
let idleSeconds = 0; // Idle time in seconds
let wpmHistory = []; // History used to smooth WPM display

// Fetch Data
let passages = []; // Store passages loaded from data.json

fetch("data.json")
  .then((response) => response.json()) // Parse JSON response
  .then((data) => {
    passages = data; // Save passages
    loadPassage(); // Load initial passage
  });

// Load Passage
function loadPassage() {
  const passageList = passages[currentDifficulty]; // Get passages for current difficulty
  const random = Math.floor(Math.random() * passageList.length); // Pick a random index
  currentPassage = passageList[random].text; // Save the chosen passage text
  displayPassage(); // Show the passage
}

// Display Passage
function displayPassage() {
  passage.hidden = false; // Make passage visible
  passage.classList.add("blurred"); // Apply blur until test starts
  startBtn.style.display = "block"; // Show start button
  passage.innerHTML = currentPassage
    .split("") // Split passage into characters
    .map((char, index) => `<span data-index="${index}">${char}</span>`) // Wrap each char in span
    .join(""); // Join spans into one HTML string
  passage.style.cursor = "pointer"; // Show pointer cursor for clickable passage
  restartBtn.hidden = true; // Hide restart button before test begins
  // Add initial cursor
  const firstSpan = document.querySelector("#passage span"); // First character span
  if (firstSpan) firstSpan.classList.add("cursor"); // Highlight current typing position
}

// Difficulty Buttons
difficultyBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (isRunning) return; // Don't change difficulty while running
    difficultyBtns.forEach((b) => b.classList.remove("active")); // Remove active state from all
    btn.classList.add("active"); // Activate clicked button
    currentDifficulty = btn.dataset.difficulty; // Set selected difficulty
    loadPassage(); // Load a new passage
  });
});

// Mode Buttons
modeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (isRunning) return; // Don't change mode while running
    modeBtns.forEach((b) => b.classList.remove("active")); // Remove active from all
    btn.classList.add("active"); // Activate selected mode
    currentMode = btn.dataset.mode; // Set selected mode
    timeLeft = currentMode === "passage" ? null : parseInt(currentMode); // Set timer value
    time.textContent = timeLeft ?? "-"; // Show timer or dash for passage
    loadPassage(); // Load new passage
  });
});

// Start Test
function startTest() {
  if (isRunning) return; // Prevent double start
  isRunning = true; // Mark test as running
  results.style.display = "none"; // Hide results modal
  startBtn.style.display = "none"; // Hide start button
  passage.classList.remove("blurred"); // Remove blur from passage
  document.querySelector(".results-backdrop").style.display = "none"; // Hide results backdrop
  document.getElementById("hidden-input").focus(); // Focus hidden input for typing
  restartBtn.hidden = false; // Show restart button

  if (currentMode !== "passage") {
    timeLeft = parseInt(currentMode); // Initialize countdown mode
    time.textContent = timeLeft;
    startTimer(); // Start timer
  } else {
    timeLeft = 0; // Passage mode starts from 0
    time.textContent = "0s";
    startTimer(); // Start timer counting up
  }
}

// Start Button
startBtn.addEventListener("click", () => {
  startTest(); // Begin the test
  document.documentElement.focus(); // Keep focus for keyboard
});

// Click passage to start
passage.addEventListener("click", () => {
  if (!isRunning) {
    startTest(); // Start test by clicking the passage
  }
});

// Restart button
restartBtn.addEventListener("click", () => {
  if (isRunning) {
    clearInterval(timerInterval); // Stop timer
    isRunning = false; // Mark test inactive
    timeLeft = currentMode === "passage" ? null : parseInt(currentMode); // Reset timer
    time.textContent = timeLeft ?? "-"; // Reset time display
    wpm.textContent = 0; // Reset WPM display
    accuracy.textContent = 0; // Reset accuracy display
    passage.classList.add("blurred"); // Blur passage again
    startBtn.style.display = "block"; // Show start button
    restartBtn.hidden = true; // Hide restart button
    loadPassage(); // Load a new passage
  }
});

// Timer
function startTimer() {
  timerInterval = setInterval(() => {
    if (currentMode === "passage") {
      timeLeft++; // Count up in passage mode
      time.textContent = timeLeft + "s"; // Show seconds
    } else {
      timeLeft--; // Count down in timed mode
      time.textContent = timeLeft; // Show remaining seconds
      if (timeLeft === 0) {
        clearInterval(timerInterval); // Stop timer at zero
        endTest(); // Finish the test
      }
    }
    updateStats(); // Update stats each second
  }, 1000); // Run once per second
}

// Update Stats
function updateStats() {
  const correct = document.querySelectorAll(".correct").length; // Count correct chars
  const incorrect = document.querySelectorAll(".incorrect").length; // Count incorrect chars
  const total = correct + incorrect; // Total typed

  let minutesElapsed;
  if (currentMode === "passage") {
    minutesElapsed = timeLeft / 60; // Passage uses elapsed time
  } else {
    minutesElapsed = (parseInt(currentMode) - timeLeft) / 60; // Timed uses elapsed time
  }
  if (minutesElapsed === 0) return; // Avoid division by zero

  // raw WPM
  const rawWPM = (total / 5) / minutesElapsed; // Standard WPM formula

  // accuracy
  const accuracyScore = total === 0 ? 0 : Math.round((correct / currentPassage.length) * 100); // Percentage of passage typed correctly

  // idle penalty
  const now = Date.now(); // Current time
  if (lastKeyTime && (now - lastKeyTime) > 2000) {
    idleSeconds = (now - lastKeyTime) / 1000; // Time since last keystroke
  } else {
    idleSeconds = 0;
  }
  const activityFactor = idleSeconds > 2 ? Math.pow(0.95, idleSeconds) : 1; // Slow down WPM if idle

  // final WPM
  const finalWPM = rawWPM * (correct / (total || 1)) * activityFactor; // Adjusted WPM

  // smooth with rolling average
  wpmHistory.push(finalWPM); // Add current value
  if (wpmHistory.length > 5) wpmHistory.shift(); // Keep last 5 values
  const smoothWPM = Math.round(wpmHistory.reduce((a, b) => a + b, 0) / wpmHistory.length); // Average WPM

  wpm.textContent = smoothWPM; // Display WPM
  accuracy.textContent = accuracyScore; // Display accuracy
}

// Keydown Listener
document.addEventListener("keydown", (e) => {
  if (!isRunning) return; // Ignore if test not running
  if (e.key.length > 1) return; // Ignore non-character keys

  e.preventDefault(); // Prevent default browser input action

  lastKeyTime = Date.now(); // Update last key time

  const spans = document.querySelectorAll("#passage span"); // Character spans
  const currentIndex = document.querySelectorAll(".correct, .incorrect").length; // Index of current char
  const currentSpan = spans[currentIndex]; // Current span to compare

  if (!currentSpan) return; // Nothing to compare if passage ended

  if (e.key === currentPassage[currentIndex]) {
    currentSpan.classList.add("correct"); // Mark correct char
  } else {
    currentSpan.classList.add("incorrect"); // Mark incorrect char
  }

  updateStats(); // Update stats immediately

  // Move cursor to the next position
  document.querySelector('.cursor')?.classList.remove('cursor'); // Remove old cursor
  const nextSpan = spans[currentIndex + 1]; // Next char span
  if (nextSpan) nextSpan.classList.add('cursor'); // Add cursor to next char

  // Clear hidden input and keep it focused
  document.getElementById("hidden-input").value = ""; // Reset hidden input content
  document.getElementById("hidden-input").focus(); // Keep focus so keyboard stays active

  if (currentIndex + 1 === currentPassage.length) {
    if (currentMode === "passage") {
      endTest(); // End test when passage finished
    }
  }
});

// Mobile Input Listener (for hidden input)
document.getElementById("hidden-input").addEventListener("input", (e) => {
  if (!isRunning) return; // Ignore if test not running

  const inputText = e.target.value; // Value typed into hidden input
  if (inputText.length === 0) return; // Ignore empty input
  const lastChar = inputText[inputText.length - 1]; // Last typed char
  if (lastChar.length > 1) return; // Ignore non-character input

  lastKeyTime = Date.now(); // Update last key time

  const spans = document.querySelectorAll("#passage span"); // Character spans
  const currentIndex = document.querySelectorAll(".correct, .incorrect").length; // Current char index
  const currentSpan = spans[currentIndex]; // Current char span

  if (!currentSpan) return; // Nothing to compare if passage ended

  if (lastChar === currentPassage[currentIndex]) {
    currentSpan.classList.add("correct"); // Mark correct
  } else {
    currentSpan.classList.add("incorrect"); // Mark incorrect
  }

  updateStats(); // Update stats immediately

  // Move cursor to the next position
  document.querySelector('.cursor')?.classList.remove('cursor'); // Remove old cursor
  const nextSpan = spans[currentIndex + 1]; // Next char span
  if (nextSpan) nextSpan.classList.add('cursor'); // Add cursor highlight

  // Clear hidden input and keep it focused
  e.target.value = ""; // Reset hidden input
  e.target.focus(); // Keep the keyboard open

  if (currentIndex + 1 === currentPassage.length) {
    if (currentMode === "passage") {
      endTest(); // End test when passage finished
    }
  }
});

// Backspace support
document.getElementById("hidden-input").addEventListener("keydown", (e) => {
  if (!isRunning) return; // Ignore if test not running
  if (e.key === 'Backspace') {
    e.preventDefault(); // Prevent default browser backspace behavior
    const spans = document.querySelectorAll("#passage span"); // Character spans
    const currentIndex = document.querySelectorAll(".correct, .incorrect").length - 1; // Index of last typed char
    if (currentIndex >= 0) {
      const lastSpan = spans[currentIndex]; // Last typed char span
      if (lastSpan.classList.contains('incorrect')) {
        lastSpan.classList.remove('incorrect'); // Remove incorrect mark
        // Update cursor
        document.querySelector('.cursor')?.classList.remove('cursor'); // Remove old cursor
        lastSpan.classList.add('cursor'); // Place cursor back on last span
      }
    }
  }
});

// Refocus hidden input on typing area click (mobile)
document.querySelector(".typing-area").addEventListener("click", (e) => {
  if (!isRunning) return; // Only if test is active
  if (e.target.id === "start-test-btn") return; // Ignore start button clicks
  document.getElementById("hidden-input").focus(); // Focus hidden input to reopen keyboard
});

// End Test
function endTest() {
  isRunning = false; // Mark test as finished
  clearInterval(timerInterval); // Stop timer

  const correct = document.querySelectorAll(".correct").length; // Count correct chars
  const incorrect = document.querySelectorAll(".incorrect").length; // Count incorrect chars
  const total = correct + incorrect; // Total typed chars

  const accuracyScore = total === 0 ? 0 : Math.round((correct / currentPassage.length) * 100); // Calculate accuracy
  let wpmScore;
  if (currentMode === "passage") {
    wpmScore = Math.round(correct / 5 / (timeLeft / 60)); // WPM for passage mode
  } else {
    wpmScore = Math.round(correct / 5 / (parseInt(currentMode) / 60)); // WPM for timed mode
  }

  wpm.textContent = wpmScore; // Show final WPM
  accuracy.textContent = accuracyScore; // Show final accuracy
  document.getElementById("result-wpm").textContent = wpmScore; // Result modal WPM
  document.getElementById("result-accuracy").textContent = accuracyScore; // Result modal accuracy
  document.getElementById("result-chars").textContent = `${correct}/${currentPassage.length}`; // Result modal char count

  // Smart result messages
  let subtitleText = "Solid run. Keep pushing to beat your high score.";
  if (parseInt(personalBest.textContent) === 0) {
    subtitleText = "Baseline Established!"; // First test message
  } else if (wpmScore > parseInt(personalBest.textContent)) {
    subtitleText = "High Score Smashed!"; // New personal best message
  }
  document.querySelector('.subtitle').textContent = subtitleText; // Update subtitle

  if (wpmScore > parseInt(personalBest.textContent)) {
    personalBest.textContent = wpmScore; // Save new personal best
    localStorage.setItem('typingSpeedPersonalBest', wpmScore); // Persist best score
  }

  results.style.display = "flex"; // Show result modal
  document.querySelector(".results-backdrop").style.display = "block"; // Show overlay
  document.querySelectorAll(".result-decoration").forEach((el) => {
    el.style.display = "block"; // Show decorations
  });
  restartBtn.hidden = true; // Hide restart button after test
}

// Mobile Dropdown Listeners
document.getElementById("difficulty-select").addEventListener("change", (e) => {
  if (isRunning) return; // Ignore while running
  currentDifficulty = e.target.value; // Set difficulty from select
  loadPassage(); // Load new passage
});

document.getElementById("mode-select").addEventListener("change", (e) => {
  if (isRunning) return; // Ignore while running
  currentMode = e.target.value; // Set mode from select
  timeLeft = currentMode === "passage" ? null : parseInt(currentMode); // Reset timer value
  time.textContent = timeLeft ?? "-"; // Show timer or dash
  loadPassage(); // Load new passage
});

// Go Again
document.getElementById("go-again").addEventListener("click", () => {
  clearInterval(timerInterval); // Stop timer
  isRunning = false; // Mark test as inactive
  timeLeft = currentMode === "passage" ? null : parseInt(currentMode); // Reset time
  time.textContent = timeLeft ?? "-"; // Reset display
  wpm.textContent = 0; // Reset WPM display
  accuracy.textContent = 0; // Reset accuracy display
  results.style.display = "none"; // Hide results modal
  document.querySelector(".results-backdrop").style.display = "none"; // Hide overlay
  document.querySelectorAll(".result-decoration").forEach((el) => {
    el.style.display = "none"; // Hide decorations
  });
  lastKeyTime = null; // Reset last key timer
  idleSeconds = 0; // Reset idle seconds
  wpmHistory = []; // Clear WPM smoothing history
  restartBtn.hidden = true; // Hide restart button
  loadPassage(); // Load a new passage
});