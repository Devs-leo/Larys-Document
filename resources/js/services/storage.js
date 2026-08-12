import {getState, setState} from '../state.js';

const IMAGE_TYPES = ['image', 'imageText'];

const EXT_BY_MIME = {
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp',
    'image/gif': 'gif', 'image/svg': 'svg',
};

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
 * Saves the current document as a .zip: `document.json` (state with every
 * image `src` rewritten to a relative `images/<id>.<ext>` path) plus an
 * `images/` folder with the actual binary files. Keeps the JSON small and
 * diffable instead of carrying base64 blobs inline.
 * @returns {Promise<boolean>} true if saved, false if the user cancelled
 *   the save dialog.
 */
export async function saveDraft() {
    const state = getState();
    // Plain-data clone (no functions/Dates in DocumentState) so rewriting
    // `src` here never touches the live state — same principle as the
    // "local copy, one commit" rule used by reorderModal.js.
    const clone = JSON.parse(JSON.stringify(state));
    const refs = collectImageRefs(clone.sections);

    const zip = new window.JSZip();
    const imagesFolder = zip.folder('images');

    refs.forEach(item => {
        const decoded = decodeDataUrl(item.data.src);
        if (!decoded) return; // empty or already a path, leave as-is
        const ext = EXT_BY_MIME[decoded.mime] || 'png';
        const filename = `${item.id}.${ext}`;
        imagesFolder.file(filename, decoded.bytes);
        item.data.src = `images/${filename}`;
    });

    zip.file('document.json', JSON.stringify(clone, null, 2));

    const bytes = await zip.generateAsync({type: 'uint8array'});

    const suggestedName = `${(state.title || 'documento').replace(/[^\w\- ]/g, '') || 'documento'}.zip`;
    const savePath = await Neutralino.os.showSaveDialog('Salva bozza', {
        defaultPath: suggestedName,
        filters: [{name: 'Bozza documento', extensions: ['zip']}],
    });
    if (!savePath) return false;

    await Neutralino.filesystem.writeBinaryFile(savePath, bytes.buffer);
    return true;
}

/**
 * Loads a draft from a .zip File (from the native <input type="file">
 * picker): reads document.json, converts every relative image path back
 * into a base64 data URL, then applies the result via setState().
 * @param {File} file
 * @returns {Promise<void>}
 * @throws {Error} if the zip has no document.json.
 */
export async function loadDraft(file) {
    const buffer = await file.arrayBuffer();
    const zip = await window.JSZip.loadAsync(buffer);

    const jsonEntry = zip.file('document.json');
    if (!jsonEntry) throw new Error('File non valido: manca document.json');
    const state = JSON.parse(await jsonEntry.async('string'));

    const refs = collectImageRefs(state.sections);
    for (const item of refs) {
        const path = item.data.src;
        if (!path || !path.startsWith('images/')) continue;
        const entry = zip.file(path);
        if (!entry) continue;
        const bytes = await entry.async('uint8array');
        const ext = path.split('.').pop().toLowerCase();
        const mime = Object.entries(EXT_BY_MIME).find(([, e]) => e === ext)?.[0] || 'image/png';
        item.data.src = await bytesToDataUrl(bytes, mime);
    }

    setState(state);
}