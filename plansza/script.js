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

document.addEventListener("DOMContentLoaded", function() {
  var confirmationBox = document.getElementById("confirmationBox");
  var wyborKlasy      = document.getElementById("wyborKlasy");
  var overlay         = document.querySelector('.overlay');
  var choicePopup     = document.querySelector('.choice-popup');
  var classPopup      = document.querySelector('.class-popup');
  var selectedClass   = null;

  // Krok 1a: Wybór bota
  var botBtn = document.getElementById('bot-choice-btn');
  if (botBtn) {
    botBtn.addEventListener('click', function() {
      opponentName = 'Bot';
      if (choicePopup) choicePopup.style.display = 'none';
      if (classPopup)  classPopup.style.display  = 'block';
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
      if (confirmationBox) confirmationBox.style.display = 'flex';
    });
  });

  // Krok 3: Potwierdzenie
  var confirmNo  = document.getElementById('confirmNo');
  var confirmYes = document.getElementById('confirmYes');
  if (confirmNo) {
    confirmNo.addEventListener('click', function() {
      if (confirmationBox) confirmationBox.style.display = 'none';
    });
  }
  if (confirmYes) {
    confirmYes.addEventListener('click', function() {
      if (confirmationBox) confirmationBox.style.display = 'none';
      if (overlay)         overlay.style.display         = 'none';
      if (selectedClass)   initGame(selectedClass);
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
        // Pokaż wybór klasy
        if (overlay)     overlay.style.display     = 'flex';
        if (choicePopup) choicePopup.style.display = 'none';
        if (classPopup)  classPopup.style.display  = 'block';
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
            document.querySelector('.choice-popup').style.display = 'none';
            document.querySelector('.class-popup').style.display  = 'block';
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
        if (inv) {
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
// SILNIK GRY
// ==========================================

function getCellType(pos) {
    var el = document.querySelector('.c' + pos);
    if (!el) return 'sala';
    var types = ['start','sala','lazienka','aula','dziekanat','praktyki','szansa','biblioteka','strefarelaksu'];
    for (var i = 0; i < types.length; i++) {
        if (el.classList.contains(types[i])) return types[i];
    }
    return 'sala';
}

var SZANSA_KARTY = [
    function(n) { return { msg: n + ': "Stypendium naukowe!" → +1 HP',                 hp: 1 }; },
    function(n) { return { msg: n + ': "Oblałeś kolokwium!" → -1 HP',                  hp: -1 }; },
    function(n) { return { msg: n + ': "Prowadzący odwołał zajęcia!" → +1 szczęście', luck: 1 }; },
    function(n) { return { msg: n + ': "Niespodziewana kartkówka!" → -2 wiedzy',         wisdom: -2 }; },
    function(n) { return { msg: n + ': "Znalazłeś notatki kolegi!" → +2 wiedzy',         wisdom: 2 }; },
    function(n) { return { msg: n + ': "Energy drink zawiódł!" → cofasz się 3 pola',     move: -3 }; },
    function(n) { return { msg: n + ': "Kolega z roku pomógł!" → naprzód 2 pola',       move: 2 }; },
    function(n) { return { msg: n + ': "Konkurs wiedzy!" → +1 HP, +1 mądrość',          hp: 1, wisdom: 1 }; },
];

var EFEKTY = {
    start:         function(n) { return { msg: n + ' mija Start → +1 HP!', hp: 1 }; },
    sala:          function(n) { return { msg: n + ' jest na sali. Nic szczególnego.' }; },
    lazienka:      function(n) { return { msg: n + ' w łazience → traci następną turę!', skip: true }; },
    aula:          function(n) { return { msg: n + ' w auli → +1 mądrość!', wisdom: 1 }; },
    dziekanat:     function(n) { return { msg: n + ' w dziekanacie → -1 HP!', hp: -1 }; },
    praktyki:      function(n) { return { msg: n + ' na praktykach → +2 mądrości!', wisdom: 2 }; },
    szansa:        function(n) { return SZANSA_KARTY[Math.floor(Math.random() * SZANSA_KARTY.length)](n); },
    biblioteka:    function(n) { return { msg: n + ' w bibliotece → +1 mądrość, +1 szczęście!', wisdom: 1, luck: 1 }; },
    strefarelaksu: function(n) { return { msg: n + ' w strefie relaksu → +1 HP!', hp: 1 }; },
};

var STATYSTYKI = {
    sportowiec: { hp: 5, luck: 2, wisdom: 3 },
    leniuch:    { hp: 3, luck: 5, wisdom: 2 },
    madrala:    { hp: 3, luck: 2, wisdom: 5 },
};

var gameState = null;
var _prevStats = [null, null];  // śledzi poprzednie wartości statystyk

function initGame(playerClass) {
    var botKlasy = Object.keys(STATYSTYKI);
    var botKlasa = botKlasy[Math.floor(Math.random() * botKlasy.length)];
    var ps = STATYSTYKI[playerClass];
    var bs = STATYSTYKI[botKlasa];
    gameState = {
        players: [
            { id: 0, name: 'Gracz',      pos: 0, klass: playerClass, skip: false, hp: ps.hp, luck: ps.luck, wisdom: ps.wisdom },
            { id: 1, name: opponentName, pos: 0, klass: botKlasa,    skip: false, hp: bs.hp, luck: bs.luck, wisdom: bs.wisdom },
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
    showMsg('Gra rozpoczęta! Twoja tura – rzuć kostką!');
}

function rollDice() {
    if (!gameState || gameState.rolled || gameState.gameOver) return;
    var player = gameState.players[gameState.turn];
    if (player.skip) {
        player.skip = false;
        showMsg(player.name + ' traci turę przez łazienkę!');
        gameState.rolled = true;
        setTimeout(nextTurn, 1500);
        return;
    }
    var val = Math.floor(Math.random() * 6) + 1;
    document.getElementById('dice-num').textContent = val;
    document.getElementById('dice-btn').disabled = true;
    gameState.rolled = true;
    player.pos = (player.pos + val) % 50;
    placeTokens();
    var type  = getCellType(player.pos);
    var efekt = (EFEKTY[type] || EFEKTY.sala)(player.name);
    if (efekt.hp)     player.hp     = Math.max(0, player.hp     + efekt.hp);
    if (efekt.wisdom) player.wisdom = Math.max(0, player.wisdom + efekt.wisdom);
    if (efekt.luck)   player.luck   = Math.max(0, player.luck   + efekt.luck);
    if (efekt.skip)   player.skip   = true;
    if (efekt.move)  { player.pos = ((player.pos + efekt.move) % 50 + 50) % 50; placeTokens(); }
    showMsg(efekt.msg);
    updateGamePanel();
    if (player.hp <= 0) {
        var winner = gameState.players[(gameState.turn + 1) % 2];
        showMsg('💀 ' + player.name + ' stracił wszystkie HP! Wygrywa ' + winner.name + '!');
        gameState.gameOver = true;
        document.getElementById('dice-btn').disabled = true;
        return;
    }
    setTimeout(nextTurn, 2000);
}

function nextTurn() {
    gameState.turn   = (gameState.turn + 1) % 2;
    gameState.rolled = false;
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

function placeTokens() {
    document.querySelectorAll('.player-token').forEach(function(t) { t.remove(); });
    if (!gameState) return;
    gameState.players.forEach(function(p, i) {
        var cell = document.querySelector('.c' + p.pos);
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

    _prevStats[0] = { hp: p1.hp, wisdom: p1.wisdom, luck: p1.luck };
    _prevStats[1] = { hp: p2.hp, wisdom: p2.wisdom, luck: p2.luck };
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

    var hpDelta  = (prev && prev.hp      !== player.hp)     ? getDelta(prev.hp,      player.hp)      : '';
    var wisDelta = (prev && prev.wisdom  !== player.wisdom) ? getDelta(prev.wisdom,  player.wisdom)  : '';
    var lukDelta = (prev && prev.luck    !== player.luck)   ? getDelta(prev.luck,    player.luck)    : '';

    el.innerHTML =
        '<span class="s-hp'  + hpFlash  + '">' + hearts              + hpDelta  + '</span>' +
        '<span class="s-wis' + wisFlash + '">' + '🧠 ' + player.wisdom + wisDelta + '</span>' +
        '<span class="s-luk' + lukFlash + '">' + '⭐ '  + player.luck   + lukDelta + '</span>';
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