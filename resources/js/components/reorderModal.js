import {showConfirmModal} from "./confirmModal.js";
import {getState, removeBlock, setSections} from "../state.js";
import {getBlockLabel, removeContentItem, setContentItems} from "../sections/sectionManager.js";
import {getDropIndex} from "../utils.js";
import {getListLevel} from "../sections/listManager.js";
import {removeListItem, setListItems} from "../sections/listManager.js";

const TYPE_LABELS = {
    paragraph: 'Paragrafo', list: 'Elenco', image: 'Immagine',
    imageText: 'Immagine + testo', table: 'Tabella',
};

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

const titleEl = overlay.querySelector('.reorder-modal-title');
const listEl = overlay.querySelector('.reorder-modal-list');

/**
 * @type {{scope: 'document'}|{scope: 'section', blockId: string}|{scope:'list', blockId:string, listItemId:string, parentItemId:string|null}|null}
 */
let context = null;
let entries = [];

overlay.querySelector('.reorder-modal-cancel').addEventListener('click', handleCancel);
overlay.querySelector('.reorder-modal-cancel-corner').addEventListener('click', handleCancel);
overlay.querySelector('.reorder-modal-save').addEventListener('click', handleSave);

async function handleCancel() {
    if (await showConfirmModal('Annullare le modifiche di riordino?')) {
        close();
    }
}

function handleSave() {
    const ids = entries.map(e => e.id);
    if (context.scope === 'document') {
        const byId = new Map(getState().sections.map(b => [b.id, b]));
        setSections(ids.map(id => byId.get(id)).filter(Boolean));
    } else if (context.scope === 'section') {
        const block = getState().sections.find(b => b.id === context.blockId);
        const byId = new Map((block?.data.content ?? []).map(it => [it.id, it]));
        setContentItems(context.blockId, context.blockId, ids.map(id => byId.get(id)).filter(Boolean));
    } else {
        const level = getListLevel(context.blockId, context.listItemId, context.parentItemId);
        const byId = new Map((level?.items ?? []).map(it => [it.id, it]));
        setListItems(context.blockId, context.listItemId, context.parentItemId, ids.map(id => byId.get(id)).filter(Boolean));
    }
    close();
}

function close() {
    overlay.classList.remove('open');
    context = null;
    entries = [];
}

/**
 * Opens the reorder modal.
 * - {scope:'document'}: sections + signature blocks, by title/label only.
 * - {scope:'section', blockId}: that section's own top-level content
 *   items (paragraphs, lists, images, tables, subsections — subsections
 *   listed by their title, not expanded).
 * Works entirely on a local copy; nothing is written until "Salva".
 * @param {{scope:'document'}|{scope:'section', blockId:string}} ctx
 */
export function openReorderModal(ctx) {
    context = ctx;
    if (ctx.scope === 'document') {
        titleEl.textContent = 'Riordina sezioni';
        entries = getState().sections.map(b => ({id: b.id, label: getBlockLabel(b)}));
    } else if (ctx.scope === 'section') {
        titleEl.textContent = 'Riordina contenuto sezione';
        const block = getState().sections.find(b => b.id === ctx.blockId);
        entries = (block?.data.content ?? []).map(it => ({id: it.id, label: labelForItem(it)}));
    } else {
        titleEl.textContent = 'Riordina elenco';
        const level = getListLevel(ctx.blockId, ctx.listItemId, ctx.parentItemId);
        entries = (level?.items ?? []).map(it => ({id: it.id, label: stripHtml(it.html) || '(vuoto)'}));
    }
    renderList();
    overlay.classList.add('open');
}

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

function renderList() {
    listEl.innerHTML = '';
    entries.forEach(entry => {
        const li = document.createElement('li');
        li.draggable = true;
        li.dataset.id = entry.id;

        const handle = document.createElement('span');
        handle.className = 'reorder-drag-handle';
        handle.textContent = '⠿';
        li.appendChild(handle);

        const label = document.createElement('span');
        label.className = 'reorder-item-label';
        label.textContent = entry.label;
        li.appendChild(label);

        const trash = document.createElement('button');
        trash.type = 'button';
        trash.className = 'reorder-trash-btn';
        trash.textContent = '🗑';
        trash.title = 'Elimina';
        trash.addEventListener('click', () => handleTrash(entry.id));
        li.appendChild(trash);

        li.addEventListener('dragstart', () => li.classList.add('dragging'));
        li.addEventListener('dragend', () => li.classList.remove('dragging'));

        listEl.appendChild(li);
    });
}

listEl.addEventListener('dragover', e => {
    e.preventDefault();
    const dragging = listEl.querySelector('.dragging');
    if (!dragging) return;
    const index = getDropIndex(listEl, e.clientY, ':scope > li');
    const ref = listEl.children[index];
    if (ref) listEl.insertBefore(dragging, ref);
    else listEl.appendChild(dragging);
});

listEl.addEventListener('drop', e => {
    e.preventDefault();
    entries = [...listEl.children]
        .map(li => entries.find(en => en.id === li.dataset.id))
        .filter(Boolean);
});

/**
 * @param {string} id
 */
async function handleTrash(id) {
    if (context.scope === 'document') {
        const block = getState().sections.find(b => b.id === id);
        if (!block) return;
        if (await showConfirmModal(`Eliminare "${getBlockLabel(block)}"?`)) {
            removeBlock(id);
            entries = entries.filter(e => e.id !== id);
            renderList();
        }
    } else if (context.scope === 'section') {
        if (await showConfirmModal('Eliminare questo elemento?')) {
            removeContentItem(context.blockId, id);
            entries = entries.filter(e => e.id !== id);
            renderList();
        }
    } else {
        if (await showConfirmModal('Eliminare questa voce?')) {
            removeListItem(context.blockId, context.listItemId, id);
            entries = entries.filter(e => e.id !== id);
            renderList();
        }
    }
}