import {getState} from "../state.js";
import {renderCover, bindCoverEvents} from "./content.js";
import {renderToolbar, bindToolbarEvents} from "./toolbar.js";

const pageEl = document.getElementById("page");

/**
 * Renders the whole app from the current state.
 */
export function render() {
    const state = getState();
    renderCover(state);
    renderToolbar(state);
    applyTheme(state.theme);
}

/**
 * Apply the current theme by overriding the relevant CSS custom properties on #page.
 * @param {Theme} theme
 */
function applyTheme(theme) {
    pageEl.style.setProperty('--navy', theme.primary);
    pageEl.style.setProperty('--accent', theme.secondary);
}

export {bindCoverEvents, bindToolbarEvents};