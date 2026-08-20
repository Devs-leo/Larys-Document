import {getState, updateBlock, removeBlock} from "../state.js";
import {
    addContentItem,
    getBlockLabel,
    mutateContentItemData,
    mutateContentItemWith
} from "./sectionManager.js";
import {normalizeEmptyEditable, itemBlockId, itemId} from "../utils.js";
import {addListItem, updateListItemText} from "./listManager.js";
import {showConfirmModal} from "../components/confirmModal.js";
import {showListSettingsModal} from '../components/listSettingsModal.js';
import {openReorderModal} from "../components/reorderModal.js";
import {bindImageEvents} from "./imageEvents.js";

const contentEl = document.getElementById('content');

/**
 * Wires content-area event delegation: structural actions on blocks/
 * content items (click) and free-text sync to state (input). Image
 * toolbar interactions live in imageEvents.js — bound here too, so
 * callers only need to invoke bindSectionEvents once.
 */
export function bindSectionEvents() {
    contentEl.addEventListener('click', onContentClick);
    contentEl.addEventListener('input', onContentInput);
    bindImageEvents();
}

/**
 * @param {MouseEvent} e
 */
async function onContentClick(e) {
    const removeBtn = e.target.closest('[data-action="remove-block"]');
    if (removeBtn) {
        handleRemoveBlock(removeBtn.dataset.blockId).then();
        return;
    }

    const gapBtn = e.target.closest('[data-action="toggle-content-inserter"]');
    if (gapBtn) {
        handleGapBtn(gapBtn);
        return;
    }

    const addBtn = e.target.closest('[data-action="add-content-item"]');
    if (addBtn) {
        const beforeItemId = addBtn.dataset.beforeItemId || null;
        addContentItem(addBtn.dataset.blockId, addBtn.dataset.containerId, addBtn.dataset.type, beforeItemId);
        return;
    }

    // "+ voce" (root/level button, dataset.parentItemId = '' or a level id)
    // and the per-item "+" nested-bullet button both use this action.
    const addListItemBtn = e.target.closest('[data-action="add-list-item"]');
    if (addListItemBtn) {
        const parentItemId = addListItemBtn.dataset.parentItemId || null;
        addListItem(itemBlockId(addListItemBtn), itemId(addListItemBtn), parentItemId);
        return;
    }

    const styleBtn = e.target.closest('[data-role="list-style-toggle"]');
    if (styleBtn) {
        const parentItemId = styleBtn.dataset.parentItemId || null;
        showListSettingsModal(itemBlockId(styleBtn), itemId(styleBtn), parentItemId);
        return;
    }

    const sectionReorderBtn = e.target.closest('[data-action="open-section-reorder"]');
    if (sectionReorderBtn) {
        openReorderModal({
            scope: 'section',
            blockId: sectionReorderBtn.dataset.blockId,
            containerId: sectionReorderBtn.dataset.containerId || sectionReorderBtn.dataset.blockId,
        });
        return;
    }

    const listReorderBtn = e.target.closest('[data-action="open-list-reorder"]');
    if (listReorderBtn) {
        const parentItemId = listReorderBtn.dataset.parentItemId || null;
        openReorderModal({
            scope: 'list',
            blockId: itemBlockId(listReorderBtn),
            listItemId: itemId(listReorderBtn),
            parentItemId,
        });
        //return;
    }
}

/**
 * @param {HTMLElement} gapBtn
 */
function handleGapBtn(gapBtn) {
    const gap = gapBtn.closest('.content-insert-gap');
    const isOpen = gap.classList.contains('is-open');
    closeContentInserters();
    if (!isOpen) gap.classList.add('is-open');
}

function closeContentInserters() {
    contentEl.querySelectorAll('.content-insert-gap.is-open').forEach(gap => {
        gap.classList.remove('is-open');
    });
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
 * Route typing in any contenteditable filed inside #content to correct state mutation based on its data-role.
 * (image-width-px is handled by imageEvents.js's own 'input' listener.)
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
function handleTableCellInput(el) {
    const row = Number(el.dataset.row);
    const col = Number(el.dataset.col);
    mutateContentItemWith(itemBlockId(el), itemId(el), data => data.rows[row][col] = el.innerHTML);
}