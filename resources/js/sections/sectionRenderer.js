import {getState} from "../state.js";
import {isSubsectionAllowed} from "./sectionManager.js";

const contentEl = document.getElementById('content');
const indexListEl = document.getElementById('index-list');
const indexEmptyEl = document.getElementById('index-empty');

/**
 * @typedef {Object} RenderCtx
 * @property {string} blockId - The top level section block this render belongs to
 * @property {number} containerDepth - depth of the immediate container.
 */

/**
 * Registry of render functions for content-item type.
 * @type {Object.<string, (item: ContentItem, ctx: RenderCtx) => HTMLElement>}
 */
const contentItemRenderers = {
    paragraph: renderParagraph,
    list: renderList,
    image: renderImage,
    imageText: renderImageText,
    table: renderTable,
    subsection: renderSubsection,
};

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
    block.data.content.forEach(item => {
        body.appendChild(renderContentItem(item, ctx));
    });
    el.appendChild(body);
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
 * @param {ContentItem} item
 * @param {RenderCtx} ctx
 * @returns {HTMLElement}
 */
function renderContentItem(item, ctx) {
    const renderFn = contentItemRenderers[item.type];
    if (!renderFn) throw new Error(`No renderer registered for content-item type: "${item.type}"`);
    const el = renderFn(item, ctx);
    el.dataset.itemId = item.id;
    el.dataset.blockId = ctx.blockId;
    el.dataset.itemType = item.type;
    el.draggable = true;
    return el;
}

/**
 * @param {ContentItem} item
 * @returns {HTMLElement}
 */
function renderParagraph(item) {
    const el = document.createElement('div');
    el.className = 'body-text';
    el.contentEditable = 'true';
    el.innerHTML = item.data.html;
    el.dataset.role = 'paragraph';
    return el;
}

/**
 * @param {ContentItem} item
 * @returns {HTMLElement}
 */
function renderList(item) {
    const wrap = document.createElement('div')
    wrap.className = 'list';

    const ul = document.createElement('ul');
    ul.style.listStyleType = item.data.style;
    item.data.items.forEach((html, i) => {
        const li = document.createElement('li');
        li.contentEditable = 'true';
        li.innerHTML = html;
        li.dataset.role = 'list-item';
        li.dataset.itemIndex = String(i);
        ul.appendChild(li);
    });
    wrap.appendChild(ul);

    const styleBtn = document.createElement('button');
    styleBtn.className = 'list-style-btn';
    styleBtn.type = 'button';
    styleBtn.textContent = '⚙';
    styleBtn.dataset.role = 'list-style-toggle';
    wrap.appendChild(styleBtn);
    return wrap;
}

/**
 * @param {ContentItem} item
 * @returns {HTMLElement}
 */
function renderImage(item) {
    const wrap = document.createElement('div');
    wrap.className = 'content-image';

    const img = document.createElement('img');
    img.src = item.data.src;
    img.alt = item.data.caption;
    wrap.appendChild(img);

    const caption = document.createElement('figcaption');
    caption.contentEditable = 'true';
    caption.textContent = item.data.caption;
    caption.dataset.role = 'image-caption';
    wrap.appendChild(caption);
    return wrap;
}

/**
 * @param {ContentItem} item
 * @returns {HTMLElement}
 */
function renderImageText(item) {
    const wrap = document.createElement('div');
    wrap.className = `content-image-text position-${item.data.imagePosition}`;

    const img = document.createElement('img');
    img.src = item.data.imageSrc;
    img.alt = item.data.imageCaption;

    const text = document.createElement('div');
    text.className = 'body-text';
    text.contentEditable = 'true';
    text.innerHTML = item.data.html;
    text.dataset.role = 'image-text-body';

    if (item.data.imagePosition === 'right') {
        wrap.appendChild(text);
        wrap.appendChild(img);
    } else {
        wrap.appendChild(img);
        wrap.appendChild(text);
    }
    return wrap;
}

/**
 * @param {ContentItem} item
 * @returns {HTMLElement}
 */
function renderTable(item) {
    const wrap = document.createElement('div');
    wrap.className = 'content-table';
    wrap.style.width = `${item.data.widthPercent}%`;

    const table = document.createElement('table');
    item.data.rows.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        row.forEach((cellHtml, colIndex) => {
            const td = document.createElement('td');
            const colWidth = item.data.columns[colIndex]?.widthPercent ?? 100 / row.length;
            td.style.width = `${colWidth}%`;
            td.contentEditable = 'true';
            td.innerHTML = cellHtml;
            td.dataset.role= 'table-cell';
            td.dataset.row = String(rowIndex);
            td.dataset.col = String(colIndex);
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });
    wrap.appendChild(table);
    return wrap;
}

/**
 * @param {ContentItem} item - type: 'subsection'
 * @param {RenderCtx} ctx
 * @returns {HTMLElement}
 */
function renderSubsection(item, ctx){
    const el = document.createElement('div');
    el.className = `subsection depth-${item.data.depth}`;

    const heading = document.createElement(item.data.depth === 1 ? 'h3': 'h4');
    heading.id = `section-${item.id}`;
    heading.contentEditable = 'true';
    heading.textContent = item.data.title;
    heading.dataset.blockId = ctx.blockId;
    heading.dataset.itemId = item.id;
    heading.dataset.role = 'subsection-title';
    el.appendChild(heading);

    const body = document.createElement('div');
    body.className = 'subsection-body';
    body.dataset.containerId = item.id;
    body.dataset.blockId = ctx.blockId;
    body.dataset.depth = String(item.data.depth);
    body.dataset.subsectionAllowed = String(isSubsectionAllowed(item.data.depth));

    const childCtx = {blockId: ctx.blockId, containerDepth: item.data.depth};
    item.data.content.forEach(child => body.appendChild(renderContentItem(child, childCtx)));
    el.appendChild(body);

    return el;
}

/**
* Rebuilds the TOC from state. Only "section" blocks produce a top-level
* entry (signature blocks are excluded on purpose). Nested subsections
* produce indented child entries, recursively, up to the depth cap.
* @param {DocumentState} state
*/
function renderIndex(state) {
    indexListEl.innerHTML = '';
    const sectionBlocks = state.sections.filter(b => b.type === 'section');

    if (sectionBlocks.length === 0) {
        indexEmptyEl.style.display = '';
        return;
    }
    indexEmptyEl.style.display = 'none';
    sectionBlocks.forEach(block => {
        indexListEl.appendChild(renderIndexEntry(block.id, block.data.title, 0));
        collectTocEntries(block.data.content, 1).forEach(entry => {
            indexListEl.appendChild(renderIndexEntry(entry.id, entry.title, entry.depth))
        });
    });
}


/**
 * @param {string} anchorId
 * @param {string} title
 * @param {number} depth
 * @returns {HTMLElement}
 */
function renderIndexEntry (anchorId, title, depth){
    const li = document.createElement('li');
    li.className = `toc-depth-${depth}`;

    const a = document.createElement('a');
    a.href = `#section-${anchorId}`;
    a.textContent = title;

    const dots = document.createElement('span');
    dots.className = 'dots';

    li.appendChild(a);
    li.appendChild(dots);
    return li;
}

/**
 * @param {ContentItem[]} content
 * @param {number} depth
 * @returns {{id: string, title: string, depth: number}[]}
 */
function collectTocEntries(content,depth){
    return content.filter(item => item.type ==='subsection').flatMap(item => [
        {id: item.id, title: item.data.title, depth},
        ...collectTocEntries(item.data.content, depth + 1)
    ]);
}