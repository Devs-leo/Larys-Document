import {
    getContentItemData,
    mutateContentItemWith,
    updateContentItemWith
} from "./sectionManager.js";
import {uid} from "../utils.js";

const MAX_LIST_DEPTH = 2;

/**
 * @typedef {Object} ListItem
 * @property {string} id
 * @property {string} html
 * @property {number} depth
 * @property {ListItem[]} children
 * @property {string} childrenStyle
 */

/**
 * @param {number} depth
 * @returns {boolean}
 */
export function isListNestingAllowed(depth) {
    return depth < MAX_LIST_DEPTH;
}

/**
 * @param {number} depth
 * @returns {ListItem}
 */
function createListItem(depth) {
    return {id: uid(), html: '', depth, children: [], childrenStyle: 'disc'};
}

/**
 * @param {ListItem[]} items
 * @param {string} id
 * @returns {{item: ListItem, siblings: ListItem[]}|null}
 */
function findListItem(items, id) {
    for (const item of items) {
        if (item.id === id) return {item, siblings: items};
        const found = findListItem(item.children, id)
        if (found) return found;
    }
    return null;
}

/**
 * @param {string} blockId
 * @param {string} listItemId
 * @param {string|null} parentItemId
 * @throws {Error} if parentItemId doesn't resolve, or depth cap exceeded.
 */
export function addListItem(blockId, listItemId, parentItemId = null) {
    updateContentItemWith(blockId, listItemId, data => {
        if (parentItemId === null) {
            data.items.push(createListItem(1));
            return;
        }
        const found = findListItem(data.items, parentItemId);
        if (!found) throw new Error(`No list item with id: ${parentItemId}`);
        if (!isListNestingAllowed(found.item.depth)) throw new Error(`Cannot nest list items deeper than ${MAX_LIST_DEPTH}`);
        found.item.children.push(createListItem(found.item.depth + 1));
    });
}


/**
 * @param {string} blockId
 * @param {string} listItemId
 * @param {string} itemId
 * @throws {Error} if no item with the given id exist.
 */
export function removeListItem(blockId, listItemId, itemId) {
    updateContentItemWith(blockId, listItemId, data => {
        const found = findListItem(data.items, itemId);
        if (!found) throw new Error(`No list item with id: ${itemId}`);
        found.siblings.splice(found.siblings.indexOf(found.item), 1);
    });
}


/**
 * Updates a bullet's text silently
 * @param {string} blockId
 * @param {string} listItemId
 * @param {string} itemId
 * @param {string} label
 */
export function updateListItemText(blockId, listItemId, itemId, label) {
    mutateContentItemWith(blockId, listItemId, data => {
        const found = findListItem(data.items, itemId);
        if (found) found.item.html = label
    });
}

/**
 * Replace the ordered items of a container.
 * @param {string} blockId
 * @param {string} listItemId
 * @param {string} parentItemId
 * @param {ListItem[]} newItems
 */
export function setListItems(blockId, listItemId, parentItemId, newItems) {
    updateContentItemWith(blockId, listItemId, data => {
        if (parentItemId === null) {
            data.items.length = 0;
            data.items.push(...newItems);
            return;
        }
        const found = findListItem(data.items, parentItemId);
        if (!found) throw new Error(`No list item with id: ${parentItemId}`);
        found.item.children.length = 0;
        found.item.children.push(...newItems);
    });
}


/**
 * Reads a single level's style + items.
 * @param {string} blockId
 * @param {string} listItemId
 * @param {string|null} parentItemId
 * @returns {{style: string, items: ListItem[]}|null}
 */
export function getListLevel(blockId, listItemId, parentItemId) {
    const data = getContentItemData(blockId, listItemId);
    if (!data) return null;
    if (parentItemId === null) return {style: data.style, items: data.items};
    const found = findListItem(data.items, parentItemId);
    return found ? {style: found.item.childrenStyle, items: found.item.children} : null;
}

/**
 * Set the style of a single list level
 * @param {string} blockId
 * @param {string} listItemId
 * @param {string|null} parentItemId
 * @param {string} style
 */
export function setListStyle(blockId, listItemId, parentItemId, style) {
    updateContentItemWith(blockId,listItemId, data => {
        if (parentItemId === null) {
            data.style = style;
            return;
        }
        const found = findListItem(data.items, parentItemId);
        if (!found) throw new Error(`No list item with id: ${parentItemId}`);
        found.item.childrenStyle = style;
    })
}