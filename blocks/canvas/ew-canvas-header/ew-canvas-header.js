import { LitElement, html, nothing } from 'da-lit';

import { getNx, getNxEWFlags } from '../../../scripts/utils.js';

const { loadStyle, hashChange } = await import(`${getNx()}/utils/utils.js`);

const style = await loadStyle(import.meta.url);

const ICONS = {
  undo: '/img/icons/s2-icon-undo-20-n.svg',
  redo: '/img/icons/s2-icon-redo-20-n.svg',
  splitLeft: '/img/icons/s2-icon-splitleft-20-n.svg',
  splitRight: '/img/icons/s2-icon-splitright-20-n.svg',
  gridCompare: '/img/icons/s2-icon-gridcompare-20-n.svg',
};

const EDITOR_VIEWS = /** @type {const} */ (['layout', 'content', 'split']);

class EWCanvasHeader extends LitElement {
  static properties = {
    /** `'layout'` / `'content'` = single pane; `'split'` = doc + WYSIWYG side by side */
    editorView: { type: String, reflect: true },
    undoAvailable: { type: Boolean },
    redoAvailable: { type: Boolean },
    authorized: { type: Boolean },
    canWrite: { type: Boolean },
    _chatDisabled: { state: true },
  };

  constructor() {
    super();
    this.editorView = 'layout';
    this.undoAvailable = false;
    this.redoAvailable = false;
    this.authorized = true;
    this.canWrite = true;
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
    this._unsubHash = hashChange.subscribe((state) => {
      this._syncChatDisabled(state?.org, state?.site);
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubHash?.();
  }

  async _syncChatDisabled(org, site) {
    const key = org && site ? `${org}/${site}` : '';
    this._chatDisableKey = key;
    if (!org || !site) {
      this._chatDisabled = false;
      return;
    }
    const { isEwChatDisabled } = await getNxEWFlags();
    const disabled = await isEwChatDisabled({ org, site });
    if (this._chatDisableKey !== key) return;
    this._chatDisabled = disabled;
  }

  _openPanel(position) {
    this.dispatchEvent(
      new CustomEvent('nx-canvas-open-panel', {
        bubbles: true,
        composed: true,
        detail: { position },
      }),
    );
  }

  _undo() {
    this.dispatchEvent(
      new CustomEvent('nx-canvas-undo', { bubbles: true, composed: true }),
    );
  }

  _redo() {
    this.dispatchEvent(
      new CustomEvent('nx-canvas-redo', { bubbles: true, composed: true }),
    );
  }

  _setEditorView(view) {
    if (!EDITOR_VIEWS.includes(view) || view === this.editorView) return;
    this.editorView = view;
    this.dispatchEvent(
      new CustomEvent('nx-canvas-editor-view', {
        bubbles: true,
        composed: true,
        detail: { view },
      }),
    );
  }

  _renderIcon(name) {
    return html`<svg aria-hidden="true" class="icon" viewBox="0 0 20 20"><use href="${ICONS[name]}#icon"></use></svg>`;
  }

  // Read-only indicator. Uses the same Spectrum "Lock" glyph DA shows in the
  // classic editor so the two experiences stay visually consistent. Inlined (with
  // currentColor) rather than referenced, so it renders regardless of icon hosting.
  // eslint-disable-next-line class-methods-use-this
  _renderLock() {
    const label = 'Read-only — you don\'t have write access';
    return html`
      <span class="lock-indicator" role="img" aria-label=${label} title=${label}>
        <svg class="icon" viewBox="0 0 20 20" aria-hidden="true">
          <path fill="currentColor" d="M11.25,11.5c0-.68945-.56055-1.25-1.25-1.25s-1.25.56055-1.25,1.25c0,.40259.20361.74487.5.97363v.77637c0,.41406.33594.75.75.75s.75-.33594.75-.75v-.77637c.29639-.22876.5-.57104.5-.97363Z" />
          <path fill="currentColor" d="M15,7.02539v-.52539c0-2.75684-2.24316-5-5-5s-5,2.24316-5,5v.52539c-1.12158.12622-2,1.07007-2,2.22461v6.5c0,1.24023,1.00977,2.25,2.25,2.25h9.5c1.24023,0,2.25-1.00977,2.25-2.25v-6.5c0-1.15454-.87842-2.09839-2-2.22461ZM10,3c1.92969,0,3.5,1.57031,3.5,3.5v.5h-7v-.5c0-1.92969,1.57031-3.5,3.5-3.5ZM15.5,15.75c0,.41309-.33691.75-.75.75H5.25c-.41309,0-.75-.33691-.75-.75v-6.5c0-.41309.33691-.75.75-.75h9.5c.41309,0,.75.33691.75.75v6.5Z" />
        </svg>
      </span>`;
  }

  render() {
    return html`
      <header class="bar" part="bar">
        <div class="group group-start" part="group-start">
          ${this._chatDisabled ? nothing : html`
          <button type="button" class="icon-btn" part="btn toggle-before" data-action="open-panel-before" aria-label="Open before panel" @click=${() => this._openPanel('before')}>
            ${this._renderIcon('splitLeft')}
          </button>
          `}
          <button type="button" class="icon-btn" part="btn" data-action="undo" aria-label="Undo" ?disabled=${!this.undoAvailable} @click=${this._undo}>
            ${this._renderIcon('undo')}
          </button>
          <button
            type="button"
            class="icon-btn"
            part="btn"
            data-action="redo"
            aria-label="Redo"
            ?disabled=${!this.redoAvailable}
            @click=${this._redo}
          >
            ${this._renderIcon('redo')}
          </button>
          ${this.authorized && !this.canWrite ? this._renderLock() : nothing}
        </div>

        <div class="group group-center" part="group-center">
          ${this.authorized ? html`
          <div class="segmented" role="group" aria-label="Editor view" part="editor-view-toggle">
            <button
              type="button"
              class="segment ${this.editorView === 'layout' ? 'is-selected' : ''}"
              aria-pressed=${this.editorView === 'layout'}
              @click=${() => this._setEditorView('layout')}
            >Layout</button>
            <button
              type="button"
              class="segment ${this.editorView === 'content' ? 'is-selected' : ''}"
              aria-pressed=${this.editorView === 'content'}
              @click=${() => this._setEditorView('content')}
            >Content</button>
            <button
              type="button"
              class="segment segment-icon ${this.editorView === 'split' ? 'is-selected' : ''}"
              aria-pressed=${this.editorView === 'split'}
              aria-label="Split view"
              title="Split view"
              @click=${() => this._setEditorView('split')}
            >${this._renderIcon('gridCompare')}</button>
          </div>
          ` : nothing}
        </div>

        <div class="group group-end" part="group-end">
          <button type="button" class="icon-btn" part="btn toggle-after" data-action="open-panel-after" aria-label="Open after panel" @click=${() => this._openPanel('after')}>
            ${this._renderIcon('splitRight')}
          </button>
        </div>
      </header>
    `;
  }
}

customElements.define('ew-canvas-header', EWCanvasHeader);
