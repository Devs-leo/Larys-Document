import {isSubsectionAllowed} from "../sectionManager.js";

const ADDABLE_TYPES = [
    {type: 'paragraph', label: 'Paragrafo'},
    {type: 'list', label: 'Elenco'},
    {type: 'image', label: 'Immagine'},
    {type: 'imageText', label: 'Immagine + testo'},
    {type: 'table', label: 'Tabella'},
];

/**
 * Renders the "add content" button bar for a container (section body or
 * subsection body). Shared because both need the exact same set of
 * addable types plus the depth-gated subsection button.
 * @param {string} blockId
 * @param {string} containerId
 * @param {number} containerDepth
 * @param {string|null} beforeItemId
 * @returns {HTMLElement}
 */
export function renderAddContentBar(blockId, containerId, containerDepth, beforeItemId = null) {
    const bar = document.createElement('div');
    bar.className = 'add-content-bar';
    if (beforeItemId !== null) bar.dataset.beforeItemId = beforeItemId;

    if (isSubsectionAllowed(containerDepth)) {
        bar.appendChild(renderAddContentButton(blockId, containerId, 'subsection', '+ Sottosezione', beforeItemId));
    }

    ADDABLE_TYPES.forEach(({type, label}) => {
        bar.appendChild(renderAddContentButton(blockId, containerId, type, `+ ${label}`, beforeItemId));
    });
    return bar;
}

/**
 * @param {string} blockId
 * @param {string} containerId
 * @param {string} type
 * @param {string} label
 * @param {string} beforeItemId
 * @returns {HTMLElement}
 */
function renderAddContentButton(blockId, containerId, type, label, beforeItemId) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.dataset.action = 'add-content-item';
    btn.dataset.blockId = blockId;
    btn.dataset.containerId = containerId;
    btn.dataset.type = type;
    if (beforeItemId !== null) btn.dataset.beforeItemId = beforeItemId;
    return btn;
}

/**
 * Renders the collapsible "+" gap shown between two content items, which
 * expands into a full renderAddContentBar for inserting before a
 * specific item.
 * @param {string} blockId
 * @param {string} containerId
 * @param {string} beforeItemId
 * @param {number} containerDepth
 * @returns {HTMLDivElement}
 */
export function renderContentInsertGap(blockId, containerId, beforeItemId, containerDepth) {
    const gap = document.createElement('div');
    gap.className = 'content-insert-gap';
    gap.dataset.blockId = blockId;
    gap.dataset.containerId = containerId;
    gap.dataset.beforeItemId = beforeItemId;
    gap.dataset.depth = String(containerDepth);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'content-insert-gap-toggle';
    toggle.textContent = '+';
    toggle.title = 'Aggiungi sottosezione'
    toggle.dataset.action = 'toggle-content-inserter';
    toggle.dataset.blockId = blockId;
    toggle.dataset.containerId = containerId;
    toggle.dataset.beforeItemId = beforeItemId;
    gap.appendChild(toggle);

    gap.appendChild(renderAddContentBar(blockId, containerId, containerDepth, beforeItemId));
    return gap;
}
