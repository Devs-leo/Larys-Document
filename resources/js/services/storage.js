import {getState, setState} from '../state.js';

const IMAGE_TYPES = ['image', 'imageText'];

const EXT_BY_MIME = {
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp',
    'image/gif': 'gif', 'image/svg': 'svg',
};

/**
 * Custom extension for saved documents. The file is still a zip under
 * the hood, but we never expose ".zip" to the OS: that would let any
 * archive manager open/extract it (and would get generic-archive icons
 * instead of a distinct app icon). Every write path below funnels
 * through `withOurExtension`/`suggestedFileName` so the extension can
 * never end up wrong on disk.
 * @type {string}
 */
const FILE_EXTENSION = 'larys';

/**
 * Absolute path of the file we last saved to or loaded from. `null`
 * until one of those happens — autosave checks this and stays off
 * until it's set, exactly as required.
 * @type {string|null}
 */
let currentFilePath = null;

/**
 * JSON (post image-externalization) of the state as of the last write
 * to `currentFilePath`. Lets the autosave tick skip writing when
 * nothing actually changed.
 * @type {string|null}
 */
let lastSavedSnapshot = null;

/** @type {number|null} */
let autosaveTimer = null;

/**
 * Recursively collects every image/imageText content item across the
 * whole document, including inside subsections. Returns references
 * (not copies) so callers can rewrite `.data.src` in place.
 * @param {Block[]} sections
 * @returns {ContentItem[]}
 */
function collectImageRefs(sections) {
    const refs = [];
    const walkItems = (items) => {
        items.forEach(item => {
            if (IMAGE_TYPES.includes(item.type)) refs.push(item);
            if (item.type === 'subsection') walkItems(item.data.content);
        });
    };
    sections.forEach(block => {
        if (block.type === 'section') walkItems(block.data.content);
    });
    return refs;
}

/**
 * @param {string} dataUrl
 * @returns {{mime: string, bytes: Uint8Array}|null}
 */
function decodeDataUrl(dataUrl) {
    const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || '');
    if (!match) return null;
    const [, mime, base64] = match;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return {mime, bytes};
}

/**
 * @param {Uint8Array} bytes
 * @param {string} mime
 * @returns {Promise<string>}
 */
function bytesToDataUrl(bytes, mime) {
    return new Promise(resolve => {
        const blob = new Blob([bytes], {type: mime});
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

/**
 * Builds the zip payload for the current state: `document.json` (state
 * with every image `src` rewritten to a relative `images/<id>.<ext>`
 * path) plus an `images/` folder with the actual binary files. Keeps
 * the JSON small and diffable instead of carrying base64 blobs inline.
 * Shared by the manual save and the silent autosave tick so the two
 * never drift apart.
 * @returns {Promise<{bytes: Uint8Array, json: string}>}
 */
async function buildDraftZip() {
    const state = getState();
    const clone = JSON.parse(JSON.stringify(state));
    const refs = collectImageRefs(clone.sections);

    const zip = new window.JSZip();
    const imagesFolder = zip.folder('images');

    refs.forEach(item => {
        const decoded = decodeDataUrl(item.data.src);
        if (!decoded) return;
        const ext = EXT_BY_MIME[decoded.mime] || 'png';
        const filename = `${item.id}.${ext}`;
        imagesFolder.file(filename, decoded.bytes);
        item.data.src = `images/${filename}`;
    });

    const json = JSON.stringify(clone, null, 2);
    zip.file('document.json', json);

    const bytes = await zip.generateAsync({type: 'uint8array'});
    return {bytes, json};
}

/**
 * Sanitizes the document title into a safe file name and appends our
 * own extension (never trusts a bare title to be filesystem-safe).
 * @param {string} title
 * @returns {string}
 */
function suggestedFileName(title) {
    const base = (title || 'documento').replace(/[^\w\- ]/g, '').trim() || 'documento';
    return `${base}.${FILE_EXTENSION}`;
}

/**
 * Forces a path to end with our extension, replacing whatever the OS
 * save dialog produced. Some native dialogs let the user type an
 * arbitrary name/extension in the filename field; without this, a zip
 * could land on disk as e.g. ".txt" or with no extension at all, which
 * would defeat both the custom icon and the "don't let a generic
 * archive tool open it" goal.
 * @param {string} path
 * @returns {string}
 */
function withOurExtension(path) {
    return path.replace(/\.[^./\\]+$/, '') + `.${FILE_EXTENSION}`;
}

/**
 * Saves the current document, prompting the user for a location via the
 * native save dialog. Also becomes the "known file" for autosave: once
 * this succeeds, silent autosave writes to the same path from then on.
 * @returns {Promise<boolean>} true if saved, false if the user cancelled
 *   the save dialog.
 */
export async function saveDraft() {
    const state = getState();

    const savePath = await Neutralino.os.showSaveDialog('Salva bozza', {
        defaultPath: suggestedFileName(state.title),
        filters: [{name: 'Documento Larys', extensions: [FILE_EXTENSION]}],
    });
    if (!savePath) return false;

    const finalPath = withOurExtension(savePath);
    const {bytes, json} = await buildDraftZip();
    await Neutralino.filesystem.writeBinaryFile(finalPath, bytes.buffer);

    currentFilePath = finalPath;
    lastSavedSnapshot = json;

    return true;
}

/**
 * Loads a draft via the native open-file dialog: reads document.json,
 * converts every relative image path back into a base64 data URL, then
 * applies the result via setState().
 *
 * Deliberately uses Neutralino.os.showOpenDialog + filesystem.readBinaryFile
 * instead of an `<input type="file">` picker: a browser File object's
 * `.path` is not a real filesystem path in Neutralino (it's stripped for
 * security, same as in any browser), so we'd have no location to write
 * autosaves back to. The native dialog gives us a real absolute path.
 *
 * @returns {Promise<boolean>} true if a draft was loaded, false if the
 *   user cancelled the dialog.
 * @throws {Error} if the chosen file has no document.json.
 */
export async function loadDraft() {
    const paths = await Neutralino.os.showOpenDialog('Carica bozza', {
        filters: [{name: 'Documento Larys', extensions: [FILE_EXTENSION]}],
    });
    if (!paths || !paths.length) return false;
    const path = paths[0];

    const buffer = await Neutralino.filesystem.readBinaryFile(path);
    const zip = await window.JSZip.loadAsync(buffer);

    const jsonEntry = zip.file('document.json');
    if (!jsonEntry) throw new Error('File non valido: manca document.json');
    const jsonText = await jsonEntry.async('string');
    const state = JSON.parse(jsonText);

    const refs = collectImageRefs(state.sections);
    for (const item of refs) {
        const itemPath = item.data.src;
        if (!itemPath || !itemPath.startsWith('images/')) continue;
        const entry = zip.file(itemPath);
        if (!entry) continue;
        const bytes = await entry.async('uint8array');
        const ext = itemPath.split('.').pop().toLowerCase();
        const mime = Object.entries(EXT_BY_MIME).find(([, e]) => e === ext)?.[0] || 'image/png';
        item.data.src = await bytesToDataUrl(bytes, mime);
    }

    setState(state);

    // The in-memory state now has data-url images, but the on-disk JSON
    // (what we'll diff against on the next autosave tick) used relative
    // "images/<id>.ext" paths — so the pre-rewrite jsonText, not
    // JSON.stringify(state), is the correct "last saved" baseline.
    currentFilePath = path;
    lastSavedSnapshot = jsonText;

    return true;
}

/**
 * Silently rewrites `currentFilePath` with the current state, no dialog
 * involved. No-op (and no disk write) if:
 *  - we don't have a known path yet (before the first manual save/load), or
 *  - nothing changed since the last write.
 * @returns {Promise<boolean>} true if a write actually happened.
 */
async function autosaveTick() {
    if (!currentFilePath) return false;

    const {bytes, json} = await buildDraftZip();
    if (json === lastSavedSnapshot) return false;

    await Neutralino.filesystem.writeBinaryFile(currentFilePath, bytes.buffer);
    lastSavedSnapshot = json;
    return true;
}

/**
 * Starts the autosave loop. Only ever writes to disk once `currentFilePath`
 * is known (i.e. after the first successful saveDraft() or loadDraft()) —
 * calling this earlier just arms a timer that no-ops until then. Safe to
 * call more than once (e.g. defensively from main.js): it replaces any
 * previous timer instead of stacking them.
 * @param {number} [intervalMs] - default 60s.
 * @param {(saved: boolean) => void} [onTick] - optional hook, e.g. to
 *   flash a "salvato automaticamente" indicator in the toolbar.
 */
export function startAutosave(intervalMs = 60_000, onTick) {
    if (autosaveTimer) clearInterval(autosaveTimer);
    autosaveTimer = setInterval(async () => {
        try {
            const saved = await autosaveTick();
            if (onTick) onTick(saved);
        } catch (err) {
            console.error('Errore autosalvataggio:', err);
        }
    }, intervalMs);
}

/**
 * Clears the tracked path/snapshot (e.g. on "new document") so autosave
 * goes back to being inert until the next explicit save/load.
 */
export function clearActiveDraftPath() {
    currentFilePath = null;
    lastSavedSnapshot = null;
}