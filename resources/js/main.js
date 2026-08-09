import {onChange} from "./state.js";
import {render, bindCoverEvents, bindToolbarEvents, bindSectionEvents} from "./components/index.js";

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
bindSectionEvents();

onChange(render);
render();