// Parse arithmetic without eval().
// Selected board values must appear exactly once.
function validateTargetExpression(expression, selectedValues, target) {
  if (selectedValues.length < 2 || selectedValues.length > 4) {
    return { valid: false, message: "Select between 2 and 4 numbers." };
  }

  const text = expression.replace(/×/g, "*").replace(/÷/g, "/");
  const tokens = [];
  const usedNumbers = [];
  let position = 0;

  while (position < text.length) {
    const character = text[position];

    if (/\s/.test(character)) {
      position++;
      continue;
    }

    if (/[0-9]/.test(character)) {
      let digits = "";

      while (position < text.length && /[0-9]/.test(text[position])) {
        digits += text[position++];
      }

      if (digits.length !== 1 || digits === "0") {
        return {
          valid: false,
          message: "Use individual selected board numbers from 1–9."
        };
      }

      tokens.push(Number(digits));
      usedNumbers.push(Number(digits));
      continue;
    }

    if ("+-*/()".includes(character)) {
      tokens.push(character);
      position++;
      continue;
    }

    return {
      valid: false,
      message: `Unsupported character: ${character}`
    };
  }

  const selected = [...selectedValues].sort((a, b) => a - b);
  const used = [...usedNumbers].sort((a, b) => a - b);

  if (
    selected.length !== used.length ||
    selected.some((value, index) => value !== used[index])
  ) {
    return {
      valid: false,
      message: "Use every selected number exactly once."
    };
  }

  let cursor = 0;

  function parseFactor() {
    const token = tokens[cursor];

    if (typeof token === "number") {
      cursor++;
      return token;
    }

    if (token === "(") {
      cursor++;
      const value = parseSum();

      if (tokens[cursor] !== ")") {
        throw new Error("Missing closing parenthesis.");
      }

      cursor++;
      return value;
    }

    throw new Error("Expected a number or opening parenthesis.");
  }

  function parseProduct() {
    let value = parseFactor();

    while (tokens[cursor] === "*" || tokens[cursor] === "/") {
      const operator = tokens[cursor++];
      const right = parseFactor();

      if (operator === "/") {
        if (right === 0) {
          throw new Error("Division by zero is not allowed.");
        }
        value /= right;
      } else {
        value *= right;
      }
    }

    return value;
  }

  function parseSum() {
    let value = parseProduct();

    while (tokens[cursor] === "+" || tokens[cursor] === "-") {
      const operator = tokens[cursor++];
      const right = parseProduct();
      value = operator === "+" ? value + right : value - right;
    }

    return value;
  }

  try {
    const result = parseSum();

    if (cursor !== tokens.length) {
      throw new Error("Unexpected input. Check your operators.");
    }

    if (!Number.isFinite(result)) {
      throw new Error("The expression must produce a finite number.");
    }

    const valid = Math.abs(result - target) <=
      1e-9 * Math.max(1, Math.abs(target));

    return {
      valid,
      result,
      message: valid
        ? `Correct! Your expression equals ${target}.`
        : `That equals ${Number(result.toFixed(6))}, not ${target}.`
    };
  } catch (error) {
    return { valid: false, message: error.message };
  }
}

// Generate a target with at least one starting solution.
// Early levels use addition; later levels use more terms.
function prepareTargetLevel() {
  const values = board.flat().filter(value => value !== null);
  const [a, b, c, d] = values;

  targetValue =
    level < 3 ? a + b :
    level < 6 ? (a + b) * c :
    (a + b) * (c + d);
}

function handleTargetClick(row, col) {
  if (gameOver || animating || board[row][col] === null) return;

  hintedCells = [];
  activeConnection = null;

  const index = targetSelection.findIndex(
    p => p.row === row && p.col === col
  );

  if (index !== -1) {
    targetSelection.splice(index, 1);
  } else if (targetSelection.length < 4) {
    targetSelection.push({ row, col });
  } else {
    setMessage("You can select at most four numbers.");
    return;
  }

  setMessage("Use each selected number once in your expression.");
  renderBoard();
}

function clearTargetSelection() {
  if (mode !== "target" || gameOver || animating) return;

  targetSelection = [];
  hintedCells = [];
  document.getElementById("expression-input").value = "";
  setMessage("Select 2–4 numbers.");
  renderBoard();
}

function submitTargetMove() {
  if (mode !== "target" || gameOver || animating) return;

  const expression = document.getElementById("expression-input").value;
  const values = targetSelection.map(p => board[p.row][p.col]);
  const answer = validateTargetExpression(expression, values, targetValue);

  if (!answer.valid) {
    setMessage(answer.message);
    return;
  }

  let earned = targetSelection.length * 2;
  earned += removeCells(targetSelection) * 10;

  targetSelection = [];
  hintedCells = [];
  activeConnection = null;
  document.getElementById("expression-input").value = "";

  if (board.length === 0) {
    earned += 150;
    score += earned;
    level++;
    resetLevel();

    setMessage(`Correct! +${earned} points. Welcome to level ${level}!`);
  } else {
    score += earned;
    setMessage(`Correct! +${earned} points.`);
    checkBoardState();
  }

  renderBoard();
}

// Recursively combine terms to explore arithmetic expression trees.
function solveTerms(terms, target) {
  if (terms.length === 1) {
    return Math.abs(terms[0].value - target) <=
      1e-9 * Math.max(1, Math.abs(target))
      ? terms[0].expression
      : null;
  }

  for (let i = 0; i < terms.length; i++) {
    for (let j = i + 1; j < terms.length; j++) {
      const a = terms[i];
      const b = terms[j];
      const rest = terms.filter((_, index) => index !== i && index !== j);

      const options = [
        {
          value: a.value + b.value,
          expression: `(${a.expression}+${b.expression})`
        },
        {
          value: a.value - b.value,
          expression: `(${a.expression}-${b.expression})`
        },
        {
          value: b.value - a.value,
          expression: `(${b.expression}-${a.expression})`
        },
        {
          value: a.value * b.value,
          expression: `(${a.expression}*${b.expression})`
        }
      ];

      if (b.value !== 0) {
        options.push({
          value: a.value / b.value,
          expression: `(${a.expression}/${b.expression})`
        });
      }

      if (a.value !== 0) {
        options.push({
          value: b.value / a.value,
          expression: `(${b.expression}/${a.expression})`
        });
      }

      const seen = new Set();

      for (const option of options) {
        if (!Number.isFinite(option.value) || seen.has(option.value)) {
          continue;
        }

        seen.add(option.value);
        const solution = solveTerms([...rest, option], target);

        if (solution !== null) return solution;
      }
    }
  }

  return null;
}

// Search value combinations rather than every board-position subset.
function findTargetSolution() {
  const positions = Array.from({ length: 10 }, () => []);

  board.forEach((row, r) => {
    row.forEach((value, c) => {
      if (value !== null) positions[value].push({ row: r, col: c });
    });
  });

  const chosen = [];
  const counts = Array(10).fill(0);

  function search(size, minimumValue) {
    if (chosen.length === size) {
      const terms = chosen.map(value => ({
        value,
        expression: String(value)
      }));

      const expression = solveTerms(terms, targetValue);
      if (expression === null) return null;

      const used = Array(10).fill(0);
      const cells = chosen.map(value =>
        positions[value][used[value]++]
      );

      return { cells, expression };
    }

    for (let value = minimumValue; value <= 9; value++) {
      if (counts[value] >= positions[value].length) continue;

      chosen.push(value);
      counts[value]++;

      const result = search(size, value);

      counts[value]--;
      chosen.pop();

      if (result !== null) return result;
    }

    return null;
  }

  for (let size = 2; size <= 4; size++) {
    const result = search(size, 1);
    if (result !== null) return result;
  }

  return null;
}

function showTargetHint() {
  if (gameOver || animating || hintsLeft === 0) return;

  const solution = findTargetSolution();

  if (solution === null) {
    checkBoardState();
    renderBoard();
    return;
  }

  hintsLeft--;
  targetSelection = [];
  hintedCells = solution.cells;

  setMessage(
    `Hint: ${solution.expression} = ${targetValue}. ` +
    `Hints left: ${hintsLeft}.`
  );
  renderBoard();
}

document.getElementById("submit-target")
  .addEventListener("click", submitTargetMove);

document.getElementById("clear-target")
  .addEventListener("click", clearTargetSelection);

document.getElementById("expression-input")
  .addEventListener("keydown", event => {
    if (event.key === "Enter") submitTargetMove();
  });