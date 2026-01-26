// Toast Notification System
function showToast(message, type = 'info', title = null, duration = 4000) {
    // Utwórz kontener jeśli nie istnieje
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    // Domyślne tytuły
    const defaultTitles = {
        success: 'Sukces!',
        error: 'Błąd!',
        info: 'Informacja'
    };
    
    // Domyślne ikony
    const icons = {
        success: '✓',
        error: '✕',
        info: 'i'
    };
    
    // Utwórz toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
            ${title || defaultTitles[type] ? `<div class="toast-title">${title || defaultTitles[type]}</div>` : ''}
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Animacja pojawienia się
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto-usuwanie
    if (duration > 0) {
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => {
                toast.remove();
                // Usuń kontener jeśli pusty
                if (container.children.length === 0) {
                    container.remove();
                }
            }, 300);
        }, duration);
    }
    
    return toast;
}

// Pomocnicze funkcje
function showSuccess(message, title = null, duration = 4000) {
    return showToast(message, 'success', title, duration);
}

function showError(message, title = null, duration = 5000) {
    return showToast(message, 'error', title, duration);
}

function showInfo(message, title = null, duration = 4000) {
    return showToast(message, 'info', title, duration);
}
