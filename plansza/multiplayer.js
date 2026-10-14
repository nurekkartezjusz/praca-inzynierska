// ==========================================
// TRYB WIELOOSOBOWY - serwer jest autorytatywny
// Klient wyświetla stan i zdarzenia z serwera oraz wysyła tylko intencje gracza.
// ==========================================

var mpStateQueue = [];
var mpProcessing = false;
var mpEndTurnTimer = null;
var mpLastResume = {};
var botSocket = null;

var MP_AUTO_ROLL_DELAY = 1200;
var MP_RESOLVE_FIELD_DELAY = 400;
var MP_END_TURN_DELAY = 1800;

function mpSend(action) {
    if (isBotGame) {
        if (!botSocket || botSocket.readyState !== WebSocket.OPEN) {
            showMsg('❌ Brak połączenia z grą. Odśwież stronę, aby rozpocząć nową grę.');
            return false;
        }
        botSocket.send(JSON.stringify(action));
        return true;
    }
    return sendGameAction(action);
}

function startBotGame(playerClass) {
    var token = localStorage.getItem('access_token');
    if (token && isTokenExpired(token)) {
        alert('Zaloguj się ponownie, aby zagrać.');
        window.location.href = '../logowanie/index.html';
        return;
    }
    isBotGame = true;
    isMultiplayer = false;
    myPlayerId = 0;
    gameState = null;
    gameSessionVersion = 0;
    mpStateQueue = [];
    mpProcessing = false;

    var protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    var tokenQuery = token ? '?token=' + encodeURIComponent(token) : '';
    var socket = new WebSocket(protocol + '://' + window.location.host + '/api/ws/bot' + tokenQuery);
    botSocket = socket;
    socket.onopen = function() {
        if (botSocket !== socket) return;
        socket.send(JSON.stringify({
            type: 'bot_init',
            class: playerClass,
            username: myUsername || 'Gracz'
        }));
    };
    socket.onmessage = function(event) {
        if (botSocket !== socket) return;
        var message = JSON.parse(event.data);
        if (message.type === 'game_state') {
            mpEnqueueState(message);
        } else if (message.type === 'error') {
            showMsg(message.message || 'Nie udało się wykonać akcji.');
            if (gameState) mpSyncPhase(mpLastResume, false);
        }
    };
    socket.onclose = function() {
        if (botSocket !== socket) return;
        botSocket = null;
        if (isBotGame) showMsg('Połączenie z grą zostało przerwane. Odśwież stronę, aby rozpocząć nową grę.');
    };
    socket.onerror = function(error) {
        console.error('Błąd WebSocket gry z botem:', error);
    };
}

// Stany z serwera są przetwarzane po kolei, żeby animacje nie nakładały się na siebie.
function mpEnqueueState(msg) {
    mpStateQueue.push(msg);
    mpProcessQueue();
}

function mpProcessQueue() {
    if (mpProcessing || !mpStateQueue.length) return;
    var msg = mpStateQueue.shift();
    if (gameState && msg.version <= gameSessionVersion) {
        mpProcessQueue();
        return;
    }
    mpProcessing = true;
    mpPlayEvents(gameState ? (msg.events || []) : [], msg, function() {
        try {
            mpApplyState(msg);
        } finally {
            mpProcessing = false;
        }
        mpProcessQueue();
    });
}

function mpPlayEvents(events, msg, done) {
    var index = 0;
    function next() {
        if (index >= events.length) {
            done();
            return;
        }
        var ev = events[index++];
        try {
            mpPlayEvent(ev, msg.state, next);
        } catch (error) {
            console.error('Błąd odtwarzania zdarzenia', ev, error);
            next();
        }
    }
    next();
}

function mpPlayEvent(ev, finalState, next) {
    var player = finalState.players[ev.player_id];
    var name = player ? player.name : 'Gracz';
    var isMine = ev.player_id === myPlayerId;

    if (ev.type === 'roll') {
        document.getElementById('dice-num').textContent = ev.value;
        showMsg('🎲 ' + name + ' wyrzucił/a ' + ev.value + '.');
        next();
    } else if (ev.type === 'moved') {
        animatePlayerMovement(gameState.players[ev.player_id], ev.path, next);
    } else if (ev.type === 'answer_result') {
        var buttons = document.getElementById('quiz-answers-container').children;
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].style.pointerEvents = 'none';
            if (i === ev.correct_index) {
                buttons[i].style.background = '#2ed573';
                buttons[i].style.borderColor = '#2ed573';
            } else if (i === ev.selected) {
                buttons[i].style.background = '#ff4757';
                buttons[i].style.borderColor = '#ff4757';
            }
        }
        if (isMine) {
            showMsg(ev.correct ? '🎉 Poprawna odpowiedź!' : '❌ Błędna odpowiedź!');
        } else {
            showMsg(name + (ev.correct ? ' odpowiedział/a poprawnie.' : ' odpowiedział/a błędnie.'));
        }
        setTimeout(next, 1200);
    } else {
        if (ev.type === 'quiz_finished') document.getElementById('quiz-modal').style.display = 'none';
        var line = mpDescribeEvent(ev, name, player, finalState);
        if (line) {
            showMsg(line[0]);
            setTimeout(next, line[1]);
        } else {
            next();
        }
    }
}

// Zwraca [tekst, opóźnienie w ms] albo null, gdy zdarzenie nie wymaga komunikatu.
function mpDescribeEvent(ev, name, player, finalState) {
    switch (ev.type) {
        case 'turn_skipped':
            return ['⏳ ' + name + ' opuszcza turę. Pozostało tur do opuszczenia: ' + ev.turns_left, 1500];
        case 'tuition_paid':
            return [ev.prepaid
                ? '🎫 ' + name + ' mija Start! Czesne opłacone z góry!'
                : '🪙 ' + name + ' mija Start i płaci czesne: ' + ev.amount, 1000];
        case 'crystal_lost':
            return ['⚠️ Brak monet na czesne (' + ev.tuition + ')! ' + name + ' traci 1 kryształek!', 1500];
        case 'relegated':
            return ['📉 ' + name + ' ma 0 kryształków! Zostaje cofnięty/a na pole ' + ev.pos + '.', 1500];
        case 'bonus_claimed':
            return ['🎉 ' + name + ' wybrał/a bonus semestralny: ' +
                { coin: '+1 moneta', hp: '+1 HP', luck: '+1 szczęścia' }[ev.bonus], 1000];
        case 'field':
            return mpDescribeField(ev.cell, name, player);
        case 'chance_card':
                    return [ev.message, 1800];
        case 'library_exchange':
            return [ev.accepted
                ? '📖 Wymiana w bibliotece: -2 monety → +1 Kryształek!'
                : '📖 ' + name + ' odmawia wymiany w bibliotece.', 1500];
        case 'hint_used':
            return ['💡 Użyto podpowiedzi! Ukryto 2 błędne odpowiedzi.', 0];
        case 'quiz_finished':
            return ['🏁 Quiz zakończony: ' + ev.score + '/' + ev.total + '. Nagroda: +' + ev.crystals +
                ' 💎, +' + ev.coins + ' 🪙', 1500];
        case 'dziekanat':
            return [mpDescribeDziekanat(ev.choice, name), 1200];
        default:
            return null;
    }
}

function mpDescribeField(cell, name, player) {
    var floor = getFloor(player.pos);
    switch (cell) {
        case 'lazienka':
            return ['🚽 ' + name + ' w łazience: Pusta kabina! Chwila oddechu, nic się nie dzieje.', 1200];
        case 'praktyki':
            return ['📋 ' + name + ' realizuje praktyki! Tracisz tury: ' + player.skipTurnsLeft +
                ' i otrzymujesz +1 kryształek! 💎', 1500];
        case 'biblioteka':
            return ['📖 ' + name + ' w bibliotece: +1 mądrości 🧠 oraz darmowa podpowiedź 💡!', 1200];
        case 'strefarelaksu':
            return ['⭐ ' + name + ' w strefie relaksu: Odpoczynek pomaga w nauce! +1 szczęścia!', 1200];
        case 'stolowka':
            return [floor === 1
                ? '🥪 Stołówka na parterze jest zamknięta! Brak bonusów.'
                : '🥪 ' + name + ' w stołówce: Pożywny obiad regeneruje zdrowie! +1 HP! ♥', 1200];
        case 'piwnica':
            return ['🚬 ' + name + ' w piwnicy (przerwa na dworze): Tracisz 1 kolejkę!', 1200];
        case 'automaty':
            return ['🥤 ' + name + ' na polu automatów.', 1200];
        case 'start':
            return [name + ' stoi na bezpiecznym polu.', 1000];
        default:
            return null;
    }
}

function mpDescribeDziekanat(choice, name) {
    var texts = {
        prepay: '🎫 Zapłacono czesne z góry! Przy najbliższym minięciu startu nie tracisz monet.',
        buy_hp: '♥ Dziekanat: Dokonano zakupu regeneracji sił (+1 HP)!',
        buy_crystal: '💎 Dziekanat: Zakupiono 1 Kryształek za 3 monety!',
        buy_shorten: '📋 Dziekanat: Zakupiono kartę skróconych praktyk!',
        obrona: '🎓 ' + name + ' przystępuje do obrony pracy!',
        leave: name + ' wychodzi z dziekanatu.'
    };
    return texts[choice] || '';
}

function mpApplyState(msg) {
    if (mpEndTurnTimer) {
        clearTimeout(mpEndTurnTimer);
        mpEndTurnTimer = null;
    }
    if (!gameState) _prevStats = [null, null, null, null];
    gameState = msg.state;
    gamePhase = msg.phase;
    gameSessionVersion = msg.version;
    mpLastResume = msg.resume || {};

    // Awatary nie są częścią stanu gry z serwera, więc dołączamy je z listy graczy pokoju.
    gameState.players.forEach(function(player) {
        var roomPlayer = roomPlayers.find(function(item) { return item.user_id === player.user_id; });
        if (roomPlayer) player.avatar = parseAvatarState(roomPlayer.avatar);
    });

    var me = gameState.players.find(function(player) { return player.user_id === myUserId; });
    if (me) myPlayerId = me.id;
    else if (isBotGame) myPlayerId = 0;

    showStartedGame();
    mpSyncPhase(mpLastResume, true);
}

// Ustawia interfejs zgodnie z fazą gry; allowAuto=false pomija akcje wysyłane automatycznie.
function mpSyncPhase(resume, allowAuto) {
    if (!gameState) return;
    updateGamePanel();
    ['quiz-modal', 'dziekanat-modal', 'start-modal'].forEach(function(id) {
        document.getElementById(id).style.display = 'none';
    });

    var current = gameState.players[gameState.turn];
    var mine = gameState.turn === myPlayerId;

    switch (gamePhase) {
        case 'awaiting_roll':
            if (mine && current.skipTurnsLeft > 0) {
                showMsg('⏳ Twoja tura jest pominięta. Przechodzę automatycznie do następnej...');
                if (allowAuto) setTimeout(function() { mpSend({ type: 'roll' }); }, MP_AUTO_ROLL_DELAY);
            } else {
                showMsg(mine ? 'Twoja tura – rzuć kostką!' : 'Tura gracza ' + current.name + '...');
            }
            break;
        case 'awaiting_start_bonus':
            if (mine) {
                var tuition = getFloor(current.pos) === 1 ? 3 : 1;
                document.getElementById('start-tuition-msg').textContent =
                    'Pomyślnie opłacono czesne w wysokości ' + tuition + ' 🪙.';
                document.getElementById('start-modal').style.display = 'flex';
            } else {
                showMsg('⏳ Oczekiwanie na wybór bonusu przez gracza: ' + current.name + '...');
            }
            break;
        case 'awaiting_field_resolution':
            if (mine && allowAuto) setTimeout(function() { mpSend({ type: 'resolve_field' }); }, MP_RESOLVE_FIELD_DELAY);
            break;
        case 'awaiting_quiz':
            if (mine && resume.quiz) {
                renderQuizModal(resume.quiz.question, resume.quiz.number, resume.quiz.total,
                    resume.quiz.hidden, current, mpAnswerQuiz);
            } else {
                showMsg('⏳ Gracz ' + current.name + ' odpowiada na pytania naukowe...');
            }
            break;
        case 'awaiting_dziekanat':
            if (mine) {
                openDziekanatModal(current);
            } else {
                showMsg('⏳ Gracz ' + current.name + ' załatwia sprawy w Dziekanacie...');
            }
            break;
        case 'awaiting_library':
            if (mine) {
                if (allowAuto) setTimeout(mpAskLibraryExchange, 100);
            } else {
                showMsg('⏳ Gracz ' + current.name + ' jest w bibliotece...');
            }
            break;
        case 'turn_resolution':
            if (mine && allowAuto) {
                mpEndTurnTimer = setTimeout(function() { mpSend({ type: 'end_turn' }); }, MP_END_TURN_DELAY);
            }
            break;
        case 'finished':
            var winner = gameState.players.find(function(player) { 
                return getFloor(player.pos) === 1 && player.crystals >= 30 && player.practicesCompleted >= 2; 
            });
            if (winner) triggerVictory(winner);
            break;
    }
}

function mpAnswerQuiz(index) {
    var buttons = document.getElementById('quiz-answers-container').children;
    for (var i = 0; i < buttons.length; i++) buttons[i].style.pointerEvents = 'none';
    mpSend({ type: 'answer', index: index });
}

function mpAskLibraryExchange() {
    var accept = confirm('📖 Biblioteka: Czy chcesz wymienić 2 monety na 1 Kryształek? 💎');
    mpSend({ type: 'library_exchange', accept: accept });
}
