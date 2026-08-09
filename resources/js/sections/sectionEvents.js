import {getState, updateBlock, removeBlock} from "../state.js";
import {
    addContentItem,
    getBlockLabel,
    mutateContentItemData,
    mutateContentItemWith
} from "./sectionManager.js";
import {normalizeEmptyEditable} from "../utils.js";
import {addListItem, updateListItemText} from "./listManager.js";
import {showConfirmModal} from "../components/confirmModal.js";
import {showListSettingsModal} from '../components/listSettingsModal.js';

const contentEl = document.getElementById('content');
const LIST_STYLE_CYCLE = ['disc', 'circle', 'square', 'decimal', 'lower-alpha', 'upper-alpha', 'lower-roman', 'upper-roman'];

export function bindSectionEvents() {
    contentEl.addEventListener('click', onContentClick);
    contentEl.addEventListener('input', onContentInput);
}

/**
 * @param {MouseEvent} e
 */
function onContentClick(e) {
    const removeBtn = e.target.closest('[data-action="remove-block"]');
    if (removeBtn) {
        handleRemoveBlock(removeBtn.dataset.blockId).then();
        return;
    }

    const addBtn = e.target.closest('[data-action="add-content-item"]');
    if (addBtn) {
        addContentItem(addBtn.dataset.blockId, addBtn.dataset.containerId, addBtn.dataset.type);
        return;
    }

    const addListBtn = e.target.closest('[data-action="add-list-item"]');
    if (addListBtn) {
        const parentItemId = addListBtn.dataset.parentItemId || null;
        addListItem(itemBlockId(addListBtn), itemId(addListBtn), parentItemId);
        return;
    }

    const styleBtn = e.target.closest('[data-role="list-style-toggle"]');
    if (styleBtn) {
        showListSettingsModal(itemBlockId(styleBtn), itemId(styleBtn));
    }
}

/**
 * @param {string} blockId
 */
async function handleRemoveBlock(blockId) {
    const block = getState().sections.find(b => b.id === blockId);
    if (!block) return;
    if (await showConfirmModal(`Eliminare "${getBlockLabel(block)}"?`)) {
        removeBlock(blockId);
    }
}

/**
 * Cycles a list's bullet style through LIST_STYLE_CYCLE.
 * @param {HTMLElement} btn
 */
function handleListStyleToggle(btn) {
    const ul = btn.closest('[data-item-id]').querySelector('ul');
    const current = ul.style.listStyleType || 'disc';
    const next = LIST_STYLE_CYCLE[(LIST_STYLE_CYCLE.indexOf(current) + 1) % LIST_STYLE_CYCLE.length];
    setContentItemData(itemBlockId(btn), itemId(btn), {style: next});
}

/**
 * Route typing in any contenteditable filed inside #content to correct state mutation based on its data-role.
 * @param {InputEvent} e
 */
function onContentInput(e) {
    const el = e.target;
    const role = el.dataset.role;
    if (!role) return;

    normalizeEmptyEditable(el);

    switch (role) {
        case 'section-title':
            updateBlock(el.dataset.blockId, {title: el.textContent});
            break;
        case 'signature-text':
            updateBlock(el.dataset.blockId, {text: el.textContent});
            break;
        case 'subsection-title':
            mutateContentItemData(el.dataset.blockId, el.dataset.itemId, {title: el.textContent});
            break;
        case 'paragraph':
        case 'image-text-body':
            mutateContentItemData(itemBlockId(el), itemId(el), {html: el.innerHTML});
            break;
        case 'image-caption':
            mutateContentItemData(itemBlockId(el), itemId(el), {caption: el.textContent});
            break;
        case 'list-item':
            updateListItemText(itemBlockId(el), itemId(el), el.dataset.listItemId, el.innerHTML);
            break;
        case 'table-cell':
            handleTableCellInput(el);
            break;
    }
}

/**
 * @param {HTMLElement} el
 */
function handleListItemInput(el) {
    const index = Number(el.dataset.itemIndex);
    mutateContentItemWith(itemBlockId(el), itemId(el), data => data.items[index] = el.innerHTML);
}

/**
 * @param {HTMLElement} el
 */
function handleTableCellInput(el) {
    const row = Number(el.dataset.row);
    const col = Number(el.dataset.col);
    mutateContentItemWith(itemBlockId(el), itemId(el), data => data.rows[row][col] = el.innerHTML);
}

/**
 * @param {HTMLElement} el
 * @returns {string}
 */
function itemBlockId(el) {
    return el.closest('[data-item-id]').dataset.blockId;
}

/**
 * @param {HTMLElement} el
 * @returns {string}
 */
function itemId(el) {
    return el.closest('[data-item-id]').dataset.itemId;
}