# TypeSnap

**TypeSnap** is a powerful, privacy-focused text expander extension for your browser. Boost your productivity by creating custom text snippets and expanding them instantly on any website.

## ✨ Features

*   **Text Expansion**: Type a short trigger (e.g., `/em`) to instantly expand it into a full email address or phrase.
*   **Spotlight Search**: Press `Ctrl + /` (or `Cmd + /` on Mac) anywhere to open a global search overlay for your snippets.
*   **Omnibox Integration**: Type `pt` <kbd>Space</kbd> in your address bar to search and navigate to URL snippets directly.
*   **Rich Management**: Organize snippets with categories (General, Work, Email, etc.) and mark favorites.
*   **Audio Feedback**: Optional satisfying sound effects when expanding snippets.
*   **Privacy First**: All data is stored locally in your browser. No cloud sync, no tracking.
*   **Theme Aware**: Automatically adapts to your system's light or dark mode.
*   **Data Backup**: Easy Import/Export of your snippets to JSON.

## 🚀 Installation

### Chrome / Edge / Brave
1.  Clone or download this repository.
2.  Open `chrome://extensions/`.
3.  Enable **Developer mode** (toggle in the top right).
4.  Click **Load unpacked**.
5.  Select the folder containing this project.

### Firefox
1.  Clone or download this repository.
2.  Open `about:debugging#/runtime/this-firefox`.
3.  Click **Load Temporary Add-on...**.
4.  Select the `manifest-firefox.json` file (or any file in the directory).

## 📖 Usage

### Creating Snippets
1.  Click the extension icon or open the Options page per the instructions in the popup.
2.  Click **New Snippet**.
3.  Enter a **Trigger** (e.g., `/sig`) and the **Content** you want to expand.
4.  (Optional) Assign a category or mark as favorite.

### Using Snippets
*   **Type & Expand**: On any webpage, type your trigger (e.g., `/sig`) into a text field. It will instantly be replaced with your content.
*   **Spotlight**: Press `Ctrl + /` to open the overlay. Type to search. Press **Enter** to copy text snippets or navigate to URL snippets.
*   **Address Bar**: Type `pt` then space, then type your query to find snippets.

## 🛠️ Configuration
Go to the **Options** page to:
*   Manage your snippets (Edit/Delete).
*   Create custom categories.
*   Toggle sound effects.
*   Switch themes manually (Light/Dark/Auto).
*   Backup or Restore your data.

## 👨‍💻 Credits
Created by **[AcrNischal](https://nishchalacharya.com.np)**.

Check out the code on [GitHub](https://github.com/AcrNischal).

---
*Built with vanilla JavaScript, HTML, and CSS. No external frameworks.*
