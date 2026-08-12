import {getListLevel, setListStyle} from '../sections/listManager.js';

const STYLES = ['disc', 'circle', 'square', 'decimal', 'lower-alpha', 'upper-alpha', 'lower-roman', 'upper-roman'];

const overlay = document.createElement('div');
overlay.className = 'confirm-modal-overlay list-settings-overlay';
overlay.innerHTML = `
  <div class="confirm-modal list-settings-modal">
    <h3>Stile elenco</h3>
    <div class="list-settings-styles"></div>
    <div class="confirm-modal-actions">
      <button type="button" class="confirm-modal-cancel list-settings-close">Chiudi</button>
    </div>
  </div>`;
document.body.appendChild(overlay);

const stylesEl = overlay.querySelector('.list-settings-styles');
let current = null;

overlay.querySelector('.list-settings-close').addEventListener('click', close);

function close() {
    overlay.classList.remove('open');
    current = null;
}

function renderStyles(activeStyle) {
    stylesEl.innerHTML = '';
    STYLES.forEach(style => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = style;
        btn.className = 'list-style-option' + (style === activeStyle ? ' active' : '');
        btn.addEventListener('click', () => {
            setListStyle(current.blockId, current.listItemId, current.parentItemId, style);
            refresh();
        });
        stylesEl.appendChild(btn);
    });
}

function refresh() {
    const level = getListLevel(current.blockId, current.listItemId, current.parentItemId);
    if (!level) { close(); return; }
    renderStyles(level.style);
}

/**
 * Opens the style picker for one list level. Reordering used to live
 * here too (up/down arrows); it's now handled by the shared
 * reorderModal via the ⇅ button, so this modal is style-only.
 * @param {string} blockId
 * @param {string} listItemId
 * @param {string|null} parentItemId
 */
export function showListSettingsModal(blockId, listItemId, parentItemId = null) {
    current = {blockId, listItemId, parentItemId};
    overlay.classList.add('open');
    refresh();
}