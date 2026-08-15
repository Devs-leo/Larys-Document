const indexListEl = document.getElementById('index-list');
const indexEmptyEl = document.getElementById('index-empty');

// How much each depth level indents in the TOC. Depth 0 = section
// title (no indent), depth 1 = first-level subsection, depth 2 =
// second-level subsection. Kept here (not just as a CSS class) so the
// indent is guaranteed even if the toc-depth-N rules aren't defined.
const TOC_INDENT_EM = 1.5;

/**
 * Rebuilds the TOC from state. Only "section" blocks produce a top-level
 * entry (signature blocks are excluded on purpose). Nested subsections
 * produce indented child entries, recursively, up to the depth cap.
 * @param {DocumentState} state
 */
export function renderIndex(state) {
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
    li.style.paddingLeft = `${depth * TOC_INDENT_EM}em`;

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