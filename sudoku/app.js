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

let solution = null; 
let givens = new Set();

let puzzle = null; 
let initialPuzzle = null;
let elapsedSeconds = 0;
let timerInterval = null;
let timerRunning = false;
let lastFocusedIndex = null;
let autoPaused = false; // true gdy aplikacja automatycznie wstrzymała się z powodu zmiany widoczności
let candidates = Array.from({length:81}, ()=> new Set());

// oznaczanie komórki jako wizualnie aktywnej (używana w trybie notatek)
function setActiveCell(i){
  Array.from(boardEl.children).forEach(c => c?.classList.remove('active'));
  if(typeof i === 'number' && i>=0 && boardEl.children[i]){
    boardEl.children[i].classList.add('active');
    lastFocusedIndex = i;
  } else lastFocusedIndex = null;
}

// konwersja tablicy zbiorów kandydatów dla zapisu/wczytania
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
    // uczyń całą komórkę fokusowalną, aby użytkownicy mogli w nią wejść klawiszem Tab
    cell.tabIndex = 0;
    // gdy komórka otrzyma fokus, przekaż go do inputa (tryb normalny)
    // lub, w trybie notatek, oznacz ją jako ostatnio sfokusowaną i pokaż kandydatów
    cell.addEventListener('focus', () => {
      if(notesModeCheckbox && notesModeCheckbox.checked){
        setActiveCell(i);
        showCandidates(i);
        return;
      }
      const inp = cell.querySelector('input');
      if(inp) inp.focus();
    });
    // obsługa Enter/Spacja do fokusowania inputa (lub przełączania zachowania notatek)
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
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', (e)=>{ if(e.key === 'Backspace' || e.key === 'Delete'){ e.target.value = ''; }});
    const candGrid = document.createElement('div'); candGrid.className = 'candidates-grid';
    for(let d=1; d<=9; d++){ const ddiv = document.createElement('div'); ddiv.dataset.digit = d; ddiv.className = 'candidate-dot'; candGrid.appendChild(ddiv); }
      const children = Array.from(candGrid.children);
      children.forEach(cd => {
        cd.addEventListener('click', (ev)=>{
          ev.stopPropagation();
          ev.preventDefault();
          const digit = Number(cd.dataset.digit);
          if(notesModeCheckbox && notesModeCheckbox.checked){
            toggleCandidateAtIndex(i, digit);
          }
        });
      });
      // w trybie notatek nie fokusujemy inputa (zapobiega przypadkowemu wpisaniu finalnej wartości)
      cell.addEventListener('click', (ev) => {
        const inp = cell.querySelector('input');
        if(notesModeCheckbox && notesModeCheckbox.checked){
          setActiveCell(i);
          showCandidates(i);
          return;
        }
        if(inp) inp.focus();
      });
    cell.appendChild(input);
    cell.appendChild(candGrid);
    boardEl.appendChild(cell);
  }
}

function onInput(e){
  const v = e.target.value = e.target.value.replace(/[^1-9]/g,'');
  const i = lastFocusedIndex = Number(e.target.dataset.index);
  highlightConflicts(getBoardFromUI());
  if(v){
    candidates[i].clear();
    renderCandidatesForIndex(i);
    const cell = e.target.parentElement;
    cell.classList.add('pop');
    setTimeout(()=> cell.classList.remove('pop'), 300);
    eliminateImpossibleCandidates();
  }
  saveState();
}

function computeCandidatesForIndex(i){
  const inputs = getBoardFromUI();
  if(!inputs || (initialPuzzle && initialPuzzle[i])) return [];
  const {r,c} = rc(i), used = new Set();
  for(let j=0; j<9; j++){ if(inputs[idx(r,j)]) used.add(inputs[idx(r,j)]); if(inputs[idx(j,c)]) used.add(inputs[idx(j,c)]); }
  const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
  for(let dr=0; dr<3; dr++) for(let dc=0; dc<3; dc++) if(inputs[idx(br+dr, bc+dc)]) used.add(inputs[idx(br+dr, bc+dc)]);
  return Array.from({length:9}, (_,n) => n+1).filter(n => !used.has(n));
}

function showCandidates(i){
  const cand = showHintsCheckbox?.checked ? computeCandidatesForIndex(i) : [];
  candidatesEl.classList.toggle('hidden', !cand.length);
  if(cand.length) candidatesEl.textContent = 'Możliwe: ' + cand.join(' ');
}

function hideCandidates(){ candidatesEl.classList.add('hidden'); }

function setBoardToUI(arr, markGivens=false){
  const inputs = boardEl.querySelectorAll('input');
  for(let i=0;i<81;i++){
    const val = arr[i];
    inputs[i].value = val ? String(val) : '';
    const cell = inputs[i].parentElement;
    if(markGivens){
      if(val){ cell.classList.add('given'); inputs[i].readOnly = true; givens.add(i); }
      else { cell.classList.remove('given'); inputs[i].readOnly = false; givens.delete(i); }
    }
    renderCandidatesForIndex(i);
  }
}

function setPuzzle(arr){
  puzzle = arr.slice();
  initialPuzzle = arr.slice();
  setBoardToUI(puzzle, true);
}

function getBoardFromUI(){
  const inputs = Array.from(boardEl.querySelectorAll('input'));
  return inputs.map(i => { const v = i.value.trim(); return v ? Number(v) : null; });
}

function renderCandidatesForIndex(i){
  const cell = boardEl.children[i];
  if(!cell) return;
  const grid = cell.querySelector('.candidates-grid');
  if(!grid) return;
  grid.style.display = cell.querySelector('input').value.trim() ? 'none' : 'grid';
  Array.from(grid.children).forEach(div => {
    const d = Number(div.dataset.digit);
    div.textContent = candidates[i].has(d) ? String(d) : '';
    div.classList.toggle('has-candidate', candidates[i].has(d));
  });
}

function toggleCandidateAtIndex(i, digit){
  if(!Number.isInteger(i) || i<0 || i>=81 || initialPuzzle?.[i]) return;
  candidates[i].has(digit) ? candidates[i].delete(digit) : candidates[i].add(digit);
  renderCandidatesForIndex(i);
}
function rc(i){ return {r: Math.floor(i/9), c: i%9}; }
function idx(r,c){ return r*9 + c; }

function isValid(board, r, c, val){
  for(let i=0;i<9;i++) if(board[idx(r,i)] === val || board[idx(i,c)] === val) return false;
  const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
  for(let dr=0;dr<3;dr++) for(let dc=0;dc<3;dc++) if(board[idx(br+dr, bc+dc)] === val) return false;
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
  const removeCount = {easy:36, medium:46, hard:54}[difficulty] || 46;
  let board = full.slice(), positions = [...Array(81).keys()], removed = 0;
  shuffle(positions);
  for(const p of positions){
    if(removed >= removeCount) break;
    const backup = board[p];
    board[p] = null;
    if(countSolutions(board, 2) !== 1) board[p] = backup;
    else removed++;
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
      eliminateImpossibleCandidates();
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
  const markError = (i, j) => { inputs[i].parentElement.classList.add('error'); inputs[j].parentElement.classList.add('error'); };
  
  for(let i=0;i<81;i++){
    const v = board[i];
    if(!v) continue;
    const {r,c} = rc(i);
    for(let col=0; col<9; col++) if(col!==c && board[idx(r,col)] === v) markError(i, idx(r,col));
    for(let row=0; row<9; row++) if(row!==r && board[idx(row,c)] === v) markError(i, idx(row,c));
    const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
    for(let dr=0; dr<3; dr++) for(let dc=0; dc<3; dc++){
      const ii = idx(br+dr, bc+dc);
      if(ii!==i && board[ii] === v) markError(i, ii);
    }
  }
}

function saveState(showMessage = false){
  if(!initialPuzzle){ if(showMessage) messageEl.textContent = 'Brak gry do zapisania.'; return; }
  const state = { initialPuzzle, current: getBoardFromUI(), solution, difficulty: difficultySelect.value, elapsedSeconds, timerRunning, candidates: serializeCandidates(), savedAt: new Date().toISOString() };
  try{ 
    localStorage.setItem('sudoku-save', JSON.stringify(state)); 
    savedAtEl.textContent = state.savedAt; 
    if(showMessage) messageEl.textContent = 'Stan gry zapisany: ' + state.savedAt;
  } catch(e){ if(showMessage) messageEl.textContent = 'Błąd zapisu.'; }
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
  initialPuzzle = st.initialPuzzle?.slice() || null;
  solution = st.solution?.slice() || null;
  const current = st.current?.slice();
  if(current) setBoardToUI(current, false);
  if(st.candidates) deserializeCandidates(st.candidates);
  for(let i=0;i<81;i++) renderCandidatesForIndex(i);
  const inputs = boardEl.querySelectorAll('input');
  if(initialPuzzle) for(let i=0;i<81;i++){
    inputs[i].parentElement.classList.toggle('given', !!initialPuzzle[i]);
    inputs[i].readOnly = !!initialPuzzle[i];
  }
  puzzle = current || null;
  if(st.savedAt) savedAtEl.textContent = st.savedAt;
  if(st.elapsedSeconds !== undefined) { elapsedSeconds = st.elapsedSeconds; updateTimerDisplay(); }
  st.timerRunning ? startTimer() : pauseTimer();
  highlightConflicts(puzzle || getBoardFromUI());
  eliminateImpossibleCandidates();
}

function clearSave(){
  localStorage.removeItem('sudoku-save');
  messageEl.textContent = 'Zapis usunięty.';
}
function eliminateImpossibleCandidates(){
  const inputs = Array.from(boardEl.querySelectorAll('input'));
  for(let i=0;i<81;i++){
    if((initialPuzzle?.[i]) || inputs[i]?.value.trim()){
      if(candidates[i].size){ candidates[i].clear(); renderCandidatesForIndex(i); }
      continue;
    }
    const allowed = new Set(computeCandidatesForIndex(i));
    const toDelete = Array.from(candidates[i]).filter(d => !allowed.has(d));
    if(toDelete.length){ toDelete.forEach(d => candidates[i].delete(d)); renderCandidatesForIndex(i); }
  }
}
// Eksport / Import
function exportState(){
  if(!initialPuzzle){ messageEl.textContent = 'Brak gry do eksportu.'; return; }
  const st = { initialPuzzle, current: getBoardFromUI(), solution, difficulty: difficultySelect.value, elapsedSeconds, candidates: serializeCandidates(), savedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(st, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: 'sudoku-save-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json' });
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
  for(let i=0;i<81;i++) if(board[i] && (board[i]<1 || board[i]>9)){ messageEl.textContent = 'Wszystkie wartości muszą być 1-9.'; return; }
  
  for(let i=0;i<81;i++){
    if(!board[i]) continue;
    const {r,c} = rc(i), v = board[i];
    for(let j=0;j<9;j++){
      if((j!==c && board[idx(r,j)] === v) || (j!==r && board[idx(j,c)] === v)){ 
        messageEl.textContent = 'Znaleziona nieprawidłowa wartość w wierszu/kolumnie.'; return; 
      }
    }
    const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
    for(let dr=0;dr<3;dr++) for(let dc=0;dc<3;dc++){
      const ii = idx(br+dr, bc+dc);
      if(ii!==i && board[ii] === v){ messageEl.textContent = 'Znaleziona nieprawidłowa wartość w bloku 3x3.'; return; }
    }
  }
  
  if(board.every(Boolean)){
    if(solveBacktrack(board.slice())){
      messageEl.textContent = 'Gratulacje — poprawne rozwiązanie!';
      try{ addResult(difficultySelect?.value || 'unknown', elapsedSeconds); } catch(e){}
      pauseTimer();
      boardEl.classList.add('win'); 
      setTimeout(()=> boardEl.classList.remove('win'), 1200);
    } else messageEl.textContent = 'Pełne, ale niepoprawne rozwiązanie.';
  } else messageEl.textContent = 'Brak konfliktów (ale są jeszcze puste pola).';
}

// Podswietl podobne wypełnione wartości na całej planszy
function highlightSimilar(value, index){
  const inputs = Array.from(boardEl.querySelectorAll('input'));
  inputs.forEach((inp, i) => {
    inp.parentElement.classList.toggle('same', value && i !== index && inp.value === String(value));
  });
}

function reset(){
  if(!initialPuzzle) return;
  setBoardToUI(initialPuzzle, true);
  messageEl.textContent = 'Reset — przywrócono początkową planszę.';
  saveState();
}

newGameBtn.addEventListener('click', newGame);
solveBtn.addEventListener('click', solve);
checkBtn.addEventListener('click', check);
resetBtn.addEventListener('click', reset);
saveBtn?.addEventListener('click', ()=> saveState(true));
loadBtn?.addEventListener('click', loadState);
clearSaveBtn?.addEventListener('click', clearSave);
exportBtn?.addEventListener('click', exportState);
importBtn?.addEventListener('click', ()=> importFileInput.click());
importFileInput?.addEventListener('change', (e)=>{ if(e.target.files?.[0]) importStateFile(e.target.files[0]); });

// ranking
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
  list.push({ difficulty, seconds, date: new Date().toISOString() });
  list.sort((a,b)=> a.seconds - b.seconds);
  saveLeaderboard(list.slice(0,50));
  renderLeaderboard();
}

function formatTime(s){ const mm = String(Math.floor(s/60)).padStart(2,'0'); const ss = String(s%60).padStart(2,'0'); return mm+':'+ss; }

function renderLeaderboard(){
  if(!leaderboardTableBody) return;
  const filter = leaderboardFilter?.value || 'all';
  const filtered = getLeaderboard().filter(r => filter === 'all' || r.difficulty === filter);
  leaderboardTableBody.innerHTML = filtered.map((row,i) => 
    `<tr><td>${i+1}</td><td>${row.difficulty}</td><td>${formatTime(row.seconds)}</td><td>${new Date(row.date).toLocaleString()}</td></tr>`
  ).join('');
}

function clearLeaderboard(){ saveLeaderboard([]); renderLeaderboard(); }

showLeaderboardBtn?.addEventListener('click', ()=>{ leaderboardEl?.classList.toggle('hidden'); renderLeaderboard(); });
clearLeaderboardBtn?.addEventListener('click', ()=>{ if(confirm('Na pewno wyczyścić ranking?')){ clearLeaderboard(); messageEl.textContent = 'Ranking wyczyszczony.';} });
leaderboardFilter?.addEventListener('change', renderLeaderboard);

// kontrolki timera
if(pauseTimerBtn) pauseTimerBtn.addEventListener('click', ()=>{ autoPaused = false; pauseTimer(); });

function attachFocusHandlers(){
  Array.from(boardEl.querySelectorAll('input')).forEach(inp =>{
    inp.addEventListener('focus', e => { 
      const i = Number(e.target.dataset.index); 
      showCandidates(i); 
      lastFocusedIndex = i; 
      highlightSimilar(inp.value, i); 
      inp.parentElement.classList.add('active'); 
    });
    inp.addEventListener('blur', e => { 
      hideCandidates(); 
      boardEl.children[Number(e.target.dataset.index)]?.classList.remove('active'); 
      highlightSimilar(null); 
    });
  });
}

// klawiatura ekranowa
function handleKeypadClick(e){
  const val = e.target.closest('button')?.dataset.value;
  if(!val) return;

  let activeInput = document.activeElement;
  const inputs = boardEl.querySelectorAll('input');
  if(!(activeInput?.tagName === 'INPUT' && boardEl.contains(activeInput))){
    if(lastFocusedIndex !== null && inputs[lastFocusedIndex]) (activeInput = inputs[lastFocusedIndex]).focus();
    else { messageEl.textContent = 'Wybierz pole, aby wprowadzić wartość.'; return; }
  }

  if(activeInput.readOnly){ messageEl.textContent = 'To pole jest stałe.'; return; }
  const i = Number(activeInput.dataset.index);
  
  if(notesModeCheckbox?.checked){
    val === 'clear' ? (candidates[i].clear(), renderCandidatesForIndex(i)) : toggleCandidateAtIndex(i, Number(val));
  } else {
    activeInput.value = val === 'clear' ? '' : val;
    if(val !== 'clear'){
      candidates[i].clear();
      renderCandidatesForIndex(i);
      const cell = activeInput.parentElement;
      cell.classList.add('pop');
      setTimeout(()=> cell.classList.remove('pop'), 300);
    }
    activeInput.dispatchEvent(new Event('input', {bubbles:true}));
    showCandidates(i);
  }
}

if(keypadEl) keypadEl.addEventListener('click', handleKeypadClick);

// nicjalizacja
makeGrid();
attachFocusHandlers();
// jeśli istnieje zapisany stan, poinformuj użytkownika
if(localStorage.getItem('sudoku-save')){
  messageEl.textContent = 'Znaleziono zapis gry — kliknij "Wczytaj zapis" lub wygeneruj nową grę.';
} else {
  messageEl.textContent = 'Wybierz poziom i kliknij "Nowa gra".';
}

// implementacja timera
function updateTimerDisplay(){
  const mm = String(Math.floor(elapsedSeconds/60)).padStart(2,'0');
  const ss = String(elapsedSeconds % 60).padStart(2,'0');
  if(timerEl) timerEl.textContent = mm+':'+ss;
}

function startTimer(){ 
  if(timerRunning) return; 
  timerRunning = true;
  timerContainer?.classList.add('timer-running');
  pauseOverlay?.classList.add('hidden');
  boardEl?.removeAttribute('aria-hidden');
  timerInterval = setInterval(()=>{ elapsedSeconds++; updateTimerDisplay(); }, 1000);
}
function pauseTimer(){ 
  if(timerInterval) clearInterval(timerInterval); 
  timerRunning = false; 
  timerInterval = null; 
  timerContainer?.classList.remove('timer-running');
  pauseOverlay?.classList.remove('hidden');
  try{ document.activeElement?.blur?.(); } catch(e){}
  boardEl?.setAttribute('aria-hidden','true');
}

if(resumeBtn) resumeBtn.addEventListener('click', ()=>{ autoPaused = false; startTimer(); messageEl.textContent = 'Wznów — powodzenia!'; });

// automatyczna pauza/wznowienie
const handlePause = (msg) => { if(timerRunning){ autoPaused = true; pauseTimer(); messageEl.textContent = msg; }};
const handleResume = () => { if(autoPaused){ autoPaused = false; startTimer(); messageEl.textContent = 'Automatycznie wznowiono timer.'; }};

document.addEventListener('visibilitychange', ()=> document.hidden ? handlePause('Automatyczna pauza — wróć do zakładki, aby wznowić.') : handleResume());
window.addEventListener('blur', ()=> handlePause('Automatyczna pauza (inne okno) — wróć do aplikacji, aby wznowić.'));
window.addEventListener('focus', handleResume);
function resetTimer(){ pauseTimer(); elapsedSeconds = 0; updateTimerDisplay(); }

updateTimerDisplay();