# Aether AI — Minimalist AI Chatbot Ecosystem

> **Pure Intelligence. Distilled.**  
> A high-performance, monochromatic AI chatbot inspired by modern minimalist design. Runs seamlessly as a **Website**, a **Google Chrome Extension (Manifest V3)**, and a **Mozilla Firefox Extension (WebExtensions)**, all sharing one unified core logic, design system, and storage abstraction.

---

## 🌟 Highlights

- **Pure Minimalist Design:** High-contrast monochromatic black-and-white interface (`#0A0A0A`, `#141414`, `#1B1B1B`, `#FFFFFF`).
- **No Frontend Frameworks:** Built with pure HTML5, CSS3 custom properties, and native ES6+ JavaScript modules.
- **High-Speed AI Streaming:** Real Server-Sent Events (SSE) streaming with AbortController cancellation.
- **Cross-Platform:**
  - 🌐 **Responsive Website:** Collapsible sidebar, prompt suggestions, workspace artifacts preview, speech-to-text, and read-aloud.
  - 🧩 **Chrome Extension:** Popup, side panel, and context menu actions on selected text.
  - 🦊 **Firefox Extension:** WebExtension popup, sidebar action, and selection menus.
- **Robust Local Storage:** Unified storage engine backed by **IndexedDB** on the web and **`storage.local`** in extensions.
- **Document Analysis & Search:** Secure in-memory parser for PDF, TXT, MD, CSV, JSON, and source code files.

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/kanangupta10114-hue/aether-ai.git
cd aether-ai
npm install
```

### 2. Configure Environment
Create `.env` from `.env.example`:
```bash
cp .env.example .env
```
Add your API key (OpenAI or Groq):
```env
OPENAI_API_KEY=your_api_key_here
```

### 3. Start Server
```bash
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧩 Browser Extensions

### Chrome (Manifest V3)
1. Navigate to `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select `extensions/chrome`.

### Firefox (WebExtensions)
1. Navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `extensions/firefox/manifest.json`.

---

## 🧪 Test Suite
Run the automated verification suite:
```bash
npm test
```
