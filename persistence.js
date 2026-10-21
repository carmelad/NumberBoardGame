// Save and Resume: browser-local, versioned session snapshot.
// No passwords or sensitive profile data are stored here.
const SAVE_KEY = "numberBoardGame.session.v1";
let restoringSavedGame = false;

function readSavedGame() {
  try {
    const value = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!value || value.version !== 1 || !["solo", "ai", "target"].includes(value.mode)) return null;
    if (!Array.isArray(value.board) || !value.board.length || !value.board.every(row =>
      Array.isArray(row) && row.length === COLS && row.every(n => n === null || (Number.isInteger(n) && n >= 1 && n <= 9)))) return null;
    if (!Array.isArray(value.removedNumbers) || value.removedNumbers.length !== value.board.length ||
        !value.removedNumbers.every(row => Array.isArray(row) && row.length === COLS)) return null;
    for (const key of ["score", "aiScore", "level", "additionsLeft", "hintsLeft", "totalElapsedMs", "levelElapsedMs"]) {
      if (!Number.isFinite(value[key]) || value[key] < 0) return null;
    }
    if (value.level < 1 || value.level > 100000 || value.additionsLeft > ADDS_PER_LEVEL || value.hintsLeft > HINTS_PER_LEVEL) return null;
    if (!["human", "ai"].includes(value.currentPlayer) || typeof value.gameOver !== "boolean") return null;
    if (!Number.isFinite(value.targetValue)) return null;
    return value;
  } catch (error) { return null; }
}

function updateResumeButtons() {
  const raw = readSavedGame();
  const saved = raw && (typeof currentGuestId !== "function" || raw.playerId === currentGuestId()) ? raw : null;
  for (const id of ["resume-game-button", "welcome-resume-button"]) {
    document.getElementById(id).hidden = !saved;
  }
  document.getElementById("saved-game-details").textContent = saved
    ? `${saved.mode === "ai" ? "Versus AI" : saved.mode === "target" ? "Target Challenge" : "Solo"} · Level ${saved.level}`
    : "";
}

function saveGameProgress() {
  if (restoringSavedGame || mode === null || animating) return;
  const now = stoppedAt ?? performance.now();
  const snapshot = {
    playerId: typeof currentGuestId === "function" ? currentGuestId() : null,
    sessionId: typeof trackedSessionId === "function" ? trackedSessionId() : null,
    version: 1, savedAt: Date.now(), mode,
    board: board.map(row => [...row]),
    removedNumbers: removedNumbers.map(row => [...row]),
    score, aiScore, level, additionsLeft, hintsLeft, currentPlayer, gameOver, targetValue,
    totalElapsedMs: Math.max(0, now - runStartedAt),
    levelElapsedMs: Math.max(0, now - levelStartedAt),
    expression: document.getElementById("expression-input").value
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot)); }
  catch (error) { console.warn("Save unavailable:", error); }
  if (typeof syncTrackedSession === "function") syncTrackedSession();
  updateResumeButtons();
}

function resumeSavedGame() {
  const saved = readSavedGame();
  if (!saved || (typeof currentGuestId === "function" && saved.playerId !== currentGuestId())) { updateResumeButtons(); return; }
  restoringSavedGame = true;
  cancelPendingActions();
  // Reuse existing UI configuration and event wiring, skipping tutorial.
  startGame(saved.mode, true);
  board = saved.board.map(row => [...row]);
  removedNumbers = saved.removedNumbers.map(row => [...row]);
  score = saved.score;
  aiScore = saved.aiScore;
  level = saved.level;
  additionsLeft = saved.additionsLeft;
  hintsLeft = saved.hintsLeft;
  currentPlayer = saved.currentPlayer;
  gameOver = saved.gameOver;
  targetValue = saved.targetValue;
  const now = performance.now();
  runStartedAt = now - saved.totalElapsedMs;
  levelStartedAt = now - saved.levelElapsedMs;
  stoppedAt = gameOver ? now : null;
  selectedCell = null;
  targetSelection = [];
  hintedCells = [];
  activeConnection = null;
  document.getElementById("expression-input").value = saved.expression || "";
  restoringSavedGame = false;
  if (typeof resumeTrackedSession === "function") resumeTrackedSession(saved.sessionId);
  setMessage(gameOver ? "Saved game finished. Start a new game to play again." : "Welcome back! Your progress has been restored.");
  renderBoard();
  scheduleAITurn();
}

document.getElementById("resume-game-button").addEventListener("click", resumeSavedGame);
document.getElementById("welcome-resume-button").addEventListener("click", resumeSavedGame);
document.getElementById("expression-input").addEventListener("input", saveGameProgress);
window.addEventListener("pagehide", saveGameProgress);
document.addEventListener("visibilitychange", () => { if (document.hidden) saveGameProgress(); });
updateResumeButtons();

// Keep dashboard data synchronized with the same saved state.
