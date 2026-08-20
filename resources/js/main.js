import {onChange} from "./state.js";
import {render} from "./components/render.js";
import {bindCoverEvents} from "./components/content.js";
import {bindToolbarEvents} from "./components/toolbar.js";
import {bindDocumentControls} from "./components/documentControls.js";
import {bindSectionEvents} from "./sections/sectionEvents.js";
import {bindPdfExport} from "./services/pdfExport.js"
import {startAutosave} from "./services/storage.js";

/** Autosave interval, in ms. Adjust to taste. */
const AUTOSAVE_INTERVAL_MS = 60_000;

/**
 * Function to handle the window close event by gracefully exiting the Neutralino application.
 */
function onWindowClose() {
    Neutralino.app.exit();
}

// Initialize Neutralino
Neutralino.init();
// Register event listeners
Neutralino.events.on("windowClose", onWindowClose);


bindCoverEvents();
bindToolbarEvents();
bindDocumentControls();
bindSectionEvents();
bindPdfExport();

startAutosave(AUTOSAVE_INTERVAL_MS);

onChange(render);
render();