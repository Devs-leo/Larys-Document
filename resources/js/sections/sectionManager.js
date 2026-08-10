import {registerBlockType, updateBlockData, mutateBlockData, getState} from "../state.js";
import {createRegistry, uid} from "../utils.js";

const MAX_SUBSECTION_DEPTH = 2;

/**
 * @typedef {Object} ContentItem
 * @property {string} id
 * @property {string} type - paragraph | list | image | imageText | table | subsection
 * @property {Object} data
 */

/**
 * @type {Registry}
 */
const contentItemRegistry = createRegistry();

registerBlockType('section', () => ({title: '', content: []}));
registerBlockType('signature', () => ({text: ''}));

contentItemRegistry.register('paragraph', () => ({html: ''}));
contentItemRegistry.register('list', () => (
    {style: 'disc', items: [{id: uid(), html: '', depth: 1, children: [], childrenStyle: 'disc'}]}));
contentItemRegistry.register('image', () => (
    {src: '', caption: '', width: 'auto', align: 'center', originalWidth: 0, originalHeight: 0}
));
contentItemRegistry.register('imageText', () => ({imagePosition: 'left', imageSrc: '', imageCaption: '', html: ''}));
contentItemRegistry.register('table', () => ({
    widthPercent: 100, columns: [{widthPercent: 50}, {widthPercent: 50}], rows: [['', '']]
}));
contentItemRegistry.register('subsection', (depth) => ({title: '', content: [], depth}));

/**
 * Chek if subsection can still be added inside a container at the given depth.
 * @param {number} containerDepth - 0 top level, 1/2 nested subsection.
 * @returns {boolean}
 */
export function isSubsectionAllowed(containerDepth) {
    return containerDepth < MAX_SUBSECTION_DEPTH;
}

/**
 * Create a new content item of the given type
 * @param {string} type
 * @param {number} containerDepth - depth of the container
 * @returns {ContentItem}
 * @throws {Error} if `type` is unknown or if `type === subsection` and depth cap exceeded.
 */
function createContentItem(type, containerDepth) {
    if (type === 'subsection') {
        if (!isSubsectionAllowed(containerDepth)) {
            throw new Error(`Cannot add a subsection beyond depth ${MAX_SUBSECTION_DEPTH}`);
        }
        const depth = containerDepth + 1;
        return {id: uid(), type, data: contentItemRegistry.create(type, depth)};
    }
    return {id: uid(), type, data: contentItemRegistry.create(type)};
}

/**
 * Locate the content array that containerId refers to
 * @param {Object} rootData - the section block's `data`.
 * @param {string} containerId
 * @param {string} roodId - The section block's own id
 * @returns {{content: ContentItem[], depth: number} | null}
 */
function findContainer(rootData, containerId, roodId) {
    if (containerId === roodId) return {content: rootData.content, depth: 0};
    return findNestedContainer(rootData.content, containerId);
}

/**
 * @param {ContentItem[]} content
 * @param {string} containerId
 */
function findNestedContainer(content, containerId) {
    for (const item of content) {
        if (item.type !== 'subsection') continue;
        if (item.id === containerId) return {content: item.data.content, depth: item.data.depth};
        const found = findNestedContainer(item.data.content, containerId);
        if (found) return found;
    }
    return null;
}

/**
 * Depth-first search for a content item by id, across a section's full tree.
 * @param {ContentItem[]} content
 * @param {string} id
 * @returns {{item: ContentItem, siblings: ContentItem[]}|null}
 */
function findContentItem(content, id) {
    for (const item of content) {
        if (item.id === id) return {item, siblings: content};
        if (item.type === 'subsection') {
            const found = findContentItem(item.data.content, id);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Append a new content item of the given type into the specified container and re-renders.
 * @param {string} blockId - id of the top-level section block.
 * @param {string} containerId - id of the target container
 * @param {string} type
 * @param {string|null} beforeItemId
 * @throws {Error} if the container isn't found, or depth cap is exceeded.
 */
export function addContentItem(blockId, containerId, type, beforeItemId = null) {
    updateBlockData(blockId, data => {
        const container = findContainer(data, containerId, blockId);
        if (!container) throw new Error(`Container not found: ${containerId}`);
        const item = createContentItem(type, container.depth);
        if (beforeItemId === null) {
            container.content.push(item);
            return;
        }
        const index = container.content.findIndex(existing => existing.id === beforeItemId);
        if (index === -1) throw new Error(`No content item with id: ${beforeItemId}`);

        container.content.splice(index, 0, item);
    });
}

/**
 * Removes a content item by id
 * @param {string} blockId
 * @param {string} itemId
 * @throws {Error} if no item with the given id exists.
 */
export function removeContentItem(blockId, itemId) {
    updateBlockData(blockId, data => {
        const found = findContentItem(data.content, itemId);
        if (!found) throw new Error(`No content item with id: ${itemId}`);
        found.siblings.splice(found.siblings.indexOf(found.item), 1);
    });
}

/**
 * Patches a content item's data. Use for change NOT already reflected in the DOM.
 * @param {string} blockId
 * @param {string} itemId
 * @param {Object} patch
 */
export function setContentItemData(blockId, itemId, patch) {
    updateContentItemWith(blockId, itemId, data => Object.assign(data, patch));
}

/**
 * Patches a content item's data silently.
 * @param {string} blockId
 * @param {string} itemId
 * @param {Object} patch
 */
export function mutateContentItemData(blockId, itemId, patch) {
    mutateContentItemWith(blockId, itemId, data => Object.assign(data, patch));
}

/**
 * Swap a content item with its previus/next sibling within its own container.
 * @param {string} blockId
 * @param {string} containerId
 * @param {string} itemId
 * @param {'up'|'down'} direction
 */
export function moveContentItem(blockId, containerId, itemId, direction) {
    updateBlockData(blockId, data => {
        const container = findContainer(data, containerId, blockId);
        if (!container) throw new Error(`Container not found: ${containerId}`);
        const arr = container.content;
        const i = arr.findIndex(it => it.id === itemId);
        if (i === -1) return;
        const j = direction === 'up' ? i - 1 : i + 1;
        if (j < 0 || j >= arr.length) return;
        [arr[i], arr[j]] = [arr[j], arr[i]];
    });
}

/**
 * Replace the full ordered list of a container's content item.
 * @param {string} blockId
 * @param {string} containerId
 * @param {ContentItem[]} newItems
 */
export function setContentItems(blockId, containerId, newItems) {
    updateBlockData(blockId, data => {
        const container = findContainer(data, containerId, blockId);
        if (!container) throw new Error(`Container not found: ${containerId}`);
        container.content.length = 0;
        container.content.push(...newItems);
    });
}

/**
 * Runs a mutator over a content item's data and re-renders.
 * @param {string} blockId
 * @param {string} itemId
 * @param {(data: Object) => void} mutatorFn
 */
export function updateContentItemWith(blockId, itemId, mutatorFn) {
    updateBlockData(blockId, data => {
        const found = findContentItem(data.content, itemId);
        if (found) mutatorFn(found.item.data);
    });
}

/**
 * @param {string} blockId
 * @param {string} itemId
 * @param {(data: Object) => void} mutatorFn
 */
export function mutateContentItemWith(blockId, itemId, mutatorFn) {
    mutateBlockData(blockId, data => {
        const found = findContentItem(data.content, itemId);
        if (found) mutatorFn(found.item.data);
    });
}

/**
 * Returns a short human-readable label for a block, used in UI copy
 * (delete confirmations, drag-handle tooltips, etc.) where a generic
 * `block.data.title` cannot be assumed — not every block type has one.
 * @param {Block} block
 * @returns {string}
 */
export function getBlockLabel(block) {
    if (block.type === 'section') return block.data.title || 'Sezione senza titolo';
    if (block.type === 'signature') return 'Blocco firma';
    return 'Blocco';
}

/**
 * Read-only lookup of a content item's data by id. Used by UI that needs
 * to display current values (e.g. the list settings modal) without
 * duplicating the tree-walk logic already in findContentItem.
 * @param {string} blockId
 * @param {string} itemId
 * @returns {Object|null}
 */
export function getContentItemData(blockId, itemId) {
    const block = getState().sections.find(b => b.id === blockId);
    if (!block) return null;
    const found = findContentItem(block.data.content, itemId);
    return found ? found.item.data : null;
}