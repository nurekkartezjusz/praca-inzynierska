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
  if(winner){ finished = true; messageEl.textContent = `Wygrywa ${winner}!`; highlightWinning(winner); incrementScore(winner); return; }
  if(board.every(Boolean)){ finished = true; messageEl.textContent = 'Remis!'; return; }

  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updateTurn();
  if(vsBotCheckbox?.checked && currentPlayer === botPlayer) botMove();
}

const checkWinner = (b = board) => {
  for(const [a,b1,c] of winningCombos) if(b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
  return null;
};

function highlightWinning(winner){
  for(const [a,b,c] of winningCombos){
    if(board[a] === winner && board[b] === winner && board[c] === winner){
      [a,b,c].forEach(i => cells[i].style.background = '#e8f0fe');
    }
  }
}

function reset(){
  board.fill(null);
  cells.forEach(c => { c.textContent = ''; c.style.background=''; c.classList.remove('filled');});
  humanPlayer = playerSymbolSelect?.value || 'X';
  botPlayer = humanPlayer === 'X' ? 'O' : 'X';
  currentPlayer = starterSelect?.value || 'X';
  finished = false;
  messageEl.textContent = '';
  updateTurn();
  if(vsBotCheckbox?.checked && currentPlayer === botPlayer) setTimeout(botMove, 100);
}

function loadScores(){
  try{ scores = JSON.parse(localStorage.getItem('tictactoe-scores') || '{"X":0,"O":0}'); }
  catch(e){ scores = { X:0, O:0 }; }
  updateScoresUI();
}

function saveScores(){
  try{ localStorage.setItem('tictactoe-scores', JSON.stringify(scores)); }catch(e){}
  updateScoresUI();
}

function updateScoresUI(){
  scoreXEl.textContent = scores.X;
  scoreOEl.textContent = scores.O;
}

function incrementScore(winner){
  if(!winner) return;
  scores[winner] = (scores[winner]||0) + 1;
  saveScores();
}

function resetScores(){
  scores = { X:0, O:0 };
  saveScores();
}

function botMove(){
  const available = board.map((v,i)=> v ? null : i).filter(i => i !== null);
  if(available.length === 0) return;
  
  const difficulty = difficultySelect?.value || 'easy';
  let moveIdx;
  
  if(difficulty === 'easy'){
    moveIdx = available[Math.floor(Math.random()*available.length)];
  } else if(difficulty === 'medium'){
    moveIdx = available.find(idx => { const copy = board.slice(); copy[idx] = botPlayer; return checkWinner(copy) === botPlayer; });
    if(moveIdx === undefined) moveIdx = available.find(idx => { const copy = board.slice(); copy[idx] = humanPlayer; return checkWinner(copy) === humanPlayer; });
    if(moveIdx === undefined) moveIdx = available[Math.floor(Math.random()*available.length)];
  } else {
    const best = minimax(board.slice(), botPlayer, 0);
    moveIdx = best?.index ?? available[Math.floor(Math.random()*available.length)];
  }
  
  setTimeout(()=>{ if(!finished && !board[moveIdx]) cells[moveIdx].click(); }, 300);
}

function minimax(newBoard, player, depth){
  const availSpots = newBoard.map((v,i)=> v ? null : i).filter(i=> i!==null);
  const winner = checkWinner(newBoard);
  
  if(winner === botPlayer) return {score: 10 - depth};
  if(winner === humanPlayer) return {score: depth - 10};
  if(availSpots.length === 0) return {score: 0};

  const moves = availSpots.map(idx => {
    newBoard[idx] = player;
    const score = minimax(newBoard, player === botPlayer ? humanPlayer : botPlayer, depth+1).score;
    newBoard[idx] = null;
    return {index: idx, score};
  });

  return moves.reduce((best, m) => 
    (player === botPlayer ? m.score > best.score : m.score < best.score) ? m : best
  );
}

function applySettings(){
  humanPlayer = playerSymbolSelect?.value || 'X';
  botPlayer = humanPlayer === 'X' ? 'O' : 'X';
  currentPlayer = starterSelect?.value || 'X';
  settingsApplied = true;
  reset();
}

cells.forEach(cell => {
  cell.addEventListener('click', handleMove);
  cell.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); cell.click(); }});
});
resetBtn.addEventListener('click', reset);
resetScoresBtn?.addEventListener('click', resetScores);
applySettingsBtn?.addEventListener('click', applySettings);

// inicjalizacja
loadScores();
humanPlayer = playerSymbolSelect?.value || 'X';
botPlayer = humanPlayer === 'X' ? 'O' : 'X';
currentPlayer = starterSelect?.value || 'X';
updateTurn();
// nie rob nic jak bot rozpoczyna