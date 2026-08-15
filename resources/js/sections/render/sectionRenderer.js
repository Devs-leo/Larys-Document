import {getState} from "../../state.js";
import {contentItemRenderers} from "./contentItemRenderers.js";
import {renderAddContentBar, renderContentInsertGap} from "./containerRenderer.js";
import {renderIndex} from "./indexRenderer.js";

const contentEl = document.getElementById('content');

/**
 * @typedef {Object} RenderCtx
 * @property {string} blockId - The top level section block this render belongs to
 * @property {number} containerDepth - depth of the immediate container.
 */

/**
 * @param {DocumentState} [state]
 */
export function renderSection(state = getState()) {
    contentEl.innerHTML = '';
    state.sections.forEach(block => {
        contentEl.appendChild(renderBlock(block));
    });
    renderIndex(state);
}

/**
 * @param {Block} block
 * @returns {HTMLElement}
 */
function renderBlock(block) {
    return block.type === 'signature' ? renderSignatureBlock(block) : renderSectionBlock(block);
}

/**
 * @param {Block} block - type: "section"
 * @returns {HTMLElement}
 */
function renderSectionBlock(block) {
    const el = document.createElement('div');
    el.className = 'section';
    el.dataset.blockId = block.id;

    const h2 = document.createElement('h2');
    h2.id = `section-${block.id}`;
    h2.contentEditable = 'true';
    h2.textContent = block.data.title;
    h2.dataset.blockId = block.id;
    h2.dataset.role = 'section-title';
    el.appendChild(h2);

    const body = document.createElement('div');
    body.className = 'section-body';
    body.dataset.containerId = block.id;
    body.dataset.blockId = block.id;
    body.dataset.depth = '0';


    const ctx = {blockId: block.id, containerDepth: 0};
    block.data.content.forEach((item, index) => {
        if (index > 0) {
            body.appendChild(renderContentInsertGap(block.id, block.id, block.data.content[index].id, 0))
        }
        body.appendChild(renderContentItem(item, ctx));
    });
    body.appendChild(renderAddContentBar(block.id, block.id, 0));
    el.appendChild(body);
    const rail = document.createElement('div');
    rail.className = 'section-reorder-rail';
    const railBtn = document.createElement('button');
    railBtn.type = 'button';
    railBtn.className = 'section-reorder-btn';
    railBtn.textContent = '⇅';
    railBtn.title = 'Riordina contenuto sezione';
    railBtn.dataset.action = 'open-section-reorder';
    railBtn.dataset.blockId = block.id;
    railBtn.dataset.containerId = block.id;
    rail.appendChild(railBtn);
    el.appendChild(rail);
    el.appendChild(renderSectionControls(block.id));
    return el;
}

/**
 * @param {Block} block - type: 'signature'
 * @returns {HTMLElement}
 */
function renderSignatureBlock(block) {
    const el = document.createElement('div');
    el.className = 'signature-block';
    el.dataset.blockId = block.id;

    const text = document.createElement('div');
    text.className = 'signature-text';
    text.contentEditable = 'true';
    text.textContent = block.data.text;
    text.dataset.blockId = block.id;
    text.dataset.role = 'signature-text';
    el.appendChild(text);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-sig';
    removeBtn.textContent = 'Rimuovi'; //TODO icona??
    removeBtn.dataset.blockId = block.id;
    removeBtn.dataset.action = 'remove-block';
    el.appendChild(removeBtn);

    return el;
}

/**
 * Static bottom controls for a section block.
 * @param {string} blockId
 * @returns {HTMLElement}
 */
function renderSectionControls(blockId) {
    const wrap = document.createElement('div');
    wrap.className = 'section-controls';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Elimina sezione';
    deleteBtn.dataset.blockId = blockId;
    deleteBtn.dataset.action = 'remove-block';
    wrap.appendChild(deleteBtn);

    return wrap;
}

/**
 * Dispatches to the registered renderer for a content item's type.
 * Exported because contentItemRenderers.js's renderSubsection recurses
 * into it to render its own nested content items (a subsection is just
 * another container, same as a section body).
 * @param {ContentItem} item
 * @param {RenderCtx} ctx
 * @returns {HTMLElement}
 */
export function renderContentItem(item, ctx) {
    const renderFn = contentItemRenderers[item.type];
    if (!renderFn) throw new Error(`No renderer registered for content-item type: "${item.type}"`);
    const el = renderFn(item, ctx);
    el.dataset.itemId = item.id;
    el.dataset.blockId = ctx.blockId;
    el.dataset.itemType = item.type;
    return el;
}
