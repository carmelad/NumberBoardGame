// Enumerate every legal pair on the current board.
function getAllLegalMoves() {
  const occupied = [];
  const moves = [];

  board.forEach((row, r) => {
    row.forEach((value, c) => {
      if (value !== null) {
        occupied.push({ row: r, col: c });
      }
    });
  });

  for (let i = 0; i < occupied.length; i++) {
    for (let j = i + 1; j < occupied.length; j++) {
      const first = occupied[i];
      const second = occupied[j];

      if (!valuesMatch(
        board[first.row][first.col],
        board[second.row][second.col]
      )) {
        continue;
      }

      const path = getConnectionPath(first, second);
      if (path === null) continue;

      moves.push({
        first,
        second,
        points: estimateMovePoints(first, second, path)
      });
    }
  }

  return moves;
}

// Calculate a move's reward without changing the real board.
function estimateMovePoints(first, second, path) {
  let clearedRows = 0;
  let remainingNumbers = 0;

  board.forEach((row, r) => {
    let remainingInRow = 0;

    row.forEach((value, c) => {
      const removedByMove =
        (r === first.row && c === first.col) ||
        (r === second.row && c === second.col);

      if (value !== null && !removedByMove) {
        remainingInRow++;
      }
    });

    if (remainingInRow === 0) clearedRows++;
    remainingNumbers += remainingInRow;
  });

  return (
    path.cells.length +
    clearedRows * 10 +
    (remainingNumbers === 0 ? 150 : 0)
  );
}

// Greedy policy: maximize immediate points.
// Randomly break ties between equally valuable moves.
function chooseGreedyMove() {
  const moves = getAllLegalMoves();
  if (moves.length === 0) return null;

  let bestPoints = -Infinity;
  let bestMoves = [];

  for (const move of moves) {
    if (move.points > bestPoints) {
      bestPoints = move.points;
      bestMoves = [move];
    } else if (move.points === bestPoints) {
      bestMoves.push(move);
    }
  }

  const index = Math.floor(Math.random() * bestMoves.length);
  return bestMoves[index];
}