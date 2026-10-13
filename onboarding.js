// Mode introductions and practice examples never modify live game state.
let tutorialMode = 'solo';
let tutorialStep = 0;
let tutorialReplay = false;
let demoSelected = [];

const introductions = {
  solo: {
    title:'Solo: find the connection',
    rules:'Select two equal numbers, or two numbers totaling 10. Connect horizontally, vertically, diagonally, or in reading order across rows. Every intermediate cell must be empty. Longer connections earn more points.',
    example:'Try matching 7 and 3 below. In the live game you earn 2 points for an adjacent pair, plus 1 for each empty cell crossed.',
    values:[7,3,4,8]
  },
  ai: {
    title:'Versus AI: make your move',
    rules:'Use the same pair rules as Solo. You and the computer alternate successful matches on a shared board. The computer chooses the highest immediate reward. Each player has a separate score; the higher total wins when the run ends.',
    example:'Match 7 and 3. Then watch the computer match 4 and 6. This practice example awards 2 points to each player, without changing your live score.',
    values:[7,3,4,6]
  },
  target: {
    title:'Target Challenge: build an answer',
    rules:'Select 2–4 active cells anywhere on the board. Use each selected cell exactly once with +, −, ×, ÷ and parentheses to reach the target. Cells do not need to connect. Fractions are allowed; division by zero is not.',
    example:'Target 75: select 8, 7 and 5, then submit (8 + 7) × 5. These three cells earn 6 points before bonuses.',
    values:[8,7,5,2]
  }
};

function showModeTutorial(selectedMode, replay) {
  tutorialMode=selectedMode; tutorialReplay=replay; tutorialStep=0;
  document.getElementById('welcome-screen').hidden=true;
  document.getElementById('menu-screen').hidden=true;
  document.getElementById('game-screen').hidden=true;
  document.getElementById('tutorial-screen').hidden=false;
  renderTutorial();
}

function renderTutorial() {
  const info=introductions[tutorialMode];
  document.getElementById('tutorial-progress').textContent=`${tutorialStep===0?'Rules':'Practice'} · ${tutorialStep+1} of 2`;
  document.getElementById('tutorial-title').textContent=info.title;
  document.getElementById('tutorial-example-status').textContent='';
  document.getElementById('tutorial-content').innerHTML=tutorialStep===0
    ? `<p>${info.rules}</p><p><strong>Across every mode:</strong> matched numbers fade, fully empty rows disappear, and columns stay fixed. Clear a board to advance with your score.</p><p>Each level has 3 hints and 3 additions. Add numbers when no moves remain. No moves and no additions ends the game. Row bonus: +10. Board bonus: +150.</p>`
    : `<p>${info.example}</p><div class="demo-board">${info.values.map((v,i)=>`<button class="demo-cell" type="button" data-demo="${i}" aria-pressed="false">${v}</button>`).join('')}</div>${tutorialMode==='target'?'<button id="demo-submit" type="button">Submit (8 + 7) × 5</button>':''}<p>This practice board is separate from your game. Your timers and allowances start when you press Start Game.</p>`;
  document.getElementById('tutorial-back').disabled=tutorialStep===0;
  document.getElementById('tutorial-next').textContent=tutorialStep===0?'Try a quick demo':tutorialReplay?'Back to game':'Start Game';
  document.getElementById('tutorial-exit').textContent=tutorialReplay?'Back to game':'Back to modes';
  document.getElementById('tutorial-title').focus();
  demoSelected=[];
  document.querySelectorAll('[data-demo]').forEach(button=>button.addEventListener('click',()=>demoClick(button)));
  const submit=document.getElementById('demo-submit');
  if(submit)submit.addEventListener('click',()=>{
    if(![0,1,2].every(i=>demoSelected.includes(i)) || demoSelected.length!==3){demoMessage('Select 8, 7 and 5 to try the example.');return;}
    fadeDemo([0,1,2]); submit.disabled=true;
    demoMessage('Correct! (8 + 7) × 5 = 75. +6 points. These numbers are now empty; the row stays because 2 remains.');
  });
}
function demoMessage(text){document.getElementById('tutorial-example-status').textContent=text;}
function fadeDemo(indices){indices.forEach(i=>{const b=document.querySelector(`[data-demo="${i}"]`);b.classList.remove('chosen');b.classList.add('faded');b.disabled=true;b.setAttribute('aria-pressed','false');});}
function demoClick(button){
  const index=Number(button.dataset.demo);
  if(demoSelected.includes(index)){demoSelected=demoSelected.filter(i=>i!==index);button.classList.remove('chosen');button.setAttribute('aria-pressed','false');return;}
  demoSelected.push(index);button.classList.add('chosen');button.setAttribute('aria-pressed','true');
  if(tutorialMode==='target')return;
  if(demoSelected.length===2){
    if(demoSelected.includes(0)&&demoSelected.includes(1)){
      fadeDemo([0,1]);demoMessage('7 + 3 = 10. Your pair earns 2 points; its cells become empty.');
      if(tutorialMode==='ai'){fadeDemo([2,3]);demoMessage('You matched 7 + 3: 2 points. AI matched 4 + 6: 2 points. The row and board are now cleared; the AI would also receive completion bonuses in the live game. Your turn follows.');}
    }else{demoMessage('For this guided example, select 7 and 3.');document.querySelectorAll('[data-demo]').forEach(b=>{b.classList.remove('chosen');b.setAttribute('aria-pressed','false');});}
    demoSelected=[];
  }
}
function closeTutorial(play){
  document.getElementById('tutorial-screen').hidden=true;
  if(tutorialReplay){document.getElementById('game-screen').hidden=false;renderBoard();}
  else if(play)startGame(tutorialMode,true);
  else document.getElementById('menu-screen').hidden=false;
}
document.getElementById('explore-button').addEventListener('click',()=>{document.getElementById('welcome-screen').hidden=true;document.getElementById('menu-screen').hidden=false;});
document.getElementById('welcome-button').addEventListener('click',()=>{document.getElementById('menu-screen').hidden=true;document.getElementById('welcome-screen').hidden=false;});
document.getElementById('tutorial-next').addEventListener('click',()=>{if(tutorialStep===0){tutorialStep=1;renderTutorial();}else closeTutorial(true);});
document.getElementById('tutorial-back').addEventListener('click',()=>{tutorialStep=0;renderTutorial();});
document.getElementById('tutorial-exit').addEventListener('click',()=>closeTutorial(false));
document.getElementById('help-tutorial').addEventListener('click',()=>showModeTutorial(mode,true));
document.querySelectorAll('.operator-button').forEach(button=>button.addEventListener('click',()=>{
  const input=document.getElementById('expression-input');
  if(mode!=='target'||gameOver||animating)return;
  input.setRangeText(button.dataset.operator,input.selectionStart,input.selectionEnd,'end');input.focus();
}));
