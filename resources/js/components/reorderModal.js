import {showConfirmModal} from "./confirmModal.js";
import {getState, removeBlock, setSections} from "../state.js";
import {getBlockLabel, getContainerContent, removeContentItem, setContentItems} from "../sections/sectionManager.js";
import {getDropIndex} from "../utils.js";
import {getListLevel, removeListItem, setListItems} from "../sections/listManager.js";

const TYPE_LABELS = {
    paragraph: 'Paragrafo', list: 'Elenco', image: 'Immagine',
    imageText: 'Immagine + testo', table: 'Tabella',
};

// Mirror of MAX_SUBSECTION_DEPTH (sectionManager.js) and MAX_LIST_DEPTH
// (listManager.js) — not exported from there, so duplicated here to
// validate cross-level drag-and-drop moves before they're committed.
const SECTION_DEPTH_CAP = 2;
const LIST_DEPTH_CAP = 2;

const overlay = document.createElement('div');
overlay.className = 'reorder-modal-overlay';
overlay.innerHTML = `
  <button type="button" class="reorder-modal-cancel-corner" title="Annulla">✕</button>
  <div class="reorder-modal-panel">
    <h3 class="reorder-modal-title"></h3>
    <ul class="reorder-modal-list"></ul>
    <div class="reorder-modal-actions">
      <button type="button" class="reorder-modal-cancel">Annulla</button>
      <button type="button" class="reorder-modal-save">Salva</button>
    </div>
  </div>`;
document.body.appendChild(overlay);

const panelEl = overlay.querySelector('.reorder-modal-panel');
const titleEl = overlay.querySelector('.reorder-modal-title');
const listEl = overlay.querySelector('.reorder-modal-list');

// Wider panel + scrollable body, so nested trees stay readable instead
// of squeezing everything into the old fixed width.
panelEl.style.width = 'min(95vw, 960px)';
panelEl.style.maxWidth = '95vw';
panelEl.style.maxHeight = '85vh';
panelEl.style.display = 'flex';
panelEl.style.flexDirection = 'column';
listEl.style.overflowY = 'auto';
listEl.style.flex = '1 1 auto';

/**
 * @type {{scope: 'document'}|{scope: 'section', blockId: string, containerId: string}|{scope:'list', blockId:string, listItemId:string, parentItemId:string|null}|null}
 */
let context = null;

// Every container level (the whole document's block list, a section/
// subsection body, or one level of a list) is registered under its own
// synthetic key in containersMap, so every level — root and every
// nested level below it — is shown and editable together in a single
// modal. Nodes can now be dragged not just within their own level but
// across levels too (e.g. promoting a paragraph out of a subsection to
// sit next to it), which is why this is a shared map keyed by container
// rather than one flat array per open() call.
let containersMap = new Map();
let nodesById = new Map();
let rootKey = null;

// Drag session bookkeeping (delegated at the panel level so a drag can
// move an item across nested <ul>s, not just reorder within one).
let draggingNode = null;
let draggingOriginKey = null;
let draggingLiEl = null;
let dragOriginParent = null;
let dragOriginNext = null;

overlay.querySelector('.reorder-modal-cancel').addEventListener('click', handleCancel);
overlay.querySelector('.reorder-modal-cancel-corner').addEventListener('click', handleCancel);
overlay.querySelector('.reorder-modal-save').addEventListener('click', handleSave);

async function handleCancel() {
    if (await showConfirmModal('Annullare le modifiche di riordino?')) {
        close();
    }
}

function handleSave() {
    // Cross-level moves can change a subsection's nesting depth, or a
    // list item's depth — fix those up right before writing, so the
    // committed data always matches where each node actually ended up.
    containersMap.forEach(data => {
        if (data.kind === 'section') {
            data.entries.forEach(node => {
                if (node.ref.type === 'subsection') recomputeSectionDepths(node, data.depth + 1);
            });
        } else if (data.kind === 'list') {
            data.entries.forEach(node => recomputeListDepths(node, data.depth));
        }
    });

    containersMap.forEach(data => {
        if (data.kind === 'document') {
            setSections(data.entries.map(n => n.ref));
        } else if (data.kind === 'section') {
            setContentItems(data.blockId, data.containerId, data.entries.map(n => n.ref));
        } else {
            setListItems(data.blockId, data.listItemId, data.parentItemId, data.entries.map(n => n.ref));
        }
    });
    close();
}

function close() {
    overlay.classList.remove('open');
    context = null;
    containersMap = new Map();
    nodesById = new Map();
    rootKey = null;
}

/**
 * Opens the reorder modal.
 * - {scope:'document'}: sections + signature blocks, by title/label only.
 * - {scope:'section', blockId, containerId}: the given container's own
 *   content items, AND — recursively — the content of every nested
 *   subsection underneath it. Items (including whole subsections) can
 *   be dragged across levels: e.g. drag a paragraph out of a subsection
 *   to become a direct sibling of it, or drag it into another
 *   subsection. containerId defaults to blockId.
 * - {scope:'list', blockId, listItemId, parentItemId}: one list level's
 *   items, AND — recursively — every nested sub-level, with the same
 *   cross-level dragging (promote a bullet out of its parent, or nest
 *   one bullet under another).
 * Reordering/moving happens on a local copy; nothing is written to
 * state until "Salva". Deleting via the trash icon is immediate, as
 * before. Depth caps (max subsection nesting / max list nesting) are
 * enforced while dragging: an invalid cross-level drop snaps back.
 * @param {{scope:'document'}|{scope:'section', blockId:string, containerId?:string}|{scope:'list', blockId:string, listItemId:string, parentItemId?:string|null}} ctx
 */
export function openReorderModal(ctx) {
    listEl.innerHTML = '';
    listEl.removeAttribute('data-container-key');
    containersMap = new Map();
    nodesById = new Map();

    if (ctx.scope === 'document') {
        context = ctx;
        titleEl.textContent = 'Riordina sezioni';
        rootKey = buildDocumentTree();
    } else if (ctx.scope === 'section') {
        const containerId = ctx.containerId ?? ctx.blockId;
        context = {...ctx, containerId};
        titleEl.textContent = containerId === ctx.blockId
            ? 'Riordina contenuto sezione'
            : 'Riordina contenuto sottosezione';
        const container = getContainerContent(ctx.blockId, containerId);
        rootKey = buildSectionTree(ctx.blockId, containerId, container?.content ?? [], container?.depth ?? 0);
    } else {
        context = ctx;
        titleEl.textContent = 'Riordina elenco';
        const parentItemId = ctx.parentItemId ?? null;
        const level = getListLevel(ctx.blockId, ctx.listItemId, parentItemId);
        const depth = parentItemId === null ? 1 : 2;
        rootKey = buildListTree(ctx.blockId, ctx.listItemId, parentItemId, level?.items ?? [], depth);
    }
    populateContainer(listEl, rootKey);
    overlay.classList.add('open');
}

// ______________________________________________________________________
// Tree building
// ______________________________________________________________________

function buildDocumentTree() {
    const entries = getState().sections.map(b => {
        const node = {id: b.id, label: getBlockLabel(b), ref: b, containerKey: null};
        nodesById.set(node.id, node);
        return node;
    });
    const key = 'document:root';
    containersMap.set(key, {kind: 'document', entries, depth: 0});
    return key;
}

function sectionKey(blockId, containerId) {
    return `section:${blockId}:${containerId}`;
}

/**
 * @param {string} blockId
 * @param {string} containerId
 * @param {ContentItem[]} content
 * @param {number} depth - depth of THIS container (items placed directly here).
 * @returns {string} the key under which this level is registered in containersMap.
 */
function buildSectionTree(blockId, containerId, content, depth) {
    const entries = content.map(item => {
        const node = {id: item.id, label: labelForItem(item), ref: item, containerKey: null};
        nodesById.set(node.id, node);
        if (item.type === 'subsection' && item.data.content.length > 0) {
            node.containerKey = buildSectionTree(blockId, item.id, item.data.content, item.data.depth);
        }
        return node;
    });
    const key = sectionKey(blockId, containerId);
    containersMap.set(key, {kind: 'section', blockId, containerId, entries, depth});
    return key;
}

function listKey(blockId, listItemId, parentItemId) {
    return `list:${blockId}:${listItemId}:${parentItemId ?? '__root__'}`;
}

/**
 * @param {string} blockId
 * @param {string} listItemId
 * @param {string|null} parentItemId
 * @param {ListItem[]} items
 * @param {number} depth - depth of THIS container (items placed directly here).
 * @returns {string}
 */
function buildListTree(blockId, listItemId, parentItemId, items, depth) {
    const entries = items.map(it => {
        const node = {id: it.id, label: stripHtml(it.html) || '(vuoto)', ref: it, containerKey: null};
        nodesById.set(node.id, node);
        if (it.children && it.children.length > 0) {
            node.containerKey = buildListTree(blockId, listItemId, it.id, it.children, depth + 1);
        }
        return node;
    });
    const key = listKey(blockId, listItemId, parentItemId);
    containersMap.set(key, {kind: 'list', blockId, listItemId, parentItemId, entries, depth});
    return key;
}

// ______________________________________________________________________
// Rendering
// ______________________________________________________________________

/**
 * Fills an existing <ul> with the entries of one container level. Used
 * both for the root level (the static listEl) and, via renderContainer,
 * for freshly created nested <ul>s.
 * @param {HTMLUListElement} ulEl
 * @param {string} key
 */
function populateContainer(ulEl, key) {
    const data = containersMap.get(key);
    ulEl.dataset.containerKey = key;
    data.entries.forEach(node => ulEl.appendChild(renderNode(node)));
}

/**
 * Creates a brand-new nested <ul> for a sub-level (a subsection body or
 * a nested list level).
 * @param {string} key
 * @returns {HTMLUListElement}
 */
function renderContainer(key) {
    const ul = document.createElement('ul');
    ul.className = 'reorder-modal-list reorder-nested-list';
    ul.style.marginLeft = '1.5em';
    ul.style.borderLeft = '2px solid var(--accent, #ccc)';
    ul.style.paddingLeft = '0.75em';
    ul.style.minHeight = '0.5em'; // keeps an emptied container droppable
    populateContainer(ul, key);
    return ul;
}

/**
 * @param {{id:string,label:string,ref:Object,containerKey:string|null}} node
 * @returns {HTMLLIElement}
 */
function renderNode(node) {
    const li = document.createElement('li');
    li.draggable = true;
    li.dataset.id = node.id;

    const row = document.createElement('div');
    row.className = 'reorder-item-row';

    const handle = document.createElement('span');
    handle.className = 'reorder-drag-handle';
    handle.textContent = '⠿';
    row.appendChild(handle);

    const label = document.createElement('span');
    label.className = 'reorder-item-label';
    label.textContent = node.label;
    row.appendChild(label);

    const trash = document.createElement('button');
    trash.type = 'button';
    trash.className = 'reorder-trash-btn';
    trash.textContent = '🗑';
    trash.title = 'Elimina';
    trash.addEventListener('click', () => handleTrash(node));
    row.appendChild(trash);

    li.appendChild(row);

    if (node.containerKey) {
        li.appendChild(renderContainer(node.containerKey));
    }
    return li;
}

// ______________________________________________________________________
// Drag & drop — delegated at the panel level so a dragged item can be
// dropped into ANY visible <ul>, not just its own, which is what makes
// promoting/demoting across levels possible.
// ______________________________________________________________________

panelEl.addEventListener('dragstart', e => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    li.classList.add('dragging');
    draggingLiEl = li;
    draggingNode = nodesById.get(li.dataset.id);
    draggingOriginKey = li.parentElement.dataset.containerKey;
    dragOriginParent = li.parentElement;
    dragOriginNext = li.nextSibling;
});

panelEl.addEventListener('dragend', () => {
    draggingLiEl?.classList.remove('dragging');
    draggingNode = null;
    draggingOriginKey = null;
    draggingLiEl = null;
    dragOriginParent = null;
    dragOriginNext = null;
});

panelEl.addEventListener('dragover', e => {
    if (!draggingLiEl) return;
    const ul = e.target.closest('ul.reorder-modal-list');
    if (!ul) return;
    // Never let a container be dropped inside its own subtree.
    if (ul !== draggingLiEl.parentElement && draggingLiEl.contains(ul)) return;
    e.preventDefault();
    const index = getDropIndex(ul, e.clientY, ':scope > li');
    const ref = ul.children[index];
    if (ref === draggingLiEl) return;
    if (ref) ul.insertBefore(draggingLiEl, ref);
    else ul.appendChild(draggingLiEl);
});

panelEl.addEventListener('drop', e => {
    if (!draggingLiEl) return;
    e.preventDefault();

    const targetUl = draggingLiEl.parentElement;
    const targetKey = targetUl?.dataset.containerKey;
    const originKey = draggingOriginKey;

    if (targetKey && targetKey !== originKey && !validateDrop(draggingNode, targetKey)) {
        // Depth cap exceeded (e.g. nesting a subsection or list item too
        // deep) — snap back to where the drag started.
        if (dragOriginNext && dragOriginNext.parentElement === dragOriginParent) {
            dragOriginParent.insertBefore(draggingLiEl, dragOriginNext);
        } else {
            dragOriginParent.appendChild(draggingLiEl);
        }
        syncContainerFromDom(originKey);
        return;
    }

    syncContainerFromDom(originKey);
    if (targetKey && targetKey !== originKey) syncContainerFromDom(targetKey);
});

/**
 * Rebuilds one container's entries array from the live DOM order of its
 * <ul>. Called after any drop that touched that container (as source,
 * target, or both).
 * @param {string} key
 */
function syncContainerFromDom(key) {
    if (!key) return;
    const ul = panelEl.querySelector(`[data-container-key="${cssEscape(key)}"]`);
    const data = containersMap.get(key);
    if (!ul || !data) return;
    data.entries = [...ul.children].map(li => nodesById.get(li.dataset.id)).filter(Boolean);
}

/**
 * Checks whether moving `node` into container `targetKey` respects the
 * relevant depth cap. Only subsections (section scope) and list items
 * that themselves carry children (list scope) can violate it — plain
 * leaf content (paragraph, image, table…) can move anywhere.
 * @param {{ref:Object, containerKey:string|null}} node
 * @param {string} targetKey
 * @returns {boolean}
 */
function validateDrop(node, targetKey) {
    const targetData = containersMap.get(targetKey);
    if (!targetData) return false;

    if (targetData.kind === 'section') {
        if (node.ref.type !== 'subsection') return true;
        const span = subtreeSpan(node, n => n.ref.type === 'subsection');
        return targetData.depth + 1 + span <= SECTION_DEPTH_CAP;
    }
    if (targetData.kind === 'list') {
        const span = subtreeSpan(node, () => true);
        return targetData.depth + span <= LIST_DEPTH_CAP;
    }
    return true; // document scope: no depth constraint
}

/**
 * How many extra nested levels exist below `node`, counting only
 * descendants matching `predicate` (subsections only, for section
 * scope; every item, for list scope, since any list item can nest).
 * @param {{containerKey:string|null}} node
 * @param {(n:Object)=>boolean} predicate
 * @returns {number}
 */
function subtreeSpan(node, predicate) {
    if (!node.containerKey) return 0;
    const data = containersMap.get(node.containerKey);
    if (!data || data.entries.length === 0) return 0;
    const relevant = data.entries.filter(predicate);
    if (relevant.length === 0) return 0;
    return 1 + Math.max(...relevant.map(child => subtreeSpan(child, predicate)));
}

// ______________________________________________________________________
// Depth fix-up at save time (mutates the actual data, so it only
// happens once the user commits — not while merely dragging).
// ______________________________________________________________________

/**
 * @param {{ref:ContentItem, containerKey:string|null}} node
 * @param {number} depth
 */
function recomputeSectionDepths(node, depth) {
    node.ref.data.depth = depth;
    if (node.containerKey) {
        const data = containersMap.get(node.containerKey);
        data.depth = depth;
        data.entries.forEach(child => {
            if (child.ref.type === 'subsection') recomputeSectionDepths(child, depth + 1);
        });
    }
}

/**
 * @param {{ref:ListItem, containerKey:string|null}} node
 * @param {number} depth
 */
function recomputeListDepths(node, depth) {
    node.ref.depth = depth;
    if (node.containerKey) {
        const data = containersMap.get(node.containerKey);
        data.depth = depth + 1;
        data.entries.forEach(child => recomputeListDepths(child, depth + 1));
    }
}

// ______________________________________________________________________
// Helpers
// ______________________________________________________________________

/** @param {string} html @returns {string} */
function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || '';
}

/** @param {ContentItem} item @returns {string} */
function labelForItem(item) {
    if (item.type === 'subsection') return `Sottosezione: ${item.data.title || 'senza titolo'}`;
    return TYPE_LABELS[item.type] || item.type;
}

/**
 * Deletes a node from whichever level of the tree it belongs to. The
 * deletion itself is immediate (same as before — not deferred to
 * "Salva"); only the affected level is then repainted, so any
 * not-yet-saved reordering/moving elsewhere in the tree is preserved.
 * @param {{id:string,ref:Object,containerKey:string|null}} node
 */
async function handleTrash(node) {
    let ownerKey = null, ownerData = null;
    for (const [key, data] of containersMap) {
        if (data.entries.includes(node)) {
            ownerKey = key;
            ownerData = data;
            break;
        }
    }
    if (!ownerData) return;

    let message = 'Eliminare questo elemento?';
    if (ownerData.kind === 'document') message = `Eliminare "${node.label}"?`;
    else if (ownerData.kind === 'section' && node.ref.type === 'subsection') message = `Eliminare "${node.label}" e tutto il suo contenuto?`;
    else if (ownerData.kind === 'list') message = 'Eliminare questa voce?';

    if (!(await showConfirmModal(message))) return;

    if (ownerData.kind === 'document') removeBlock(node.id);
    else if (ownerData.kind === 'section') removeContentItem(ownerData.blockId, node.id);
    else removeListItem(ownerData.blockId, ownerData.listItemId, node.id);

    ownerData.entries = ownerData.entries.filter(n => n.id !== node.id);
    repaintContainer(ownerKey);
    nodesById.delete(node.id);
    if (node.containerKey) containersMap.delete(node.containerKey);
}

/**
 * @param {string} key
 */
function repaintContainer(key) {
    if (key === rootKey) {
        listEl.innerHTML = '';
        populateContainer(listEl, key);
        return;
    }
    const existing = panelEl.querySelector(`[data-container-key="${cssEscape(key)}"]`);
    if (!existing) return;
    existing.replaceWith(renderContainer(key));
}

/** @param {string} s @returns {string} */
function cssEscape(s) {
    return window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}