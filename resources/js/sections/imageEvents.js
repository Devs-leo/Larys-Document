import {getContentItemData} from "./sectionManager.js";
import {itemBlockId, itemId} from "../utils.js";
import {
    mutateImageWidth,
    pickImageSource,
    scaleImageWidth,
    setImageAlign, setImagePosition,
    setImageSource,
    setImageWidth
} from "../services/manageImages.js";

const contentEl = document.getElementById('content');

/**
 * Wires all image-toolbar interactions inside #content: source picking,
 * alignment/position, size presets, the exact-width input (live preview
 * on 'input', committed value on 'change'), and the advanced-panel
 * toggle. Called once from sectionEvents.bindSectionEvents.
 */
export function bindImageEvents() {
    contentEl.addEventListener('click', onImageClick);
    contentEl.addEventListener('input', onImageInput);
    contentEl.addEventListener('change', onImageChange);
}

/**
 * @param {MouseEvent} e
 */
async function onImageClick(e) {
    const imageBtn = e.target.closest('[data-action="pick-image-source"]');
    if (imageBtn) {
        const imageData = await pickImageSource();
        if (imageData) {
            setImageSource(itemBlockId(imageBtn), itemId(imageBtn), imageData);
        }
        return;
    }

    const alignBtn = e.target.closest('[data-action="set-image-align"]');
    if (alignBtn) {
        setImageAlign(itemBlockId(alignBtn), itemId(alignBtn), alignBtn.dataset.align);
        return;
    }

    const widthBtn = e.target.closest('[data-action="set-image-width"]');
    if (widthBtn) {
        setImageWidth(itemBlockId(widthBtn), itemId(widthBtn), widthBtn.dataset.width);
        return;
    }

    const scaleBtn = e.target.closest('[data-action="scale-image"]');
    if (scaleBtn) {
        const factor = Number(scaleBtn.dataset.scale);
        scaleImageWidth(itemBlockId(scaleBtn), itemId(scaleBtn), factor);
        return;
    }

    const toggleAdvBtn = e.target.closest('[data-action="toggle-image-advanced"]');
    if (toggleAdvBtn) {
        const wrapper = toggleAdvBtn.closest('.image-advanced-wrapper');
        if (wrapper) {
            document.querySelectorAll('.image-advanced-wrapper.is-open').forEach(w => {
                if (w !== wrapper) w.classList.remove('is-open');
            });
            wrapper.classList.toggle('is-open');
        }
        return;
    }

    const positionBtn = e.target.closest('[data-action="set-image-position"]');
    if (positionBtn) {
        setImagePosition(itemBlockId(positionBtn), itemId(positionBtn), positionBtn.dataset.align);
        //return;
    }
}

/**
 * Live preview while typing the exact-width input: updates the DOM
 * directly and mutates state silently (no re-render) so focus/caret
 * aren't lost mid-edit.
 * @param {InputEvent} e
 */
function onImageInput(e) {
    if (e.target.dataset.role === 'image-width-px') {
        handleImagePixelWidthInput(e.target);
    }
}

/**
 * Commits the exact-width value once the input is confirmed (blur/enter).
 * @param {Event} e
 */
function onImageChange(e) {
    if (e.target.dataset.role === 'image-width-px') {
        const val = Number(e.target.value);
        if (val && val > 0) {
            setImageWidth(itemBlockId(e.target), itemId(e.target), String(val));
        }
    }
}

/**
 * @param {HTMLElement} el
 */
function handleImagePixelWidthInput(el) {
    const val = Number(el.value);
    const figure = el.closest('figure.content-image');
    if (!figure) return;

    const blockId = itemBlockId(el);
    const currentItemId = itemId(el);
    const itemData = getContentItemData(blockId, currentItemId);
    const originalWidth = itemData?.originalWidth || 0;

    const media = figure.querySelector('.content-image-media');
    const warningBox = figure.querySelector('.resolution-warning');

    if (val && val > 0) {
        if (media) {
            media.style.width = `${val}px`;
            media.style.maxWidth = '100%';
        }
        if (warningBox && originalWidth > 0) {
            if (val > originalWidth) {
                warningBox.style.display = 'block';
                warningBox.innerHTML = `⚠️ <strong>Attenzione:</strong> La larghezza impostata (${val}px) supera quella originale (${originalWidth}px). L'immagine potrebbe risultare sgranata.`;
            } else {
                warningBox.style.display = 'none';
            }
        }
        mutateImageWidth(blockId, currentItemId, val);
    } else if (el.value === '') {
        if (media) {
            media.style.width = 'max-content';
        }
        if (warningBox) warningBox.style.display = 'none';
        mutateImageWidth(blockId, currentItemId, 'auto');
    }
}
