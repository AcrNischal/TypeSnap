// content.js

let snippets = [];
let settings = {};
const KEY_BUFFER_SIZE = 50; // Keep track of the last N characters
let keyBuffer = "";

// Initialize
function loadData() {
    chrome.storage.local.get(['snippets', 'settings'], (result) => {
        snippets = result.snippets || [];
        settings = result.settings || { soundEnabled: true, selectedSound: 'paste1.mp3' };
    });
}

loadData();

// Listen for storage changes to update local cache
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.snippets) snippets = changes.snippets.newValue;
        if (changes.settings) settings = changes.settings.newValue;
    }
});

// Helper to play sound
function playSound() {
    if (settings && settings.soundEnabled) {
        try {
            const soundUrl = chrome.runtime.getURL('audio/' + (settings.selectedSound || 'paste1.mp3'));
            const audio = new Audio(soundUrl);
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Audio play failed (user interaction policy?):', e));
        } catch (e) {
            console.error("Error playing sound:", e);
        }
    }
}

// Text replacement logic
function expandSnippet(target, trigger, content) {
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

    if (isInput) {
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const text = target.value;
        const before = text.substring(0, start);
        const after = text.substring(end);

        // Remove trigger from 'before'
        // Ensure we only replace if it actually ends with trigger
        if (before.endsWith(trigger)) {
            const newBefore = before.slice(0, -trigger.length);
            const newText = newBefore + content + after;
            target.value = newText;

            // Restore cursor position
            const newCursorPos = newBefore.length + content.length;
            target.setSelectionRange(newCursorPos, newCursorPos);

            // Dispatch input event to notify frameworks (React, Vue, etc.)
            target.dispatchEvent(new Event('input', { bubbles: true }));
            playSound();
        }
    } else if (target.isContentEditable) {
        // ContentEditable is harder. Simplified approach for text-only nodes.
        // This is a basic implementation. Robust contenteditable manipulation is complex.
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);

        // Very basic handling: delete back trigger length, insert text
        // Note: keeping it simple for "runnable code" constraint.
        // A robust solution needs to walk back nodes.
        // We will assume the trigger is in the current text node.

        const node = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            const offset = range.startOffset;
            const before = text.substring(0, offset);

            if (before.endsWith(trigger)) {
                // Remove trigger
                const rangeToDelete = document.createRange();
                rangeToDelete.setStart(node, offset - trigger.length);
                rangeToDelete.setEnd(node, offset);
                rangeToDelete.deleteContents();

                // Insert content
                const textNode = document.createTextNode(content);
                rangeToDelete.insertNode(textNode);

                // Move cursor to end of inserted text
                rangeToDelete.setStartAfter(textNode);
                rangeToDelete.setEndAfter(textNode);
                selection.removeAllRanges();
                selection.addRange(rangeToDelete);

                playSound();
            }
        }
    }
}

// Event Listener
document.addEventListener('input', (e) => {
    const target = e.target;
    // We only care about text inputs
    if (!target.isContentEditable && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') return;
    if (target.tagName === 'INPUT' && !['text', 'search', 'url', 'email', 'tel'].includes(target.type)) return;

    // Since we can't easily capture the exact char typed in 'input' sometimes,
    // we rely on checking the text around the cursor.

    // Actually, 'input' event is good for checking the current state.
    // We check if the text *before cursor* ends with any trigger.

    // Performance note: In a huge buffer, this might be slow, but usually fine.

    let textBeforeCursor = "";
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        textBeforeCursor = target.value.substring(0, target.selectionStart);
    } else if (target.isContentEditable) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const node = range.startContainer;
            if (node.nodeType === Node.TEXT_NODE) {
                textBeforeCursor = node.textContent.substring(0, range.startOffset);
            }
        }
    }

    // Check matching snippets
    // optimization: maybe use a Map or Trie for many snippets, but array find is okay for typical usage (<100 snippets)
    const match = snippets.find(s => textBeforeCursor.endsWith(s.trigger));

    if (match) {
        expandSnippet(target, match.trigger, match.content);
    }
});

// --- Spotlight Overlay ---

class Spotlight {
    constructor() {
        this.isOpen = false;
        this.overlay = null;
        this.snippets = [];
    }

    init() {
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && (e.ctrlKey || e.metaKey)) { // Ctrl+/ or Cmd+/
                e.preventDefault();
                this.toggle();
            }
            // Close on escape
            if (this.isOpen && e.key === 'Escape') {
                this.close();
            }
        });
    }

    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    }

    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        this.createOverlay();
        this.loadSnippets();

        // Ensure focus is captured
        requestAnimationFrame(() => {
            if (this.shadowRoot) {
                const input = this.shadowRoot.getElementById('spotlight-input');
                if (input) {
                    input.focus();
                    // Double check after a small delay in case of strict focus management on clear
                    setTimeout(() => input.focus(), 50);
                }
            }
        });
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }

    loadSnippets() {
        chrome.storage.local.get(['snippets'], (result) => {
            this.snippets = result.snippets || [];
            this.renderResults('');
        });
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'typesnap-spotlight-host';
        this.overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; z-index:2147483647; pointer-events:auto;';

        this.shadowRoot = this.overlay.attachShadow({ mode: 'open' });

        const style = `
            :host {
                pointer-events: auto; 
                display: flex;
                justify-content: center;
                align-items: flex-start;
                padding-top: 20vh;
                font-family: system-ui, -apple-system, sans-serif;
                background: rgba(0,0,0,0.4);
                height: 100%;
                backdrop-filter: blur(2px);
            }
            .container {
                width: 600px;
                max-width: 90%;
                background: #1e1e1e;
                border-radius: 12px;
                box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                overflow: hidden;
                border: 1px solid #333;
                display: flex;
                flex-direction: column;
                color: #e0e0e0;
            }
            .search-box {
                padding: 16px;
                border-bottom: 1px solid #333;
                display: flex;
                align-items: center;
            }
            .search-box svg {
                color: #888;
                margin-right: 12px;
            }
            input {
                background: transparent;
                border: none;
                font-size: 18px;
                color: white;
                width: 100%;
                outline: none;
                font-family: inherit;
            }
            .results {
                max-height: 400px;
                overflow-y: auto;
            }
            .item {
                padding: 12px 16px;
                display: flex;
                align-items: center;
                cursor: pointer;
                border-bottom: 1px solid #2a2a2a;
            }
            .item:last-child { border-bottom: none; }
            .item:hover, .item.selected {
                background: #2d2d2d;
            }
            .trigger {
                background: #3c3c3c;
                color: #61afef;
                padding: 2px 6px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 12px;
                margin-right: 12px;
            }
            .content {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                font-size: 14px;
                color: #aaa;
            }
            .empty {
                padding: 20px;
                text-align: center;
                color: #666;
            }
        `;

        this.shadowRoot.innerHTML = `
            <style>${style}</style>
            <div class="container" id="container">
                <div class="search-box">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input type="text" id="spotlight-input" placeholder="Search snippets..." autocomplete="off">
                </div>
                <div class="results" id="results"></div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        // Handle click outside to close
        this.overlay.addEventListener('click', (e) => {
            const container = this.shadowRoot.getElementById('container');
            // Check if click path includes container
            if (!e.composedPath().includes(container)) {
                this.close();
            }
        });

        const input = this.shadowRoot.getElementById('spotlight-input');
        input.addEventListener('input', (e) => this.renderResults(e.target.value));
        input.addEventListener('keydown', (e) => this.handleNavigation(e));

        this.renderResults('');
    }

    renderResults(query) {
        const resultsEl = this.shadowRoot.getElementById('results');
        resultsEl.innerHTML = '';

        const filtered = this.snippets.filter(s => {
            const isUrl = s.content && (s.content.startsWith('http://') || s.content.startsWith('https://'));
            if (!isUrl) return false;

            return s.trigger.toLowerCase().includes(query.toLowerCase()) ||
                s.content.toLowerCase().includes(query.toLowerCase());
        });

        if (filtered.length === 0) {
            resultsEl.innerHTML = '<div class="empty">No snippets found</div>';
            return;
        }

        filtered.forEach((s, index) => {
            const item = document.createElement('div');
            item.className = `item ${index === 0 ? 'selected' : ''}`;
            item.dataset.index = index;
            item.innerHTML = `
                <span class="trigger">${s.trigger}</span>
                <span class="content">${this.escapeHtml(s.content)}</span>
            `;
            item.addEventListener('click', () => this.selectAction(s));
            resultsEl.appendChild(item);
        });
    }

    handleNavigation(e) {
        const items = this.shadowRoot.querySelectorAll('.item');
        let selectedIndex = -1;
        items.forEach((item, idx) => {
            if (item.classList.contains('selected')) selectedIndex = idx;
        });

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = (selectedIndex + 1) % items.length;
            this.updateSelection(items, nextIndex);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = (selectedIndex - 1 + items.length) % items.length;
            this.updateSelection(items, prevIndex);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex !== -1) {
                items[selectedIndex].click();
            }
        }
    }

    updateSelection(items, newIndex) {
        items.forEach(i => i.classList.remove('selected'));
        if (items[newIndex]) {
            items[newIndex].classList.add('selected');
            items[newIndex].scrollIntoView({ block: 'nearest' });
        }
    }

    selectAction(snippet) {
        try {
            // Basic URL check
            const isUrl = snippet.content.startsWith('http://') || snippet.content.startsWith('https://');
            if (isUrl) {
                window.location.href = snippet.content;
            } else {
                throw new Error('Not a URL');
            }
        } catch (e) {
            // Not a URL, copy to clipboard
            navigator.clipboard.writeText(snippet.content).then(() => {
                this.close();
            }).catch(err => {
                console.error('Could not copy text: ', err);
                this.close();
            });
            return;
        }
        this.close();
    }

    escapeHtml(text) {
        return text.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

new Spotlight().init();
