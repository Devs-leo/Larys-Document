import {addBlock} from "../state.js";
import {openReorderModal} from "./reorderModal.js";
import {showTocSettingsModal} from "./tocSettingsModal.js";

const el = {
    addSectionBtn: document.getElementById('add-section-btn'),
    addSignatureBtn: document.getElementById('add-section-right-btn'),
    reorderSectionsBtn: document.getElementById('reorder-sections-btn'),
    tocSettingsBtn: document.getElementById('toc-settings-btn'),
};

/**
 * Wires the controls that live visually in the toolbar area but act on
 * document structure/content rather than presentation: adding sections
 * or signature blocks, opening the document-level reorder modal, and
 * opening the TOC-position picker.
 */
export function bindDocumentControls() {
    el.addSectionBtn.addEventListener('click', () => addBlock('section'));
    el.addSignatureBtn.addEventListener('click', () => addBlock('signature'));
    el.reorderSectionsBtn.addEventListener('click', () => openReorderModal({scope: 'document'}));
    el.tocSettingsBtn.addEventListener('click', showTocSettingsModal);
}
