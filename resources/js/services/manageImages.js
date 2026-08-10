import {updateContentItemWith, mutateContentItemWith} from "../sections/sectionManager.js";

/**
 * @param {string} ext
 * @returns {string}
 */
function getMimeType(ext) {
    const mimeMap = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        gif: 'image/gif',
        svg: 'image/svg'
    };
    return mimeMap[ext.toLowerCase()] || 'image/png';
}

/**
 * Get the native width and heigh of the img.
 * @param {string} src
 * @returns {Promise<{width: number, height: number}>}
 */
function getImageDimension(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({width: img.naturalWidth || 0, height: img.naturalHeight || 0});
        img.onerror = () => resolve({width: 0, height: 0});
        img.src = src;
    });
}

/**
 * @returns {Promise<{src: string, naturalWidth: number, naturalHeight: number}|null>}
 */
export async function pickImageSource() {
    try {
        const entries = await Neutralino.os.showOpenDialog('Scegli immagine', {
            filters: [
                {name: 'Immagini', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg']}
            ]
        });

        if (!entries || entries.length === 0) return null;

        const filePath = entries[0];
        const extension = filePath.split('.').pop()?.toLowerCase() || '';
        const mimeType = getMimeType(extension);

        const binaryData = await Neutralino.filesystem.readBinaryFile(filePath);
        const unit8Array = new Uint8Array(binaryData);
        const blob = new Blob([unit8Array], {type: mimeType});

        const src = await new Promise((resolve) => {
            const render = new FileReader();
            render.onload = (e) => resolve(e.target.result);
            render.readAsDataURL(blob);
        });

        const dims = await getImageDimension(src);
        return {src, naturalWidth: dims.width, naturalHeight: dims.height};
    } catch (err) {
        console.error('Error on loading image:', err);
        return null;
    }
}

/**
 *
 * @param {string} blockId
 * @param {string} itemId
 * @param  imageData
 */
export function setImageSource(blockId, itemId, imageData) {
    if (!imageData || !imageData.src) return;
    updateContentItemWith(blockId, itemId, data => {
        data.src = imageData.src;
        data.originalWidth = imageData.naturalWidth || 0;
        data.originalHeight = imageData.naturalHeight || 0;
        data.width = 'auto';
    });
}


export function setImageAlign(blockId, itemId, align) {
    updateContentItemWith(blockId, itemId, data => {
        data.align = align;
    });
}

/**
 * @param {string} blockId
 * @param {string} itemId
 * @param {string} width
 */
export function setImageWidth(blockId, itemId, width) {
    updateContentItemWith(blockId, itemId, data => {
        if (width === 'auto' || width === '100%' || width === '50%') {
            data.width = width;
        } else {
            const num = Number(width);
            data.width = isNaN(num) || num <= 0 ? 'auto' : num;
        }
    });
}

export function scaleImageWidth(blockId, itemId, factor) {
    updateContentItemWith(blockId, itemId, data => {
        const baseWidth = data.originalWidth || 300;
        data.width = Math.round(baseWidth * factor);
    });
}

export function mutateImageWidth(blockId, itemId, width) {
    mutateContentItemWith(blockId, itemId, data => {
        if (width === 'auto' || width === '100%' || width === '50%') {
            data.width = width;
        } else {
            const num = Number(width);
            data.width = isNaN(num) || num <= 0 ? 'auto' : num;
        }
    });
}