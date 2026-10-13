const COLS = 10;
const ADDS_PER_LEVEL = 3;
const HINTS_PER_LEVEL = 3;
const MATCH_DELAY = 450;

let mode = null;
let board = [];
let removedNumbers = [];
let selectedCell = null;
let hintedCells = [];
let activeConnection = null;
let targetSelection = [];
let targetValue = 10;

let additionsLeft = 3;
let hintsLeft = 3;
let score = 0;
let aiScore = 0;
let level = 1;
let currentPlayer = "human";

let gameOver = false;
let animating = false;
let pendingMatch = null;
let pendingAI = null;
let runStartedAt = 0;
let levelStartedAt = 0;
let stoppedAt = null;

function createBoard(currentLevel) {
  const rows = Math.min(
    16,
    Math.floor(Math.random() * 3) + 8 +
    Math.floor((currentLevel - 1) / 3)
  );

  const result = Array.from({ length: rows }, () =>
    Array.from({ length: COLS }, () =>
      Math.floor(Math.random() * 9) + 1
    )
  );

  result[0][1] = 10 - result[0][0];
  return result;
}

function setMessage(text) {
  document.getElementById("message").textContent = text;
}

function valuesMatch(first, second) {
  return first !== null && second !== null &&
    (first === second || first + second === 10);
}

// Prefer a direct straight connection over reading order.
function getConnectionPath(first, second) {
  const dr = second.row - first.row;
  const dc = second.col - first.col;

  if (dr === 0 && dc === 0) return null;

  if (dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)) {
    const path = [{ ...first }];
    const rowStep = Math.sign(dr);
    const colStep = Math.sign(dc);
    let row = first.row + rowStep;
    let col = first.col + colStep;
    let clear = true;

    while (row !== second.row || col !== second.col) {
      if (board[row][col] !== null) {
        clear = false;
        break;
      }

      path.push({ row, col });
      row += rowStep;
      col += colStep;
    }

    if (clear) {
      path.push({ ...second });
      return { kind: "straight", cells: path };
    }
  }

  const start = first.row * COLS + first.col;
  const end = second.row * COLS + second.col;
  const step = Math.sign(end - start);
  const path = [{ ...first }];

  for (let index = start + step; index !== end; index += step) {
    const row = Math.floor(index / COLS);
    const col = index % COLS;

    if (board[row][col] !== null) return null;
    path.push({ row, col });
  }

  path.push({ ...second });
  return { kind: "reading", cells: path };
}

function isValidMatch(first, second) {
  return valuesMatch(
    board[first.row][first.col],
    board[second.row][second.col]
  ) && getConnectionPath(first, second) !== null;
}

// Target mode searches expressions instead of matching pairs.
function findLegalMatch() {
  if (mode === "target") return findTargetSolution();

  const occupied = [];

  board.forEach((row, r) => {
    row.forEach((value, c) => {
      if (value !== null) occupied.push({ row: r, col: c });
    });
  });

  for (let i = 0; i < occupied.length; i++) {
    for (let j = i + 1; j < occupied.length; j++) {
      if (isValidMatch(occupied[i], occupied[j])) {
        return [occupied[i], occupied[j]];
      }
    }
  }

  return null;
}

function resetLevel() {
  board = createBoard(level);
  removedNumbers = board.map(row => row.map(() => null));
  additionsLeft = ADDS_PER_LEVEL;
  hintsLeft = HINTS_PER_LEVEL;
  selectedCell = null;
  hintedCells = [];
  targetSelection = [];
  activeConnection = null;
  levelStartedAt = performance.now();
  document.getElementById("expression-input").value = "";

  if (mode === "target") prepareTargetLevel();
}

function cancelPendingActions() {
  if (pendingMatch !== null) clearTimeout(pendingMatch);
  if (pendingAI !== null) clearTimeout(pendingAI);

  pendingMatch = null;
  pendingAI = null;
  animating = false;
}

function startGame(selectedMode) {
  if (!["solo", "ai", "target"].includes(selectedMode)) return;

  mode = selectedMode;
  document.getElementById("menu-screen").hidden = true;
  document.getElementById("game-screen").hidden = false;

  document.getElementById("mode-title").textContent =
    mode === "ai" ? "Versus AI" :
    mode === "target" ? "Target Challenge" : "Solo";

  document.getElementById("game-description").textContent =
    mode === "target"
      ? "Use 2–4 numbers and arithmetic to reach the target."
      : "Match equal numbers or pairs that add to 10.";

  document.getElementById("ai-score-card").hidden = mode !== "ai";
  document.getElementById("turn-indicator").hidden = mode !== "ai";
  document.getElementById("target-controls").hidden = mode !== "target";
  document.getElementById("pair-rules").hidden = mode === "target";
  document.getElementById("target-rules").hidden = mode !== "target";

  document.getElementById("score-label").textContent =
    mode === "ai" ? "Your score" : "Score";

  startNewGame();
}

function startNewGame() {
  if (mode === null) return;

  cancelPendingActions();
  score = 0;
  aiScore = 0;
  level = 1;
  currentPlayer = "human";
  gameOver = false;
  stoppedAt = null;
  runStartedAt = performance.now();

  resetLevel();
  setMessage(
    mode === "target"
      ? "Select 2–4 numbers, then build your expression."
      : "Select two numbers to make a match."
  );
  renderBoard();
}

function backToMenu() {
  cancelPendingActions();
  mode = null;
  activeConnection = null;
  selectedCell = null;
  hintedCells = [];
  targetSelection = [];

  document.getElementById("game-screen").hidden = true;
  document.getElementById("menu-screen").hidden = false;
}

function checkBoardState() {
  if (findLegalMatch() !== null) return;

  if (additionsLeft > 0) {
    setMessage("No valid moves remain. Use Add Numbers to continue.");
    return;
  }

  gameOver = true;
  stoppedAt = performance.now();

  if (mode === "ai") {
    const result =
      score > aiScore ? "You win!" :
      score < aiScore ? "AI wins!" : "It's a draw!";

    setMessage(
      `${result} Your score: ${score}. AI score: ${aiScore}. ` +
      `Level reached: ${level}.`
    );
  } else {
    setMessage(
      `Game over! Score: ${score}. Level reached: ${level}.`
    );
  }
}

// Shared removal behavior for every mode.
// Returns how many rows were cleared.
function removeCells(cells) {
  const previousRows = board.length;

  for (const cell of cells) {
    removedNumbers[cell.row][cell.col] = board[cell.row][cell.col];
    board[cell.row][cell.col] = null;
  }

  const keptBoard = [];
  const keptHistory = [];

  board.forEach((row, index) => {
    if (row.some(value => value !== null)) {
      keptBoard.push(row);
      keptHistory.push(removedNumbers[index]);
    }
  });

  board = keptBoard;
  removedNumbers = keptHistory;
  return previousRows - board.length;
}

function applyMatch(first, second, path) {
  const actor = currentPlayer;
  let earned = path.cells.length;
  earned += removeCells([first, second]) * 10;

  selectedCell = null;
  hintedCells = [];
  activeConnection = null;

  const clearedBoard = board.length === 0;
  if (clearedBoard) earned += 150;

  if (mode === "ai" && actor === "ai") {
    aiScore += earned;
  } else {
    score += earned;
  }

  if (clearedBoard) {
    level++;
    resetLevel();
  }

  if (mode === "ai") {
    currentPlayer = actor === "human" ? "ai" : "human";
  }

  setMessage(
    `${actor === "ai" ? "AI" : "You"} earned ${earned} points.` +
    (clearedBoard ? ` Welcome to level ${level}!` : "")
  );

  checkBoardState();
}

function animateMatch(first, second) {
  const path = getConnectionPath(first, second);

  animating = true;
  selectedCell = null;
  hintedCells = [first, second];
  activeConnection = { ...path, type: "match" };

  setMessage(currentPlayer === "ai" ? "AI found a match!" : "Connected!");
  renderBoard();

  pendingMatch = setTimeout(() => {
    pendingMatch = null;
    applyMatch(first, second, path);
    animating = false;
    renderBoard();
    scheduleAITurn();
  }, MATCH_DELAY);
}

function scheduleAITurn() {
  if (
    mode !== "ai" || currentPlayer !== "ai" ||
    gameOver || animating || pendingAI !== null
  ) return;

  if (findLegalMatch() === null) return;

  setMessage("AI is choosing a move…");

  pendingAI = setTimeout(() => {
    pendingAI = null;

    if (
      mode !== "ai" || currentPlayer !== "ai" ||
      gameOver || animating
    ) return;

    const move = chooseGreedyMove();

    if (move !== null) {
      animateMatch(move.first, move.second);
    } else {
      checkBoardState();
      renderBoard();
    }
  }, 600);
}

function handleCellClick(row, col) {
  if (
    mode === null || gameOver || animating ||
    board[row][col] === null ||
    (mode === "ai" && currentPlayer !== "human")
  ) return;

  if (mode === "target") {
    handleTargetClick(row, col);
    return;
  }

  const clicked = { row, col };
  hintedCells = [];
  activeConnection = null;

  if (selectedCell === null) {
    selectedCell = clicked;
    setMessage("Now select a matching number.");
  } else if (selectedCell.row === row && selectedCell.col === col) {
    selectedCell = null;
    setMessage("Selection cleared.");
  } else if (isValidMatch(selectedCell, clicked)) {
    animateMatch({ ...selectedCell }, clicked);
    return;
  } else {
    const matchingValues = valuesMatch(
      board[selectedCell.row][selectedCell.col],
      board[row][col]
    );

    setMessage(
      matchingValues
        ? "Invalid connection: the path is blocked or not allowed."
        : "Invalid match: numbers must be equal or add to 10."
    );

    selectedCell = clicked;
  }

  renderBoard();
}

function showHint() {
  if (
    mode === null || gameOver || animating || hintsLeft === 0 ||
    (mode === "ai" && currentPlayer !== "human")
  ) return;

  if (mode === "target") {
    showTargetHint();
    return;
  }

  const match = findLegalMatch();
  selectedCell = null;
  hintedCells = match || [];
  activeConnection = null;

  if (match !== null) {
    hintsLeft--;
    activeConnection = {
      ...getConnectionPath(match[0], match[1]),
      type: "hint"
    };
    setMessage(`Try this pair. Hints left: ${hintsLeft}.`);
  } else {
    checkBoardState();
  }

  renderBoard();
}

function addNumbers() {
  if (mode === null || gameOver || animating) return;

  if (findLegalMatch() !== null) {
    setMessage("A valid move is still available.");
    return;
  }

  if (additionsLeft === 0) {
    checkBoardState();
    renderBoard();
    return;
  }

  const remaining = board.flat().filter(value => value !== null);

  for (let i = 0; i < remaining.length; i += COLS) {
    const row = remaining.slice(i, i + COLS);
    while (row.length < COLS) row.push(null);

    board.push(row);
    removedNumbers.push(Array(COLS).fill(null));
  }

  additionsLeft--;
  selectedCell = null;
  targetSelection = [];
  hintedCells = [];
  activeConnection = null;
  document.getElementById("expression-input").value = "";

  setMessage("Numbers added. Look for new moves.");
  checkBoardState();
  renderBoard();
  scheduleAITurn();
}

function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = String(Math.floor((seconds % 3600) / 60))
    .padStart(2, "0");
  const remainder = String(seconds % 60).padStart(2, "0");

  return hours > 0
    ? `${hours}:${minutes}:${remainder}`
    : `${minutes}:${remainder}`;
}

function updateTimers() {
  if (mode === null) return;

  const now = stoppedAt ?? performance.now();
  document.getElementById("level-time").textContent =
    formatTime(now - levelStartedAt);
  document.getElementById("total-time").textContent =
    formatTime(now - runStartedAt);
}

function renderNumberTracker() {
  const tracker = document.getElementById("number-tracker");
  const active = new Set(board.flat());
  tracker.replaceChildren();

  for (let number = 1; number <= 9; number++) {
    const cleared = !active.has(number);
    const badge = document.createElement("span");

    badge.className = `number-status${cleared ? " cleared" : ""}`;
    badge.textContent = cleared ? `${number} ✓` : number;
    badge.setAttribute(
      "aria-label",
      `${number}: ${cleared ? "none remaining" : "still on board"}`
    );

    tracker.appendChild(badge);
  }
}

function drawConnection() {
  const svg = document.getElementById("connection-layer");
  const container = document.getElementById("board");
  svg.replaceChildren();

  if (mode === null) return;

  const width = container.clientWidth;
  const height = container.clientHeight;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  if (activeConnection === null) return;

  function center(position) {
    const cell = container.children[position.row * COLS + position.col];
    return {
      x: cell.offsetLeft + cell.offsetWidth / 2,
      y: cell.offsetTop + cell.offsetHeight / 2
    };
  }

  const cells = activeConnection.cells;
  const first = center(cells[0]);
  let commands = `M ${first.x} ${first.y}`;

  if (activeConnection.kind === "straight") {
    const last = center(cells[cells.length - 1]);
    commands += ` L ${last.x} ${last.y}`;
  } else {
    for (let i = 1; i < cells.length; i++) {
      const previous = center(cells[i - 1]);
      const current = center(cells[i]);

      if (cells[i].row !== cells[i - 1].row) {
        const forward = cells[i].row > cells[i - 1].row;
        commands +=
          ` L ${forward ? width : 0} ${previous.y}` +
          ` M ${forward ? 0 : width} ${current.y}`;
      }

      commands += ` L ${current.x} ${current.y}`;
    }
  }

  const path = document.createElementNS(
    "http://www.w3.org/2000/svg", "path"
  );
  path.setAttribute("d", commands);
  path.setAttribute("class", `connection ${activeConnection.type}`);
  svg.appendChild(path);
}

function renderBoard() {
  const container = document.getElementById("board");
  container.replaceChildren();
  container.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;

  board.forEach((row, r) => {
    row.forEach((value, c) => {
      const cell = document.createElement("button");
      const oldValue = removedNumbers[r][c];

      const selected = mode === "target"
        ? targetSelection.some(p => p.row === r && p.col === c)
        : selectedCell !== null &&
          selectedCell.row === r && selectedCell.col === c;

      cell.type = "button";
      cell.className = "cell";
      cell.textContent = value ?? oldValue ?? "";
      cell.disabled =
        value === null || gameOver || animating ||
        (mode === "ai" && currentPlayer === "ai");

      if (value === null) {
        cell.classList.add(oldValue === null ? "empty" : "removed");
      }
      if (selected) cell.classList.add("selected");

      if (hintedCells.some(p => p.row === r && p.col === c)) {
        cell.classList.add(animating ? "matching" : "hinted");
      }

      cell.setAttribute("aria-pressed", String(selected));
      cell.setAttribute(
        "aria-label",
        `${value === null ? "Empty" : value}, row ${r + 1}, column ${c + 1}`
      );
      cell.addEventListener("click", () => handleCellClick(r, c));
      container.appendChild(cell);
    });
  });

  document.getElementById("score").textContent = score;
  document.getElementById("ai-score").textContent = aiScore;
  document.getElementById("level").textContent = level;
  document.getElementById("adds-left").textContent = additionsLeft;
  document.getElementById("hints-left").textContent = hintsLeft;

  document.getElementById("turn-indicator").textContent =
    gameOver ? "Game finished" :
    currentPlayer === "human" ? "Your turn" : "AI turn";

  document.getElementById("hint-button").disabled =
    gameOver || animating || hintsLeft === 0 ||
    (mode === "ai" && currentPlayer === "ai");

  document.getElementById("add-button").disabled =
    gameOver || animating || additionsLeft === 0;

  document.getElementById("submit-target").disabled =
    gameOver || animating || targetSelection.length < 2;

  document.getElementById("clear-target").disabled =
    gameOver || animating;

  document.getElementById("expression-input").disabled =
    gameOver || animating;

  if (mode === "target") {
    document.getElementById("target-value").textContent = targetValue;
    document.getElementById("target-selected").textContent =
      targetSelection.length === 0
        ? "None"
        : targetSelection.map(p => board[p.row][p.col]).join(", ");
  }

  renderNumberTracker();
  updateTimers();
  drawConnection();
}

document.getElementById("solo-button")
  .addEventListener("click", () => startGame("solo"));
document.getElementById("ai-button")
  .addEventListener("click", () => startGame("ai"));
document.getElementById("target-button")
  .addEventListener("click", () => startGame("target"));
document.getElementById("hint-button")
  .addEventListener("click", showHint);
document.getElementById("add-button")
  .addEventListener("click", addNumbers);
document.getElementById("new-game-button")
  .addEventListener("click", startNewGame);
document.getElementById("menu-button")
  .addEventListener("click", backToMenu);

window.addEventListener("resize", drawConnection);
setInterval(updateTimers, 250);