// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const list = document.getElementById('popupList');
    const search = document.getElementById('popupSearch');
    const openOptionsLink = document.getElementById('openOptions');
    const notification = document.getElementById('notification');

    let snippets = [];

    // Open options page
    openOptionsLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    });

    // Load Data
    chrome.storage.local.get(['snippets', 'settings'], (result) => {
        snippets = result.snippets || [];
        const theme = result.settings?.theme || 'auto';

        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            document.body.setAttribute('data-theme', theme);
        }
        renderSnippets();
    });

    function renderSnippets(text = '') {
        list.innerHTML = '';

        const filtered = snippets.filter(s =>
            s.trigger.toLowerCase().includes(text.toLowerCase()) ||
            s.content.toLowerCase().includes(text.toLowerCase())
        );

        if (filtered.length === 0) {
            list.innerHTML = '<div style="text-align:center; color: var(--text-secondary); padding: 20px; font-size: 13px;">No matching snippets</div>';
            return;
        }

        filtered.forEach(s => {
            const item = document.createElement('div');
            item.className = 'snippet-item';

            // Format content preview
            const contentPreview = s.content.length > 50 ? s.content.substring(0, 50) + '...' : s.content;

            item.innerHTML = `
                <div class="snippet-trigger">${s.trigger}</div>
                <div class="snippet-preview">${escapeHtml(contentPreview)}</div>
            `;

            item.addEventListener('click', () => copyToClipboard(s.content));
            list.appendChild(item);
        });
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification();
            // Optional: Close popup after copy?
            // window.close(); 
        }).catch(err => {
            console.error('Failed to copy', err);
        });
    }

    function showNotification() {
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 1500);
    }

    search.addEventListener('input', (e) => renderSnippets(e.target.value));

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
