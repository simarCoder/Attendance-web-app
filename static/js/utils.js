/**
 * utils.js
 * Handles global UI interactions like Toasts and Modals.
 */

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = "success") {
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

// --- SHARED HELPERS ---

/**
 * Populates a select dropdown with employee options.
 * Used by Attendance and Salary modules.
 */
function populateEmployeeDropdown(selectId, employees) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = '<option value="">Select Employee...</option>';

  employees.forEach((emp) => {
    const option = document.createElement("option");
    option.value = emp.id || emp.employee_id;
    option.textContent = `${emp.name} (${emp.role})`;
    select.appendChild(option);
  });
}

// Expose to window
window.showToast = showToast;
window.showConfirmModal = showConfirmModal;
window.populateEmployeeDropdown = populateEmployeeDropdown;
