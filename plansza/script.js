let currentGame = null;

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
  const gamesBtn = document.getElementById('mini-games-btn');
  if (gamesBtn && !gamesBtn.contains(e.target) && menu.classList.contains('show')) {
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
    if (document.getElementById('wait-modal').classList.contains('show')) {
      cancelInvitation();
    }
    if (document.getElementById('fp-modal').classList.contains('show')) {
      closeFriendPicker();
    }
  }
});



// MENU
function toggleMenu(){
    document.getElementById('main-menu').classList.toggle('show');
}

//MENU STRZAŁKA
function toggleGamesMenu(){
    const submenu = document.getElementById('games-menu');
    const arrow = document.querySelector('#mini-games-btn .arrow');
    submenu.classList.toggle('show');
    if (submenu.classList.contains('show')){
        arrow.style.transform = 'rotate(90deg)';
    } else {
        arrow.style.transform = 'rotate(0deg)';
    }
}


// KARTY WYBORU KLASY
const colors = {
    wlosy: ["czarne", "blond", "braz"],
    koszulka: ["czarna", "czerwona", "niebieska", "zielona", "biala", "rozowa"],
    spodnie: ["czarne", "biale", "szare", "niebieskie"]
};

function renderAvatar(avatarState, container) {

    const parts = ["skora", "usta", "oczy", "wlosy", "koszulka", "spodnie"];

    parts.forEach(part => {
        const img = container.querySelector("." + part);
        if (!img) return;
        let path = "";
        if (colors[part]) {
            const styleNum = avatarState[part];
            const colorIndex = avatarState[part + "ColorIndex"];
            const color = colors[part][colorIndex];

            path = `../wybor%20awatara/img/${part}/${part}${styleNum}_${color}.png`;
        } else {
            path = `../wybor%20awatara/img/${part}/${part}${avatarState[part]}.png`;
        }

        img.src = path;
    });
    if (container.closest("#firstCard")) {
        const hantel = container.querySelector(".hantel");
        if (hantel) {
            hantel.src = "img/hantel.png";
        }
    }
    if (container.closest("#secondCard")) {
        const zzz = container.querySelector(".zzz");
        const babelek = container.querySelector(".babelek");
        const skoraNum = avatarState.skora;
        if (zzz) {
          zzz.src = `img/zzz_skora${skoraNum}.png`;
        }
        if (babelek) {
          babelek.src = "img/babelek.png"
        }
    }
    if (container.closest("#thirdCard")) {
        const okulary = container.querySelector(".okulary");
        if (okulary) {
            okulary.src = "img/okulary.png";
        }
    }
}

// Awatar na kartach
document.addEventListener("DOMContentLoaded", () => { 
    const API_URL = '/api';

    // Bezpieczne parsowanie JSON z odpowiedzi
    async function safeJsonParse(response) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const text = await response.text();
            if (text) {
                return JSON.parse(text);
            }
        }
        return {};
    }

    async function loadAvatarForCard() {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        try {
            const response = await fetch(`${API_URL}/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) return;

            const userData = await safeJsonParse(response);
            if (!userData.avatar) return;

            const avatarState = JSON.parse(userData.avatar);

            const containers = document.querySelectorAll('.avatar-container');
            if (!containers.length) return;

            containers.forEach(container => {
                renderAvatar(avatarState, container); // ✔️ poprawne wywołanie
            });

        } catch (err) {
            console.error("Błąd ładowania awatara:", err);
        }
    }

    loadAvatarForCard();
});



// Obrót kart
document.addEventListener("DOMContentLoaded", () => {
  const containers = document.querySelectorAll('.container');

  containers.forEach(container => {
    container.addEventListener('click', () => {
      container.classList.toggle('flipped');
      });
    });
});
// Karuzela kart
document.addEventListener("DOMContentLoaded", () => {
    
})


// Tooltip
document.addEventListener("DOMContentLoaded", () => {
  const tooltip = document.getElementById('tooltip');
  const containers = document.querySelectorAll('.container');

  containers.forEach(container => {

    container.addEventListener('mouseenter', () => {
      tooltip.textContent = "Kliknij, aby obrócić";
      tooltip.style.opacity = 1;
    });

    container.addEventListener('mousemove', (e) => {
      tooltip.style.left = e.clientX + 15 + "px";
      tooltip.style.top = e.clientY + 15 + "px";
    });
  
    container.addEventListener('mouseleave', () => {
      if (!container.classList.add('clicked')) {
        tooltip.style.opacity = 0;
      } 
    });

    container.addEventListener('click', () => {
      container.classList.add('clicked');
      tooltip.style.opacity = 0;
    });

  });
});

// ==========================================
// WYBÓR OPONENTA + KLASY
// ==========================================
var API_URL = '/api';
var pendingInvitationId = null;
var outgoingPollTimer   = null;
var incomingPollTimer   = null;
var pendingIncomingId   = null;
var opponentName        = 'Bot';

// Zmienne i połączenia dla trybu multiplayer
var isMultiplayer          = false;
var multiplayerInvitationId = null;
var ws                      = null;
var myPlayerId              = 0; // 0 = zapraszający, 1 = zaproszony
var myClass                 = null;
var opponentClass           = null;

function connectWebSocket(invitationId) {
    var token = localStorage.getItem('access_token');
    if (!token) return;
    
    isMultiplayer = true;
    multiplayerInvitationId = invitationId;
    
    var wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    var wsUrl = wsProtocol + '://' + window.location.host + '/api/ws/game/' + invitationId + '?token=' + token;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = function() {
        console.log("Połączono z serwerem gier multiplayer!");
    };
    
    ws.onmessage = function(event) {
        var data = JSON.parse(event.data);
        console.log("Multiplayer odebrano:", data);
        
        if (data.type === "system") {
            if (data.role === "inviter") {
                myPlayerId = 0;
            } else {
                myPlayerId = 1;
            }
            opponentName = data.opponent_username;
            console.log("Twoja rola: " + data.role + ", Oponent: " + opponentName);
        } else if (data.type === "player_joined") {
            console.log("Przeciwnik dołączył: " + data.username);
        } else if (data.type === "player_left") {
            console.log("Przeciwnik wyszedł: " + data.username);
            showMsg("⚠️ Przeciwnik " + data.username + " rozłączył się!");
        } else if (data.type === "game_action") {
            var payload = data.payload;
            handleMultiplayerAction(payload);
        }
    };
    
    ws.onclose = function() {
        console.log("Rozłączono z serwerem gier.");
    };
    
    ws.onerror = function(err) {
        console.error("Błąd WebSocket:", err);
    };
}

function sendGameAction(payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        payload.username = localStorage.getItem('user_username') || 'Bez nazwy';
        ws.send(JSON.stringify(payload));
    }
}

function handleMultiplayerAction(payload) {
    if (payload.type === "select_class") {
        opponentClass = payload.class;
        opponentName = payload.username || opponentName;
        console.log("Oponent wybrał klasę: " + opponentClass);
        
        if (myClass) {
            var overlay = document.querySelector('.overlay');
            var classPopup = document.querySelector('.class-popup');
            document.body.classList.remove('confirmation-open');
            if (overlay) overlay.style.display = 'none';
            if (classPopup) classPopup.style.display = 'none';
            
            initMultiplayerGame();
        }
    } else if (payload.type === "roll_dice") {
        executeRoll(payload.value);
    } else if (payload.type === "claim_start_bonus") {
        var opponent = gameState.players[gameState.turn];
        var type = payload.bonusType;
        if (type === 'coin') {
            opponent.coins += 1;
            showMsg("🎉 " + opponent.name + " wybrał darmową monetę!");
        } else if (type === 'hp') {
            opponent.hp += 1;
            showMsg("🎉 " + opponent.name + " wybrał dodatkowe zdrowie (+1 HP)!");
        } else if (type === 'luck') {
            opponent.luck += 1;
            showMsg("🎉 " + opponent.name + " wybrał punkt szczęścia (+1 szczęścia)!");
        }
        updateGamePanel();
        if (startModalCallback) {
            var cb = startModalCallback;
            startModalCallback = null;
            cb();
        }
    } else if (payload.type === "draw_chance") {
        executeChanceCard(payload.cardIndex);
    } else if (payload.type === "quiz_completed") {
        if (payload.gameState) {
            gameState.players = payload.gameState.players;
            gameState.turn = payload.gameState.turn;
            gameState.gameOver = payload.gameState.gameOver;
            gameState.rolled = payload.gameState.rolled;
        }
        if (payload.msg) {
            showMsg(payload.msg);
        }
        updateGamePanel();
        placeTokens();
        setTimeout(nextTurn, 2200);
    } else if (payload.type === "dziekanat_completed") {
        if (payload.gameState) {
            gameState.players = payload.gameState.players;
            gameState.turn = payload.gameState.turn;
            gameState.gameOver = payload.gameState.gameOver;
            gameState.rolled = payload.gameState.rolled;
        }
        if (payload.msg) {
            showMsg(payload.msg);
        }
        updateGamePanel();
        placeTokens();
        setTimeout(nextTurn, 1500);
    } else if (payload.type === "sync_game_state") {
        if (payload.gameState) {
            gameState.players = payload.gameState.players;
            gameState.turn = payload.gameState.turn;
            gameState.gameOver = payload.gameState.gameOver;
            gameState.rolled = payload.gameState.rolled;
        }
        updateGamePanel();
        placeTokens();
    } else if (payload.type === "victory") {
        var winner = gameState.players[payload.winnerId];
        triggerVictory(winner);
    }
}

function returnToMainPage() {
  window.location.href = '../index.html';
}

function closeChoicePopup() {
  document.body.classList.remove('confirmation-open');
  returnToMainPage();
}

function showClassSelectionPopup() {
  var overlay = document.querySelector('.overlay');
  var mainWindow = document.querySelector('.main-window');
  var classPopup = document.querySelector('.class-popup');
  document.body.classList.add('confirmation-open');
  if (overlay) overlay.style.display = 'flex';
  if (mainWindow) mainWindow.style.display = 'none';
  if (classPopup) classPopup.style.display = 'block';
}

document.addEventListener("DOMContentLoaded", function() {
  var urlParams = new URLSearchParams(window.location.search);
  var inviteAcceptedId = urlParams.get('invite_accepted');
  if (inviteAcceptedId) {
    connectWebSocket(inviteAcceptedId);
    
    var choicePopup = document.querySelector('.choice-popup');
    var classPopup = document.querySelector('.class-popup');
    var overlay = document.querySelector('.overlay');
    var mainWindow = document.querySelector('.main-window');

    if (choicePopup) choicePopup.style.display = 'none';
    if (classPopup) classPopup.style.display = 'block';
    if (overlay) overlay.style.display = 'flex';
    if (mainWindow) mainWindow.style.display = 'none';
    document.body.classList.add('confirmation-open');

    window.history.replaceState({}, document.title, '/plansza/');
  }
  var confirmationBox = document.getElementById("confirmationBox");
  var wyborKlasy      = document.getElementById("wyborKlasy");
  var overlay         = document.querySelector('.overlay');
  var classPopup      = document.querySelector('.class-popup');
  var mainWindow      = document.querySelector('.main-window');
  var selectedClass   = null;
  document.body.classList.add('confirmation-open');

  // Krok 1a: Wybór bota
  var botBtn = document.getElementById('bot-choice-btn');
  if (botBtn) {
    botBtn.addEventListener('click', function() {
      opponentName = 'Bot';
      showClassSelectionPopup();
    });
  }

  // Krok 1b: Wybór znajomego
  var friendBtn = document.getElementById('friend-choice-btn');
  if (friendBtn) {
    friendBtn.addEventListener('click', function() { openFriendPicker(); });
  }

  // Krok 2: Wybór klasy
  var klasMap = {
    'btn-sportowiec': { klasa: 'sportowiec', nazwa: 'Sportowca' },
    'btn-leniuch':    { klasa: 'leniuch',    nazwa: 'Leniucha'  },
    'btn-madrala':    { klasa: 'madrala',    nazwa: 'Mądralę'   },
  };
  Object.keys(klasMap).forEach(function(id) {
    var btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', function() {
      selectedClass = klasMap[id].klasa;
      if (wyborKlasy)      wyborKlasy.textContent        = klasMap[id].nazwa;
      setConfirmationOpen(true);
    });
  });

  function setConfirmationOpen(isOpen) {
    if (!confirmationBox) return;
    if (isOpen) {
      document.body.classList.add('confirmation-open');
      confirmationBox.style.display = 'flex';
    } else {
      confirmationBox.style.display = 'none';
    }
  }

  // Krok 3: Potwierdzenie
  var confirmNo  = document.getElementById('confirmNo');
  var confirmYes = document.getElementById('confirmYes');
  if (confirmNo) {
    confirmNo.addEventListener('click', function() {
      setConfirmationOpen(false);
    });
  }
  if (confirmYes) {
    confirmYes.addEventListener('click', function() {
      if (!selectedClass) {
        alert('Wybierz klasę!');
        return;
      }
      setConfirmationOpen(false);
      if (isMultiplayer) {
        myClass = selectedClass;
        sendGameAction({ type: "select_class", class: selectedClass });
        showMsg("Oczekiwanie na wybór klasy przez przeciwnika...");
        
        var cardsWrapper = document.querySelector('.cards-wrapper');
        if (cardsWrapper) {
            cardsWrapper.innerHTML = '<div style="text-align:center; padding: 50px; font-size: 1.5rem; color:#fff; font-family:\'VT323\', monospace;">Wybrałeś: ' + selectedClass.toUpperCase() + '.<br>Czekanie na oponenta...</div>';
        }
        var closeBtn = document.getElementById('class-popup-close-btn');
        if (closeBtn) closeBtn.style.display = 'none';
        
        // Sprawdź czy drugi gracz już wybrał (często gra_action przychodzi zanim zamkniemy popup)
        if (opponentClass) {
            var classPopup = document.querySelector('.class-popup');
            if (overlay) overlay.style.display = 'none';
            if (classPopup) classPopup.style.display = 'none';
            
            initMultiplayerGame();
        }
      } else {
        document.body.classList.remove('confirmation-open');
        if (overlay) overlay.style.display = 'none';
        initGame(selectedClass);
      }
    });
  }

  // Przychodzące zaproszenia: akceptacja / odrzucenie
  var incAccept  = document.getElementById('inc-accept');
  var incDecline = document.getElementById('inc-decline');

  if (incAccept) {
    incAccept.addEventListener('click', function() {
      if (!pendingIncomingId) return;
      var token = localStorage.getItem('access_token');
      fetch(API_URL + '/game-invitations/accept/' + pendingIncomingId, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        document.getElementById('inc-modal').classList.remove('show');
        clearInterval(incomingPollTimer);
        opponentName = data.inviter || 'Znajomy';
        connectWebSocket(pendingIncomingId);
        pendingIncomingId = null;
        showClassSelectionPopup();
        incomingPollTimer = setInterval(checkIncoming, 5000);  // ← WZNÓW POLLING
    })
      .catch(function(e) { alert('Błąd: ' + e.message); });
    });
  }

  if (incDecline) {
  incDecline.addEventListener('click', function() {
    if (!pendingIncomingId) return;
    var token = localStorage.getItem('access_token');
    fetch(API_URL + '/game-invitations/decline/' + pendingIncomingId, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .finally(function() {
      document.getElementById('inc-modal').classList.remove('show');
      pendingIncomingId = null;
      clearInterval(incomingPollTimer);
      incomingPollTimer = setInterval(checkIncoming, 5000);  // ← WZNÓW POLLING
    });
  });
}

  // Zacznij sprawdzać przychodzące zaproszenia + przywróć stan wychodzącego
  startIncomingPoll();
  checkPendingOutgoing();
});

// ==========================================
// ZNAJOMI – PICKER + POLLING WYCHODZĄCY
// ==========================================

function openFriendPicker() {
    var token = localStorage.getItem('access_token');
    if (!token) { alert('Musisz być zalogowany!'); return; }

    var list = document.getElementById('fp-list');
    list.innerHTML = '<div class="fp-loading">Wczytuję znajomych...</div>';
    document.getElementById('fp-modal').classList.add('show');

    fetch(API_URL + '/friends', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
    })
    .then(function(friends) {
        if (!friends.length) {
            list.innerHTML = '<p class="fp-empty">Brak znajomych.<br>Dodaj ich w zakładce <a href="../znajomi/">Znajomi</a>!</p>';
        } else {
            list.innerHTML = friends.map(function(f) {
                var safe = escapeHtml(f.username);
                return '<div class="fp-item"><span class="fp-username">' + safe +
                    '</span><button class="fp-invite-btn" onclick="inviteFriend(\'' + safe + '\')">Zaproś</button></div>';
            }).join('');
        }
    })
    .catch(function(e) {
        list.innerHTML = '<p class="fp-error">Błąd: ' + escapeHtml(e.message) + '</p>';
    });
}

function closeFriendPicker() {
    document.getElementById('fp-modal').classList.remove('show');
}

function inviteFriend(username) {
    var token = localStorage.getItem('access_token');
    closeFriendPicker();

    fetch(API_URL + '/game-invitations/send', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ invitee_username: username, game_type: 'wielka-studencka-batalla' })
    })
    .then(function(r) {
        return r.json().then(function(d) {
            // Jeśli już istnieje aktywne zaproszenie – odzyskaj jego ID
            if (r.status === 400 && d.detail && d.detail.indexOf('aktywne') !== -1) {
                return recoverPendingInvitation(username);
            }
            if (!r.ok) throw new Error(d.detail || 'Błąd wysyłania');
            return d;
        });
    })
    .then(function(data) {
        if (!data || !data.invitation_id) return; // już obsłużone przez recoverPendingInvitation
        pendingInvitationId = data.invitation_id;
        opponentName = username;
        document.getElementById('wait-name').textContent = username;
        document.getElementById('wait-modal').classList.add('show');
        setFriendBtnWaiting(username);
        outgoingPollTimer = setInterval(pollOutgoing, 3000);
    })
    .catch(function(e) { alert('Błąd: ' + e.message); });
}

function recoverPendingInvitation(preferredUsername) {
    var token = localStorage.getItem('access_token');
    return fetch(API_URL + '/game-invitations/my-pending', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.json(); })
    .then(function(list) {
        var inv = list.find(function(i) { return i.game_type === 'wielka-studencka-batalla'; });
        if (!inv) return null;
        var username = inv.invitee_username || preferredUsername;
        pendingInvitationId = inv.id;
        opponentName = username;
        document.getElementById('wait-name').textContent = username;
        document.getElementById('wait-modal').classList.add('show');
        setFriendBtnWaiting(username);
        if (!outgoingPollTimer) outgoingPollTimer = setInterval(pollOutgoing, 3000);
        return null; // zablokuj domyślny handler
    });
}

function pollOutgoing() {
    if (!pendingInvitationId) return;
    var token = localStorage.getItem('access_token');
    fetch(API_URL + '/game-invitations/status/' + pendingInvitationId, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.status === 'accepted') {
            clearInterval(outgoingPollTimer); outgoingPollTimer = null;
            document.getElementById('wait-modal').classList.remove('show');
            resetFriendBtn();
            connectWebSocket(pendingInvitationId);
            showClassSelectionPopup();
        } else if (data.status === 'declined' || data.status === 'expired') {
            clearInterval(outgoingPollTimer); outgoingPollTimer = null;
            document.getElementById('wait-modal').classList.remove('show');
            resetFriendBtn();
            pendingInvitationId = null;
            alert('Znajomy ' + (data.status === 'declined' ? 'odrzucił zaproszenie.' : 'nie odpowiedział w czasie.'));
        }
    })
    .catch(function() {});
}

function cancelInvitation() {
    clearInterval(outgoingPollTimer); outgoingPollTimer = null;
    document.getElementById('wait-modal').classList.remove('show');
    resetFriendBtn();
    if (!pendingInvitationId) return;
    var id = pendingInvitationId;
    pendingInvitationId = null;
    var token = localStorage.getItem('access_token');
    fetch(API_URL + '/game-invitations/cancel/' + id, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function() {
        showCancelToast('Zaproszenie anulowane.');
    })
    .catch(function() {
        showCancelToast('Zaproszenie anulowane.');
    });
}

function showCancelToast(msg) {
    var toast = document.getElementById('cancel-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, 2500);
}

function setFriendBtnWaiting(username) {
    var btn = document.getElementById('friend-choice-btn');
    var col = document.querySelector('.friends-column');
    if (!btn) return;
    btn.textContent = 'Anuluj zaproszenie';
    btn.classList.add('choice-btn-cancel');
    btn.onclick = function() { cancelInvitation(); };
    var status = document.getElementById('friend-invite-status');
    if (!status) {
        status = document.createElement('p');
        status.id = 'friend-invite-status';
        status.className = 'friend-invite-status';
        if (col) col.appendChild(status);
    }
    status.textContent = 'Oczekiwanie na ' + username + '...';
}

function resetFriendBtn() {
    var btn = document.getElementById('friend-choice-btn');
    if (btn) {
        btn.textContent = 'Wybierz znajomego';
        btn.classList.remove('choice-btn-cancel');
        btn.onclick = function() { openFriendPicker(); };
    }
    var status = document.getElementById('friend-invite-status');
    if (status) status.remove();
}

// ==========================================
// POLLING PRZYCHODZĄCYCH ZAPROSZEŃ
// ==========================================

function startIncomingPoll() {
    checkIncoming();
    incomingPollTimer = setInterval(checkIncoming, 5000);
}

function checkPendingOutgoing() {
    var token = localStorage.getItem('access_token');
    if (!token) return;
    fetch(API_URL + '/game-invitations/my-pending', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.json(); })
    .then(function(list) {
        var inv = list.find(function(i) { return i.game_type === 'wielka-studencka-batalla'; });
        if (!inv) return;
        // Przywróć stan oczekiwania
        pendingInvitationId = inv.id;
        opponentName = inv.invitee_username;
        document.getElementById('wait-name').textContent = inv.invitee_username;
        document.getElementById('wait-modal').classList.add('show');
        setFriendBtnWaiting(inv.invitee_username);
        if (!outgoingPollTimer) outgoingPollTimer = setInterval(pollOutgoing, 3000);
    })
    .catch(function() {});
}

function checkIncoming() {
    var token = localStorage.getItem('access_token');
    if (!token) return;
    if (document.getElementById('inc-modal').classList.contains('show')) return;

    fetch(API_URL + '/game-invitations/received', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.json(); })
    .then(function(invs) {
      var inv = invs.find(function(i) { return i.game_type === 'wielka-studencka-batalla'; });
    if (inv && !pendingIncomingId) {  // ← DODAJ WARUNEK
      pendingIncomingId = inv.id;
      document.getElementById('inc-from').textContent = inv.inviter.username;
      document.getElementById('inc-modal').classList.add('show');
    }
  })
    .catch(function() {});
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function(m) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
}

// ==========================================
// SILNIK GRY - WIELKA STUDENCKA BATALIA
// ==========================================

var EASY_QUESTIONS = [
    {
        q: "Ile to jest 2 + 2 * 2?",
        a: ["8", "6", "4", "16"],
        c: 1
    },
    {
        q: "Co oznacza skrót WSB?",
        a: ["Warszawska Szkoła Biznesu", "Wyższa Szkoła Bankowa", "Wielka Studencka Batalia", "Samorząd Studencki"],
        c: 1
    },
    {
        q: "Który skrót klawiszowy służy do kopiowania tekstu?",
        a: ["Ctrl + C", "Ctrl + V", "Ctrl + X", "Ctrl + Z"],
        c: 0
    },
    {
        q: "Co jest głównym zadaniem pamięci RAM?",
        a: ["Przechowywanie plików na dysku", "Pamięć robocza procesora", "Wyświetlanie obrazu", "Zasilanie podzespołów"],
        c: 1
    },
    {
        q: "Który dokument potwierdza status studenta?",
        a: ["Dowód osobisty", "Prawo jazdy", "Legitymacja studencka", "Karta biblioteczna"],
        c: 2
    },
    {
        q: "Który semestr kończy standardowe 3-letnie studia licencjackie?",
        a: ["5. semestr", "6. semestr", "7. semestr", "8. semestr"],
        c: 1
    },
    {
        q: "W jakim pliku najczęściej zapisuje się kod JavaScript?",
        a: ["style.css", "index.html", "script.js", "main.py"],
        c: 2
    },
    {
        q: "Jakie pismo składamy, ubiegając się o pracę?",
        a: ["CV", "Paragon", "Podanie o urlop", "Mandat"],
        c: 0
    },
    {
        q: "Kto przewodniczy komisji obrony pracy dyplomowej?",
        a: ["Przewodniczący komisji", "Starosta roku", "Dziekan (zawsze)", "Prezydent miasta"],
        c: 0
    },
    {
        q: "Ile bitów składa się na jeden bajt (Byte)?",
        a: ["4 bity", "8 bitów", "16 bitów", "32 bity"],
        c: 1
    }
];

var HARD_QUESTIONS = [
    {
        q: "Który algorytm sortowania ma najgorszą złożoność czasową O(n^2)?",
        a: ["Quick Sort", "Merge Sort", "Bubble Sort", "Heap Sort"],
        c: 2
    },
    {
        q: "Który protokół sieciowy działa w warstwie aplikacji modelu OSI?",
        a: ["TCP", "IP", "HTTP", "UDP"],
        c: 2
    },
    {
        q: "Co to jest polimorfizm w programowaniu obiektowym?",
        a: ["Wielopostaciowość metod", "Ukrywanie pól", "Dziedziczenie wielokrotne", "Tworzenie struktur danych"],
        c: 0
    },
    {
        q: "Czym jest 'Query' w kontekście baz danych SQL?",
        a: ["Zapytaniem do bazy", "Strukturą tabeli", "Kluczem głównym", "Dodatkowym indeksem"],
        c: 0
    },
    {
        q: "Który z tych kierunków nie kończy się tytułem inżyniera?",
        a: ["Informatyka", "Zarządzanie i Inżynieria Produkcji", "Filologia Angielska", "Logistyka (inżynierska)"],
        c: 2
    },
    {
        q: "Jaka baza danych przechowuje dane w formacie klucz-wartość?",
        a: ["PostgreSQL", "SQLite", "Redis", "MySQL"],
        c: 2
    },
    {
        q: "Która metoda protokołu HTTP jest uważana za idempotentną?",
        a: ["POST", "GET", "PATCH", "CONNECT"],
        c: 1
    },
    {
        q: "Co robi polecenie systemów kontroli wersji: git merge?",
        a: ["Tworzy nowe repozytorium", "Pobiera najnowsze zmiany z serwera", "Scala wybraną gałąź z obecną gałęzią", "Cofa ostatni commit"],
        c: 2
    },
    {
        q: "Kto jest głównym twórcą języka Python?",
        a: ["Guido van Rossum", "Dennis Ritchie", "Bjarne Stroustrup", "James Gosling"],
        c: 0
    },
    {
        q: "Z ilu bitów składa się adres IPv4?",
        a: ["32 bity", "64 bity", "128 bitów", "16 bitów"],
        c: 0
    }
];

function getCellType(pos) {
    var el = document.querySelector('.c' + pos);
    if (!el) return 'sala';
    var types = ['start','sala','lazienka','aula','dziekanat','praktyki','szansa','biblioteka','strefarelaksu','automaty','stolowka','piwnica'];
    for (var i = 0; i < types.length; i++) {
        if (el.classList.contains(types[i])) return types[i];
    }
    return 'sala';
}

function getCellName(pos) {
    var el = document.querySelector('.c' + pos);
    return el ? el.textContent : "Sala";
}

function getFloor(pos) {
    if (typeof pos !== 'number') return 1;
    if (pos >= 84 && pos <= 101) return 3;
    if (pos >= 50 && pos <= 83) return 2;
    return 1;
}

var SZANSA_KARTY = [
    function(p) { p.hp += 1; return { msg: p.name + ': "Stypendium naukowe!" → +1 HP', p: p }; },
    function(p) { p.hp = Math.max(1, p.hp - 1); return { msg: p.name + ': "Oblałeś kolokwium!" → -1 HP', p: p }; },
    function(p) { p.luck += 1; return { msg: p.name + ': "Prowadzący odwołał zajęcia!" → +1 szczęście', p: p }; },
    function(p) { p.wisdom = Math.max(0, p.wisdom - 2); return { msg: p.name + ': "Niespodziewana kartkówka!" → -2 wiedzy', p: p }; },
    function(p) { p.wisdom += 2; return { msg: p.name + ': "Znalazłeś notatki starszego rocznika!" → +2 wiedzy', p: p }; },
    function(p) { p.coins += 2; return { msg: p.name + ': "Przelew od rodziców!" → +2 monety', p: p }; },
    function(p) { p.coins = Math.max(0, p.coins - 2); return { msg: p.name + ': "Zgubiłeś legitymację studencką!" → Wyrobienie nowej kosztuje -2 monety', p: p }; },
    function(p) { p.crystals += 1; p.coins += 1; return { msg: p.name + ': "Wygrałeś konkurs rzetelności naukowej!" → +1 Kryształek, +1 moneta', p: p }; }
];

var STATYSTYKI = {
    sportowiec: { hp: 5, luck: 2, wisdom: 3 },
    leniuch:    { hp: 3, luck: 5, wisdom: 2 },
    madrala:    { hp: 3, luck: 2, wisdom: 5 },
};

var gameState = null;
var _prevStats = [null, null];  // śledzi poprzednie wartości statystyk
var startModalCallback = null;
var quizContext = null;

function initMultiplayerGame() {
    var p1Class = myPlayerId === 0 ? myClass : opponentClass;
    var p2Class = myPlayerId === 0 ? opponentClass : myClass;
    
    var p1Stats = STATYSTYKI[p1Class];
    var p2Stats = STATYSTYKI[p2Class];
    
    var p1StartCoins = p1Class === 'leniuch' ? 3 : (p1Class === 'madrala' ? 0 : 1);
    var p2StartCoins = p2Class === 'leniuch' ? 3 : (p2Class === 'madrala' ? 0 : 1);
    
    var p1Wisdom = p1Stats.wisdom + (p1Class === 'madrala' ? 1 : 0);
    var p2Wisdom = p2Stats.wisdom + (p2Class === 'madrala' ? 1 : 0);
    
    var p1Name = myPlayerId === 0 ? localStorage.getItem('user_username') || 'Gracz 1' : opponentName;
    var p2Name = myPlayerId === 0 ? opponentName : localStorage.getItem('user_username') || 'Gracz 2';

    gameState = {
        players: [
            { id: 0, name: p1Name, pos: 84, klass: p1Class, skipTurnsLeft: 0, hp: p1Stats.hp, luck: p1Stats.luck, wisdom: p1Wisdom, crystals: 0, coins: p1StartCoins, tempCzesnePaid: false, hasShortenCard: false, boughtCrystalThisFloor: false, hints: 0 },
            { id: 1, name: p2Name, pos: 84, klass: p2Class, skipTurnsLeft: 0, hp: p2Stats.hp, luck: p2Stats.luck, wisdom: p2Wisdom, crystals: 0, coins: p2StartCoins, tempCzesnePaid: false, hasShortenCard: false, boughtCrystalThisFloor: false, hints: 0 },
        ],
        turn: 0, rolled: false, gameOver: false,
    };
    
    placeTokens();
    updateGamePanel();
    _prevStats = [null, null];
    
    document.getElementById('gp-p1').style.display    = 'flex';
    document.getElementById('gp-p2').style.display    = 'flex';
    document.getElementById('dice-panel').style.display = 'flex';
    
    if (gameState.turn === myPlayerId) {
        document.getElementById('dice-btn').disabled = false;
        showMsg('Gra rozpoczęta! Rozpoczynasz naukę na 2. piętrze WSB. Rzuć kostką!');
    } else {
        document.getElementById('dice-btn').disabled = true;
        showMsg('Gra rozpoczęta! Kolejka gracza ' + opponentName + '...');
    }
}

function initGame(playerClass) {
    var botKlasy = Object.keys(STATYSTYKI);
    var botKlasa = botKlasy[Math.floor(Math.random() * botKlasy.length)];
    var ps = STATYSTYKI[playerClass];
    var bs = STATYSTYKI[botKlasa];
    
    // Starting coins: leniuch = 3, madrala = 0, sportowiec = 1
    var playerStartCoins = playerClass === 'leniuch' ? 3 : (playerClass === 'madrala' ? 0 : 1);
    var botStartCoins = botKlasa === 'leniuch' ? 3 : (botKlasa === 'madrala' ? 0 : 1);
    
    // Wisdom addition for mądrala (+1 w mądrość)
    var playerWisdom = ps.wisdom;
    var botWisdom = bs.wisdom;
    if (playerClass === 'madrala') playerWisdom += 1;
    if (botKlasa === 'madrala') botWisdom += 1;

    gameState = {
        players: [
            { id: 0, name: 'Gracz', pos: 84, klass: playerClass, skipTurnsLeft: 0, hp: ps.hp, luck: ps.luck, wisdom: playerWisdom, crystals: 0, coins: playerStartCoins, tempCzesnePaid: false, hasShortenCard: false, boughtCrystalThisFloor: false, hints: 0 },
            { id: 1, name: opponentName, pos: 84, klass: botKlasa, skipTurnsLeft: 0, hp: bs.hp, luck: bs.luck, wisdom: botWisdom, crystals: 0, coins: botStartCoins, tempCzesnePaid: false, hasShortenCard: false, boughtCrystalThisFloor: false, hints: 0 },
        ],
        turn: 0, rolled: false, gameOver: false,
    };
    placeTokens();
    updateGamePanel();
    _prevStats = [null, null];  // reset śledzenia zmian przy nowej grze
    document.getElementById('gp-p1').style.display    = 'flex';
    document.getElementById('gp-p2').style.display    = 'flex';
    document.getElementById('dice-panel').style.display = 'flex';
    document.getElementById('dice-btn').disabled = false;
    showMsg('Gra rozpoczęta! Rozpoczynasz naukę na 2. piętrze WSB. Rzuć kostką!');
}

function advanceOneStep(player, pos) {
    var floor = getFloor(pos);
    if (floor === 3) {
        if (pos === 101) {
            return player.crystals >= 5 ? 50 : 84;
        }
        return pos + 1;
    } else if (floor === 2) {
        if (pos === 83) {
            return player.crystals >= 10 ? 0 : 50;
        }
        return pos + 1;
    } else if (floor === 1) {
        if (pos === 49) {
            return 0; // Standard loop on Parter
        }
        return pos + 1;
    }
    return pos;
}

function executeRoll(val) {
    var player = gameState.players[gameState.turn];
    document.getElementById('dice-num').textContent = val;
    document.getElementById('dice-btn').disabled = true;
    gameState.rolled = true;

    // Movement sequence checking for passing start
    var currentFloor = getFloor(player.pos);
    var passedStartCount = 0;
    
    var currentPos = player.pos;
    for (var i = 0; i < val; i++) {
        var prevPos = currentPos;
        var nextPos = advanceOneStep(player, prevPos);
        var floorCurrent = getFloor(prevPos);
        var floorNext = getFloor(nextPos);
        
        if (floorNext === floorCurrent) {
            // Checks wrapping on same floor (passing Start)
            if ((floorCurrent === 3 && prevPos === 101 && nextPos === 84) ||
                (floorCurrent === 2 && prevPos === 83 && nextPos === 50) ||
                (floorCurrent === 1 && prevPos === 49 && nextPos === 0)) {
                passedStartCount++;
            }
        }
        currentPos = nextPos;
    }
    player.pos = currentPos;
    placeTokens();
    updateGamePanel();

    if (passedStartCount > 0) {
        handlePassStart(player, function() {
            triggerFieldArrival(player);
        });
    } else {
        triggerFieldArrival(player);
    }
}

function rollDice() {
    if (!gameState || gameState.rolled || gameState.gameOver) return;
    var player = gameState.players[gameState.turn];
    
    // Check if player is currently in practice or piwnica skip status
    if (player.skipTurnsLeft > 0) {
        player.skipTurnsLeft--;
        showMsg('⏳ ' + player.name + ' odbywa praktyki/przerwę! Pozostało tur do opuszczenia: ' + player.skipTurnsLeft);
        gameState.rolled = true;
        updateGamePanel();
        if (isMultiplayer) {
            sendGameAction({ type: "sync_game_state", gameState: gameState });
        }
        setTimeout(nextTurn, 1800);
        return;
    }
    
    var val = Math.floor(Math.random() * 6) + 1;
    if (isMultiplayer) {
        sendGameAction({ type: "roll_dice", value: val });
    }
    executeRoll(val);
}

function handlePassStart(player, onFinished) {
    var floor = getFloor(player.pos);
    var tuition = floor === 1 ? 3 : 1;
    
    if (player.tempCzesnePaid) {
        player.tempCzesnePaid = false;
        showMsg("🎫 " + player.name + " mija Start! Czesne opłacone z góry!");
        updateGamePanel();
        promptStartBonus(player, onFinished);
    } else {
        if (player.coins >= tuition) {
            player.coins -= tuition;
            showMsg("🪙 " + player.name + " mija Start i płaci czesne: " + tuition + " monety (pozostało: " + player.coins + ")");
            updateGamePanel();
            promptStartBonus(player, onFinished);
        } else {
            player.crystals = Math.max(0, player.crystals - 1);
            showMsg("⚠️ Brak monet na czesne (" + tuition + ")! " + player.name + " traci 1 kryształek! (pozostało: " + player.crystals + ")");
            updateGamePanel();
            
            if (player.crystals === 0) {
                var currentFloor = getFloor(player.pos);
                if (currentFloor === 2) {
                    player.pos = 84;
                    showMsg("📉 " + player.name + " ma 0 kryształków! Zostaje cofnięty/a na 2. piętro (Start III, cell 84)!");
                    placeTokens();
                    updateGamePanel();
                } else if (currentFloor === 1) {
                    player.pos = 50;
                    showMsg("📉 " + player.name + " ma 0 kryształków! Zostaje cofnięty/a na 1. piętro (Start II, cell 50)!");
                    placeTokens();
                    updateGamePanel();
                }
            }
            if (isMultiplayer) {
                sendGameAction({ type: "sync_game_state", gameState: gameState });
            }
            onFinished();
        }
    }
}

function promptStartBonus(player, onFinished) {
    if (player.id === myPlayerId) {
        var floor = getFloor(player.pos);
        var tuition = floor === 1 ? 3 : 1;
        document.getElementById('start-tuition-msg').textContent = "Pomyślnie opłacono czesne w wysokości " + tuition + " 🪙.";
        document.getElementById('start-modal').style.display = 'flex';
        startModalCallback = onFinished;
    } else {
        if (isMultiplayer) {
            showMsg("⏳ Oczekiwanie na wybór bonusu przez gracza: " + player.name + "...");
            startModalCallback = onFinished;
        } else {
            var choices = ['coin', 'hp', 'luck'];
            var b = choices[Math.floor(Math.random() * choices.length)];
            if (b === 'coin') {
                player.coins += 1;
                showMsg("🤖 " + player.name + " wybrał darmową monetę jako bonus semestralny!");
            } else if (b === 'hp') {
                player.hp += 1;
                showMsg("🤖 " + player.name + " wybrał punkt zdrowia (+1 HP) jako bonus semestralny!");
            } else {
                player.luck += 1;
                showMsg("🤖 " + player.name + " wybrał punkt szczęścia (+1 szczęścia) jako bonus semestralny!");
            }
            updateGamePanel();
            setTimeout(onFinished, 1200);
        }
    }
}

function claimStartBonus(type) {
    if (!gameState) return;
    var player = gameState.players[myPlayerId];
    if (type === 'coin') {
        player.coins += 1;
        showMsg("🎉 Wybrałeś/aś dodatkową monetę!");
    } else if (type === 'hp') {
        player.hp += 1;
        showMsg("🎉 Wybrałeś/aś dodatkowe zdrowie (+1 HP)!");
    } else if (type === 'luck') {
        player.luck += 1;
        showMsg("🎉 Wybrałeś/aś punkt szczęścia studenta (+1 szczęścia)!");
    }
    document.getElementById('start-modal').style.display = 'none';
    updateGamePanel();
    
    if (isMultiplayer) {
        sendGameAction({ type: "claim_start_bonus", bonusType: type });
    }
    
    if (startModalCallback) {
        var cb = startModalCallback;
        startModalCallback = null;
        cb();
    }
}

function resolveOccupancy(player) {
    var other = gameState.players.find(function(p) { return p.id !== player.id; });
    var moved = false;
    while (player.pos === other.pos) {
        var floor = getFloor(player.pos);
        if (floor === 3) {
            player.pos = player.pos === 84 ? 101 : player.pos - 1;
        } else if (floor === 2) {
            player.pos = player.pos === 50 ? 83 : player.pos - 1;
        } else if (floor === 1) {
            player.pos = player.pos === 0 ? 49 : player.pos - 1;
        }
        moved = true;
    }
    if (moved) {
        showMsg("⚠️ Pole zajęte przez przeciwnika! Cofasz się na najbliższe wolne pole (" + getCellName(player.pos) + ").");
        placeTokens();
    }
}

function executeChanceCard(cardIndex) {
    var player = gameState.players[gameState.turn];
    var card = SZANSA_KARTY[cardIndex];
    var result = card(player);
    showMsg(result.msg);
    updateGamePanel();
    
    if (player.hp <= 0) {
        var winner = gameState.players[(gameState.turn + 1) % 2];
        showMsg('💀 ' + player.name + ' stracił wszystkie HP! Wygrywa ' + winner.name + '!');
        gameState.gameOver = true;
        document.getElementById('dice-btn').disabled = true;
        if (isMultiplayer) {
            sendGameAction({ type: "victory", winnerId: winner.id });
        }
        return;
    }
    setTimeout(nextTurn, 2000);
}

function triggerFieldArrival(player) {
    resolveOccupancy(player);
    
    var type = getCellType(player.pos);
    
    if (type === 'sala') {
        triggerQuiz(player, 1);
    } else if (type === 'aula') {
        triggerQuiz(player, 2);
    } else if (type === 'dziekanat') {
        triggerDziekanat(player);
    } else if (type === 'lazienka') {
        showMsg("🚽 " + player.name + " w łazience: Pusta kabina! Chwila oddechu, nic się nie dzieje.");
        if (isMultiplayer && player.id === myPlayerId) {
            sendGameAction({ type: "sync_game_state", gameState: gameState });
        }
        setTimeout(nextTurn, 1500);
    } else if (type === 'praktyki') {
        player.crystals += 1;
        if (player.hasShortenCard) {
            player.skipTurnsLeft = 1;
            player.hasShortenCard = false;
            showMsg("📋 " + player.name + " realizuje praktyki! Masz kartę skróconych praktyk → tracisz tylko 1 turę i otrzymujesz +1 kryształek! 💎");
        } else if (player.klass === 'sportowiec') {
            player.skipTurnsLeft = 2;
            showMsg("🏃 " + player.name + " realizuje praktyki! Jako Sportowiec kończysz je szybciej → tracisz 2 tury i otrzymujesz +1 kryształek! 💎");
        } else {
            player.skipTurnsLeft = 3;
            showMsg("💼 " + player.name + " realizuje praktyki! Tracisz 3 tury i otrzymujesz +1 kryształek! 💎");
        }
        updateGamePanel();
        if (isMultiplayer && player.id === myPlayerId) {
            sendGameAction({ type: "sync_game_state", gameState: gameState });
        }
        setTimeout(nextTurn, 2200);
    } else if (type === 'biblioteka') {
        player.wisdom += 1;
        player.hints += 1;
        var floor = getFloor(player.pos);
        if (floor === 1) {
            if (player.id === myPlayerId) {
                if (player.coins >= 2) {
                    var yes = confirm("📖 Biblioteka: Czy chcesz wymienić 2 monety na 1 Kryształek? 💎");
                    if (yes) {
                        player.coins -= 2;
                        player.crystals += 1;
                        showMsg("📖 Wymiana w bibliotece: -2 monety → +1 Kryształek!");
                    } else {
                        showMsg("📖 Odmówiłeś/aś wymiany w bibliotece.");
                    }
                } else {
                    showMsg("📖 Biblioteka: Nie masz wystarczająco dużo monet (min. 2 🪙) na wymianę na kryształek!");
                }
                if (isMultiplayer) {
                    sendGameAction({ type: "sync_game_state", gameState: gameState });
                }
            } else {
                if (!isMultiplayer) {
                    if (player.coins >= 2 && player.crystals < 15) {
                        player.coins -= 2;
                        player.crystals += 1;
                        showMsg("🤖 " + player.name + " wymienił 2 monety na 1 Kryształek w bibliotece!");
                    }
                }
            }
        } else {
            showMsg("📖 " + player.name + " w bibliotece: Otrzymuje +1 mądrości 🧠 oraz darmową podpowiedź 💡!");
            if (isMultiplayer && player.id === myPlayerId) {
                sendGameAction({ type: "sync_game_state", gameState: gameState });
            }
        }
        updateGamePanel();
        if (!isMultiplayer || player.id === myPlayerId) {
            setTimeout(nextTurn, 2000);
        }
    } else if (type === 'strefarelaksu') {
        player.luck += 1;
        showMsg("⭐ " + player.name + " w strefie relaksu: Odpoczynek pomaga w nauce! +1 szczęścia!");
        updateGamePanel();
        if (isMultiplayer && player.id === myPlayerId) {
            sendGameAction({ type: "sync_game_state", gameState: gameState });
        }
        setTimeout(nextTurn, 1500);
    } else if (type === 'stolowka') {
        var floor = getFloor(player.pos);
        if (floor === 1) {
            showMsg("🥪 Stołówka na parterze jest zamknięta! Brak bonusów.");
        } else {
            player.hp += 1;
            showMsg("🥪 " + player.name + " w stołówce: Pożywny obiad regeneruje zdrowie! +1 HP! ♥");
        }
        updateGamePanel();
        if (isMultiplayer && player.id === myPlayerId) {
            sendGameAction({ type: "sync_game_state", gameState: gameState });
        }
        setTimeout(nextTurn, 1500);
    } else if (type === 'piwnica') {
        player.skipTurnsLeft = 1;
        showMsg("🚬 " + player.name + " w piwnicy (przerwa na dworze): Tracisz 1 kolejkę!");
        updateGamePanel();
        if (isMultiplayer && player.id === myPlayerId) {
            sendGameAction({ type: "sync_game_state", gameState: gameState });
        }
        setTimeout(nextTurn, 1500);
    } else if (type === 'automaty') {
        if (player.coins >= 1) {
            player.coins -= 1;
            var hpGained = player.klass === 'sportowiec' ? 2 : 1;
            player.hp += hpGained;
            showMsg("🥤 " + player.name + " zjadł przekąskę z automatu! Koszt: -1 moneta, zysk: +" + hpGained + " HP! ♥");
        } else {
            showMsg("🥤 " + player.name + " wchodzi na pole automatów, ale nie ma monet na zakup batona.");
        }
        updateGamePanel();
        if (isMultiplayer && player.id === myPlayerId) {
            sendGameAction({ type: "sync_game_state", gameState: gameState });
        }
        setTimeout(nextTurn, 2000);
    } else if (type === 'szansa') {
        if (isMultiplayer) {
            if (player.id === myPlayerId) {
                var cardIndex = Math.floor(Math.random() * SZANSA_KARTY.length);
                sendGameAction({ type: "draw_chance", cardIndex: cardIndex });
                executeChanceCard(cardIndex);
            }
        } else {
            var cardIndex = Math.floor(Math.random() * SZANSA_KARTY.length);
            executeChanceCard(cardIndex);
        }
    } else {
        showMsg(player.name + ' stoi na bezpiecznym polu.');
        if (isMultiplayer && player.id === myPlayerId) {
            sendGameAction({ type: "sync_game_state", gameState: gameState });
        }
        setTimeout(nextTurn, 1500);
    }
}

function triggerQuiz(player, count) {
    var floor = getFloor(player.pos);
    var isHard = (player.klass === 'leniuch') || (floor === 1);
    var pool = isHard ? HARD_QUESTIONS : EASY_QUESTIONS;
    var shuffled = pool.slice().sort(function() { return 0.5 - Math.random(); });
    
    quizContext = {
        player: player,
        total: count,
        answered: 0,
        correct: 0,
        questions: shuffled.slice(0, count)
    };
    
    if (isMultiplayer) {
        if (player.id === myPlayerId) {
            showQuizQuestion();
        } else {
            showMsg("⏳ Gracz " + player.name + " odpowiada na pytania naukowe...");
        }
    } else {
        if (player.id === 0) {
            showQuizQuestion();
        } else {
            runBotQuiz();
        }
    }
}

function showQuizQuestion() {
    var q = quizContext.questions[quizContext.answered];
    document.getElementById('quiz-question-text').innerHTML = 
        `<strong>Pytanie ${quizContext.answered + 1} z ${quizContext.total}:</strong><br><br>${q.q}`;
    
    var answersContainer = document.getElementById('quiz-answers-container');
    answersContainer.innerHTML = '';
    
    q.a.forEach(function(ans, index) {
        var btn = document.createElement('button');
        btn.className = 'custom-modal-btn';
        btn.innerHTML = `<span style="color:#00d2d3; font-weight:bold; margin-right:8px;">${String.fromCharCode(65 + index)}:</span> ${ans}`;
        btn.onclick = function() { selectQuizAnswer(index); };
        answersContainer.appendChild(btn);
    });
    
    var hintBtn = document.getElementById('quiz-hint-btn');
    if (quizContext.player.hints > 0 || quizContext.player.coins >= 1) {
        hintBtn.style.display = 'block';
        if (quizContext.player.hints > 0) {
            hintBtn.innerHTML = `💡 Użyj darmowej podpowiedzi (Dostępne: ${quizContext.player.hints})`;
        } else {
            hintBtn.innerHTML = `🪙 Kup podpowiedź 50/50 (Koszt: 1 moneta)`;
        }
    } else {
        hintBtn.style.display = 'none';
    }
    
    document.getElementById('quiz-modal').style.display = 'flex';
}

function useQuiz1Hint() {
    var player = quizContext.player;
    if (player.hints > 0) {
        player.hints--;
    } else if (player.coins >= 1) {
        player.coins--;
    } else {
        return;
    }
    updateGamePanel();
    
    var q = quizContext.questions[quizContext.answered];
    var correctIndex = q.c;
    var wrongIndices = [];
    q.a.forEach(function(_, i) {
        if (i !== correctIndex) wrongIndices.push(i);
    });
    wrongIndices.sort(function() { return 0.5 - Math.random(); });
    var toHide = wrongIndices.slice(0, 2);
    
    var buttons = document.getElementById('quiz-answers-container').children;
    for (var i = 0; i < buttons.length; i++) {
        if (toHide.includes(i)) {
            buttons[i].style.opacity = '0.3';
            buttons[i].style.pointerEvents = 'none';
        }
    }
    document.getElementById('quiz-hint-btn').style.display = 'none';
    showMsg("💡 Użyto podpowiedzi! Ukryto 2 błędne odpowiedzi.");
}

function selectQuizAnswer(selectedIndex) {
    var q = quizContext.questions[quizContext.answered];
    var buttons = document.getElementById('quiz-answers-container').children;
    
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].style.pointerEvents = 'none';
        if (i === q.c) {
            buttons[i].style.background = '#2ed573';
            buttons[i].style.borderColor = '#2ed573';
        } else if (i === selectedIndex) {
            buttons[i].style.background = '#ff4757';
            buttons[i].style.borderColor = '#ff4757';
        }
    }
    
    if (selectedIndex === q.c) {
        quizContext.correct++;
        showMsg("🎉 Poprawna odpowiedź!");
    } else {
        showMsg("❌ Błędna odpowiedź! Prawidłowa to: " + q.a[q.c]);
    }
    
    quizContext.answered++;
    
    setTimeout(function() {
        if (quizContext.answered < quizContext.total) {
            showQuizQuestion();
        } else {
            document.getElementById('quiz-modal').style.display = 'none';
            resolveQuizRewards();
        }
    }, 1200);
}

function resolveQuizRewards() {
    var player = quizContext.player;
    var floor = getFloor(player.pos);
    var score = quizContext.correct;
    var total = quizContext.total;
    
    if (total === 1) {
        if (score === 1) {
            player.crystals += 1;
            player.coins += 1;
            showMsg(`🎉 Poprawna odpowiedź! Zdobywasz +1 Kryształek 💎 i +1 monetę 🪙!`);
        } else {
            showMsg(`❌ Pudło! Nie zdobywasz kryształka na sali.`);
        }
    } else if (total === 2) {
        if (floor === 1) {
            if (score === 2) {
                player.crystals += 1;
                player.coins += 2;
                showMsg(`🎉 Pełen sukces (2/2) w Auli na ostatnim piętrze! Zdobywasz +1 Kryształek 💎 i +2 monety 🪙!`);
            } else if (score === 1) {
                player.coins += 1;
                showMsg(`⚠️ Wynik 1/2. Brak kryształka (tylko pełen sukces ocala cię na parterze), ale zyskujesz +1 monetę 🪙.`);
            } else {
                showMsg(`❌ 0/2 w Auli! Brak nagród.`);
            }
        } else {
            if (score === 2) {
                player.crystals += 1;
                player.coins += 2;
                showMsg(`🎉 Doskonały wynik (2/2) w Auli! Otrzymujesz +1 Kryształek 💎 i +2 monety 🪙!`);
            } else if (score === 1) {
                player.crystals += 1;
                player.coins += 1;
                showMsg(`👍 Dobry wynik (1/2) w Auli! Otrzymujesz +1 Kryształek 💎 i +1 monetę 🪙!`);
            } else {
                showMsg(`❌ 0/2 w Auli! Brak nagród.`);
            }
        }
    }
    quizContext = null;
    updateGamePanel();
    
    if (isMultiplayer) {
         if (player.id === myPlayerId) {
             sendGameAction({ type: "quiz_completed", gameState: gameState, msg: document.getElementById('gp-msg').textContent });
             setTimeout(nextTurn, 2200);
         }
    } else {
         setTimeout(nextTurn, 2200);
    }
}

function runBotQuiz() {
    var bot = quizContext.player;
    var count = quizContext.total;
    var prob = 0.4 + (bot.wisdom * 0.08);
    if (bot.klass === 'leniuch') prob -= 0.15;
    if (bot.klass === 'madrala') prob += 0.15;
    prob = Math.min(0.92, Math.max(0.2, prob));
    
    showMsg(`🤖 ${bot.name} odpowiada na pytania naukowe...`);
    
    var idx = 0;
    function answerOneByOne() {
        var correct = Math.random() < prob;
        if (correct) {
            quizContext.correct++;
        }
        idx++;
        if (idx < count) {
            setTimeout(answerOneByOne, 1000);
        } else {
            setTimeout(resolveQuizRewards, 1000);
        }
    }
    setTimeout(answerOneByOne, 1000);
}

function triggerDziekanat(player) {
    if (isMultiplayer) {
        if (player.id === myPlayerId) {
            var floor = getFloor(player.pos);
            var obronaBtn = document.getElementById('dk-btn-obrona');
            if (floor === 1 && player.crystals >= 15) {
                obronaBtn.style.display = 'block';
            } else {
                obronaBtn.style.display = 'none';
            }
            
            document.getElementById('dk-btn-prepay').disabled = player.coins < 1 || player.tempCzesnePaid;
            document.getElementById('dk-btn-hp').disabled = player.coins < 2;
            document.getElementById('dk-btn-crystal').disabled = player.coins < 3 || player.boughtCrystalThisFloor;
            document.getElementById('dk-btn-shorten').disabled = player.coins < 2 || player.hasShortenCard;
            
            document.getElementById('dziekanat-modal').style.display = 'flex';
        } else {
            showMsg("⏳ Gracz " + player.name + " załatwia sprawy w Dziekanacie...");
        }
    } else {
        if (player.id === 0) {
            var floor = getFloor(player.pos);
            var obronaBtn = document.getElementById('dk-btn-obrona');
            if (floor === 1 && player.crystals >= 15) {
                obronaBtn.style.display = 'block';
            } else {
                obronaBtn.style.display = 'none';
            }
            
            document.getElementById('dk-btn-prepay').disabled = player.coins < 1 || player.tempCzesnePaid;
            document.getElementById('dk-btn-hp').disabled = player.coins < 2;
            document.getElementById('dk-btn-crystal').disabled = player.coins < 3 || player.boughtCrystalThisFloor;
            document.getElementById('dk-btn-shorten').disabled = player.coins < 2 || player.hasShortenCard;
            
            document.getElementById('dziekanat-modal').style.display = 'flex';
        } else {
            runBotDziekanat(player);
        }
    }
}

function closeDziekanatModal() {
    document.getElementById('dziekanat-modal').style.display = 'none';
    setTimeout(nextTurn, 500);
}

function applyDziekanat(action) {
    var activeId = isMultiplayer ? myPlayerId : 0;
    var player = gameState.players[activeId];
    var floor = getFloor(player.pos);
    
    if (action === 'prepay') {
        if (player.coins >= 1 && !player.tempCzesnePaid) {
            player.coins -= 1;
            player.tempCzesnePaid = true;
            showMsg("🎫 Zapłacono czesne z góry! Przy najbliższym minięciu startu nie tracisz monet.");
        }
    } else if (action === 'buy_hp') {
        if (player.coins >= 2) {
            player.coins -= 2;
            player.hp += 1;
            showMsg("♥ Dziekanat: Dokonano zakupu regeneracji sił (+1 HP)!");
        }
    } else if (action === 'buy_crystal') {
        if (player.coins >= 3 && !player.boughtCrystalThisFloor) {
            player.coins -= 3;
            player.crystals += 1;
            player.boughtCrystalThisFloor = true;
            showMsg("💎 Dziekanat: Zakupiono 1 Kryształek za 3 monety!");
        }
    } else if (action === 'buy_shorten') {
        if (player.coins >= 2 && !player.hasShortenCard) {
            player.coins -= 2;
            player.hasShortenCard = true;
            showMsg("📋 Dziekanat: Zakupiono kartę skróconych praktyk!");
        }
    } else if (action === 'obrona') {
        if (floor === 1 && player.crystals >= 15) {
            document.getElementById('dziekanat-modal').style.display = 'none';
            if (isMultiplayer) {
                sendGameAction({ type: "victory", winnerId: activeId });
            }
            triggerVictory(player);
            return;
        }
    }
    
    document.getElementById('dziekanat-modal').style.display = 'none';
    updateGamePanel();
    
    if (isMultiplayer) {
        sendGameAction({ type: "dziekanat_completed", gameState: gameState, msg: document.getElementById('gp-msg').textContent });
        setTimeout(nextTurn, 1500);
    } else {
        setTimeout(nextTurn, 1500);
    }
}

function runBotDziekanat(bot) {
    var floor = getFloor(bot.pos);
    if (floor === 1 && bot.crystals >= 15) {
        triggerVictory(bot);
        return;
    }
    
    var prepayChance = bot.coins >= 1 && !bot.tempCzesnePaid && Math.random() < 0.4;
    var buyHpChance = bot.coins >= 2 && bot.hp < 4 && Math.random() < 0.5;
    var buyCrystalChance = bot.coins >= 3 && !bot.boughtCrystalThisFloor && bot.crystals < 15 && Math.random() < 0.6;
    var shortenChance = bot.coins >= 2 && !bot.hasShortenCard && Math.random() < 0.3;
    
    if (buyCrystalChance) {
        bot.coins -= 3;
        bot.crystals += 1;
        bot.boughtCrystalThisFloor = true;
        showMsg(`🏛️ Dziekanat: Bot ${bot.name} kupił 1 Kryształek 💎 za 3 monety!`);
    } else if (buyHpChance) {
        bot.coins -= 2;
        bot.hp += 1;
        showMsg(`🏛️ Dziekanat: Bot ${bot.name} wymienił 2 monety na +1 HP!`);
    } else if (shortenChance) {
        bot.coins -= 2;
        bot.hasShortenCard = true;
        showMsg(`🏛️ Dziekanat: Bot ${bot.name} kupił kartę skróconych praktyk za 2 monety!`);
    } else if (prepayChance) {
        bot.coins -= 1;
        bot.tempCzesnePaid = true;
        showMsg(`🏛️ Dziekanat: Bot ${bot.name} zapłacił czesne z góry za 1 monetę!`);
    } else {
        showMsg(`🏛️ Dziekanat: Bot ${bot.name} załatwił sprawy urzędowe i opuścił dziekanat.`);
    }
    
    updateGamePanel();
    setTimeout(nextTurn, 2200);
}

function triggerVictory(winner) {
    gameState.gameOver = true;
    gameState.rolled = true;
    document.getElementById('dice-btn').disabled = true;
    
    winner.pos = 'k25';
    placeTokens();
    
    var degreeText = "LICENCJAT";
    if (winner.klass === 'madrala') {
        degreeText = "INŻYNIER";
    } else if (winner.klass === 'sportowiec') {
        degreeText = Math.random() < 0.5 ? "INŻYNIER" : "LICENCJAT";
    }
    
    if (winner.id === myPlayerId) {
        document.getElementById('diploma-student-name').textContent = winner.name.toUpperCase();
        document.getElementById('diploma-student-class').textContent = winner.klass.toUpperCase() + " (WSB MERITO)";
        document.getElementById('diploma-earned-degree').textContent = degreeText;
        
        var statSummary = `
            <strong>Zebrane Kryształki:</strong> ${winner.crystals} 💎 (wymagane 15)<br>
            <strong>Końcowe Monety:</strong> ${winner.coins} 🪙<br>
            <strong>Mądrość:</strong> ${winner.wisdom} 🧠<br>
            <strong>Szczęście:</strong> ${winner.luck} ⭐<br>
            <strong>Zdrowie (HP):</strong> ${winner.hp} ♥
        `;
        document.getElementById('diploma-stats-summary').innerHTML = statSummary;
        document.getElementById('diploma-modal').style.display = 'flex';
        showMsg(`🏆 Gratulacje! Ukończyłeś studia z tytułem ${degreeText}!`);
    } else {
        showMsg(`🏆 Gra zakończona! Gracz ${winner.name} obronił pracę jako pierwszy i otrzymał tytuł: ${degreeText}!`);
    }
}

function nextTurn() {
    if (gameState.gameOver) return;
    gameState.turn   = (gameState.turn + 1) % 2;
    gameState.rolled = false;
    updateGamePanel();
    var current = gameState.players[gameState.turn];
    
    if (isMultiplayer) {
        if (gameState.turn === myPlayerId) {
            document.getElementById('dice-btn').disabled = false;
            showMsg('Twoja tura – rzuć kostką!');
        } else {
            document.getElementById('dice-btn').disabled = true;
            showMsg('Tura gracza ' + current.name + '...');
        }
    } else {
        if (current.id === 1) {
            showMsg('Tura ' + current.name + '...');
            setTimeout(rollDice, 1200);
        } else {
            document.getElementById('dice-btn').disabled = false;
            showMsg('Twoja tura – rzuć kostką!');
        }
    }
}

function placeTokens() {
    document.querySelectorAll('.player-token').forEach(function(t) { t.remove(); });
    if (!gameState) return;
    gameState.players.forEach(function(p, i) {
        var selector = typeof p.pos === 'string' ? '.' + p.pos : '.c' + p.pos;
        var cell = document.querySelector(selector);
        if (!cell) return;
        var token = document.createElement('div');
        token.className = 'player-token player-token-' + (i + 1);
        cell.appendChild(token);
    });
}

function updateGamePanel() {
    if (!gameState) return;
    var p1 = gameState.players[0], p2 = gameState.players[1];

    renderStatBar('gp-p1-stat', p1, _prevStats[0]);
    renderStatBar('gp-p2-stat', p2, _prevStats[1]);

    document.getElementById('gp-p1-name').textContent = p1.name + ' [' + p1.klass + ']';
    document.getElementById('gp-p2-name').textContent = p2.name + ' [' + p2.klass + ']';
    document.getElementById('gp-p1').classList.toggle('gp-active', gameState.turn === 0 && !gameState.gameOver);
    document.getElementById('gp-p2').classList.toggle('gp-active', gameState.turn === 1 && !gameState.gameOver);

    _prevStats[0] = { hp: p1.hp, wisdom: p1.wisdom, luck: p1.luck, crystals: p1.crystals, coins: p1.coins };
    _prevStats[1] = { hp: p2.hp, wisdom: p2.wisdom, luck: p2.luck, crystals: p2.crystals, coins: p2.coins };
}

function renderStatBar(id, player, prev) {
    var el = document.getElementById(id);
    if (!el) return;

    var hpMax  = 5;
    var hearts = '';
    for (var i = 0; i < hpMax; i++) { hearts += i < player.hp ? '♥' : '♡'; }
    if (player.hp > hpMax) hearts += '+' + (player.hp - hpMax);

    var hpFlash  = prev && prev.hp      !== player.hp     ? ' s-flash' : '';
    var wisFlash = prev && prev.wisdom  !== player.wisdom ? ' s-flash' : '';
    var lukFlash = prev && prev.luck    !== player.luck   ? ' s-flash' : '';
    var cryFlash = prev && prev.crystals !== player.crystals ? ' s-flash' : '';
    var coiFlash = prev && prev.coins    !== player.coins   ? ' s-flash' : '';

    var hpDelta  = (prev && prev.hp      !== player.hp)     ? getDelta(prev.hp,      player.hp)      : '';
    var wisDelta = (prev && prev.wisdom  !== player.wisdom) ? getDelta(prev.wisdom,  player.wisdom)  : '';
    var lukDelta = (prev && prev.luck    !== player.luck)   ? getDelta(prev.luck,    player.luck)    : '';
    var cryDelta = (prev && prev.crystals !== player.crystals) ? getDelta(prev.crystals, player.crystals) : '';
    var coiDelta = (prev && prev.coins    !== player.coins)   ? getDelta(prev.coins,   player.coins)    : '';

    var prepaidInd = player.tempCzesnePaid ? ' 🎫' : '';
    var shortenInd = player.hasShortenCard ? ' 📋' : '';
    var hintsInd = player.hints > 0 ? ' 💡' : '';

    el.innerHTML =
        '<span class="s-hp'  + hpFlash  + '">' + hearts              + hpDelta  + '</span>' +
        '<span class="s-wis' + wisFlash + '">' + '🧠 ' + player.wisdom + wisDelta + '</span>' +
        '<span class="s-luk' + lukFlash + '">' + '⭐ '  + player.luck   + lukDelta + '</span>' +
        '<span class="s-cry' + cryFlash + '">' + '💎 Kryształy: ' + player.crystals + ' / 15' + cryDelta + '</span>' +
        '<span class="s-coi' + coiFlash + '">' + '🪙 Monety: ' + player.coins + coiDelta + prepaidInd + shortenInd + hintsInd + '</span>';
}

function getDelta(oldVal, newVal) {
    var d = newVal - oldVal;
    if (d === 0) return '';
    return '<span class="s-delta ' + (d > 0 ? 's-pos' : 's-neg') + '">' + (d > 0 ? '+' : '') + d + '</span>';
}

function showMsg(text) {
    var el = document.getElementById('gp-msg');
    if (el) el.textContent = text;
}