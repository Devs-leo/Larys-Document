import {updateMeta} from "../state.js";
const eyebrowEl = document.querySelector('#cover .eyebrow');
const titleEl = document.getElementById('doc-title');
const metaEl = document.querySelector('#cover .meta');

/**
 * Renders the cover fields from state into the DOM.
 * Called on load/reset/import, when the DOM is NOT already in sync
 * with the new state (unlike normal typing, handled by bindCoverEvents).
 * @param {DocumentState} state
 */
export function renderCover(state) {
    eyebrowEl.textContent = state.eyebrow;
    titleEl.textContent = state.title;
    metaEl.textContent = state.meta;
}

/**
 * Wires the contenteditable cover fields to state.updateMeta.
 * Called once at startup. Does not trigger render (see updateMeta docs).
 */
export function bindCoverEvents() {
    eyebrowEl.addEventListener('input', () => updateMeta({ eyebrow: eyebrowEl.textContent }));
    titleEl.addEventListener('input', () => updateMeta({ title: titleEl.textContent }));
    metaEl.addEventListener('input', () => updateMeta({ meta: metaEl.textContent }));
}