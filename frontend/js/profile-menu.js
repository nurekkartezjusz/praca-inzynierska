// Menu profilu w nawigacji (ikona wylogowania + przycisk "Wyloguj")
function toggleMenu() {
    document.getElementById('profile-menu').classList.toggle('show');
}

document.addEventListener('click', function (e) {
    const menu = document.getElementById('profile-menu');
    const profile = document.getElementById('user-profile');
    if (menu && profile && !profile.contains(e.target) && menu.classList.contains('show')) {
        menu.classList.remove('show');
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const email = document.getElementById('profile-email');
    if (email) email.textContent = localStorage.getItem('user_email') || '';
});
