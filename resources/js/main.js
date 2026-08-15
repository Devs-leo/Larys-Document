import {onChange} from "./state.js";
import {render} from "./components/render.js";
import {bindCoverEvents} from "./components/content.js";
import {bindToolbarEvents} from "./components/toolbar.js";
import {bindDocumentControls} from "./components/documentControls.js";
import {bindSectionEvents} from "./sections/sectionEvents.js";

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

onChange(render);
render();
