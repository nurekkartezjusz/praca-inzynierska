const API_URL = 'http://localhost:8000';

// Sprawdź czy użytkownik jest zalogowany
function checkAuth() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '/logowanie/';
    }
    return token;
}

// Pobierz token
function getToken() {
    return localStorage.getItem('access_token');
}

// Wyloguj
function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_email');
    showToast('Wylogowano pomyślnie', 'success');
    setTimeout(() => {
        window.location.href = '/logowanie/';
    }, 1000);
}

// Pobierz inicjały użytkownika
function getInitials(username) {
    return username.substring(0, 2).toUpperCase();
}

// Wyszukaj użytkowników
async function searchUsers() {
    const query = document.getElementById('searchInput').value.trim();
    const resultsDiv = document.getElementById('searchResults');
    
    if (query.length === 0) {
        resultsDiv.innerHTML = '';
        return;
    }

    if (query.length < 2) {
        resultsDiv.innerHTML = '<div class="empty-state">Wpisz co najmniej 2 znaki</div>';
        return;
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/api/users/search?query=${encodeURIComponent(query)}&token=${token}`);
        
        if (!response.ok) {
            throw new Error('Błąd wyszukiwania');
        }

        const users = await response.json();
        
        if (users.length === 0) {
            resultsDiv.innerHTML = '<div class="empty-state">Nie znaleziono użytkowników</div>';
            return;
        }

        resultsDiv.innerHTML = users.map(user => createUserCard(user, 'search')).join('');
    } catch (error) {
        console.error('Błąd:', error);
        showToast('Błąd wyszukiwania użytkowników', 'error');
    }
}

// Pobierz zaproszenia
async function loadFriendRequests() {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/api/friends/requests?token=${token}`);
        
        if (!response.ok) {
            throw new Error('Błąd pobierania zaproszeń');
        }

        const requests = await response.json();
        const requestsDiv = document.getElementById('friendRequests');
        const countSpan = document.getElementById('requestCount');
        
        countSpan.textContent = requests.length;

        if (requests.length === 0) {
            requestsDiv.innerHTML = '<div class="empty-state">Brak nowych zaproszeń</div>';
            return;
        }

        requestsDiv.innerHTML = requests.map(req => {
            const user = {
                ...req.requester,
                friendship_id: req.friendship_id,
                friendship_status: 'pending_received'
            };
            return createUserCard(user, 'request');
        }).join('');
    } catch (error) {
        console.error('Błąd:', error);
        showToast('Błąd pobierania zaproszeń', 'error');
    }
}

// Pobierz listę znajomych
async function loadFriends() {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/api/friends?token=${token}`);
        
        if (!response.ok) {
            throw new Error('Błąd pobierania znajomych');
        }

        const friends = await response.json();
        const friendsDiv = document.getElementById('friendsList');
        const countSpan = document.getElementById('friendCount');
        
        countSpan.textContent = friends.length;

        if (friends.length === 0) {
            friendsDiv.innerHTML = '<div class="empty-state">Nie masz jeszcze znajomych. Użyj wyszukiwarki powyżej!</div>';
            return;
        }

        friendsDiv.innerHTML = friends.map(friend => createUserCard(friend, 'friend')).join('');
    } catch (error) {
        console.error('Błąd:', error);
        showToast('Błąd pobierania znajomych', 'error');
    }
}

// Stwórz kartę użytkownika
function createUserCard(user, type) {
    const initials = getInitials(user.username);
    let actions = '';
    let status = '';

    if (type === 'search') {
        switch (user.friendship_status) {
            case 'none':
                actions = `<button class="btn-success" onclick="sendFriendRequest('${user.username}')">Dodaj do znajomych</button>`;
                break;
            case 'pending_sent':
                status = '<span class="status pending">Wysłano zaproszenie</span>';
                break;
            case 'pending_received':
                actions = `
                    <button class="btn-success" onclick="acceptFriendRequest(${user.friendship_id})">Zaakceptuj</button>
                    <button class="btn-danger-small" onclick="rejectFriendRequest(${user.friendship_id})">Odrzuć</button>
                `;
                break;
            case 'friends':
                status = '<span class="status friends">Znajomy</span>';
                actions = `<button class="btn-danger-small" onclick="removeFriend(${user.friendship_id}, '${user.username}')">Usuń</button>`;
                break;
        }
    } else if (type === 'request') {
        actions = `
            <button class="btn-success" onclick="acceptFriendRequest(${user.friendship_id})">Zaakceptuj</button>
            <button class="btn-danger-small" onclick="rejectFriendRequest(${user.friendship_id})">Odrzuć</button>
        `;
    } else if (type === 'friend') {
        status = '<span class="status friends">Znajomy</span>';
        actions = `<button class="btn-danger-small" onclick="removeFriend(${user.friendship_id}, '${user.username}')">Usuń</button>`;
    }

    return `
        <div class="user-card">
            <div class="user-info">
                <div class="avatar-preview">${initials}</div>
                <div class="user-details">
                    <div class="username">${user.username}</div>
                    <div class="email">${user.email}</div>
                    ${status}
                </div>
            </div>
            <div class="user-actions">
                ${actions}
            </div>
        </div>
    `;
}

// Wyślij zaproszenie
async function sendFriendRequest(username) {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/api/friends/request?token=${token}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                addressee_username: username
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Błąd wysyłania zaproszenia');
        }

        showToast(`Wysłano zaproszenie do ${username}`, 'success');
        searchUsers(); // Odśwież wyniki wyszukiwania
    } catch (error) {
        console.error('Błąd:', error);
        showToast(error.message, 'error');
    }
}

// Zaakceptuj zaproszenie
async function acceptFriendRequest(friendshipId) {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/api/friends/accept/${friendshipId}?token=${token}`, {
            method: 'POST'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Błąd akceptowania zaproszenia');
        }

        showToast(data.message, 'success');
        loadFriendRequests();
        loadFriends();
        searchUsers(); // Odśwież wyniki jeśli są
    } catch (error) {
        console.error('Błąd:', error);
        showToast(error.message, 'error');
    }
}

// Odrzuć zaproszenie
async function rejectFriendRequest(friendshipId) {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/api/friends/reject/${friendshipId}?token=${token}`, {
            method: 'POST'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Błąd odrzucania zaproszenia');
        }

        showToast(data.message, 'success');
        loadFriendRequests();
        searchUsers(); // Odśwież wyniki jeśli są
    } catch (error) {
        console.error('Błąd:', error);
        showToast(error.message, 'error');
    }
}

// Usuń znajomego
async function removeFriend(friendshipId, username) {
    if (!confirm(`Czy na pewno chcesz usunąć ${username} ze znajomych?`)) {
        return;
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/api/friends/${friendshipId}?token=${token}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Błąd usuwania znajomego');
        }

        showToast(data.message, 'success');
        loadFriends();
        searchUsers(); // Odśwież wyniki jeśli są
    } catch (error) {
        console.error('Błąd:', error);
        showToast(error.message, 'error');
    }
}

// Wyszukiwanie na Enter
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchUsers();
    }
});

// Wyszukiwanie w czasie rzeczywistym (debounce)
let searchTimeout;
document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchUsers();
    }, 500);
});

// Inicjalizacja
checkAuth();
loadFriendRequests();
loadFriends();
