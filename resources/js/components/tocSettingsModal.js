import {getState, setTocPosition} from '../state.js';

const overlay = document.createElement('div');
overlay.className = 'confirm-modal-overlay';
overlay.innerHTML = `
  <div class="confirm-modal toc-settings-modal">
    <h3>Posizione indice</h3>
    <div class="toc-position-options">
      <button type="button" data-position="top">Inizio documento</button>
      <button type="button" data-position="bottom">Fine documento</button>
    </div>
    <div class="confirm-modal-actions">
      <button type="button" class="confirm-modal-cancel toc-settings-close">Chiudi</button>
    </div>
  </div>`;
document.body.appendChild(overlay);

const optionsEl = overlay.querySelector('.toc-position-options');
overlay.querySelector('.toc-settings-close').addEventListener('click', close);

optionsEl.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
        setTocPosition(btn.dataset.position);
        refresh();
    });
});

function close() {
    overlay.classList.remove('open');
}

function refresh() {
    const current = getState().tocPosition;
    optionsEl.querySelectorAll('button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.position === current);
    });
}

/** Opens the TOC-position picker. */
export function showTocSettingsModal() {
    refresh();
    overlay.classList.add('open');
}