import {getState} from '../../state.js';

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function safeId(id) {
    return `pdf-${String(id).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function renderRichHtml(html = '') {
    return html || '';
}

function renderCover(state) {
    const logo = document.querySelector('#logo-slot')?.innerHTML?.trim() || '<img src="/resources/assets/logo.png" alt="Logo">';

    return `
        <section class="pdf-cover">
            <div class="pdf-cover-main">
                <h1>${escapeHtml(state.title)}</h1>
                ${state.eyebrow ? `<div class="pdf-eyebrow">${escapeHtml(state.eyebrow)}</div>` : ''}
                ${state.meta ? `<div class="pdf-cover-meta">${escapeHtml(state.meta)}</div>` : ''}
            </div>
            ${logo ? `<div class="pdf-cover-logo">${logo}</div>` : ''}
        </section>
    `;
}

function renderHeaderFooter(state) {
    return `
        <div class="pdf-running-header">${escapeHtml(state.title)}</div>
        
        <!-- ELEMENTI FOOTER SEPARATI (Approccio Nativo Paged.js) -->
        <div class="pdf-running-footer-left">${escapeHtml(state.meta)}</div>
        <div class="pdf-running-footer-center"></div>
        <div class="pdf-running-footer-right">
            <img src="../assets/logo.png" alt="Logo" />
        </div>
    `;
}

function renderTocItem(label, targetId, depth = 0) {
    return `
        <li class="pdf-toc-item depth-${depth}">
            <a href="#${safeId(targetId)}">${escapeHtml(label)}</a>
        </li>
    `;
}

function collectTocItems(blocks, out = []) {
    for (const block of blocks) {
        if (block.type === 'section') {
            out.push({label: block.data.title, id: block.id, depth: 0});
            collectSubsectionToc(block.data.content || [], 1, out);
        }
    }
    return out;
}

function collectSubsectionToc(items, depth, out) {
    for (const item of items) {
        if (item.type !== 'subsection') continue;
        out.push({label: item.data.title, id: item.id, depth});
        collectSubsectionToc(item.data.content || [], depth + 1, out);
    }
}

function renderToc(state) {
    const items = collectTocItems(state.sections);

    if (!items.length) return '';

    return `
        <section class="pdf-toc">
            <h2>Indice</h2>
            <ol class="pdf-toc-list">
                ${items.map(item => renderTocItem(item.label, item.id, item.depth)).join('')}
            </ol>
        </section>
    `;
}

function renderParagraph(item) {
    return `<div class="pdf-paragraph">${renderRichHtml(item.data.html)}</div>`;
}

function renderListItems(items) {
    return (items || []).map(item => `
        <li>
            <span>${renderRichHtml(item.html)}</span>
            ${item.children?.length ? `<ul class="pdf-list-level" style="list-style-type:${escapeHtml(item.childrenStyle || 'disc')}">${renderListItems(item.children)}</ul>` : ''}
        </li>
    `).join('');
}

function renderList(item) {
    const style = item.data.style || 'disc';
    return `
        <div class="pdf-list">
            <ul style="list-style-type:${escapeHtml(style)}">
                ${renderListItems(item.data.items)}
            </ul>
        </div>
    `;
}

function normalizeImageWidth(width) {
    if (width === 'auto' || width == null || width === '') return null;
    if (typeof width === 'number' && Number.isFinite(width)) return `${width}px`;
    if (typeof width === 'string' && /^\d+(?:\.\d+)?(?:px|%)$/.test(width)) return width;
    if (typeof width === 'string' && /^\d+(?:\.\d+)?$/.test(width)) return `${width}px`;
    return null;
}

function renderImageFigure(item) {
    const d = item.data;
    const width = normalizeImageWidth(d.width);
    const align = d.align || 'center';
    const figureClass = `pdf-figure align-${escapeHtml(align)}`;

    return `
        <figure class="${figureClass}">
            <div class="pdf-image-box"${width ? ` style="width:${width}"` : ''}>
                <img src="${escapeHtml(d.src || '')}" alt="${escapeHtml(d.caption || '')}">
            </div>
            ${d.caption ? `<figcaption>${escapeHtml(d.caption)}</figcaption>` : ''}
        </figure>
    `;
}

function renderImageText(item) {
    const d = item.data;
    const width = normalizeImageWidth(d.width);
    const position = d.imagePosition === 'right' ? 'right' : 'left';

    const figure = `
        <figure class="pdf-figure image-text-figure">
            <div class="pdf-image-box"${width ? ` style="width:${width}"` : ''}>
                <img src="${escapeHtml(d.src || '')}" alt="${escapeHtml(d.caption || '')}">
            </div>
            ${d.caption ? `<figcaption>${escapeHtml(d.caption)}</figcaption>` : ''}
        </figure>
    `;

    const text = `<div class="pdf-image-text-body">${renderRichHtml(d.html)}</div>`;

    return `<div class="pdf-image-text position-${position}">${position === 'right' ? text + figure : figure + text}</div>`;
}

function renderTable(item) {
    const width = Number.isFinite(Number(item.data.widthPercent)) ? `${Number(item.data.widthPercent)}%` : '100%';
    const columns = item.data.columns || [];

    const rows = (item.data.rows || []).map(row => `
        <tr>
            ${row.map((cell, colIndex) => {
                const colWidth = Number.isFinite(Number(columns[colIndex]?.widthPercent))
                    ? `${Number(columns[colIndex].widthPercent)}%`
                    : '';
                return `<td${colWidth ? ` style="width:${colWidth}"` : ''}>${renderRichHtml(cell)}</td>`;
            }).join('')}
        </tr>
    `).join('');

    return `
        <div class="pdf-table-wrap" style="width:${width}">
            <table>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

function renderSubsection(item, state) {
    const depth = Number(item.data.depth) || 1;
    const headingTag = depth === 1 ? 'h3' : 'h4';

    return `
        <section class="pdf-subsection depth-${depth}">
            <${headingTag} id="${safeId(item.id)}">${escapeHtml(item.data.title)}</${headingTag}>
            <div class="pdf-subsection-body">
                ${(item.data.content || []).map(child => renderContentItem(child, state)).join('')}
            </div>
        </section>
    `;
}

function renderContentItem(item, state) {
    switch (item.type) {
        case 'paragraph': return renderParagraph(item);
        case 'list': return renderList(item);
        case 'image': return renderImageFigure(item);
        case 'imageText': return renderImageText(item);
        case 'table': return renderTable(item);
        case 'subsection': return renderSubsection(item, state);
        default: return '';
    }
}

function renderSection(block, state) {
    return `
        <section class="pdf-section">
            <h2 id="${safeId(block.id)}">${escapeHtml(block.data.title)}</h2>
            <div class="pdf-section-body">
                ${(block.data.content || []).map(item => renderContentItem(item, state)).join('')}
            </div>
        </section>
    `;
}

function renderSignature(block) {
    return `
        <section class="pdf-signature">
            <div class="pdf-signature-text">${renderRichHtml(block.data.text || '')}</div>
        </section>
    `;
}

export function renderPdfDocument(state = getState()) {
    const sections = (state.sections || []).filter(Boolean);
    const toc = renderToc(state);
    const content = sections.map(block => {
        if (block.type === 'signature') return renderSignature(block);
        return renderSection(block, state);
    }).join('');

    const topToc = state.tocPosition !== 'bottom';

    return `
        <div class="pdf-document" style="--pdf-primary:${escapeHtml(state.theme?.primary || '#050a37')};--pdf-secondary:${escapeHtml(state.theme?.secondary || '#FFFFFF')}">
            ${renderHeaderFooter(state)}
            ${renderCover(state)}
            ${topToc ? toc : ''}
            <main class="pdf-content">
                ${content}
            </main>
            ${!topToc ? toc : ''}
        </div>
    `;
}