import {updateTheme, resetState, addBlock} from "../state.js";
import {showConfirmModal} from "./confirmModal.js";
import {openReorderModal} from "./reorderModal.js";
import {loadDraft, saveDraft} from "../services/storage.js";
import {showTocSettingsModal} from "./tocSettigsModal.js";

const el = {
    settingsBtn: document.getElementById('settings-btn'),
    settingsPanel: document.getElementById('settings-panel'),
    closeBtn: document.querySelector('#settings-panel .close-btn'),
    presetBtns: document.querySelectorAll('#settings-panel .preset-btn'),
    primaryInput: document.getElementById('color-primary'),
    secondaryInput: document.getElementById('color-secondary'),
    newDocBtn: document.getElementById('new-doc-btn'),
    tutorialBtn: document.getElementById('tutorial-btn'),
    addSectionBtn: document.getElementById('add-section-btn'),
    addSignatureBtn: document.getElementById('add-section-right-btn'),
    reorderSectionsBtn: document.getElementById('reorder-sections-btn'),
    saveDocBtn: document.getElementById('save-doc-btn'),
    loadDraftInput: document.getElementById('load-draft-input'),
    tocSettingsBtn: document.getElementById('toc-settings-btn'),
}

/**
 * Named theme presets. "custom" has no fixed values: it just marks that
 * the user is driving the colour inputs directly.
 * @type {Object.<string, {primary: string, secondary: string}|null>}
 */
const PRESETS = {
    larys: {primary: '#0B1330', secondary: '#B5792A'},
    neutro: {primary: '#3A3A3A', secondary: '#8A8A8A'},
    custom: null
};

/**
 * Toolbar controls connections.
 */
export function bindToolbarEvents() {
    el.settingsBtn.addEventListener('click', () => el.settingsPanel.classList.add('open'));
    el.closeBtn.addEventListener('click', () => el.settingsPanel.classList.remove('open'));
    el.addSectionBtn.addEventListener('click', () => addBlock('section'));
    el.addSignatureBtn.addEventListener('click', () => addBlock('signature'));

    el.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setActivePreset(btn.dataset.preset);
            const preset = PRESETS[btn.dataset.preset];
            if (preset) updateTheme(preset);
        });
    });

    el.primaryInput.addEventListener('input', () => {
        setActivePreset('custom');
        updateTheme({primary: el.primaryInput.value});
    });
    el.secondaryInput.addEventListener('input', () => {
        setActivePreset('custom');
        updateTheme({secondary: el.secondaryInput.value});
    });

    el.newDocBtn.addEventListener('click', async () => {
        if (await showConfirmModal('Creare un nuovo documento? Le modifiche non salvate andranno perse.')) {
            resetState();
        }
    });

    el.tutorialBtn.addEventListener('click', () => {
        //TODO aprire un modale con una sezione HTML iniettabile con la spiegazione della app, a app finita
    });

    el.reorderSectionsBtn.addEventListener('click', () => openReorderModal({scope: 'document'}));

    el.saveDocBtn.addEventListener('click', async () => {
        try {
            await saveDraft();
        } catch (err) {
            console.error('Errore salvataggio bozza:', err);
            await showConfirmModal('Salvataggio non riuscito. Controlla la console per i dettagli.');
        }
    });

    el.loadDraftInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        e.target.value = ''; // permette di riselezionare lo stesso file e ritriggerare 'change'
        if (!file) return;
        try {
            await loadDraft(file);
        } catch (err) {
            console.error('Errore caricamento bozza:', err);
            await showConfirmModal('Caricamento non riuscito. Controlla la console per i dettagli.');
        }
    });

    el.tocSettingsBtn.addEventListener('click', showTocSettingsModal);
}

/**
 * Highlights the active preset button and marks the rest inactive.
 * @param {string} presetKey
 */
function setActivePreset(presetKey) {
    el.presetBtns.forEach(b => b.classList.toggle('active', b.dataset.preset === presetKey));
}

/**
 * Syncs the settings panel controls with the current state.
 * @param {DocumentState} state
 */
export function renderToolbar(state) {
    el.primaryInput.value = state.theme.primary;
    el.secondaryInput.value = state.theme.secondary;

    const matched = Object.entries(PRESETS).find(
        ([key, val]) => val && val.primary === state.theme.primary && val.secondary === state.theme.secondary
    );
    setActivePreset(matched ? matched[0] : 'custom');
}