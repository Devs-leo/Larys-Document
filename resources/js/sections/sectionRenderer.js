import {getState} from "../state.js";
import {isSubsectionAllowed} from "./sectionManager.js";
import {isListNestingAllowed} from "./listManager.js";

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
    block.data.content.forEach((item, index) => {
        if (index > 0) {
            body.appendChild(renderContentInsertGap(block.id, block.id, block.data.content[index].id, 0))
        }
        body.appendChild(renderContentItem(item, ctx));
    });
    body.appendChild(renderAddContentBar(block.id, block.id, 0));
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
    return renderListLevel(item.data.items, item.data.style, null);
}

/**
 * Renders one level of a list (its own <ul>, gear, and "+ voce" button)
 * and recurses into nested levels. Each level gets its own controls
 * because each level has its own independently-configurable style —
 * changing the style of a sub-list must never touch the parent's.
 * @param {ListItem[]} items
 * @param {string} style
 * @param {string|null} parentItemId - null for the root level, otherwise
 *   the id of the item whose children this level renders.
 * @returns {HTMLElement}
 */
function renderListLevel(items, style, parentItemId) {
    const wrap = document.createElement('div');
    wrap.className = 'content-list';

    const controls = document.createElement('div');
    controls.className = 'list-level-controls';

    const styleBtn = document.createElement('button');
    styleBtn.type = 'button';
    styleBtn.className = 'list-style-btn';
    styleBtn.textContent = '⚙';
    styleBtn.dataset.role = 'list-style-toggle';
    styleBtn.dataset.parentItemId = parentItemId ?? '';
    controls.appendChild(styleBtn);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'add-list-item-btn';
    addBtn.textContent = '+ voce';
    addBtn.dataset.action = 'add-list-item';
    addBtn.dataset.parentItemId = parentItemId ?? '';
    controls.appendChild(addBtn);

    wrap.appendChild(controls);

    const ul = document.createElement('ul');
    ul.style.listStyleType = style;
    items.forEach(item => ul.appendChild(renderListItem(item)));
    wrap.appendChild(ul);

    return wrap;
}

/**
 * @param {ListItem} item
 * @returns {HTMLLIElement}
 */
function renderListItem(item) {
    const li = document.createElement('li');

    const text = document.createElement('span');
    text.contentEditable = 'true';
    text.innerHTML = item.html;
    text.dataset.role = 'list-item';
    text.dataset.listItemId = item.id;
    li.appendChild(text);

    if (isListNestingAllowed(item.depth)) {
        const nestBtn = document.createElement('button');
        nestBtn.type = 'button';
        nestBtn.className = 'add-sub-item-btn';
        nestBtn.textContent = '+';
        nestBtn.title = 'Aggiungi sotto-voce';
        nestBtn.dataset.action = 'add-list-item';
        nestBtn.dataset.parentItemId = item.id;
        li.appendChild(nestBtn);
    }

    if (item.children.length > 0) {
        li.appendChild(renderListLevel(item.children, item.childrenStyle, item.id));
    }
    return li;
}

/**
 * @param {ContentItem} item
 * @returns {HTMLElement}
 */
function renderImage(item) {
    const wrap = document.createElement('figure');
    wrap.className = 'content-image';

    const rawWidth = item.data.width ?? (item.data.widthPercent ? `${item.data.widthPercent}%` : 'auto');
    const align = item.data.align ?? 'center';

    const originalWidth = item.data.originalWidth || 0;
    const originalHeight = item.data.originalHeight || 0;

    let numericPxWidth = '';
    if (typeof rawWidth === 'number') {
        numericPxWidth = rawWidth;
    } else if (rawWidth === 'auto' && originalWidth > 0) {
        numericPxWidth = originalWidth;
    }

    const controls = document.createElement('div');
    controls.className = 'content-image-controls';

    const pickBtn = document.createElement('button');
    pickBtn.type = 'button';
    pickBtn.className = 'btn-image-action';
    pickBtn.textContent = '🖼️ Immagine';
    pickBtn.dataset.action = 'pick-image-source';

    const alignGroup = document.createElement('div');
    alignGroup.className = 'content-image-align-group';
    [
        {value: 'left', label: 'Sinistra'},
        {value: 'center', label: 'Centro'},
        {value: 'right', label: 'Destra'},
    ].forEach(({value, label}) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        btn.dataset.action = 'set-image-align';
        btn.dataset.align = value;
        btn.classList.toggle('active', align === value);
        alignGroup.appendChild(btn);
    });

    const presetsGroup = document.createElement('div');
    presetsGroup.className = 'content-image-presets-group';

    const btn50 = document.createElement('button');
    btn50.type = 'button';
    btn50.textContent = '-50%';
    btn50.title = 'Riduci a metà';
    btn50.dataset.action = 'scale-image';
    btn50.dataset.scale = '0.5';
    presetsGroup.appendChild(btn50);

    const btn11 = document.createElement('button');
    btn11.type = 'button';
    btn11.textContent = '1:1 (Reset)';
    btn11.title = 'Reimposta dimensioni originali';
    btn11.dataset.action = 'set-image-width';
    btn11.dataset.width = 'auto'; // 'auto' forza l'immagine alla dimensione nativa
    btn11.classList.toggle('active', rawWidth === 'auto');
    presetsGroup.appendChild(btn11);

    const btnX2 = document.createElement('button');
    btnX2.type = 'button';
    btnX2.textContent = 'x2';
    btnX2.title = 'Raddoppia dimensione';
    btnX2.dataset.action = 'scale-image';
    btnX2.dataset.scale = '2';
    presetsGroup.appendChild(btnX2);

    const btnMax = document.createElement('button');
    btnMax.type = 'button';
    btnMax.textContent = 'Max';
    btnMax.title = 'Adatta al foglio';
    btnMax.dataset.action = 'set-image-width';
    btnMax.dataset.width = '100%';
    btnMax.classList.toggle('active', rawWidth === '100%');
    presetsGroup.appendChild(btnMax);

    const advWrap = document.createElement('div');
    advWrap.className = 'image-advanced-wrapper';

    const advBtn = document.createElement('button');
    advBtn.type = 'button';
    advBtn.className = 'btn-advanced-toggle';
    advBtn.textContent = '⚙️ Avanzate';
    advBtn.dataset.action = 'toggle-image-advanced';

    const advDropdown = document.createElement('div');
    advDropdown.className = 'image-advanced-dropdown';

    const labelPx = document.createElement('label');
    labelPx.textContent = 'Larghezza esatta (px):';

    const inputPx = document.createElement('input');
    inputPx.type = 'number';
    inputPx.min = '10';
    inputPx.step = '10';
    inputPx.placeholder = originalWidth ? `Es. ${originalWidth}` : 'Es. 300';
    inputPx.value = numericPxWidth;
    inputPx.dataset.role = 'image-width-px';

    const infoOrig = document.createElement('div');
    infoOrig.className = 'image-orig-info';
    infoOrig.textContent = (originalWidth > 0 && originalHeight > 0)
        ? `Nativa: ${originalWidth} x ${originalHeight} px`
        : 'Dimensione originale non rilevata';

    const warningBox = document.createElement('div');
    warningBox.className = 'resolution-warning';

    const currentPxVal = typeof rawWidth === 'number' ? rawWidth : 0;
    const isExceeded = originalWidth > 0 && currentPxVal > originalWidth;
    warningBox.style.display = isExceeded ? 'block' : 'none';
    warningBox.innerHTML = `⚠️ <strong>Attenzione:</strong> La larghezza (${currentPxVal}px) supera quella originale. L'immagine potrebbe sgranare.`;

    advDropdown.appendChild(labelPx);
    advDropdown.appendChild(inputPx);
    advDropdown.appendChild(infoOrig);
    advDropdown.appendChild(warningBox);

    advWrap.appendChild(advBtn);
    advWrap.appendChild(advDropdown);

    controls.appendChild(pickBtn);
    controls.appendChild(alignGroup);
    controls.appendChild(presetsGroup);
    controls.appendChild(advWrap);

    const media = document.createElement('div');
    media.className = `content-image-media align-${align}`;

    if (rawWidth === 'auto') {
        media.style.width = 'max-content';
        media.style.maxWidth = '100%';
    } else if (typeof rawWidth === 'string' && rawWidth.endsWith('%')) {
        media.style.width = rawWidth;
    } else if (typeof rawWidth === 'number') {
        media.style.width = `${rawWidth}px`;
        media.style.maxWidth = '100%';
    } else {
        media.style.width = `${rawWidth}px`;
        media.style.maxWidth = '100%';
    }

    const img = document.createElement('img');
    img.src = item.data.src;
    img.alt = item.data.caption || '';
    img.style.height = 'auto';

    media.appendChild(img);

    const caption = document.createElement('figcaption');
    caption.className = `fc align-${align}`;
    caption.contentEditable = 'true';
    caption.textContent = item.data.caption;
    caption.dataset.role = 'image-caption';

    wrap.appendChild(controls);
    wrap.appendChild(media);
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
            td.dataset.role = 'table-cell';
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
function renderSubsection(item, ctx) {
    const el = document.createElement('div');
    el.className = `subsection depth-${item.data.depth}`;

    const heading = document.createElement(item.data.depth === 1 ? 'h3' : 'h4');
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
    item.data.content.forEach((child, index) => {
        if (index > 0) {
            body.appendChild(renderContentInsertGap(ctx.blockId, item.id, item.data.content[index].id, item.data.depth));
        }
        body.appendChild(renderContentItem(child, childCtx));
    });
    body.appendChild(renderAddContentBar(ctx.blockId, item.id, item.data.depth));
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
function renderIndexEntry(anchorId, title, depth) {
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
function collectTocEntries(content, depth) {
    return content.filter(item => item.type === 'subsection').flatMap(item => [
        {id: item.id, title: item.data.title, depth},
        ...collectTocEntries(item.data.content, depth + 1)
    ]);
}


const ADDABLE_TYPES = [
    {type: 'paragraph', label: 'Paragrafo'},
    {type: 'list', label: 'Elenco'},
    {type: 'image', label: 'Immagine'},
    {type: 'imageText', label: 'Immagine + testo'},
    {type: 'table', label: 'Tabella'},
];


/**
 * @param {string} blockId
 * @param {string} containerId
 * @param {number} containerDepth
 * @param {string|null} beforeItemId
 * @returns {HTMLElement}
 */
function renderAddContentBar(blockId, containerId, containerDepth, beforeItemId = null) {
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
 *
 * @param {string} blockId
 * @param {string} containerId
 * @param {string} beforeItemId
 * @param {number} containerDepth
 * @returns {HTMLDivElement}
 */
function renderContentInsertGap(blockId, containerId, beforeItemId, containerDepth) {
    const gap = document.createElement('div');
    gap.className = 'content-insert-gap';
    gap.dataset.blockId = blockId;
    gap.dataset.containerId = containerId;
    gap.dataset.beforeItemId = beforeItemId;
    gap.dataset.depth = String(containerDepth);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'content-insert-gap-toggle';
    toggle.textContent = '+ Aggiungi sottosezione';
    toggle.dataset.action = 'toggle-content-inserter';
    toggle.dataset.blockId = blockId;
    toggle.dataset.containerId = containerId;
    toggle.dataset.beforeItemId = beforeItemId;
    gap.appendChild(toggle);

    gap.appendChild(renderAddContentBar(blockId, containerId, containerDepth, beforeItemId));
    return gap;
}
