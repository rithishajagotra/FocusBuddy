const STATE = {
  IDLE: "Idle",
  FOCUSED: "Focused",
  HIDDEN: "Hidden"
};

let session = null;
let timerInterval, idleTimeout;
let idleStart = null;
let isIdle = false;
let resetIdleHandler = null;

const taskInput = document.getElementById("taskInput");
const durationInput = document.getElementById("durationInput");
const idleInput = document.getElementById("idleInput");

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");

const timerDisplay = document.getElementById("timer");
const stateDisplay = document.getElementById("state");
const distractionDisplay = document.getElementById("distractions");

const summaryEl = document.getElementById("summary");
const historyList = document.getElementById("historyList");
const resetBtn = document.getElementById("resetBtn");

const todayFocusEl = document.getElementById("todayFocus");
const avgScoreEl = document.getElementById("avgScore");



startBtn.onclick = () => {
  session = {
    task: taskInput.value,
    plannedDurationMs: durationInput.value * 60000,
    startTime: Date.now(),
    elapsedMs: 0,
    idleMs: 0,
    distractionCount: 0,
    score: 0
  };

  startBtn.disabled = true;
  stopBtn.disabled = false;
  stateDisplay.textContent = STATE.FOCUSED;
  document.body.className = "";

  startTimer();
  startIdleDetection(idleInput.value);
};

stopBtn.onclick = endSession;

function endSession() {
  clearInterval(timerInterval);
  clearTimeout(idleTimeout);
  cleanupIdle();

  session.elapsedMs = Date.now() - session.startTime;
  calculateScore(session);
  saveSession(session);
  showSummary(session);

  startBtn.disabled = false;
  stopBtn.disabled = true;
  stateDisplay.textContent = STATE.IDLE;
  document.body.className = "idle";
}


function startTimer() {
  timerInterval = setInterval(() => {
    const remaining =
      session.plannedDurationMs - (Date.now() - session.startTime);

    if (remaining <= 0) {
      timerDisplay.textContent = "00:00";
      endSession();
      return;
    }

    updateTimer(remaining);
  }, 1000);
}

function updateTimer(ms) {
  const s = Math.floor(ms / 1000);
  timerDisplay.textContent =
    `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;
}


function startIdleDetection(sec) {
  resetIdleHandler = () => {
    if (isIdle) {
      session.idleMs += Date.now() - idleStart;
      isIdle = false;
      document.body.className = "";
    }

    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
      isIdle = true;
      idleStart = Date.now();
      stateDisplay.textContent = STATE.IDLE;
      document.body.className = "idle";
    }, sec * 1000);
  };

  document.addEventListener("mousemove", resetIdleHandler);
  document.addEventListener("keydown", resetIdleHandler);
  resetIdleHandler();
}

function cleanupIdle() {
  document.removeEventListener("mousemove", resetIdleHandler);
  document.removeEventListener("keydown", resetIdleHandler);
}


document.addEventListener("visibilitychange", () => {
  if (!session) return;

  if (document.visibilityState === "hidden") {
    session.distractionCount++;
    distractionDisplay.textContent = session.distractionCount;
    stateDisplay.textContent = STATE.HIDDEN;
    document.body.className = "hidden-tab";
  } else {
    stateDisplay.textContent = STATE.FOCUSED;
    document.body.className = "";
  }
});


function calculateScore(s) {
  const focused = s.elapsedMs - s.idleMs;
  s.score = Math.max(
    0,
    Math.round((focused / s.plannedDurationMs) * 100 - s.distractionCount * 2)
  );
}


function saveSession(s) {
  const sessions = JSON.parse(localStorage.getItem("sessions")) || [];
  sessions.push(s);
  localStorage.setItem("sessions", JSON.stringify(sessions));
  renderHistory();
}

function showSummary(s) {
  summaryEl.classList.remove("hidden");
  summaryEl.innerHTML = `
    <h2>Session Complete</h2>
    <p>${s.task}</p>
    <p>Focused: ${Math.round((s.elapsedMs - s.idleMs) / 60000)} min</p>
    <p>Distractions: ${s.distractionCount}</p>
    <p>Score: ${s.score}%</p>
  `;
}


function renderHistory() {
  const sessions = JSON.parse(localStorage.getItem("sessions")) || [];
  historyList.innerHTML = "";

  let totalFocus = 0;
  let totalScore = 0;

  sessions.forEach(s => {
    const li = document.createElement("li");
    li.textContent = `${s.task} — ${s.score}%`;
    historyList.appendChild(li);
    totalFocus += s.elapsedMs - s.idleMs;
    totalScore += s.score;
  });

  todayFocusEl.textContent = Math.round(totalFocus / 60000);
  avgScoreEl.textContent = sessions.length
    ? Math.round(totalScore / sessions.length)
    : 0;
}

resetBtn.onclick = () => {
  if (confirm("Reset all data?")) {
    localStorage.clear();
    renderHistory();
    summaryEl.classList.add("hidden");
  }
};

renderHistory();
