import {getState, updateBlock, removeBlock} from "../state.js";
import {
    addContentItem,
    getBlockLabel, getContentItemData,
    mutateContentItemData,
    mutateContentItemWith
} from "./sectionManager.js";
import {normalizeEmptyEditable} from "../utils.js";
import {addListItem, updateListItemText} from "./listManager.js";
import {showConfirmModal} from "../components/confirmModal.js";
import {showListSettingsModal} from '../components/listSettingsModal.js';
import {
    mutateImageWidth,
    pickImageSource,
    scaleImageWidth,
    setImageAlign, setImagePosition,
    setImageSource,
    setImageWidth
} from "../services/manageImages.js";

const contentEl = document.getElementById('content');

export function bindSectionEvents() {
    contentEl.addEventListener('click', onContentClick);
    contentEl.addEventListener('input', onContentInput);
    contentEl.addEventListener('change', inputSizeImageInput);
}

function inputSizeImageInput(e) {
    if (e.target.dataset.role === 'image-width-px') {
        const val = Number(e.target.value);
        if (val && val > 0) {
            setImageWidth(itemBlockId(e.target), itemId(e.target), String(val));
        }
    }
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

    const styleBtn = e.target.closest('[data-role="list-style-toggle"]');
    if (styleBtn) {
        const parentItemId = styleBtn.dataset.parentItemId || null;
        showListSettingsModal(itemBlockId(styleBtn), itemId(styleBtn), parentItemId);
        return;
    }

    const imageBtn = e.target.closest('[data-action="pick-image-source"]');
    if (imageBtn) {
        const imageData = await pickImageSource();
        if (imageData) {
            setImageSource(itemBlockId(imageBtn), itemId(imageBtn), imageData);
        }
        return;
    }

    const alignBtn = e.target.closest('[data-action="set-image-align"]');
    if (alignBtn) {
        setImageAlign(itemBlockId(alignBtn), itemId(alignBtn), alignBtn.dataset.align);
        return;
    }

    const widthBtn = e.target.closest('[data-action="set-image-width"]');
    if (widthBtn) {
        setImageWidth(itemBlockId(widthBtn), itemId(widthBtn), widthBtn.dataset.width);
        return;
    }

    const scaleBtn = e.target.closest('[data-action="scale-image"]');
    if (scaleBtn) {
        const factor = Number(scaleBtn.dataset.scale);
        scaleImageWidth(itemBlockId(scaleBtn), itemId(scaleBtn), factor);
        return;
    }

    const toggleAdvBtn = e.target.closest('[data-action="toggle-image-advanced"]');
    if (toggleAdvBtn) {
        const wrapper = toggleAdvBtn.closest('.image-advanced-wrapper');
        if (wrapper) {
            document.querySelectorAll('.image-advanced-wrapper.is-open').forEach(w => {
                if (w !== wrapper) w.classList.remove('is-open');
            });
            wrapper.classList.toggle('is-open');
        }
        return;
    }

    const positionBtn = e.target.closest('[data-action="set-image-position"]');
    if (positionBtn) {
        setImagePosition(itemBlockId(positionBtn), itemId(positionBtn), positionBtn.dataset.align);
        return;
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
        case 'image-width-px':
            handleImagePixelWidthInput(el);
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


function handleImagePixelWidthInput(el) {
    const val = Number(el.value);
    const figure = el.closest('figure.content-image');
    if (!figure) return;

    const blockId = itemBlockId(el);
    const currentItemId = itemId(el);
    const itemData = getContentItemData(blockId, currentItemId);
    const originalWidth = itemData?.originalWidth || 0;

    const media = figure.querySelector('.content-image-media');
    const warningBox = figure.querySelector('.resolution-warning');

    if (val && val > 0) {
        if (media) {
            media.style.width = `${val}px`;
            media.style.maxWidth = '100%';
        }
        if (warningBox && originalWidth > 0) {
            if (val > originalWidth) {
                warningBox.style.display = 'block';
                warningBox.innerHTML = `⚠️ <strong>Attenzione:</strong> La larghezza impostata (${val}px) supera quella originale (${originalWidth}px). L'immagine potrebbe risultare sgranata.`;
            } else {
                warningBox.style.display = 'none';
            }
        }
        mutateImageWidth(blockId, currentItemId, val);
    } else if (el.value === '') {
        if (media) {
            media.style.width = 'max-content';
        }
        if (warningBox) warningBox.style.display = 'none';
        mutateImageWidth(blockId, currentItemId, 'auto');
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