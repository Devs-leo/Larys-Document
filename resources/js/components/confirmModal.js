const overlay = document.createElement('div');
overlay.className = 'confirm-modal-overlay';
overlay.innerHTML = `
  <div class="confirm-modal">
    <p class="confirm-modal-message"></p>
    <div class="confirm-modal-actions">
      <button type="button" class="confirm-modal-cancel">Annulla</button>
      <button type="button" class="confirm-modal-confirm">Conferma</button>
    </div>
  </div>`;
document.body.appendChild(overlay);

const messageEl = overlay.querySelector('.confirm-modal-message');
let activeResolve = null;

function close() {
    overlay.classList.remove('open');
    activeResolve = null;
}

overlay.querySelector('.confirm-modal-confirm').addEventListener('click', () => {
    const resolve = activeResolve;
    close();
    resolve?.(true);
});
overlay.querySelector('.confirm-modal-cancel').addEventListener('click', () => {
    const resolve = activeResolve;
    close();
    resolve?.(false);
});

/**
 * Shows a styled confirm modal (replaces native confirm()). One shared
 * instance app-wide — callers just await the resulting promise.
 * @param {string} message
 * @returns {Promise<boolean>}
 */
export function showConfirmModal(message) {
    messageEl.textContent = message;
    overlay.classList.add('open');
    return new Promise(resolve => {
        activeResolve = resolve;
    });
}