/**
 * Workspace Artifacts View Component
 * Handles the side preview panel for generated code, HTML, and documents
 */
import { $, escapeHtml } from '../../shared/utils/dom-helpers.js';
import { globalBus } from '../../shared/core/event-bus.js';

export class ArtifactsView {
  constructor({ chatEngine }) {
    this.engine = chatEngine;
    this.panel = $('#artifacts-panel');
    this.toggleBtn = $('#toggle-artifacts-btn');
    this.closeBtn = $('#close-artifacts-btn');
    this.copyBtn = $('#artifact-copy-btn');
    this.titleText = $('#artifact-title-text');
    this.body = $('#artifact-body');

    this.currentArtifact = null;

    this.bindEvents();
  }

  bindEvents() {
    this.toggleBtn?.addEventListener('click', () => {
      this.panel.classList.toggle('is-open');
    });

    this.closeBtn?.addEventListener('click', () => {
      this.panel.classList.remove('is-open');
    });

    this.copyBtn?.addEventListener('click', () => {
      if (this.currentArtifact?.content) {
        navigator.clipboard.writeText(this.currentArtifact.content);
        this.copyBtn.textContent = 'Copied!';
        setTimeout(() => { this.copyBtn.textContent = 'Copy'; }, 1800);
      }
    });

    globalBus.on('artifact:created', (artifact) => {
      this.displayArtifact(artifact);
    });
  }

  displayArtifact(artifact) {
    this.currentArtifact = artifact;
    this.panel.classList.add('is-open');
    if (this.titleText) this.titleText.textContent = artifact.title || 'Workspace Artifact';

    if (!this.body) return;

    if (artifact.type === 'html') {
      // Secure sandboxed iframe preview
      this.body.innerHTML = `
        <iframe class="artifact-preview-frame" sandbox="allow-scripts" srcdoc="${escapeHtml(artifact.content)}"></iframe>
      `;
    } else {
      this.body.innerHTML = `
        <pre><code class="language-${escapeHtml(artifact.language || 'text')}">${escapeHtml(artifact.content)}</code></pre>
      `;
    }
  }
}
