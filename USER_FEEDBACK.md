# User feedback integration

## Observation
A first-time reviewer found the rules and scoring difficult to discover, and noted that controls and long explanations competed with the board. The proposed improvement was a focused Target Challenge introduction with visual examples.

## Changes implemented
- Added a three-step Target Challenge tutorial: selecting 2–4 cells anywhere, constructing an expression, and seeing a correct answer fade its numbers.
- Used a fixed 75-target example, separate from live game state, so practice does not consume hints or change scores.
- Moved the board above expression controls and compacted statistics and number tracking.
- Added a bounded, scrollable board region to accommodate appended rows.
- Collapsed detailed rules into accessible Help, including a tutorial replay that preserves the active session.
- Added clickable arithmetic operators and support for the displayed subtraction symbol.
- Retained Solo and Versus AI modes.

## Verification
JavaScript syntax checks passed. Script-level interaction checks passed for tutorial entry, correct target submission, replay preserving scores, subtraction normalization, and AI mode selection. HTML checks passed for unique IDs and expected help/board structure.

## Remaining validation
A graphical browser was unavailable in the implementation environment. Visual layout, keyboard interaction, and mobile behavior require checking in the user's browser. A follow-up first-time-player test is needed to determine whether the changes improve understanding; usability improvement has not yet been measured.

## Expanded onboarding and visual redesign
The updated direction applies equally to all modes: welcome and inspiration → mode selection → mode-specific rules → interactive practice → live game. The welcome screen now has a large visual example and one primary action; mode selection uses three distinct cards. Every mode includes an isolated practice example and replayable help. This supersedes the initial Target-only tutorial. Visual browser review remains required.
