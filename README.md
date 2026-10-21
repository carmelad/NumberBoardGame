# Number Board Game

A browser-based number puzzle inspired by Number Match, with solo
play, a computer opponent, and arithmetic target challenges.

Built with HTML, CSS, and JavaScript. No installation or build step
is required.

## Run locally

Download or clone the repository, then open index.html in a browser.

On macOS, from the project directory:

    open index.html

## Game modes

### Solo

Match two equal numbers or two numbers totaling 10.

Pairs connect horizontally, vertically, diagonally, or in reading
order across row boundaries. Intermediate cells must be empty.

### Versus AI

The human and computer alternate successful matches on a shared
board. Each maintains a separate cumulative score.

The AI enumerates legal moves and chooses the highest immediate
reward, including row and board bonuses. Equal-scoring moves are
chosen randomly.

This is a greedy agent, not a minimax agent.

### Target Challenge

Select 2–4 cells anywhere on the board and construct an expression
equal to the level's target.

Supported operations are addition, subtraction, multiplication,
division, and parentheses. Each selected cell must be used once.

Fractional intermediate results are allowed. Division by zero is
invalid. Expressions are parsed without eval().

## Shared mechanics

- Starting boards have 10 columns and 8–10 rows.
- Matched numbers become logically empty but remain faintly visible.
- Entirely cleared rows disappear; columns never collapse.
- Scores carry forward when a cleared board advances the level.
- Each level provides three hints and three additions.
- Add Numbers copies remaining values into new rows when no moves exist.
- The game ends when no legal moves and no additions remain.
- Level and total-run timers track elapsed time.
- A digit tracker marks numbers with no active occurrences remaining.

## Scoring

- Pair match: 2 points plus 1 per empty cell crossed.
- Target expression: 2 points per selected number.
- Cleared row: 10 bonus points.
- Cleared board: 150 bonus points.

If both straight and reading-order connections are valid, the
straight connection determines the pair's points.

## Code structure

| File | Responsibility |
| --- | --- |
| index.html | Interface structure and CSS styling |
| game.js | State, matching, scoring, rendering, timers, and turns |
| ai.js | Legal-move enumeration and greedy move selection |
| target.js | Arithmetic parsing, target generation, and solution search |

## Design decisions

Game state is separate from its visual representation. Active
numbers live in the board array; removed values are retained in
a separate history array.

Human moves, hints, and the AI share pair-validation rules.
Target hints and available-move checks use an arithmetic solver.

Pending AI actions and animations are canceled when restarting
or returning to the menu.

## Current limitations

- The AI considers immediate rewards rather than future responses.
- Progress is not saved after refreshing the page.
- Starting boards have a valid move but are not guaranteed fully solvable.
- Board height increases every three levels up to a 16-row starting cap.
- Target difficulty changes at levels 3 and 6; it does not increase
  continuously afterward.
- Arithmetic checks use floating-point calculations with a small tolerance.
- Target solution searches run on the main browser thread and may
  briefly delay the interface.
- Target moves do not yet have the pair-match connection animation.

## Planned improvements

- Depth-limited minimax with alpha-beta pruning.
- Saved progress and high scores.
- Clickable arithmetic-expression controls.
- Automated tests and reproducible demo boards.
- Further difficulty progression and solver performance improvements.

## Inspiration

Core pair-matching gameplay is inspired by Easybrain's Number Match.
This project implements its own interface, opponent, and arithmetic
challenge mode.

## Author

Carmela Dangale


## Guest profile and history (October 2026 prototype)
Choose **Play as Guest** on the landing page and enter a username (2–30 characters). The dashboard offers editable username, per-mode personal bests, a level-by-session chart, and the last 20 sessions. Game sessions are stored in `localStorage` in this browser; an unfinished game continues under the same session ID when resumed. Starting a new game marks the previous unfinished session as abandoned.

**Not implemented:** real registration, login, email/password, MFA, cloud SQL, cross-device sync, or global leaderboards. The account buttons explicitly identify those features as upcoming. Local history can be lost if browser storage is cleared and is not authoritative for global scores.

Serve the directory with `python3 -m http.server 8000` and visit `http://localhost:8000`. Test guest creation, each game mode, restart, resume, username editing, and dashboard mode filters.
