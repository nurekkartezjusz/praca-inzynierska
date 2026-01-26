const config = {
    skora: 3,
    usta: 6,
    oczy: 4,
    wlosy: 6,
    koszulka: 3,
    spodnie: 3
};
const colors = {
    wlosy: ["czarne", "blond", "braz"],
    koszulka: ["czarna", "czerwona", "niebieska", "zielona", "biala", "rozowa"],
    spodnie: ["czarne", "biale", "szare", "niebieskie"]
};
const state = {
    skora: 1,
    usta: 1,
    oczy: 1,
    wlosy: 1,
    wlosyColorIndex: 0,
    koszulka: 1,
    koszulkaColorIndex: 0,
    spodnie: 1,
    spodnieColorIndex: 0
};
function prev(part) {
    changeStyle(part, -1);
}
function next(part) {
    changeStyle(part, 1);
}
function prevColor(part) {
    changeColor(part, -1);
}
function nextColor(part) {
    changeColor(part, 1);
}
function changeStyle(part, direction) {
    state[part] += direction;
    if (state[part] > config[part]) state[part] = 1;
    if (state[part] < 1) state[part] = config[part];
    update(part);
}
function changeColor(part, direction) {
    const colorKey = part + "ColorIndex";
    const availableColors = colors[part];
    state[colorKey] += direction;
    if (state[colorKey] >= availableColors.length) state[colorKey] = 0;
    if (state[colorKey] < 0) state[colorKey] = availableColors.length - 1;
    update(part);
}
function update(part) {
    const img = document.getElementById(part);
    let path = "";
    if (colors[part]) {
        const styleNum = state[part];
        const color = colors[part][state[part + "ColorIndex"]];
        path = `img/${part}/${part}${styleNum}_${color}.png`;
    } else {
        path = `img/${part}/${part}${state[part]}.png`;
    }
    img.src = path;
}
window.onload = () => {
    ["skora", "usta", "oczy", "wlosy", "koszulka", "spodnie"].forEach(update);
    
    // Pokaż checkbox tutorial tylko dla nowych użytkowników (po rejestracji)
    const urlParams = new URLSearchParams(window.location.search);
    const isNewUser = urlParams.get('new') === 'true';
    
    const tutorialSection = document.querySelector('.tutorial-check');
    if (!isNewUser && tutorialSection) {
        tutorialSection.style.display = 'none';
    }
    
    // Ukryj przycisk strony głównej dla nowych użytkowników (po rejestracji)
    const homeBtn = document.getElementById('home-btn');
    if (isNewUser && homeBtn) {
        homeBtn.style.display = 'none';
    }
};

async function startGame() {
    const tutorial = document.getElementById("tutorial").checked;

    const API_URL = 'http://localhost:8000';
    const token = localStorage.getItem('access_token');

    if (!token) {
        alert("Musisz być zalogowany!");
        window.location.href = '../logowanie/index.html';
        return;
    }

    try {
        // Zapisz awatar do bazy
        const response = await fetch(`${API_URL}/api/avatar?token=${token}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                avatar: JSON.stringify(state)
            })
        });

        if (response.ok) {
            showSuccess('Awatar zapisany pomyślnie!');
            setTimeout(() => {
                window.location.href = '../statystyki/index.html';
            }, 1500);
        } else {
            showError('Błąd zapisywania awatara');
        }
    } catch (error) {
        console.error("Błąd:", error);
        showError('Błąd połączenia z serwerem');
    }
}
