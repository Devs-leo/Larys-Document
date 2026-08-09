import {getContentItemData, setContentItemData} from '../sections/sectionManager.js';
import {moveListItem} from '../sections/listManager.js';

const STYLES = ['disc', 'circle', 'square', 'decimal', 'lower-alpha', 'upper-alpha', 'lower-roman', 'upper-roman'];

const overlay = document.createElement('div');
overlay.className = 'confirm-modal-overlay list-settings-overlay';
overlay.innerHTML = `
  <div class="confirm-modal list-settings-modal">
    <h3>Impostazioni elenco</h3>
    <div class="list-settings-styles"></div>
    <ol class="list-settings-items"></ol>
    <div class="confirm-modal-actions">
      <button type="button" class="confirm-modal-cancel list-settings-close">Chiudi</button>
    </div>
  </div>`;
document.body.appendChild(overlay);

const stylesEl = overlay.querySelector('.list-settings-styles');
const itemsEl = overlay.querySelector('.list-settings-items');
let current = null;

overlay.querySelector('.list-settings-close').addEventListener('click', close);

function close() {
    overlay.classList.remove('open');
    current = null;
}

/** @param {string} activeStyle */
function renderStyles(activeStyle) {
    stylesEl.innerHTML = '';
    STYLES.forEach(style => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = style;
        btn.className = 'list-style-option' + (style === activeStyle ? ' active' : '');
        btn.addEventListener('click', () => {
            setContentItemData(current.blockId, current.listItemId, {style});
            refresh();
        });
        stylesEl.appendChild(btn);
    });
}

/** @param {ListItem[]} items */
function renderItems(items) {
    itemsEl.innerHTML = '';
    items.forEach((item, i) => {
        const li = document.createElement('li');

        const label = document.createElement('span');
        label.innerHTML = item.html || '(vuoto)';
        li.appendChild(label);

        const upBtn = document.createElement('button');
        upBtn.type = 'button';
        upBtn.textContent = '↑';
        upBtn.disabled = i === 0;
        upBtn.addEventListener('click', () => {
            moveListItem(current.blockId, current.listItemId, null, item.id, 'up');
            refresh();
        });
        li.appendChild(upBtn);

        const downBtn = document.createElement('button');
        downBtn.type = 'button';
        downBtn.textContent = '↓';
        downBtn.disabled = i === items.length - 1;
        downBtn.addEventListener('click', () => {
            moveListItem(current.blockId, current.listItemId, null, item.id, 'down');
            refresh();
        });
        li.appendChild(downBtn);

        itemsEl.appendChild(li);
    });
}

/** Re-reads the list's current data and redraws the modal in place. */
function refresh() {
    const data = getContentItemData(current.blockId, current.listItemId);
    if (!data) { close(); return; }
    renderStyles(data.style);
    renderItems(data.items);
}

/**
 * Opens the per-list settings modal: bullet style picker + top-level
 * item reordering via up/down buttons. Nested (depth-2) items aren't
 * reorderable here yet — first working version, scoped to top-level
 * bullets; drag-and-drop for all levels arrives with the document-wide
 * reorder modal.
 * @param {string} blockId
 * @param {string} listItemId
 */
export function showListSettingsModal(blockId, listItemId) {
    current = {blockId, listItemId};
    overlay.classList.add('open');
    refresh();
}