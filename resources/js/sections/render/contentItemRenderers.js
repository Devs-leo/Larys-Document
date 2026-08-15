import {isSubsectionAllowed} from "../sectionManager.js";
import {isListNestingAllowed} from "../listManager.js";
import {renderAddContentBar, renderContentInsertGap} from "./containerRenderer.js";
import {renderContentItem} from "./sectionRenderer.js";

/**
 * Registry of render functions per content-item type, consumed by
 * sectionRenderer.js's dispatcher (renderContentItem).
 * @type {Object.<string, (item: ContentItem, ctx: RenderCtx) => HTMLElement>}
 */
export const contentItemRenderers = {
    paragraph: renderParagraph,
    list: renderList,
    image: renderImage,
    imageText: renderImageText,
    table: renderTable,
    subsection: renderSubsection,
};

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

    const reorderBtn = document.createElement('button');
    reorderBtn.type = 'button';
    reorderBtn.className = 'list-reorder-btn';
    reorderBtn.textContent = '⇅';
    reorderBtn.title = 'Riordina elenco';
    reorderBtn.dataset.action = 'open-list-reorder';
    reorderBtn.dataset.parentItemId = parentItemId ?? '';
    controls.appendChild(reorderBtn);

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
    return renderImageFigure(item, {
        actionName: 'set-image-align',
        currentValue: item.data.align ?? 'center',
        choices: [
            {value: 'left', label: 'Sinistra'},
            {value: 'center', label: 'Centro'},
            {value: 'right', label: 'Destra'},
        ],
    });
}

/**
 * Renders the shared <figure class="content-image"> block used by both
 * standalone images and the image side of imageText: pick-source button,
 * a position/align button group, size presets, an "advanced" exact-width
 * dropdown, and the media + caption. Only the button group's action name,
 * current value, and choices differ between callers — every other control
 * and the underlying data fields (src/caption/width/originalWidth/
 * originalHeight) are identical, since image and imageText were unified
 * onto the same field names precisely to make this reuse possible.
 * @param {ContentItem} item
 * @param {{actionName: string, currentValue: string, choices: {value:string,label:string}[]}} alignConfig
 * @returns {HTMLElement}
 */
function renderImageFigure(item, alignConfig) {
    const wrap = document.createElement('figure');
    wrap.className = 'content-image';

    const rawWidth = item.data.width ?? 'auto';
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
    controls.appendChild(pickBtn);

    const alignGroup = document.createElement('div');
    alignGroup.className = 'content-image-align-group';
    alignConfig.choices.forEach(({value, label}) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        btn.dataset.action = alignConfig.actionName;
        btn.dataset.align = value;
        btn.classList.toggle('active', alignConfig.currentValue === value);
        alignGroup.appendChild(btn);
    });
    controls.appendChild(alignGroup);

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
    btn11.dataset.width = 'auto';
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
    controls.appendChild(presetsGroup);

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
    controls.appendChild(advWrap);
    const mediaAlignClass = alignConfig.choices.length === 3 ? alignConfig.currentValue : 'center';

    const media = document.createElement('div');
    media.className = `content-image-media align-${mediaAlignClass}`;

    if (rawWidth === 'auto') {
        media.style.width = 'max-content';
        media.style.maxWidth = '100%';
    } else if (typeof rawWidth === 'string' && rawWidth.endsWith('%')) {
        media.style.width = rawWidth;
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
    caption.className = `fc align-${mediaAlignClass}`;
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

    const figure = renderImageFigure(item, {
        actionName: 'set-image-position',
        currentValue: item.data.imagePosition,
        choices: [
            {value: 'left', label: 'Sinistra'},
            {value: 'right', label: 'Destra'},
        ],
    });

    const text = document.createElement('div');
    text.className = 'body-text';
    text.contentEditable = 'true';
    text.innerHTML = item.data.html;
    text.dataset.role = 'image-text-body';

    if (item.data.imagePosition === 'right') {
        wrap.appendChild(text);
        wrap.appendChild(figure);
    } else {
        wrap.appendChild(figure);
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

    const rail = document.createElement('div');
    rail.className = 'section-reorder-rail subsection-reorder-rail';
    const railBtn = document.createElement('button');
    railBtn.type = 'button';
    railBtn.className = 'section-reorder-btn';
    railBtn.textContent = '⇅';
    railBtn.title = 'Riordina contenuto sottosezione';
    railBtn.dataset.action = 'open-section-reorder';
    railBtn.dataset.blockId = ctx.blockId;
    railBtn.dataset.containerId = item.id;
    rail.appendChild(railBtn);
    el.appendChild(rail);

    return el;
}
