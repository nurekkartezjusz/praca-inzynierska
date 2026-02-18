let currentGame = null;

function toggleGamesMenu() {
  const menu = document.getElementById('games-menu');
  menu.classList.toggle('show');
}

function openGame(gameType, gameTitle) {
  const modal = document.getElementById('game-modal');
  const iframe = document.getElementById('game-iframe');
  const title = document.getElementById('game-title');
  
  // Ustaw tytuł
  title.textContent = gameTitle;
  
  // Załaduj grę tylko jeśli to inna gra lub pierwszy raz
  if (currentGame !== gameType) {
    if (gameType === 'kolko') {
      iframe.src = '../kolko-i-krzyzyk/index.html';
      iframe.classList.remove('scale');
    } else if (gameType === 'sudoku') {
      iframe.src = '../sudoku/index.html';
      iframe.classList.add('scale');
    }
    currentGame = gameType;
  }
  
  // Pokaż modal
  modal.classList.add('show');
  
  // Zamknij dropdown
  document.getElementById('games-menu').classList.remove('show');
}

function closeGame() {
  const modal = document.getElementById('game-modal');
  
  // Ukryj modal (NIE czyść iframe - zachowaj stan gry)
  modal.classList.remove('show');
}

// Funkcja do przełączania pełnego ekranu dla całej planszy
function toggleBoardFullscreen() {
  const elem = document.documentElement;
  const btn = document.getElementById('fullscreen-btn');
  
  if (!document.fullscreenElement) {
    // Wejdź w pełny ekran
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { /* Safari */
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE11 */
      elem.msRequestFullscreen();
    }
  } else {
    // Wyjdź z pełnego ekranu
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) { /* Safari */
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { /* IE11 */
      document.msExitFullscreen();
    }
  }
}

// Aktualizuj tekst przycisku pełnego ekranu
document.addEventListener('fullscreenchange', updateFullscreenButton);
document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
document.addEventListener('msfullscreenchange', updateFullscreenButton);

function updateFullscreenButton() {
  const btn = document.getElementById('fullscreen-btn');
  if (document.fullscreenElement) {
    btn.innerHTML = '⛶ Wyjdź';
  } else {
    btn.innerHTML = '⛶ Pełny ekran';
  }
}

// Zamknij menu po kliknięciu poza nim
document.addEventListener('click', function(e) {
  const menu = document.getElementById('games-menu');
  const gamesBtn = document.querySelector('.menu-btn.games');
  if (!gamesBtn.contains(e.target) && menu.classList.contains('show')) {
    menu.classList.remove('show');
  }
});

// Zamknij modal po kliknięciu w tło
document.getElementById('game-modal').addEventListener('click', function(e) {
  if (e.target === this) {
    closeGame();
  }
});

// Zamknij modal klawiszem ESC
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeGame();
  }
});

// Czy jesteś pewien swojego wyboru
document.addEventListener("DOMContentLoaded", () => {

  document.getElementById('btn-sportowiec').addEventListener("click", () => {
    alert("Wybrales sportowca");
  });
  document.getElementById('btn-leniuch').addEventListener("click", () => {
    alert("Wybrales leniucha");
  });
  document.getElementById('btn-madrala').addEventListener("click", () => {
    alert("Wybrales madrale");
  });

});