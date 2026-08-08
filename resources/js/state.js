import {createObservable, createRegistry, uid} from "./utils.js";

/**
 * @typedef {Object} Theme
 * @property {string} primary - primary colour.
 * @property {string} secondary - secondary colour.
 */

/**
 * @typedef {Object} Block
 * @property {string} id - Unique identifier of the block.
 * @property {string} type - Block type key
 * @property {Object} data - Type-specific payload.
 */

/**
 * @typedef {Object} DocumentState
 * @property {string} title - the document title.
 * @property {string} eyebrow - the subtitle or the lead of the document.
 * @property {string} meta - other info as author and date.
 * @property {Theme} theme - the document theme.
 * @property {Block[]} sections - order list of section in the document.
 */

/**
 * Build the default state for a new/empty document.
 * Used both on app startup and by `resetState` ("New document").
 *
 * @returns {DocumentState}
 */
function defaultState() {
    return {
        title: "Titolo del documento",
        eyebrow: "Sottotitolo",
        meta: "Autore, data",
        theme: {primary: "#0B1330", secondary: "#B5792A"},
        sections: [],
    };
}

/** Observable store holding the entire DocumentState.
 * @type {Observable} */
const store = createObservable(defaultState());

/** registry of block-type factories
 * @type {Registry}*/
const blockRegistry = createRegistry();

/** @returns {DocumentState}*/
export const getState = store.get

/**
 * Registers a function to run on every "structural" state change, typically the `render` function is registrated here.
 * @param {(state: DocumentState) => void} fn
 */
export const onChange = store.subscribe;

/**
 * Replace the entire state and notifies.
 * @param {DocumentState} newState
 */
export function setState(newState) {
    store.set(newState);
}

/**
 * Reset the state to default values.
 */
export function resetState() {
    store.set(defaultState());
}

/**
 * Update the theme colours.
 * @param {Partial<Theme>} patch
 */
export function updateTheme(patch) {
    store.set(s => {
        s.theme = {...s.theme, ...patch};
        return s;
    });
}

/**
 * Update the cover fields.
 * The title, the eyebrow and the meta info.
 * @param {Partial<Pick<DocumentState, 'title' | 'eyebrow' | 'meta'>>} patch
 */
export function updateMeta(patch) {
    store.mutate(s => Object.assign(s, patch));
}

/**
 * Replaces the entire sections array.
 * @param {Block []} newSections
 */
export function setSections(newSections) {
    store.set(s => {
        s.sections = newSections;
        return s;
    });
}

// ______________________________________________________________________
// Block methods
// ______________________________________________________________________

/**
 * Registers a factory that produces the default `data` payload foa a given block type. Called once per tyre, typically
 * from the file that owns that block's rendering logic.
 * @param {string} type
 * @param {() => Object} factory
 */
export function registerBlockType(type, factory) {
    blockRegistry.register(type, factory);
}

/**
 * Block creator.
 * @param {string} type
 * @returns {Block}
 * @throws {Error} If `type` was never registered.
 */
function createBlock(type) {
    return {id: uid(), type, data: blockRegistry.create(type)};
}

/**
 * Add block at the end of section list.
 * @param {string} type
 */
export function addBlock(type) {
    store.set(s => {
        s.sections.push(createBlock(type));
        return s;
    });
}

/**
 * Patches the `data` payload of an existing block by id. Does NOT notify: used for free text/content already reflected
 * on screen by contenteditable.
 * @param {string} id
 * @param {Object} patch - Merged into `block.data`, shape depends on the block `type`.
 */
export function updateBlock(id, patch) {
    store.mutate(s => {
        const b = s.sections.find(b => b.id === id);
        if (b) Object.assign(b.data, patch);
    });
}

/**
 * Delete the block section from state using Block id.
 * @param {string} id
 * @throws {Error} If no block with the given id exists.
 */
export function removeBlock(id) {
    store.set(s => {
        const exists = s.sections.some(b => b.id === id);
        if (!exists) throw new Error(`No block with id: ${id}`);
        s.sections = s.sections.filter(b => b.id !== id);
        return s;
    });
}

// ______________________________________________________________________
// Nested-tree primitives (for content items inside a section's data)
// ______________________________________________________________________

/**
 * Runs a mutator over a block's data tree and re-renders.
 * @param {string} blockId
 * @param {(data: Object) => void} mutatorFn
 */
export function updateBlockData(blockId, mutatorFn){
    store.set(s =>{
        const b = s.sections.find(b => b.id === blockId);
        if (b) mutatorFn(b.data);
        return s;
    });
}

/**
 * Runs a mutator but silent.
 * @param {string} blockId
 * @param {(data: Object) => void} mutatorFn
 */
export function mutateBlockData(blockId, mutatorFn){
    store.mutate(s => {
        const b = s.sections.find(b => b.id === blockId);
        if (b) mutatorFn(b.data);
    })
}
