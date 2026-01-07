// Global State
let snippets = [];
let settings = {};
let categories = [];
let currentEditId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Elements

    // Elements
    const snippetsList = document.getElementById('snippetsList');
    const searchInput = document.getElementById('searchInput');
    const addSnippetBtn = document.getElementById('addSnippetBtn');
    const snippetModal = document.getElementById('snippetModal');
    const modalTitle = document.getElementById('modalTitle');
    const snippetTrigger = document.getElementById('snippetTrigger');
    const snippetContent = document.getElementById('snippetContent');
    const snippetCategory = document.getElementById('snippetCategory');
    const snippetFavorite = document.getElementById('snippetFavorite');
    const saveSnippetBtn = document.getElementById('saveSnippetBtn');
    const closeButtons = document.querySelectorAll('.close-modal');

    // Settings Elements
    const soundToggle = document.getElementById('soundToggle');
    const soundSelect = document.getElementById('soundSelect');
    const previewSoundBtn = document.getElementById('previewSoundBtn');
    const themeSelect = document.getElementById('themeSelect');
    const navItems = document.querySelectorAll('.nav-item');
    const newCategoryInput = document.getElementById('newCategoryInput');
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const categoriesList = document.getElementById('categoriesList');

    // Init
    loadData();

    // Data Loading
    function loadData() {
        chrome.storage.local.get(['snippets', 'settings'], (result) => {
            snippets = result.snippets || [];
            settings = result.settings || {
                soundEnabled: true,
                selectedSound: 'paste1.mp3',
                theme: 'auto',
                categories: ['General', 'Work', 'Email', 'Personal', 'Utilities']
            };

            // Ensure settings.categories exists and has defaults
            const requiredDefaults = ['General', 'Work', 'Email'];
            let changed = false;

            if (!settings.categories) {
                settings.categories = ['General', 'Work', 'Email', 'Personal', 'Utilities'];
                changed = true;
            } else {
                requiredDefaults.forEach(def => {
                    if (!settings.categories.includes(def)) {
                        settings.categories.push(def);
                        changed = true;
                    }
                });
            }

            // Sync global state *before* saving
            categories = settings.categories;

            if (changed) {
                saveData();
            }



            applySettings();
            renderSnippets();
            renderCategories();
        });
    }

    function saveData() {
        // We sync categories into settings object
        settings.categories = categories;

        chrome.storage.local.set({ snippets, settings }, () => {
            console.log('Data saved');
            renderSnippets();
            applySettings();
            renderCategories();
        });
    }

    // Render Logic
    function renderSnippets(filterText = '') {
        const activeView = document.querySelector('.nav-item.active').dataset.view;
        snippetsList.innerHTML = '';

        // Populate Category Dropdown in Modal
        snippetCategory.innerHTML = '';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            snippetCategory.appendChild(option);
        });

        let filtered = snippets.filter(s => {
            const matchesSearch = s.trigger.toLowerCase().includes(filterText.toLowerCase()) ||
                s.content.toLowerCase().includes(filterText.toLowerCase());
            if (activeView === 'favorites') return matchesSearch && s.favorite;
            if (activeView === 'settings') return false;
            return matchesSearch;
        });

        if (filtered.length === 0) {
            snippetsList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">No snippets found.</div>';
            return;
        }

        filtered.forEach(snippet => {
            const card = document.createElement('div');
            card.className = 'snippet-card';

            // Icons SVG
            const starIcon = snippet.favorite
                ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="gold" stroke="gold" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>'
                : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';

            const editIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
            const deleteIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';

            card.innerHTML = `
                <div class="card-header">
                    <span class="trigger-badge">${snippet.trigger}</span>
                     <!-- Category Badge -->
                    <span style="font-size: 11px; padding: 2px 6px; background: var(--bg-color); border-radius: 4px; color: var(--text-secondary); margin-left: 10px;">${snippet.category || 'General'}</span>

                    <button class="btn-icon favorite-btn ${snippet.favorite ? 'active' : ''}" style="margin-left: auto;">
                        ${starIcon}
                    </button>
                </div>
                <div class="card-content">${escapeHtml(snippet.content)}</div>
                <div class="card-footer">
                    <button class="btn-icon edit-btn" title="Edit">${editIcon}</button>
                    <button class="btn-icon delete-btn delete" title="Delete">${deleteIcon}</button>
                </div>
            `;

            // Event Listeners for Buttons
            card.querySelector('.edit-btn').addEventListener('click', () => openModal(snippet));
            card.querySelector('.delete-btn').addEventListener('click', () => deleteSnippet(snippet.id));
            card.querySelector('.favorite-btn').addEventListener('click', (e) => toggleFavorite(snippet.id, e.target));

            snippetsList.appendChild(card);
        });
    }

    // Category Management
    function renderCategories() {
        categoriesList.innerHTML = '';
        categories.forEach(cat => {
            const tag = document.createElement('span');
            tag.className = 'category-tag';
            tag.textContent = cat;

            // Add delete option (protected categories check)
            const protectedCategories = ['General', 'Work', 'Email'];

            if (!protectedCategories.includes(cat)) {
                const del = document.createElement('span');
                del.innerHTML = '&times;';
                del.style.marginLeft = '8px';
                del.style.cursor = 'pointer';
                del.onclick = () => deleteCategory(cat);
                tag.appendChild(del);
            }

            categoriesList.appendChild(tag);
        });
    }

    addCategoryBtn.addEventListener('click', () => {
        const newCat = newCategoryInput.value.trim();
        if (newCat && !categories.includes(newCat)) {
            categories.push(newCat);
            newCategoryInput.value = '';
            saveData();
        }
    });

    function deleteCategory(cat) {
        if (confirm(`Delete category "${cat}"?`)) {
            categories = categories.filter(c => c !== cat);
            // reset snippets with this category to General
            snippets.forEach(s => {
                if (s.category === cat) s.category = 'General';
            });
            saveData();
        }
    }

    // CRUD
    function openModal(snippet = null) {
        currentEditId = snippet ? snippet.id : null;
        modalTitle.textContent = snippet ? 'Edit Snippet' : 'New Snippet';

        // Remove leading slash for display if present
        let displayTrigger = snippet ? snippet.trigger : '';
        if (displayTrigger.startsWith('/')) {
            displayTrigger = displayTrigger.substring(1);
        }
        snippetTrigger.value = displayTrigger;

        snippetContent.value = snippet ? snippet.content : '';
        snippetCategory.value = snippet ? (snippet.category || 'General') : 'General';
        snippetFavorite.checked = snippet ? snippet.favorite : false;

        snippetModal.classList.remove('hidden');
    }

    function closeModal() {
        snippetModal.classList.add('hidden');
    }

    function saveSnippet() {
        let trigger = snippetTrigger.value.trim();
        const content = snippetContent.value;
        const category = snippetCategory.value;
        const favorite = snippetFavorite.checked;

        if (!trigger || !content) {
            alert('Trigger and Content are required!');
            return;
        }

        // Auto-prefix
        if (!trigger.startsWith('/')) {
            trigger = '/' + trigger;
        }

        if (currentEditId) {
            const index = snippets.findIndex(s => s.id === currentEditId);
            if (index !== -1) {
                snippets[index] = { ...snippets[index], trigger, content, category, favorite };
            }
        } else {
            const newSnippet = {
                id: Date.now().toString(),
                trigger,
                content,
                category,
                favorite
            };
            snippets.push(newSnippet);
        }

        saveData();
        closeModal();
    }

    function deleteSnippet(id) {
        if (confirm('Are you sure you want to delete this snippet?')) {
            snippets = snippets.filter(s => s.id !== id);
            saveData();
        }
    }

    function toggleFavorite(id, btnElement) {
        const index = snippets.findIndex(s => s.id === id);
        if (index !== -1) {
            snippets[index].favorite = !snippets[index].favorite;
            saveData();
        }
    }

    // Settings
    function applySettings() {
        soundToggle.checked = settings.soundEnabled;
        soundSelect.value = settings.selectedSound || 'paste1.mp3';
        themeSelect.value = settings.theme || 'auto';
        updateThemeDisplay();
    }

    function updateThemeDisplay() {
        const theme = settings.theme || 'auto';
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            document.body.setAttribute('data-theme', theme);
        }
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if ((settings.theme || 'auto') === 'auto') {
            updateThemeDisplay();
        }
    });

    soundToggle.addEventListener('change', (e) => {
        settings.soundEnabled = e.target.checked;
        saveData();
    });

    soundSelect.addEventListener('change', (e) => {
        settings.selectedSound = e.target.value;
        saveData();
    });

    themeSelect.addEventListener('change', (e) => {
        settings.theme = e.target.value;
        saveData();
    });

    previewSoundBtn.addEventListener('click', () => {
        const soundUrl = chrome.runtime.getURL('audio/' + soundSelect.value);
        new Audio(soundUrl).play();
    });

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            const view = item.dataset.view;
            if (view === 'settings') {
                document.getElementById('snippetsView').classList.add('hidden');
                document.getElementById('helpView').classList.add('hidden');
                document.getElementById('aboutView').classList.add('hidden');
                document.getElementById('settingsView').classList.remove('hidden');
                renderCategories(); // refresh categories view
            } else if (view === 'help') {
                document.getElementById('snippetsView').classList.add('hidden');
                document.getElementById('settingsView').classList.add('hidden');
                document.getElementById('aboutView').classList.add('hidden');
                document.getElementById('helpView').classList.remove('hidden');
            } else if (view === 'about') {
                document.getElementById('snippetsView').classList.add('hidden');
                document.getElementById('settingsView').classList.add('hidden');
                document.getElementById('helpView').classList.add('hidden');
                document.getElementById('aboutView').classList.remove('hidden');
            } else {
                document.getElementById('settingsView').classList.add('hidden');
                document.getElementById('helpView').classList.add('hidden');
                document.getElementById('aboutView').classList.add('hidden');
                document.getElementById('snippetsView').classList.remove('hidden');
                renderSnippets(searchInput.value);
            }
        });
    });

    // Listeners
    addSnippetBtn.addEventListener('click', () => openModal());
    saveSnippetBtn.addEventListener('click', saveSnippet);
    closeButtons.forEach(btn => btn.addEventListener('click', closeModal));
    searchInput.addEventListener('input', (e) => renderSnippets(e.target.value));

    // Import/Export
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');

    exportBtn.addEventListener('click', () => {
        const dataStr = JSON.stringify(snippets, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `typesnap_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    });

    importBtn.addEventListener('click', () => importFile.click());

    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (!Array.isArray(imported)) throw new Error('Invalid format: Root must be an array');

                let count = 0;
                imported.forEach(s => {
                    if (s.trigger && s.content) {
                        // Regenerate ID to avoid collisions
                        const newId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                        snippets.push({
                            id: newId,
                            trigger: s.trigger,
                            content: s.content,
                            category: s.category || 'General',
                            favorite: s.favorite || false
                        });
                        count++;
                    }
                });

                saveData();
                alert(`Successfully imported ${count} snippets!`);
                e.target.value = ''; // Reset
            } catch (err) {
                alert('Error importing snippets: ' + err.message);
                console.error(err);
            }
        };
        reader.readAsText(file);
    });

    // Utils
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});

