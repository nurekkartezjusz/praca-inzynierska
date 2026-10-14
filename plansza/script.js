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

var currentUserAvatar = null;

function parseAvatarState(avatar) {
    if (!avatar) return null;
    try {
        var avatarState = typeof avatar === 'string' ? JSON.parse(avatar) : avatar;
        return avatarState && typeof avatarState === 'object' && !Array.isArray(avatarState)
            ? avatarState
            : null;
    } catch (error) {
        console.warn("Nie udało się odczytać konfiguracji awatara:", error);
        return null;
    }
}

function renderAvatarLayers(container, avatarState) {
    ["skora", "usta", "oczy", "wlosy", "koszulka", "spodnie"].forEach(part => {
        if (!container.querySelector("." + part)) {
            const img = document.createElement("img");
            img.className = "layer " + part;
            container.appendChild(img);
        }
    });
    container.classList.add("avatar-container");
    renderAvatar(avatarState, container);
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

            const avatarState = parseAvatarState(userData.avatar);
            if (!avatarState) return;
            currentUserAvatar = avatarState;

            const containers = document.querySelectorAll('.avatar-container');
            containers.forEach(container => {
                renderAvatar(avatarState, container);
            });

            if (gameState) {
                placeTokens();
                updateGamePanel();
            }

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
var isBotGame              = false;
var multiplayerInvitationId = null;
var ws                      = null;
var pendingGameActions      = [];
var wsReconnectTimer        = null;
var wsReconnectAttempt      = 0;
var gameSessionVersion      = 0;
var gamePhase               = "class_selection";
var awaitingSavedSessionCheck = false;
var myPlayerId              = 0; // 0 = zapraszający, 1 = zaproszony
var myUserId                = null;
var roomPlayers             = [];
var playerClasses           = {};
var isRoomHost               = false;
var lobbyPollTimer           = null;
var myUsername              = localStorage.getItem('user_username') || null;
var myClass                 = null;
var opponentClass           = null;

// Sprawdza lokalnie (bez zapytania do serwera), czy token JWT już wygasł
function isTokenExpired(token) {
    try {
        var payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return !payload.exp || (payload.exp * 1000) < Date.now();
    } catch (e) {
        return true;
    }
}

function connectWebSocket(invitationId) {
    var token = localStorage.getItem('access_token');
    if (!token) return;

    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return;

    if (isTokenExpired(token)) {
        alert('Twoja sesja wygasła. Zaloguj się ponownie, aby zagrać.');
        window.location.href = '../logowanie/index.html';
        return;
    }
    
    console.log('connectWebSocket called with invitationId=', invitationId);
    isBotGame = false;
    isMultiplayer = true;
    multiplayerInvitationId = invitationId;
    if (wsReconnectTimer) {
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = null;
    }

    var protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    var url = protocol + '://' + window.location.host + '/api/ws/game/' + invitationId + '?token=' + encodeURIComponent(token);
    console.log('connectWebSocket: Creating WebSocket connection to', url);
    var socket = new WebSocket(url);
    ws = socket;

    socket.onopen = function() {
        console.log('WebSocket opened');
        if (ws !== socket) return;
        wsReconnectAttempt = 0;
        if (myClass) sendGameAction({ type: 'select_class', class: myClass });
        while (pendingGameActions.length && socket.readyState === WebSocket.OPEN) {
            socket.send(pendingGameActions.shift());
        }
    };

    socket.onmessage = function(event) {
        console.log('socket.onmessage received:', event.data);
        if (ws !== socket) return;
        var data = JSON.parse(event.data);
        if (data.type === 'system') {
            console.log('System message received:', {
                has_saved_session: data.has_saved_session,
                awaitingSavedSessionCheck: awaitingSavedSessionCheck,
                player_id: data.player_id,
                role: data.role
            });
            myPlayerId = Number.isInteger(data.player_id) ? data.player_id : (data.role === 'inviter' ? 0 : 1);
            roomPlayers = Array.isArray(data.players) ? data.players : [];
            myUserId = roomPlayers[myPlayerId]?.user_id || myUserId;
            updateMyPlayerSlot();
            isRoomHost = data.host_id === myUserId;
            myUsername = data.username || myUsername;
            opponentName = data.opponent_username || 'Gracz';
            var firstOpponent = roomPlayers.find(function(player) { return player.id !== myPlayerId; });
            if (firstOpponent) opponentName = firstOpponent.username;
            if (data.has_saved_session) {
                console.log('Has saved session, showing lobby');
                hideLobby();
                awaitingSavedSessionCheck = false;
                document.body.classList.remove('confirmation-open');
                var resumeOverlay = document.querySelector('.overlay');
                var resumeClassPopup = document.querySelector('.class-popup');
                if (resumeOverlay) resumeOverlay.style.display = 'none';
                if (resumeClassPopup) resumeClassPopup.style.display = 'none';
            } else if (awaitingSavedSessionCheck) {
                console.log('No saved session and awaiting check is true, showing class popup');
                awaitingSavedSessionCheck = false;
                displayClassSelectionPopup();
            } else {
                console.log('Neither condition met - not showing popup or lobby');
            }
            renderLobby();
            if (myClass) sendGameAction({ type: 'select_class', class: myClass });
        } else if (data.type === 'game_state') {
            mpEnqueueState(data);
        } else if (data.type === 'player_joined') {
            if (Array.isArray(data.players)) {
                roomPlayers = data.players;
                updateMyPlayerSlot();
            }
            renderLobby();
            if (myClass) sendGameAction({ type: 'select_class', class: myClass });
        } else if (data.type === 'player_left') {
            showMsg('⚠️ Przeciwnik ' + data.username + ' rozłączył się!');
        } else if (data.type === 'game_action') {
            handleLobbyAction(data.payload, data.sender_player_id);
        } else if (data.type === 'error') {
            var summary = document.getElementById('lobby-summary');
            if (summary && document.getElementById('lobby-modal').style.display !== 'none') {
                summary.textContent = data.message || 'Nie udało się wykonać akcji w lobby.';
            } else {
                showMsg(data.message || 'Nie udało się wykonać akcji.');
                if (gameState) mpSyncPhase(mpLastResume, false);
            }
        }
    };

    socket.onclose = function(event) {
        if (ws !== socket) return;
        console.log('Rozłączono z serwerem gier. Kod: ' + event.code);
        ws = null;
        scheduleGameReconnect(invitationId);
    };

    socket.onerror = function(error) {
        console.error('Błąd WebSocket:', error);
    };
}

function scheduleGameReconnect(invitationId) {
    if (!isMultiplayer || wsReconnectTimer) return;
    var delay = Math.min(15000, 1000 * Math.pow(2, Math.min(wsReconnectAttempt, 4)));
    wsReconnectAttempt++;
    showMsg("⏳ Utracono połączenie z grą. Ponawiam próbę za " + Math.ceil(delay / 1000) + " s...");
    wsReconnectTimer = setTimeout(function() {
        wsReconnectTimer = null;
        connectWebSocket(invitationId);
    }, delay);
}

function sendGameAction(payload) {
    var action = Object.assign({}, payload, {
        username: myUsername || localStorage.getItem('user_username') || 'Bez nazwy'
    });

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(action));
        return true;
    }

    if (!multiplayerInvitationId) return false;
    var serialized = JSON.stringify(action);
    if (action.type !== "select_class") {
        showMsg("❌ Brak połączenia z grą. Poczekaj na ponowne połączenie i ponów akcję.");
        return false;
    }
    if (pendingGameActions.length >= 100) {
        console.error("Kolejka wiadomości gry jest pełna; wybór klasy nie został zakolejkowany.");
        return false;
    }
    pendingGameActions.push(serialized);
    if (!ws) scheduleGameReconnect(multiplayerInvitationId);
    return false;
}

function handleLobbyAction(payload, senderPlayerId) {
    if (payload.type !== "select_class") return;
    if (!Number.isInteger(senderPlayerId) || senderPlayerId < 0) return;
    var sender = roomPlayers.find(function(player) { return player.id === senderPlayerId; });
    if (!sender) return;
    playerClasses[sender.user_id] = { klass: payload.class, name: payload.username || sender.username };
    renderLobby();
}

function returnToMainPage() {
  window.location.href = '../index.html';
}

function closeChoicePopup() {
  document.body.classList.remove('confirmation-open');
  returnToMainPage();
}

function displayClassSelectionPopup() {
  console.log('displayClassSelectionPopup called');
  var overlay = document.querySelector('.overlay');
  var mainWindow = document.querySelector('.main-window');
  var classPopup = document.querySelector('.class-popup');
  console.log('Elements found:', {
    overlay: !!overlay,
    mainWindow: !!mainWindow,
    classPopup: !!classPopup
  });
  document.body.classList.add('confirmation-open');
  if (overlay) overlay.style.display = 'flex';
  if (mainWindow) mainWindow.style.display = 'none';
  if (classPopup) classPopup.style.display = 'block';
  console.log('displayClassSelectionPopup finished, classPopup display:', classPopup?.style.display);
}

function showClassSelectionPopup() {
    if (awaitingSavedSessionCheck) return;
    if (!isMultiplayer || !multiplayerInvitationId) {
        displayClassSelectionPopup();
        return;
    }

    var token = localStorage.getItem('access_token');
    fetch(API_URL + '/game-sessions/resumable?invitation_id=' + encodeURIComponent(multiplayerInvitationId), {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(response) {
        if (!response.ok) throw new Error('Nie udało się sprawdzić zapisanej gry');
        return response.json();
    })
    .then(function(data) {
        if (gameState) return;
        if (String(data.invitation_id) === String(multiplayerInvitationId)) {
            document.body.classList.remove('confirmation-open');
            showMsg('Wznawianie zapisanej gry...');
            return;
        }
        displayClassSelectionPopup();
    })
    .catch(function(error) {
        console.error('Błąd sprawdzania zapisanej gry:', error);
        if (!gameState) displayClassSelectionPopup();
    });
}

function showLobby() {
    var modal = document.getElementById('lobby-modal');
    if (modal) modal.style.display = 'flex';
    renderLobby();
    if (lobbyPollTimer) clearInterval(lobbyPollTimer);
    lobbyPollTimer = setInterval(refreshLobby, 3000);
}

function keepGameRoomInUrl(roomId) {
    var url = '/plansza/?invite_accepted=' + encodeURIComponent(roomId);
    window.history.replaceState({}, document.title, url);
}

function hideLobby() {
    var modal = document.getElementById('lobby-modal');
    if (modal) modal.style.display = 'none';
    if (lobbyPollTimer) clearInterval(lobbyPollTimer);
    lobbyPollTimer = null;
}

function refreshLobby() {
    if (!isMultiplayer || !multiplayerInvitationId || !localStorage.getItem('access_token')) return;
    fetch(API_URL + '/game-rooms/' + encodeURIComponent(multiplayerInvitationId), {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('access_token') }
    }).then(function(response) {
        if (!response.ok) throw new Error('Nie udało się odświeżyć lobby');
        return response.json();
    }).then(function(data) {
        roomPlayers = data.players || [];
        updateMyPlayerSlot();
        renderLobby(data.pending || []);
        if (isRoomHost && roomPlayers.length >= 2 && (!ws || ws.readyState === WebSocket.CLOSED)) {
            connectWebSocket(multiplayerInvitationId);
        }
    }).catch(function(error) { console.warn(error.message); });
}

function updateMyPlayerSlot() {
    if (myUserId === null) return;
    var ownPlayer = roomPlayers.find(function(player) { return player.user_id === myUserId; });
    if (ownPlayer) myPlayerId = ownPlayer.id;
}

function renderLobby(pendingPlayers) {
    var roster = document.getElementById('lobby-roster');
    var summary = document.getElementById('lobby-summary');
    var startButton = document.getElementById('lobby-start-btn');
    var inviteButton = document.getElementById('lobby-invite-btn');
    var classButton = document.getElementById('lobby-class-btn');
    if (!roster || !startButton) return;
    pendingPlayers = pendingPlayers || [];
    roster.replaceChildren();
    roomPlayers.forEach(function(player) {
        var item = document.createElement('li');
        var name = document.createElement('span');
        var status = document.createElement('span');
        var picked = playerClasses[player.user_id];
        name.textContent = (player.username || 'Gracz') + (player.user_id === (roomPlayers[0] || {}).user_id ? ' (gospodarz)' : '');
        status.textContent = picked ? 'Klasa: ' + picked.klass : 'Wybiera klasę';
        item.append(name, status);
        roster.appendChild(item);
    });
    pendingPlayers.forEach(function(player) {
        var item = document.createElement('li');
        item.textContent = player.username + ' - oczekuje';
        roster.appendChild(item);
    });
    var allClassesChosen = roomPlayers.length >= 2 && roomPlayers.every(function(player) { return !!playerClasses[player.user_id]; });
    summary.textContent = roomPlayers.length + '/4 graczy; potrzeba co najmniej 2 i wyboru klasy przez każdego.';
    startButton.style.display = isRoomHost ? '' : 'none';
    inviteButton.style.display = isRoomHost && roomPlayers.length + pendingPlayers.length < 4 ? '' : 'none';
    var mySelection = playerClasses[myUserId];
    classButton.textContent = mySelection ? 'Wybrana klasa: ' + mySelection.klass : 'Wybierz klasę';
    classButton.disabled = !!mySelection;
    startButton.disabled = !allClassesChosen;
}

function showLobbyClassPicker() {
    var lobby = document.getElementById('lobby-modal');
    if (lobby) lobby.style.display = 'none';
    displayClassSelectionPopup();
}

function showStartedGame() {
    hideLobby();
    var overlay = document.querySelector('.overlay');
    var classPopup = document.querySelector('.class-popup');
    document.body.classList.remove('confirmation-open');
    if (overlay) overlay.style.display = 'none';
    if (classPopup) classPopup.style.display = 'none';
    gameState.players.forEach(function(player, index) {
        var panel = document.getElementById('gp-p' + (index + 1));
        if (panel) panel.style.display = 'flex';
    });
    document.getElementById('dice-panel').style.display = 'flex';
    updateGamePanel();
    placeTokens();
}

document.addEventListener("DOMContentLoaded", function() {
  var urlParams = new URLSearchParams(window.location.search);
  var inviteAcceptedId = urlParams.get('invite_accepted');
    var isResume = urlParams.get('resume') === '1';
  if (inviteAcceptedId) {
        console.log('DOMContentLoaded: Invite accepted detected, inviteAcceptedId=', inviteAcceptedId);
        awaitingSavedSessionCheck = true;
        console.log('DOMContentLoaded: Set awaitingSavedSessionCheck=true, calling connectWebSocket');
    connectWebSocket(inviteAcceptedId);
    
    var choicePopup = document.querySelector('.choice-popup');
    var classPopup = document.querySelector('.class-popup');
    var overlay = document.querySelector('.overlay');
    var mainWindow = document.querySelector('.main-window');

    if (choicePopup) choicePopup.style.display = 'none';
    if (mainWindow) mainWindow.style.display = 'none';
    if (classPopup) classPopup.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    document.body.classList.remove('confirmation-open');
    if (isResume) showMsg('Wznawianie zapisanej gry...');

    window.history.replaceState({}, document.title, '/plansza/?invite_accepted=' + encodeURIComponent(inviteAcceptedId) + (isResume ? '&resume=1' : ''));
  }
  var confirmationBox = document.getElementById("confirmationBox");
  var wyborKlasy      = document.getElementById("wyborKlasy");
  var overlay         = document.querySelector('.overlay');
  var classPopup      = document.querySelector('.class-popup');
  var mainWindow      = document.querySelector('.main-window');
  var selectedClass   = null;
    var lobbyClassButton = document.getElementById('lobby-class-btn');
    var lobbyInviteButton = document.getElementById('lobby-invite-btn');
    var lobbyStartButton = document.getElementById('lobby-start-btn');
    if (lobbyClassButton) lobbyClassButton.addEventListener('click', showLobbyClassPicker);
    if (lobbyInviteButton) lobbyInviteButton.addEventListener('click', openFriendPicker);
    if (lobbyStartButton) lobbyStartButton.addEventListener('click', initMultiplayerGame);
    if (!inviteAcceptedId) document.body.classList.add('confirmation-open');

  // Krok 1a: Wybór bota
  var botBtn = document.getElementById('bot-choice-btn');
  if (botBtn) {
    botBtn.addEventListener('click', function() {
      opponentName = 'Bot';
            isBotGame = true;
            isMultiplayer = false;
            multiplayerInvitationId = null;
            hideLobby();
      showClassSelectionPopup();
    });
  }

  // Krok 1b: Wybór znajomego
  var friendBtn = document.getElementById('friend-choice-btn');
    if (friendBtn) {
        friendBtn.addEventListener('click', function() {
            isBotGame = false;
            openFriendPicker();
        });
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
            if (isBotGame) {
                document.body.classList.remove('confirmation-open');
                if (overlay) overlay.style.display = 'none';
                if (classPopup) classPopup.style.display = 'none';
                myClass = selectedClass;
                startBotGame(selectedClass);
                return;
            }
      if (isMultiplayer) {
        myClass = selectedClass;
                playerClasses[myUserId] = { klass: selectedClass, name: myUsername };
        sendGameAction({ type: "select_class", class: selectedClass });
                showMsg("Klasa wybrana. Gospodarz rozpocznie grę, gdy wszyscy będą gotowi.");
        
        var cardsWrapper = document.querySelector('.cards-wrapper');
        if (cardsWrapper) {
            cardsWrapper.innerHTML = '<div style="text-align:center; padding: 50px; font-size: 1.5rem; color:#fff; font-family:\'VT323\', monospace;">Wybrałeś: ' + selectedClass.toUpperCase() + '.<br>Czekanie na oponenta...</div>';
        }
        
        // Ukryj przyciski i strzałki sterujące w popapie, żeby uniknąć ponownego klikania
        var btns = document.querySelector('.class-popup .buttons');
        if (btns) btns.style.display = 'none';
        var ctrl = document.querySelector('.class-popup .control');
        if (ctrl) ctrl.style.display = 'none';
        
        var closeBtn = document.getElementById('class-popup-close-btn');
        if (closeBtn) closeBtn.style.display = 'none';
        
        var classPopup = document.querySelector('.class-popup');
        document.body.classList.remove('confirmation-open');
        if (overlay) overlay.style.display = 'none';
        if (classPopup) classPopup.style.display = 'none';
        var lobby = document.getElementById('lobby-modal');
        if (lobby) lobby.style.display = 'flex';
        renderLobby();
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
        awaitingSavedSessionCheck = true;
        connectWebSocket(data.room_id || pendingIncomingId);
        keepGameRoomInUrl(data.room_id || pendingIncomingId);
        pendingIncomingId = null;
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
    var inviteUrl = isRoomHost && multiplayerInvitationId
        ? API_URL + '/game-rooms/' + encodeURIComponent(multiplayerInvitationId) + '/invite'
        : API_URL + '/game-invitations/send';

    fetch(inviteUrl, {
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
        if (isRoomHost && multiplayerInvitationId) {
            showMsg('Zaproszenie wysłane do ' + username + '.');
            refreshLobby();
            return;
        }
        pendingInvitationId = data.invitation_id;
        multiplayerInvitationId = data.room_id || data.invitation_id;
        keepGameRoomInUrl(multiplayerInvitationId);
        isMultiplayer = true;
        isRoomHost = true;
        roomPlayers = [{ id: 0, username: myUsername || 'Gospodarz' }];
        awaitingSavedSessionCheck = false;
        showLobby();
        refreshLobby();
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
            awaitingSavedSessionCheck = true;
            connectWebSocket(data.room_id || pendingInvitationId);
            keepGameRoomInUrl(data.room_id || pendingInvitationId);
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
        var inv = list.find(function(i) {
            return i.game_type === 'wielka-studencka-batalla' && i.id === i.room_id;
        }) || list.find(function(i) { return i.game_type === 'wielka-studencka-batalla'; });
        if (!inv) return;
        pendingInvitationId = inv.id;
        multiplayerInvitationId = inv.room_id || inv.id;
        isMultiplayer = true;
        isRoomHost = true;
        roomPlayers = [{ id: 0, username: myUsername || 'Gospodarz' }];
        showLobby();
        refreshLobby();
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
var _prevStats = [null, null, null, null];
var startModalCallback = null;
var quizContext = null;

function initMultiplayerGame() {
    if (gameState || !isRoomHost || roomPlayers.length < 2 || roomPlayers.length > 4 ||
        roomPlayers.some(function(player) { return !playerClasses[player.user_id]; })) return;
    sendGameAction({ type: "game_init" });
    showMsg('Uruchamianie gry...');
}

function initGame(playerClass) {
    startBotGame(playerClass);
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

function animatePlayerMovement(player, path, onComplete) {
    var playerIndex = gameState.players.indexOf(player);
    var isCurrentUser = isMultiplayer ? player.id === myPlayerId : player.id === 0;
    var token = document.querySelector('.player-token-' + (playerIndex + 1));
    if (!token || path.length === 0) {
        onComplete();
        return;
    }
    var boardMap = token.closest('.board-map');
    var stepDuration = 250;
    isPlayerMoving = true;

    var proxy = token.cloneNode(true);
    var tokenRect = token.getBoundingClientRect();
    proxy.classList.remove('player-token-current');
    proxy.style.position = 'fixed';
    proxy.style.left = tokenRect.left + 'px';
    proxy.style.top = tokenRect.top + 'px';
    proxy.style.right = 'auto';
    proxy.style.bottom = 'auto';
    proxy.style.width = tokenRect.width + 'px';
    proxy.style.height = tokenRect.height + 'px';
    proxy.style.margin = '0';
    proxy.style.zIndex = '6000';
    document.body.appendChild(proxy);
    token.style.visibility = 'hidden';

    function animateStep(stepIndex) {
        if (stepIndex >= path.length) {
            proxy.remove();
            token.style.visibility = '';
            isPlayerMoving = false;
            onComplete();
            return;
        }

        var nextCell = document.querySelector('.c' + path[stepIndex]);
        if (!nextCell) {
            proxy.remove();
            token.style.visibility = '';
            isPlayerMoving = false;
            onComplete();
            return;
        }

        nextCell.appendChild(token);
        var targetRect = token.getBoundingClientRect();
        var cameraDeltaX = 0;
        var cameraDeltaY = 0;

        if (isCurrentUser && boardZoom > 1 && boardMap) {
            cameraDeltaX = window.innerWidth / 2 - (targetRect.left + targetRect.width / 2);
            cameraDeltaY = window.innerHeight / 2 - (targetRect.top + targetRect.height / 2);
            var currentTransform = new DOMMatrix(getComputedStyle(boardMap).transform);
            boardCameraX = currentTransform.m41 + cameraDeltaX;
            boardCameraY = currentTransform.m42 + cameraDeltaY;
            boardMap.style.transitionDuration = stepDuration + 'ms';
            boardMap.style.transitionTimingFunction = 'ease-in-out';
            updateBoardCamera(boardMap);
        }
        var targetLeft = targetRect.left + cameraDeltaX;
        var targetTop = targetRect.top + cameraDeltaY;

        if (typeof proxy.animate !== 'function') {
            proxy.remove();
            token.style.visibility = '';
            isPlayerMoving = false;
            onComplete();
            return;
        }

        var animation = proxy.animate([
            {
                left: proxy.style.left,
                top: proxy.style.top,
                width: proxy.style.width,
                height: proxy.style.height
            },
            {
                left: targetLeft + 'px',
                top: targetTop + 'px',
                width: targetRect.width + 'px',
                height: targetRect.height + 'px'
            }
        ], {
            duration: stepDuration,
            easing: 'ease-in-out'
        });

        var animationCompleted = false;
        var animationWatchdog = setTimeout(finishAnimationStep, stepDuration + 500);

        function finishAnimationStep() {
            if (animationCompleted) return;
            animationCompleted = true;
            clearTimeout(animationWatchdog);
            proxy.style.left = targetLeft + 'px';
            proxy.style.top = targetTop + 'px';
            proxy.style.width = targetRect.width + 'px';
            proxy.style.height = targetRect.height + 'px';
            animation.cancel();
            if (stepIndex === path.length - 1 && boardMap) {
                boardMap.style.removeProperty('transition-duration');
                boardMap.style.removeProperty('transition-timing-function');
            }
            animateStep(stepIndex + 1);
        }

        animation.onfinish = finishAnimationStep;
    }

    animateStep(0);
}

function executeRoll(val) {
    var player = gameState.players[gameState.turn];
    document.getElementById('dice-num').textContent = val;
    document.getElementById('dice-btn').disabled = true;
    gameState.rolled = true;

    // Movement sequence checking for passing start
    var currentFloor = getFloor(player.pos);
    var passedStartCount = 0;
    var movementPath = [];
    
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
        movementPath.push(nextPos);
    }

    animatePlayerMovement(player, movementPath, function() {
        player.pos = currentPos;
        placeTokens();
        updateGamePanel();

        function arriveOnField() {
            if (getFloor(player.pos) !== currentFloor) player.boughtCrystalThisFloor = false;
            gamePhase = "awaiting_field_resolution";
            triggerFieldArrival(player);
        }
        if (passedStartCount > 0) {
            handlePassStart(player, arriveOnField);
        } else {
            arriveOnField();
        }
    });
}

function rollDice() {
    if (!gameState || gameState.rolled || gameState.gameOver) return;
    if (isBotGame) {
        document.getElementById('dice-btn').disabled = true;
        mpSend({ type: "roll" });
        return;
    }
    if (isMultiplayer) {
        if (gameState.turn !== myPlayerId) return;
        document.getElementById('dice-btn').disabled = true;
        mpSend({ type: "roll" });
        return;
    }
    var player = gameState.players[gameState.turn];
    
    // Check if player is currently in practice or piwnica skip status
    if (player.skipTurnsLeft > 0) {
        player.skipTurnsLeft--;
        showMsg('⏳ ' + player.name + ' odbywa praktyki/przerwę! Pozostało tur do opuszczenia: ' + player.skipTurnsLeft);
        gameState.rolled = true;
        gamePhase = "turn_resolution";
        updateGamePanel();
        scheduleNextTurn(1800);
        return;
    }
    
    var val = Math.floor(Math.random() * 6) + 1;
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

function claimStartBonus(type) {
    if (isBotGame) {
        document.getElementById('start-modal').style.display = 'none';
        mpSend({ type: "claim_bonus", bonus: type });
        return;
    }
    if (isMultiplayer) {
        document.getElementById('start-modal').style.display = 'none';
        mpSend({ type: "claim_bonus", bonus: type });
        return;
    }
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
    
    if (startModalCallback) {
        var cb = startModalCallback;
        startModalCallback = null;
        cb();
    }
}

function executeChanceCard(cardIndex) {
    var player = gameState.players[gameState.turn];
    var card = SZANSA_KARTY[cardIndex];
    var result = card(player);
    showMsg(result.msg);
    updateGamePanel();
    
    if (player.hp <= 0) {
        var winner = gameState.players[(gameState.turn + 1) % gameState.players.length];
        showMsg('💀 ' + player.name + ' stracił wszystkie HP! Wygrywa ' + winner.name + '!');
        gameState.gameOver = true;
        document.getElementById('dice-btn').disabled = true;
        return;
    }
    scheduleNextTurn(2000);
}

function triggerFieldArrival(player) {
    gamePhase = "resolving_field";
    var type = getCellType(player.pos);
    
    if (type === 'sala') {
        triggerQuiz(player, 1);
    } else if (type === 'aula') {
        triggerQuiz(player, 2);
    } else if (type === 'dziekanat') {
        triggerDziekanat(player);
    } else if (type === 'lazienka') {
        showMsg("🚽 " + player.name + " w łazience: Pusta kabina! Chwila oddechu, nic się nie dzieje.");
        scheduleNextTurn(1500);
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
        scheduleNextTurn(2200);
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
            } else {
                if (player.coins >= 2 && player.crystals < 15) {
                    player.coins -= 2;
                    player.crystals += 1;
                    showMsg("🤖 " + player.name + " wymienił 2 monety na 1 Kryształek w bibliotece!");
                }
            }
        } else {
            showMsg("📖 " + player.name + " w bibliotece: Otrzymuje +1 mądrości 🧠 oraz darmową podpowiedź 💡!");
        }
        updateGamePanel();
        scheduleNextTurn(2000);
    } else if (type === 'strefarelaksu') {
        player.luck += 1;
        showMsg("⭐ " + player.name + " w strefie relaksu: Odpoczynek pomaga w nauce! +1 szczęścia!");
        updateGamePanel();
        scheduleNextTurn(1500);
    } else if (type === 'stolowka') {
        var floor = getFloor(player.pos);
        if (floor === 1) {
            showMsg("🥪 Stołówka na parterze jest zamknięta! Brak bonusów.");
        } else {
            player.hp += 1;
            showMsg("🥪 " + player.name + " w stołówce: Pożywny obiad regeneruje zdrowie! +1 HP! ♥");
        }
        updateGamePanel();
        scheduleNextTurn(1500);
    } else if (type === 'piwnica') {
        player.skipTurnsLeft = 1;
        showMsg("🚬 " + player.name + " w piwnicy (przerwa na dworze): Tracisz 1 kolejkę!");
        updateGamePanel();
        scheduleNextTurn(1500);
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
        scheduleNextTurn(2000);
    } else if (type === 'szansa') {
        var cardIndex = Math.floor(Math.random() * SZANSA_KARTY.length);
        executeChanceCard(cardIndex);
    } else {
        showMsg(player.name + ' stoi na bezpiecznym polu.');
        scheduleNextTurn(1500);
    }
}

function triggerQuiz() {
    console.error('Quiz rozstrzyga serwer.');
}

function renderQuizModal(q, number, total, hiddenAnswers, player, onAnswer) {
    document.getElementById('quiz-question-text').innerHTML = 
        `<strong>Pytanie ${number} z ${total}:</strong><br><br>${q.q}`;
    
    var answersContainer = document.getElementById('quiz-answers-container');
    answersContainer.innerHTML = '';
    
    q.a.forEach(function(ans, index) {
        var btn = document.createElement('button');
        btn.className = 'custom-modal-btn';
        btn.innerHTML = `<span style="color:#00d2d3; font-weight:bold; margin-right:8px;">${String.fromCharCode(65 + index)}:</span> ${ans}`;
        btn.onclick = function() { onAnswer(index); };
        answersContainer.appendChild(btn);
    });
    (hiddenAnswers || []).forEach(function(index) {
        var hiddenButton = answersContainer.children[index];
        if (hiddenButton) {
            hiddenButton.style.opacity = '0.3';
            hiddenButton.style.pointerEvents = 'none';
        }
    });
    
    var hintBtn = document.getElementById('quiz-hint-btn');
    var alreadyHinted = !!(hiddenAnswers && hiddenAnswers.length);
    if (!alreadyHinted && (player.hints > 0 || player.coins >= 1)) {
        hintBtn.style.display = 'block';
        if (player.hints > 0) {
            hintBtn.innerHTML = `💡 Użyj darmowej podpowiedzi (Dostępne: ${player.hints})`;
        } else {
            hintBtn.innerHTML = `🪙 Kup podpowiedź 50/50 (Koszt: 1 moneta)`;
        }
    } else {
        hintBtn.style.display = 'none';
    }
    
    document.getElementById('quiz-modal').style.display = 'flex';
}

function useQuiz1Hint() {
    if (isBotGame) {
        mpSend({ type: "use_hint" });
        return;
    }
    if (isMultiplayer) {
        mpSend({ type: "use_hint" });
        return;
    }
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
    quizContext.hiddenAnswers = toHide;
    
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

function openDziekanatModal(player) {
    var obronaBtn = document.getElementById('dk-btn-obrona');
    obronaBtn.style.display = getFloor(player.pos) === 1 && player.crystals >= 15 ? 'block' : 'none';

    document.getElementById('dk-btn-prepay').disabled = player.coins < 1 || player.tempCzesnePaid;
    document.getElementById('dk-btn-hp').disabled = player.coins < 2;
    document.getElementById('dk-btn-crystal').disabled = player.coins < 3 || player.boughtCrystalThisFloor;
    document.getElementById('dk-btn-shorten').disabled = player.coins < 2 || player.hasShortenCard;

    document.getElementById('dziekanat-modal').style.display = 'flex';
}

function triggerDziekanat(player) {
    if (player.id === 0) openDziekanatModal(player);
}

function closeDziekanatModal() {
    document.getElementById('dziekanat-modal').style.display = 'none';
    if (isBotGame || isMultiplayer) {
        mpSend({ type: "dziekanat", choice: "leave" });
    } else {
        scheduleNextTurn(500);
    }
}

function applyDziekanat(action) {
    if (isBotGame || isMultiplayer) {
        document.getElementById('dziekanat-modal').style.display = 'none';
        mpSend({ type: "dziekanat", choice: action });
        return;
    }
}

function triggerVictory(winner) {
    gameState.gameOver = true;
    gameState.rolled = true;
    document.getElementById('dice-btn').disabled = true;
    
    winner.pos = 'k25';
    gamePhase = "finished";
    placeTokens();
    
    var degreeText = winner.degree || (winner.klass === 'madrala' ? "INŻYNIER" : "LICENCJAT");
    
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

function scheduleNextTurn(delay) {
    if (!gameState) return;
    var scheduledTurnNumber = Number.isInteger(gameState.turnNumber) ? gameState.turnNumber : 0;
    setTimeout(function() { nextTurn(scheduledTurnNumber); }, delay);
}

function nextTurn(expectedTurnNumber) {
    if (gameState.gameOver) return;
    var currentTurnNumber = Number.isInteger(gameState.turnNumber) ? gameState.turnNumber : 0;
    if (expectedTurnNumber !== undefined && expectedTurnNumber !== currentTurnNumber) return;
    gameState.turn   = (gameState.turn + 1) % gameState.players.length;
    gameState.turnNumber = currentTurnNumber + 1;
    gameState.rolled = false;
    gamePhase = "awaiting_roll";
    updateGamePanel();
    var current = gameState.players[gameState.turn];
    
    if (current.id === 1) {
        showMsg('Tura ' + current.name + '...');
        setTimeout(rollDice, 1200);
    } else {
        document.getElementById('dice-btn').disabled = false;
        showMsg('Twoja tura – rzuć kostką!');
    }
}

var boardZoom = 1;
var boardCameraX = 0;
var boardCameraY = 0;
var isPlayerMoving = false;

function getMinBoardZoom(board, boardMap) {
    var frameWidth = board.offsetWidth - boardMap.offsetWidth;
    var frameHeight = board.offsetHeight - boardMap.offsetHeight;
    var availableWidth = Math.max(1, window.innerWidth - frameWidth - 32);
    var availableHeight = Math.max(1, window.innerHeight - frameHeight - 32);
    return Math.min(1, availableWidth / boardMap.offsetWidth, availableHeight / boardMap.offsetHeight);
}

function updateBoardCamera(boardMap) {
    if (boardZoom === 1 && boardCameraX === 0 && boardCameraY === 0) {
        boardMap.style.removeProperty('transform');
        return;
    }
    boardMap.style.transform = 'translate(' + boardCameraX + 'px, ' + boardCameraY + 'px) scale(' + boardZoom + ')';
}

function getBoardTransformOrigin(boardMap) {
    var values = getComputedStyle(boardMap).transformOrigin.split(' ');
    return { x: parseFloat(values[0]), y: parseFloat(values[1]) };
}

function initializeBoardZoom() {
    var board = document.querySelector('.board');
    var boardMap = board && board.querySelector('.board-map');
    if (!board || !boardMap) return;

    board.addEventListener('wheel', function(event) {
        if (isPlayerMoving) {
            event.preventDefault();
            return;
        }
        if (!board.querySelector('.player-token-current')) return;
        if (event.target.closest('.overlay, .class-popup, .confirmation-overlay, .custom-modal, .fp-modal, .wait-modal, .diploma-content')) return;

        event.preventDefault();

        var minZoom = getMinBoardZoom(board, boardMap);
        var nextZoom = Math.max(minZoom, Math.min(3, boardZoom * Math.exp(-event.deltaY * 0.001)));
        if (nextZoom === boardZoom) return;

        if (nextZoom <= minZoom) {
            boardZoom = minZoom;
            boardCameraX = 0;
            boardCameraY = 0;
        } else if (nextZoom <= 1) {
            boardZoom = nextZoom;
            boardCameraX = 0;
            boardCameraY = 0;
        } else {
            var token = board.querySelector('.player-token-current');
            if (token) {
                var tokenRect = token.getBoundingClientRect();
                var mapRect = boardMap.getBoundingClientRect();
                var currentTransform = new DOMMatrix(getComputedStyle(boardMap).transform);
                var transformOrigin = getBoardTransformOrigin(boardMap);
                var viewportCenterX = window.innerWidth / 2;
                var viewportCenterY = window.innerHeight / 2;
                var tokenOffsetX = (tokenRect.left + tokenRect.width / 2 - mapRect.left) / currentTransform.a;
                var tokenOffsetY = (tokenRect.top + tokenRect.height / 2 - mapRect.top) / currentTransform.d;
                var mapOriginX = mapRect.left - currentTransform.m41 - (1 - currentTransform.a) * transformOrigin.x;
                var mapOriginY = mapRect.top - currentTransform.m42 - (1 - currentTransform.d) * transformOrigin.y;

                boardZoom = nextZoom;
                boardCameraX = viewportCenterX - mapOriginX - tokenOffsetX * boardZoom - (1 - boardZoom) * transformOrigin.x;
                boardCameraY = viewportCenterY - mapOriginY - tokenOffsetY * boardZoom - (1 - boardZoom) * transformOrigin.y;
            } else {
                boardZoom = nextZoom;
            }
        }

        updateBoardCamera(boardMap);
    }, { passive: false });

    window.addEventListener('resize', function() {
        if (boardZoom === 1 && boardCameraX === 0 && boardCameraY === 0) return;
        var minZoom = getMinBoardZoom(board, boardMap);
        if (boardZoom <= minZoom) {
            boardZoom = minZoom;
            boardCameraX = 0;
            boardCameraY = 0;
        }
        updateBoardCamera(boardMap);
    });
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

        var isCurrentUser = isMultiplayer ? p.id === myPlayerId : p.id === 0;
        if (isCurrentUser) token.classList.add('player-token-current');
        var avatarState = p.avatar || (isCurrentUser ? currentUserAvatar : null);
        if (avatarState) {
            renderAvatarLayers(token, avatarState);
        } else if (!isMultiplayer && p.id === 1) {
            var img = document.createElement('img');
            img.src = 'img/komputer.png';
            img.alt = p.name || 'Komputer';
            img.title = p.name || 'Komputer';
            token.appendChild(img);
        }

        cell.appendChild(token);
    });
}

function updateGamePanel() {
    if (!gameState) return;
    var diceButton = document.getElementById('dice-btn');
    if (diceButton) {
        diceButton.disabled = gameState.gameOver || gameState.rolled ||
            (isMultiplayer ? gameState.turn !== myPlayerId : gameState.turn !== 0);
    }

    gameState.players.forEach(function(player, index) {
        var panel = document.getElementById('gp-p' + (index + 1));
        if (panel) panel.style.display = 'flex';
        var badge = document.querySelector('#gp-p' + (index + 1) + ' .pp-dot');
        var isCurrentUser = isMultiplayer ? player.id === myPlayerId : player.id === 0;
        if (!badge) return;

        var avatarState = player.avatar || (isCurrentUser ? currentUserAvatar : null);
        if (avatarState) {
            if (!badge.classList.contains('avatar-container')) {
                renderAvatarLayers(badge, avatarState);
            } else {
                renderAvatar(avatarState, badge);
            }
            badge.style.background = 'transparent';
        } else {
            badge.classList.remove('avatar-container');
            badge.replaceChildren();
            badge.style.background = isMultiplayer
                ? ['#e74c3c', '#4488d6', '#31a36b', '#e5ac28'][index]
                : '';
        }
        renderStatBar('gp-p' + (index + 1) + '-stat', player, _prevStats[index]);
        document.getElementById('gp-p' + (index + 1) + '-name').textContent = player.name + ' [' + player.klass + ']';
        if (panel) panel.classList.toggle('gp-active', gameState.turn === index && !gameState.gameOver);
        _prevStats[index] = { hp: player.hp, wisdom: player.wisdom, luck: player.luck, crystals: player.crystals, coins: player.coins };
    });
    for (var index = gameState.players.length; index < 4; index++) {
        var unusedPanel = document.getElementById('gp-p' + (index + 1));
        if (unusedPanel) unusedPanel.style.display = 'none';
    }
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

initializeBoardZoom();