/**
 * utils.js
 * Handles global UI interactions like Toasts and Modals.
 */

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = "success") {
  // Ensure container exists
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;

  container.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = "fadeOut 0.3s ease-out forwards";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// --- CONFIRMATION MODAL ---
let confirmCallback = null;

function showConfirmModal(message, callback) {
  const modal = document.getElementById("custom-modal");
  const msgEl = document.getElementById("modal-message");

  if (msgEl) msgEl.innerText = message;
  confirmCallback = callback;

  if (modal) modal.classList.add("active");
}

function closeConfirmModal() {
  const modal = document.getElementById("custom-modal");
  if (modal) modal.classList.remove("active");
  confirmCallback = null;
}

function handleConfirmYes() {
  if (confirmCallback) confirmCallback();
  closeConfirmModal();
}

// Expose to window
window.showToast = showToast;
window.showConfirmModal = showConfirmModal;
