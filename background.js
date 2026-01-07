// background.js

// Initialization
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        const defaultSettings = {
            soundEnabled: true,
            selectedSound: "paste1.mp3",
            theme: "auto",
            categories: ["General", "Work", "Email", "Personal", "Utilities"]
        };

        const defaultSnippets = [
            {
                id: Date.now().toString(),
                trigger: "/hi",
                content: "Hello! How can I help you today?",
                category: "General",
                favorite: false
            },
            {
                id: (Date.now() + 1).toString(),
                trigger: "/google",
                content: "https://google.com",
                category: "Utilities",
                favorite: true
            }
        ];

        chrome.storage.local.set({
            settings: defaultSettings,
            snippets: defaultSnippets
        }, () => {
            console.log("TypeSnap: Default settings and snippets initialized.");
        });
    }
});

// Omnibox Support
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
    chrome.storage.local.get(['snippets'], (result) => {
        const snippets = result.snippets || [];
        const suggestions = snippets
            .filter(s => s.trigger.toLowerCase().includes(text.toLowerCase()) ||
                s.content.toLowerCase().includes(text.toLowerCase()))
            .map(s => ({
                content: s.content,
                description: `${s.trigger} - ${escapeXml(s.content)}` // Omnibox requires XML escaping
            }));

        suggest(suggestions);
    });
});

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
    // If text matches a specific snippet content (from suggestion), navigate/copy
    // Note: 'text' is the 'content' field from suggestion usually

    // Check if it's a URL
    if (isValidUrl(text)) {
        chrome.tabs.update({ url: text });
    } else {
        // Since we can't easily "paste" into the web page from here without active tab injection,
        // and user asked for "navigate url", we focus on navigation. 
        // If strict search is needed:
        chrome.storage.local.get(['snippets'], (result) => {
            const snippets = result.snippets || [];
            // Try to find if user typed a trigger directly
            const match = snippets.find(s => s.trigger === text || s.trigger === '/' + text);
            if (match && isValidUrl(match.content)) {
                chrome.tabs.update({ url: match.content });
            } else {
                // Fallback search?
                const encoded = encodeURIComponent(text);
                chrome.tabs.update({ url: `https://google.com/search?q=${encoded}` });
            }
        });
    }
});

// Helper
function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    }).substring(0, 100); // Truncate for display
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}
