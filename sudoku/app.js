// Simple Sudoku generator + solver (backtracking) with UI
const boardEl = document.getElementById('board');
const difficultySelect = document.getElementById('difficulty');
const newGameBtn = document.getElementById('newGame');
const checkBtn = document.getElementById('check');
const solveBtn = document.getElementById('solve');
const resetBtn = document.getElementById('reset');
const saveBtn = document.getElementById('saveGame');
const loadBtn = document.getElementById('loadGame');
const clearSaveBtn = document.getElementById('clearSave');
const messageEl = document.getElementById('message');
const showHintsCheckbox = document.getElementById('showHints');
const candidatesEl = document.getElementById('candidates');
const keypadEl = document.getElementById('keypad');
const notesModeCheckbox = document.getElementById('notesMode');
const exportBtn = document.getElementById('exportGame');
const importBtn = document.getElementById('importGame');
const importFileInput = document.getElementById('importFile');
const timerEl = document.getElementById('timer');
const timerContainer = document.getElementById('timerContainer');
const timerDot = document.getElementById('timerDot');
const pauseOverlay = document.getElementById('pauseOverlay');
const resumeBtn = document.getElementById('resumeBtn');
const pauseTimerBtn = document.getElementById('pauseTimer');
const savedAtEl = document.getElementById('savedAt');

let solution = null; // full solution array 81
let givens = new Set();

let puzzle = null; // current puzzle (with blanks)
let initialPuzzle = null;
let elapsedSeconds = 0;
let timerInterval = null;
let timerRunning = false;
let lastFocusedIndex = null;
let autoPaused = false; // true when the app auto-paused due to visibility change
let candidates = Array.from({length:81}, ()=> new Set());

// Helper to mark a cell as visually active (used for notes mode selection)
function setActiveCell(i){
  const children = boardEl.children;
  for(let k=0;k<children.length;k++){ if(children[k]) children[k].classList.remove('active'); }
  if(typeof i === 'number' && i>=0 && i<children.length && children[i]){
    children[i].classList.add('active');
    lastFocusedIndex = i;
  } else {
    lastFocusedIndex = null;
  }
}

// helper to convert candidates set array for save/load
function serializeCandidates(){ return candidates.map(s => Array.from(s)); }
function deserializeCandidates(arr){
  candidates = Array.from({length:81}, ()=> new Set());
  if(Array.isArray(arr)){
    for(let i=0;i<Math.min(arr.length,81); i++){
      if(Array.isArray(arr[i])) arr[i].forEach(v=> candidates[i].add(Number(v)));
    }
  }
}

function makeGrid(){
  boardEl.innerHTML = '';
  for(let i=0;i<81;i++){
    const cell = document.createElement('div');
    cell.className = 'cell';
    // make the whole cell focusable so users can Tab into it
    cell.tabIndex = 0;
    // when the cell receives focus, either forward to the input (normal mode)
    // or, in notes mode, mark it as last focused and show candidates
    cell.addEventListener('focus', () => {
      if(notesModeCheckbox && notesModeCheckbox.checked){
        setActiveCell(i);
        showCandidates(i);
        return;
      }
      const inp = cell.querySelector('input');
      if(inp) inp.focus();
    });
    // support Enter/Space to focus the input (or toggle notes behavior)
    cell.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        if(notesModeCheckbox && notesModeCheckbox.checked){
          lastFocusedIndex = i;
          showCandidates(i);
        } else {
          const inp = cell.querySelector('input'); if(inp) inp.focus();
        }
      }
    });
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 1;
    input.dataset.index = i;
    // ...existing code...
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', (e)=>{ if(e.key === 'Backspace' || e.key === 'Delete'){ e.target.value = ''; }});
    // small candidates grid
    const candGrid = document.createElement('div'); candGrid.className = 'candidates-grid';
    for(let d=1; d<=9; d++){ const ddiv = document.createElement('div'); ddiv.dataset.digit = d; ddiv.className = 'candidate-dot'; candGrid.appendChild(ddiv); }
      // make candidate dots clickable: toggle candidate on click
      // attach event listeners after creation so closures capture `i`
      const children = Array.from(candGrid.children);
      children.forEach(cd => {
        cd.addEventListener('click', (ev)=>{
          ev.stopPropagation();
          ev.preventDefault();
          const digit = Number(cd.dataset.digit);
          // Only toggle candidate when notes mode is enabled.
          if(notesModeCheckbox && notesModeCheckbox.checked){
            toggleCandidateAtIndex(i, digit);
          }
        });
      });
      // clicking cell: in notes mode we don't focus the input (prevents accidental final-value entry)
      cell.addEventListener('click', (ev) => {
        const inp = cell.querySelector('input');
        if(notesModeCheckbox && notesModeCheckbox.checked){
          setActiveCell(i);
          showCandidates(i);
          return;
        }
        if(inp) inp.focus();
      });
    // ...existing code...
    cell.appendChild(input);
    cell.appendChild(candGrid);
    boardEl.appendChild(cell);
  }
}

function onInput(e){
  const v = e.target.value.replace(/[^1-9]/g,'');
  e.target.value = v;
  // remember last focused index for keypad input
  lastFocusedIndex = Number(e.target.dataset.index);
  // highlight conflicts live and auto-save current state
  const boardNow = getBoardFromUI();
  highlightConflicts(boardNow);
  // if a final value was entered, clear any pencil candidates for this cell
  const i = Number(e.target.dataset.index);
  if(v){ candidates[i].clear(); renderCandidatesForIndex(i); 
    // input pop animation
    const cell = e.target.parentElement; cell.classList.add('pop'); setTimeout(()=> cell.classList.remove('pop'), 300);
  }
  // only eliminate impossible candidates when a final value was entered
  if(v){ eliminateImpossibleCandidates(); }
  autoSaveState();
}

function computeCandidatesForIndex(i){
  const inputs = getBoardFromUI();
  if(!inputs) return [];
  if(initialPuzzle && initialPuzzle[i]) return [];
  const {r,c} = rc(i);
  const used = new Set();
  for(let col=0; col<9; col++){ if(inputs[idx(r,col)]) used.add(inputs[idx(r,col)]); }
  for(let row=0; row<9; row++){ if(inputs[idx(row,c)]) used.add(inputs[idx(row,c)]); }
  const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
  for(let dr=0; dr<3; dr++) for(let dc=0; dc<3; dc++){ const ii = idx(br+dr, bc+dc); if(inputs[ii]) used.add(inputs[ii]); }
  const candidates = [];
  for(let n=1;n<=9;n++) if(!used.has(n)) candidates.push(n);
  return candidates;
}

function showCandidates(i){
  if(!showHintsCheckbox || !showHintsCheckbox.checked) { candidatesEl.classList.add('hidden'); return; }
  const cand = computeCandidatesForIndex(i);
  if(!cand || cand.length === 0){ candidatesEl.classList.add('hidden'); return; }
  candidatesEl.classList.remove('hidden');
  candidatesEl.textContent = 'Możliwe: ' + cand.join(' ');
}

function hideCandidates(){ candidatesEl.classList.add('hidden'); }

function render(arr){
  const inputs = boardEl.querySelectorAll('input');
  for(let i=0;i<81;i++){
    const val = arr[i];
    inputs[i].value = val ? String(val) : '';
    const cell = inputs[i].parentElement;
    if(val){ cell.classList.add('given'); inputs[i].readOnly = true; givens.add(i); }
    else { cell.classList.remove('given'); inputs[i].readOnly = false; givens.delete(i); }
    // render candidates for this cell
    renderCandidatesForIndex(i);
  }
}

function setPuzzle(arr){
  puzzle = arr.slice();
  initialPuzzle = arr.slice();
  render(puzzle);
}

function getBoardFromUI(){
  const inputs = Array.from(boardEl.querySelectorAll('input'));
  return inputs.map(i => { const v = i.value.trim(); return v ? Number(v) : null; });
}

function setBoardToUI(arr, markGivens=false){
  const inputs = boardEl.querySelectorAll('input');
  for(let i=0;i<81;i++){
    inputs[i].value = arr[i] ? String(arr[i]) : '';
    if(markGivens){ if(arr[i]){ inputs[i].parentElement.classList.add('given'); inputs[i].readOnly = true; } else { inputs[i].parentElement.classList.remove('given'); inputs[i].readOnly = false; } }
    renderCandidatesForIndex(i);
  }
}

function renderCandidatesForIndex(i){
  const cell = boardEl.children[i];
  if(!cell) return;
  const input = cell.querySelector('input');
  const grid = cell.querySelector('.candidates-grid');
  if(!grid) return;
  // if there is a value, hide candidates
  const val = input.value.trim();
  if(val){ grid.style.display = 'none'; } else { grid.style.display = 'grid'; }
  // fill candidate numbers
  const arr = Array.from(grid.children);
  for(const div of arr){
    const d = Number(div.dataset.digit);
    // show number only when candidate exists; also add a visual marker
    if(candidates[i].has(d)) { div.textContent = String(d); div.classList.add('has-candidate'); }
    else { div.textContent = ''; div.classList.remove('has-candidate'); }
  }

}

function toggleCandidateAtIndex(i, digit){
  if(!Number.isInteger(i) || i<0 || i>=81) return;
  if(initialPuzzle && initialPuzzle[i]) return; // givens not editable
  if(candidates[i].has(digit)) candidates[i].delete(digit); else candidates[i].add(digit);
  renderCandidatesForIndex(i);
  // do not automatically eliminate here so user can freely add any notes;
  // elimination will run when a final value is entered elsewhere.
}
// Utility: row, col, box indices
function rc(i){ return {r: Math.floor(i/9), c: i%9}; }
function idx(r,c){ return r*9 + c; }

function isValid(board, r, c, val){
  for(let i=0;i<9;i++){
    if(board[idx(r,i)] === val) return false;
    if(board[idx(i,c)] === val) return false;
  }
  const br = Math.floor(r/3)*3; const bc = Math.floor(c/3)*3;
  for(let dr=0;dr<3;dr++) for(let dc=0;dc<3;dc++){
    if(board[idx(br+dr, bc+dc)] === val) return false;
  }
  return true;
}

function findEmpty(board){
  for(let i=0;i<81;i++) if(!board[i]) return i;
  return -1;
}

function solveBacktrack(board){
  const pos = findEmpty(board);
  if(pos === -1) return true;
  const {r,c} = rc(pos);
  for(let n=1;n<=9;n++){
    if(isValid(board, r, c, n)){
      board[pos] = n;
      if(solveBacktrack(board)) return true;
      board[pos] = null;
    }
  }
  return false;
}

function countSolutions(board, limit=2){
  // returns number of solutions up to `limit`
  let count = 0;
  function helper(b){
    if(count >= limit) return;
    const p = findEmpty(b);
    if(p === -1){ count++; return; }
    const {r,c} = rc(p);
    for(let n=1;n<=9;n++){
      if(isValid(b, r, c, n)){
        b[p] = n;
        helper(b);
        b[p] = null;
        if(count >= limit) return;
      }
    }
  }
  helper(board.slice());
  return count;
}

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1)); [arr[i],arr[j]] = [arr[j],arr[i]];
  }
}

function generateFull(){
  const board = Array(81).fill(null);
  const numbers = [1,2,3,4,5,6,7,8,9];
  function fill(){
    const pos = findEmpty(board);
    if(pos === -1) return true;
    const {r,c} = rc(pos);
    shuffle(numbers);
    for(const n of numbers){
      if(isValid(board,r,c,n)){
        board[pos] = n;
        if(fill()) return true;
        board[pos] = null;
      }
    }
    return false;
  }
  fill();
  return board;
}

function removeCells(full, difficulty){
  // difficulty: easy, medium, hard -> number of removals
  const removeCount = difficulty === 'easy' ? 36 : difficulty === 'medium' ? 46 : 54;
  let board = full.slice();
  const positions = [...Array(81).keys()];
  shuffle(positions);
  let removed = 0;
  for(const p of positions){
    if(removed >= removeCount) break;
    const backup = board[p];
    board[p] = null;
    // check uniqueness: if more than one solution, revert
    const sols = countSolutions(board, 2);
    if(sols !== 1){
      board[p] = backup; // revert
    } else {
      removed++;
    }
  }
  return board;
}

function newGame(){
  messageEl.textContent = 'Generowanie...';
  setTimeout(()=>{
    const full = generateFull();
    solution = full.slice();
    const diff = difficultySelect.value;
    const pz = removeCells(full, diff);
    puzzle = pz.slice();
    initialPuzzle = pz.slice();
    setBoardToUI(puzzle, true);
    // eliminate impossible candidates if enabled
      eliminateImpossibleCandidates(); // always eliminate impossible candidates
    // reset timer and start immediately for the new game
    resetTimer();
    startTimer();
    messageEl.textContent = 'Gotowe — powodzenia!';
  }, 20);
}

function solve(){
  if(!solution){ messageEl.textContent = 'Brak rozwiązania w pamięci — wygeneruj najpierw grę.'; return; }
  setBoardToUI(solution, false);
}

function highlightConflicts(board){
  const inputs = Array.from(boardEl.querySelectorAll('input'));
  inputs.forEach(i => i.parentElement.classList.remove('error'));
  for(let i=0;i<81;i++){
    const v = board[i];
    if(!v) continue;
    const {r,c} = rc(i);
    // row
    for(let col=0; col<9; col++){
      if(col!==c && board[idx(r,col)] === v){ inputs[i].parentElement.classList.add('error'); inputs[idx(r,col)].parentElement.classList.add('error'); }
    }
    // col
    for(let row=0; row<9; row++){
      if(row!==r && board[idx(row,c)] === v){ inputs[i].parentElement.classList.add('error'); inputs[idx(row,c)].parentElement.classList.add('error'); }
    }
    // box
    const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
    for(let dr=0; dr<3; dr++) for(let dc=0; dc<3; dc++){
      const ii = idx(br+dr, bc+dc);
      if(ii!==i && board[ii] === v){ inputs[i].parentElement.classList.add('error'); inputs[ii].parentElement.classList.add('error'); }
    }
  }
}

function autoSaveState(){
  // save only if a puzzle was generated
  if(!initialPuzzle) return;
  const state = { initialPuzzle: initialPuzzle, current: getBoardFromUI(), solution: solution, difficulty: difficultySelect.value, elapsedSeconds: elapsedSeconds, timerRunning: timerRunning, candidates: serializeCandidates(), savedAt: new Date().toISOString() };
  try{ localStorage.setItem('sudoku-save', JSON.stringify(state)); savedAtEl.textContent = state.savedAt; } catch(e){}
}
function saveState(){
  if(!initialPuzzle){ messageEl.textContent = 'Brak gry do zapisania.'; return; }
  // explicit save: include timestamp
  const st = { initialPuzzle: initialPuzzle, current: getBoardFromUI(), solution: solution, difficulty: difficultySelect.value, elapsedSeconds: elapsedSeconds, timerRunning: timerRunning, candidates: serializeCandidates(), savedAt: new Date().toISOString() };
  try{ localStorage.setItem('sudoku-save', JSON.stringify(st)); savedAtEl.textContent = st.savedAt; messageEl.textContent = 'Stan gry zapisany: ' + st.savedAt; } catch(e){ messageEl.textContent = 'Błąd zapisu.'; }
}

function loadState(){
  const raw = localStorage.getItem('sudoku-save');
  if(!raw){ messageEl.textContent = 'Brak zapisanego stanu.'; return; }
  try{
    const st = JSON.parse(raw);
    loadStateFromObject(st);
    messageEl.textContent = 'Wczytano zapis.';
  }catch(e){ messageEl.textContent = 'Błąd wczytywania zapisu.'; }
}

function loadStateFromObject(st){
  if(st.initialPuzzle){ initialPuzzle = st.initialPuzzle.slice(); } else initialPuzzle = null;
  if(st.solution) solution = st.solution.slice(); else solution = null;
  const current = st.current ? st.current.slice() : null;
  if(current) setBoardToUI(current, false);
  // restore candidates if present
  if(st.candidates) deserializeCandidates(st.candidates);
  // render candidates for all cells
  for(let i=0;i<81;i++) renderCandidatesForIndex(i);
  // mark givens based on initialPuzzle
  const inputs = boardEl.querySelectorAll('input');
  if(initialPuzzle){
    for(let i=0;i<81;i++){
      if(initialPuzzle[i]){ inputs[i].parentElement.classList.add('given'); inputs[i].readOnly = true; }
      else { inputs[i].parentElement.classList.remove('given'); inputs[i].readOnly = false; }
    }
  }
  puzzle = current ? current.slice() : null;
  if(st.savedAt) savedAtEl.textContent = st.savedAt;
  if(typeof st.elapsedSeconds !== 'undefined') { elapsedSeconds = st.elapsedSeconds; updateTimerDisplay(); }
  // resume timer if it was running when saved
  if(st.timerRunning){
    startTimer();
  } else {
    pauseTimer();
  }
  highlightConflicts(puzzle || getBoardFromUI());
  // eliminate impossible candidates (default behavior)
  eliminateImpossibleCandidates();
}

function clearSave(){
  localStorage.removeItem('sudoku-save');
  messageEl.textContent = 'Zapis usunięty.';
}
// Automatic candidates maintenance and naked single application
function eliminateImpossibleCandidates(){
  const inputs = Array.from(boardEl.querySelectorAll('input'));
  for(let i=0;i<81;i++){
    const inp = inputs[i];
    if(!inp) continue;
    // skip givens
    if(initialPuzzle && initialPuzzle[i]){ if(candidates[i].size){ candidates[i].clear(); renderCandidatesForIndex(i); } continue; }
    const val = inp.value.trim();
    if(val){ if(candidates[i].size){ candidates[i].clear(); renderCandidatesForIndex(i); } continue; }
    // compute allowed candidates and remove any impossible ones
    const allowed = new Set(computeCandidatesForIndex(i));
    let changed = false;
    for(const d of Array.from(candidates[i])){
      if(!allowed.has(d)){ candidates[i].delete(d); changed = true; }
    }
    if(changed) renderCandidatesForIndex(i);
  }
}
// Export / Import
function exportState(){
  if(!initialPuzzle){ messageEl.textContent = 'Brak gry do eksportu.'; return; }
  const st = { initialPuzzle: initialPuzzle, current: getBoardFromUI(), solution: solution, difficulty: difficultySelect.value, elapsedSeconds: elapsedSeconds, candidates: serializeCandidates(), savedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(st, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sudoku-save-'+(new Date()).toISOString().replace(/[:.]/g,'-')+'.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  messageEl.textContent = 'Wyeksportowano stan gry.';
}

function importStateFile(file){
  const reader = new FileReader();
  reader.onload = function(ev){
    try{
      const st = JSON.parse(ev.target.result);
      loadStateFromObject(st);
      messageEl.textContent = 'Zaimportowano stan z pliku.';
    }catch(e){ messageEl.textContent = 'Nieprawidłowy plik.'; }
  };
  reader.readAsText(file);
}
function check(){
  const board = getBoardFromUI();
  // validate entries
  for(let i=0;i<81;i++){
    const v = board[i];
    if(v && (v <1 || v>9)){ messageEl.textContent = 'Wszystkie wartości muszą być 1-9.'; return; }
  }
  // check conflicts
  for(let i=0;i<81;i++){
    const v = board[i];
    if(!v) continue;
    const {r,c} = rc(i);
    for(let j=0;j<9;j++){
      if(j!==c && board[idx(r,j)] === v){ messageEl.textContent = 'Znaleziona nieprawidłowa wartość w wierszu.'; return; }
      if(j!==r && board[idx(j,c)] === v){ messageEl.textContent = 'Znaleziona nieprawidłowa wartość w kolumnie.'; return; }
    }
    const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
    for(let dr=0;dr<3;dr++) for(let dc=0;dc<3;dc++){
      const ii = idx(br+dr, bc+dc);
      if(ii!==i && board[ii] === v){ messageEl.textContent = 'Znaleziona nieprawidłowa wartość w bloku 3x3.'; return; }
    }
  }
  // if full, check solution correctness
  if(board.every(Boolean)){
    const copy = board.slice();
    if(solveBacktrack(copy)){
      messageEl.textContent = 'Gratulacje — poprawne rozwiązanie!';
      // record result in leaderboard
      try{ addResult(difficultySelect ? difficultySelect.value : 'unknown', elapsedSeconds); } catch(e){}
      // stop timer
      pauseTimer();
      // win animation
      if(boardEl) { boardEl.classList.add('win'); setTimeout(()=> boardEl.classList.remove('win'), 1200); }
    } else {
      messageEl.textContent = 'Pełne, ale niepoprawne rozwiązanie.';
    }
  } else {
    messageEl.textContent = 'Brak konfliktów (ale są jeszcze puste pola).';
  }
}

// Highlight similar filled values across the board
function highlightSimilar(value, index){
  const inputs = Array.from(boardEl.querySelectorAll('input'));
  // remove existing same markers
  for(let i=0;i<inputs.length;i++){
    const cell = inputs[i].parentElement;
    cell.classList.remove('same');
  }
  if(!value) return;
  for(let i=0;i<inputs.length;i++){
    if(i === index) continue;
    if(inputs[i].value && inputs[i].value === String(value)){
      inputs[i].parentElement.classList.add('same');
    }
  }
}

function reset(){
  if(!initialPuzzle) return;
  setBoardToUI(initialPuzzle, true);
  messageEl.textContent = 'Reset — przywrócono początkową planszę.';
  autoSaveState();
}

// Attach events
newGameBtn.addEventListener('click', newGame);
solveBtn.addEventListener('click', solve);
checkBtn.addEventListener('click', check);
resetBtn.addEventListener('click', reset);
if(saveBtn) saveBtn.addEventListener('click', saveState);
if(loadBtn) loadBtn.addEventListener('click', loadState);
if(clearSaveBtn) clearSaveBtn.addEventListener('click', clearSave);
if(exportBtn) exportBtn.addEventListener('click', exportState);
if(importBtn) importBtn.addEventListener('click', ()=> importFileInput.click());
if(importFileInput) importFileInput.addEventListener('change', (e)=>{ if(e.target.files && e.target.files[0]) importStateFile(e.target.files[0]); });

// Leaderboard (ranking)
const showLeaderboardBtn = document.getElementById('showLeaderboard');
const clearLeaderboardBtn = document.getElementById('clearLeaderboard');
const leaderboardEl = document.getElementById('leaderboard');
const leaderboardTableBody = document.querySelector('#leaderboardTable tbody');
const leaderboardFilter = document.getElementById('leaderboardFilter');

function getLeaderboard(){
  try{ const raw = localStorage.getItem('sudoku-leaderboard'); return raw ? JSON.parse(raw) : []; } catch(e){ return []; }
}

function saveLeaderboard(list){
  try{ localStorage.setItem('sudoku-leaderboard', JSON.stringify(list)); } catch(e){}
}

function addResult(difficulty, seconds){
  const list = getLeaderboard();
  const entry = { difficulty: difficulty, seconds: seconds, date: new Date().toISOString() };
  list.push(entry);
  // sort by time ascending
  list.sort((a,b)=> a.seconds - b.seconds);
  // keep top 50
  const trimmed = list.slice(0,50);
  saveLeaderboard(trimmed);
  renderLeaderboard();
}

function formatTime(s){ const mm = String(Math.floor(s/60)).padStart(2,'0'); const ss = String(s%60).padStart(2,'0'); return mm+':'+ss; }

function renderLeaderboard(){
  const list = getLeaderboard();
  if(!leaderboardTableBody) return;
  leaderboardTableBody.innerHTML = '';
  // apply filter
  const filter = (leaderboardFilter && leaderboardFilter.value) ? leaderboardFilter.value : 'all';
  const filtered = list.filter(r => filter === 'all' ? true : r.difficulty === filter);
  filtered.forEach((row,i)=>{
    const tr = document.createElement('tr');
    const num = document.createElement('td'); num.textContent = String(i+1);
    const diff = document.createElement('td'); diff.textContent = row.difficulty;
    const time = document.createElement('td'); time.textContent = formatTime(row.seconds);
    const date = document.createElement('td'); date.textContent = (new Date(row.date)).toLocaleString();
    tr.appendChild(num); tr.appendChild(diff); tr.appendChild(time); tr.appendChild(date);
    leaderboardTableBody.appendChild(tr);
  });
}

function clearLeaderboard(){ saveLeaderboard([]); renderLeaderboard(); }

if(showLeaderboardBtn) showLeaderboardBtn.addEventListener('click', ()=>{ if(leaderboardEl) leaderboardEl.classList.toggle('hidden'); renderLeaderboard(); });
if(clearLeaderboardBtn) clearLeaderboardBtn.addEventListener('click', ()=>{ if(confirm('Na pewno wyczyścić ranking?')){ clearLeaderboard(); messageEl.textContent = 'Ranking wyczyszczony.';} });
if(leaderboardFilter) leaderboardFilter.addEventListener('change', ()=> renderLeaderboard());

// timer controls
if(pauseTimerBtn) pauseTimerBtn.addEventListener('click', ()=>{ autoPaused = false; pauseTimer(); });

// Attach focus handlers to show candidates and remember last focused cell
function attachFocusHandlers(){
  const inputs = Array.from(boardEl.querySelectorAll('input'));
  inputs.forEach(inp =>{
    inp.addEventListener('focus', (e)=>{ const i = Number(e.target.dataset.index); showCandidates(i); lastFocusedIndex = i; highlightSimilar(inputs[i].value, i); inp.parentElement.classList.add('active'); });
    inp.addEventListener('blur', (e)=>{ hideCandidates(); const i = Number(e.target.dataset.index); if(boardEl.children[i]) boardEl.children[i].classList.remove('active'); highlightSimilar(null); });
  });
}

// Keypad: handle clicks on numeric buttons to insert into focused/last-selected cell
function handleKeypadClick(e){
  const btn = e.target.closest('button');
  if(!btn || !keypadEl) return;
  const val = btn.dataset.value;
  if(!val) return;

  // find active input or fallback to last focused
  let activeInput = document.activeElement;
  const inputs = boardEl.querySelectorAll('input');
  if(!(activeInput && activeInput.tagName === 'INPUT' && boardEl.contains(activeInput))){
    if(lastFocusedIndex !== null && inputs[lastFocusedIndex]){
      activeInput = inputs[lastFocusedIndex];
      activeInput.focus();
    } else {
      messageEl.textContent = 'Wybierz pole, aby wprowadzić wartość.';
      return;
    }
  }

  if(activeInput.readOnly){ messageEl.textContent = 'To pole jest stałe.'; return; }
  const i = Number(activeInput.dataset.index);
  if(notesModeCheckbox && notesModeCheckbox.checked){
    // notes mode: toggle candidate or clear candidates
    if(val === 'clear'){
      candidates[i].clear();
      renderCandidatesForIndex(i);
    } else {
      const n = Number(val);
      toggleCandidateAtIndex(i, n);
    }
  } else {
    if(val === 'clear'){
      activeInput.value = '';
    } else {
      activeInput.value = val;
      // entering a final value clears pencil marks for this cell
      candidates[i].clear(); renderCandidatesForIndex(i);
      // small pop animation
      const cell = activeInput.parentElement; cell.classList.add('pop'); setTimeout(()=> cell.classList.remove('pop'), 300);
    }
    // trigger the input handler logic
    activeInput.dispatchEvent(new Event('input', {bubbles:true}));
    showCandidates(i);
  }
}

if(keypadEl) keypadEl.addEventListener('click', handleKeypadClick);

// Initialize
makeGrid();
attachFocusHandlers();
// If a saved state exists, inform user
if(localStorage.getItem('sudoku-save')){
  messageEl.textContent = 'Znaleziono zapis gry — kliknij "Wczytaj zapis" lub wygeneruj nową grę.';
} else {
  messageEl.textContent = 'Wybierz poziom i kliknij "Nowa gra".';
}

// Timer implementation
function updateTimerDisplay(){
  const mm = String(Math.floor(elapsedSeconds/60)).padStart(2,'0');
  const ss = String(elapsedSeconds % 60).padStart(2,'0');
  if(timerEl) timerEl.textContent = mm+':'+ss;
}

function startTimer(){ if(timerRunning) return; timerRunning = true; // DOM indicator
  if(timerContainer) timerContainer.classList.add('timer-running');
  // hide pause overlay so board is visible
  if(pauseOverlay) pauseOverlay.classList.add('hidden');
  // ensure board content is accessible again
  if(boardEl) boardEl.removeAttribute('aria-hidden');
  timerInterval = setInterval(()=>{ elapsedSeconds++; updateTimerDisplay(); }, 1000);
}
function pauseTimer(){ if(timerInterval) clearInterval(timerInterval); timerRunning = false; timerInterval = null; if(timerContainer) timerContainer.classList.remove('timer-running');
  // show overlay to prevent viewing/interacting with the board
  if(pauseOverlay) pauseOverlay.classList.remove('hidden');
  // blur any focused input to prevent keyboard navigation into board
  try{ if(document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch(e){}
  if(boardEl) boardEl.setAttribute('aria-hidden','true');
}

if(resumeBtn) resumeBtn.addEventListener('click', ()=>{ autoPaused = false; startTimer(); messageEl.textContent = 'Wznów — powodzenia!'; });

// Auto-pause when the document becomes hidden and auto-resume when visible again
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden){
    // if timer was running, auto-pause and remember we auto-paused
    if(timerRunning){ autoPaused = true; pauseTimer(); messageEl.textContent = 'Automatyczna pauza — wróć do zakładki, aby wznowić.'; }
  } else {
    // on return, only resume if we auto-paused earlier
    if(autoPaused){ autoPaused = false; startTimer(); messageEl.textContent = 'Automatycznie wznowiono timer.'; }
  }
});

// Also detect when the window loses/gains focus (switching to another application)
window.addEventListener('blur', ()=>{
  // On blur, if timer was running, pause and mark autoPaused
  if(timerRunning){ autoPaused = true; pauseTimer(); messageEl.textContent = 'Automatyczna pauza (inne okno) — wróć do aplikacji, aby wznowić.'; }
});

window.addEventListener('focus', ()=>{
  // On focus, resume only if we auto-paused due to blur/visibility
  if(autoPaused){ autoPaused = false; startTimer(); messageEl.textContent = 'Automatycznie wznowiono timer.'; }
});
function resetTimer(){ pauseTimer(); elapsedSeconds = 0; updateTimerDisplay(); }

updateTimerDisplay();