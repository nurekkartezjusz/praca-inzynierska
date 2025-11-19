const boardEl = document.getElementById('board');
const cells = Array.from(document.querySelectorAll('.cell'));
const turnEl = document.getElementById('turn');
const resetBtn = document.getElementById('reset');
const messageEl = document.getElementById('message');
const vsBotCheckbox = document.getElementById('vsBot');
const difficultySelect = document.getElementById('difficulty');
const playerSymbolSelect = document.getElementById('playerSymbol');
const starterSelect = document.getElementById('starter');
const applySettingsBtn = document.getElementById('applySettings');
const scoreXEl = document.getElementById('scoreX');
const scoreOEl = document.getElementById('scoreO');
const resetScoresBtn = document.getElementById('resetScores');

let board = Array(9).fill(null);
let currentPlayer = 'X';
let finished = false;
let scores = { X: 0, O: 0 };
let humanPlayer = 'X';
let botPlayer = 'O';
let settingsApplied = false;

const winningCombos = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

function updateTurn() {
  turnEl.textContent = currentPlayer;
}

function handleMove(e){
  if(finished) return;
  const idx = Number(this.dataset.index);
  if(board[idx]) return;
  board[idx] = currentPlayer;
  this.textContent = currentPlayer;
  this.classList.add('filled');

  const winner = checkWinner();
  if(winner){
    finished = true;
    messageEl.textContent = `Wygrywa ${winner}!`;
    highlightWinning(winner);
    incrementScore(winner);
    return;
  }

  if(board.every(Boolean)){
    finished = true;
    messageEl.textContent = 'Remis!';
    return;
  }

  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updateTurn();

  // jeśli gra z botem i teraz jest tura O (bot), wykonaj ruch
  if(vsBotCheckbox && vsBotCheckbox.checked && !finished && currentPlayer === botPlayer){
    botMove();
  }
}

function checkWinner(){
  for(const combo of winningCombos){
    const [a,b,c] = combo;
    if(board[a] && board[a] === board[b] && board[a] === board[c]){
      return board[a];
    }
  }
  return null;
}

function highlightWinning(winner){
  for(const combo of winningCombos){
    const [a,b,c] = combo;
    if(board[a] === winner && board[b] === winner && board[c] === winner){
      [a,b,c].forEach(i => cells[i].style.background = '#e8f0fe');
    }
  }
}

function reset(){
  board.fill(null);
  cells.forEach(c => { c.textContent = ''; c.style.background=''; c.classList.remove('filled');});
  // ustaw początkowego gracza według wyboru
  humanPlayer = (playerSymbolSelect && playerSymbolSelect.value) ? playerSymbolSelect.value : 'X';
  botPlayer = humanPlayer === 'X' ? 'O' : 'X';
  currentPlayer = (starterSelect && starterSelect.value) ? starterSelect.value : 'X';
  finished = false;
  messageEl.textContent = '';
  updateTurn();
  // jeśli gra z botem i bot zaczyna, niech wykona ruch
  if(vsBotCheckbox && vsBotCheckbox.checked && currentPlayer === botPlayer){
    botMove();
  }
}

function loadScores(){
  try{
    const raw = localStorage.getItem('tictactoe-scores');
    if(raw){ scores = JSON.parse(raw); }
  }catch(e){ scores = { X:0, O:0 }; }
  updateScoresUI();
}

function saveScores(){
  try{ localStorage.setItem('tictactoe-scores', JSON.stringify(scores)); }catch(e){}
}

function updateScoresUI(){
  if(scoreXEl) scoreXEl.textContent = scores.X;
  if(scoreOEl) scoreOEl.textContent = scores.O;
}

function incrementScore(winner){
  if(!winner) return;
  scores[winner] = (scores[winner]||0) + 1;
  saveScores();
  updateScoresUI();
}

function resetScores(){
  scores = { X:0, O:0 };
  saveScores();
  updateScoresUI();
}

function botMove(){
  const available = board.map((v,i)=> v ? null : i).filter(i => i !== null);
  if(available.length === 0) return;
  const difficulty = (difficultySelect && difficultySelect.value) ? difficultySelect.value : 'easy';
  if(difficulty === 'easy'){
    const idx = available[Math.floor(Math.random()*available.length)];
    setTimeout(()=>{ if(!finished && !board[idx]) cells[idx].click(); }, 300);
    return;
  }
  if(difficulty === 'medium'){
    // medium: try to win in one, block opponent in one, else random
    // try winning move
    for(const idx of available){
      const copy = board.slice(); copy[idx] = botPlayer;
      if(checkWinnerBoard(copy) === botPlayer){
        setTimeout(()=>{ if(!finished && !board[idx]) cells[idx].click(); }, 250);
        return;
      }
    }
    // try block opponent
    for(const idx of available){
      const copy = board.slice(); copy[idx] = humanPlayer;
      if(checkWinnerBoard(copy) === humanPlayer){
        setTimeout(()=>{ if(!finished && !board[idx]) cells[idx].click(); }, 250);
        return;
      }
    }
    // otherwise random
    const idx = available[Math.floor(Math.random()*available.length)];
    setTimeout(()=>{ if(!finished && !board[idx]) cells[idx].click(); }, 300);
    return;
  }
  // hard: minimax
  const best = minimax(board.slice(), botPlayer, 0);
  const moveIdx = best.index;
  if(moveIdx === undefined || moveIdx === null){
    // fallback random
    const idx = available[Math.floor(Math.random()*available.length)];
    setTimeout(()=>{ if(!finished && !board[idx]) cells[idx].click(); }, 300);
    return;
  }
  setTimeout(()=>{ if(!finished && !board[moveIdx]) cells[moveIdx].click(); }, 300);
}

function checkWinnerBoard(bd){
  for(const combo of winningCombos){
    const [a,b,c] = combo;
    if(bd[a] && bd[a] === bd[b] && bd[a] === bd[c]){
      return bd[a];
    }
  }
  return null;
}

function minimax(newBoard, player, depth){
  const availSpots = newBoard.map((v,i)=> v ? null : i).filter(i=> i!==null);

  const winner = checkWinnerBoard(newBoard);
  if(winner === botPlayer) return {score: 10 - depth};
  if(winner === humanPlayer) return {score: depth - 10};
  if(availSpots.length === 0) return {score: 0};

  const moves = [];

  for(let i=0;i<availSpots.length;i++){
    const idx = availSpots[i];
    const move = {};
    move.index = idx;
    newBoard[idx] = player;

    if(player === botPlayer){
      const result = minimax(newBoard, humanPlayer, depth+1);
      move.score = result.score;
    } else {
      const result = minimax(newBoard, botPlayer, depth+1);
      move.score = result.score;
    }

    newBoard[idx] = null;
    moves.push(move);
  }

  let bestMove;
  if(player === botPlayer){
    let bestScore = -Infinity;
    for(const m of moves){ if(m.score > bestScore){ bestScore = m.score; bestMove = m; } }
  } else {
    let bestScore = Infinity;
    for(const m of moves){ if(m.score < bestScore){ bestScore = m.score; bestMove = m; } }
  }

  return bestMove;
}

cells.forEach(cell => cell.addEventListener('click', handleMove));
resetBtn.addEventListener('click', reset);
if(resetScoresBtn) resetScoresBtn.addEventListener('click', resetScores);
// Apply settings with explicit button to avoid accidental resets
function applySettings(){
  humanPlayer = (playerSymbolSelect && playerSymbolSelect.value) ? playerSymbolSelect.value : 'X';
  botPlayer = humanPlayer === 'X' ? 'O' : 'X';
  // starter value sets currentPlayer
  currentPlayer = (starterSelect && starterSelect.value) ? starterSelect.value : 'X';
  settingsApplied = true;
  reset();
}
if(applySettingsBtn) applySettingsBtn.addEventListener('click', applySettings);
// do not auto-reset on select changes; let user apply
// vsBot checkbox can be toggled mid-game, but if user changes it they should press Apply

// keyboard accessibility: Enter/Space to place
cells.forEach(cell => {
  cell.addEventListener('keydown', function(e){
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      this.click();
    }
  });
});

loadScores();
// Initial settings are applied only when user clicks Apply
// Pre-fill variables so UI shows consistent values
humanPlayer = (playerSymbolSelect && playerSymbolSelect.value) ? playerSymbolSelect.value : 'X';
botPlayer = humanPlayer === 'X' ? 'O' : 'X';
currentPlayer = (starterSelect && starterSelect.value) ? starterSelect.value : 'X';
updateTurn();
// jeśli od razu włączono bot i bot zaczyna (tutaj X zawsze zaczyna) - nic do zrobienia teraz