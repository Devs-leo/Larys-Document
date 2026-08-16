import {getState} from '../state.js';
import {renderPdfDocument} from '../sections/render/pdfRenderer.js';

const PREVIEW_ID = 'pdf-preview';
const PDF_CSS = 'css/pdf.css';

let exporting = false;

function getPreview() {
    const el = document.getElementById(PREVIEW_ID);
    if (!el) throw new Error(`#${PREVIEW_ID} not found`);
    return el;
}

function waitForImages(root) {
    const images = [...root.querySelectorAll('img')];
    return Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
            img.addEventListener('load', resolve, {once: true});
            img.addEventListener('error', resolve, {once: true});
        });
    }));
}

function waitForNextFrame() {
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function cleanup(preview) {
    preview.innerHTML = '';
    preview.classList.remove('is-exporting');
    document.body.classList.remove('pdf-exporting');
    exporting = false;
}

function requirePaged() {
    if (!window.PagedPolyfill || typeof window.PagedPolyfill.preview !== 'function') {
        throw new Error('Paged.js non è stato caricato. Aggiungi js/vendor/paged.polyfill.js.');
    }
}

export async function exportPdf() {
    if (exporting) return;
    exporting = true;

    const preview = getPreview();
    const state = getState();

    try {
        requirePaged();

        preview.innerHTML = '';
        preview.classList.add('is-exporting');
        document.body.classList.add('pdf-exporting');

        const source = document.createElement('div');
        source.className = 'pdf-source';
        source.innerHTML = renderPdfDocument(state);
        preview.appendChild(source);

        await waitForImages(source);
        await waitForNextFrame();

        preview.innerHTML = '';
        await window.PagedPolyfill.preview(source, [PDF_CSS], preview);
        await waitForNextFrame();

        await new Promise(resolve => {
            const finish = () => {
                window.removeEventListener('afterprint', finish);
                cleanup(preview);
                resolve();
            };

            window.addEventListener('afterprint', finish, {once: true});
            window.print();

            // Some embedded WebViews do not emit afterprint when the print command is cancelled.
            setTimeout(() => {
                if (document.body.classList.contains('pdf-exporting')) {
                    window.removeEventListener('afterprint', finish);
                    cleanup(preview);
                    resolve();
                }
            }, 120000);
        });
    } catch (error) {
        cleanup(preview);
        console.error(error);
        alert(`Esportazione PDF non riuscita: ${error.message}`);
    }
}

export function bindPdfExport() {
    const button = document.getElementById('print-doc-btn');
    if (!button) return;
    button.addEventListener('click', exportPdf);
}
