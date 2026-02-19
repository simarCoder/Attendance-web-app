/**
 * settings.js
 * Handles the Settings page interactions.
 */

function loadSettings() {
  // 1. Load Hours (Admin + Head)
  fetch(`${API_BASE}/settings/hours`)
    .then((res) => res.json())
    .then((data) => {
      const input = document.getElementById("setting-hours");
      if (input) input.value = data.hours;
    })
    .catch((err) => console.error(err));

  // 2. Load System Users & Renewal Date (Head Only)
  const role = sessionStorage.getItem("role");
  if (role === "head") {
    loadSystemUsers();
    loadRenewalDate();
    loadDemoMode(); // NEW: Load toggle state
  }
}

async function triggerDatabaseBackup() {
  try {
    const btn = document.querySelector(
      'button[onclick="triggerDatabaseBackup()"]',
    );
    const origText = btn.innerText;
    btn.innerText = "Backing up...";
    btn.disabled = true;

    const res = await fetch(`${API_BASE}/settings/backup`, { method: "POST" });
    const data = await res.json();

    if (res.ok) {
      if (window.showToast) showToast("Backup Successful!", "success");
    } else {
      if (window.showToast) showToast(data.message, "error");
    }

    btn.innerText = origText;
    btn.disabled = false;
  } catch (err) {
    console.error(err);
    if (window.showToast) showToast("Backup failed (server error)", "error");
  }
}

// --- RENEWAL LOGIC ---
function loadRenewalDate() {
  fetch(`${API_BASE}/settings/renewal`)
    .then((res) => res.json())
    .then((data) => {
      const input = document.getElementById("setting-renewal-date");
      if (input && data.date) {
        input.value = data.date;
      }
    })
    .catch((err) => console.error(err));
}

async function saveRenewalDate(event) {
  event.preventDefault();
  const dateStr = document.getElementById("setting-renewal-date").value;

  try {
    const res = await fetch(`${API_BASE}/settings/renewal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateStr }),
    });

    const data = await res.json();
    if (res.ok) {
      if (window.showToast) showToast(data.message, "success");
    } else {
      if (window.showToast) showToast(data.message, "error");
    }
  } catch (err) {
    if (window.showToast) showToast("Server error", "error");
  }
}

// --- DEMO MODE LOGIC (NEW) ---
function loadDemoMode() {
  fetch(`${API_BASE}/settings/demo`)
    .then((res) => res.json())
    .then((data) => {
      const toggle = document.getElementById("setting-demo-toggle");
      if (toggle) toggle.checked = data.enabled;
    })
    .catch((err) => console.error("Error loading demo mode:", err));
}

function toggleDemoMode() {
  const toggle = document.getElementById("setting-demo-toggle");
  if (!toggle) return;

  fetch(`${API_BASE}/settings/demo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled: toggle.checked }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (window.showToast) showToast(data.message, "success");
      // Reload to apply banner layout changes
      setTimeout(() => location.reload(), 1000);
    })
    .catch((err) => {
      console.error(err);
      if (window.showToast) showToast("Failed to update demo mode", "error");
      // Revert toggle if failed
      toggle.checked = !toggle.checked;
    });
}

// --- SYSTEM USERS LOGIC ---
function loadSystemUsers() {
  const tbody = document.getElementById("system-users-table-body");
  if (!tbody) return;

  fetch(`${API_BASE}/users`)
    .then((res) => res.json())
    .then((users) => {
      tbody.innerHTML = "";
      if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No users found.</td></tr>`;
        return;
      }

      users.forEach((u) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
                <td>${u.id}</td>
                <td>${u.username}</td>
                <td>${u.role.toUpperCase()}</td>
                <td>
                    <div style="display:flex; gap:0.5rem;">
                        <input type="password" value="${u.password}" id="pass-${u.id}" class="form-control" style="padding:0.25rem 0.5rem; font-size:0.8rem; width:100px;">
                        <button onclick="updateUserPassword(${u.id})" class="btn btn-primary" style="padding:0.25rem 0.5rem; font-size:0.8rem;">Save</button>
                    </div>
                </td>
                <td>
                    <button onclick="deleteSystemUser(${u.id})" class="btn btn-warning" style="padding:0.25rem 0.5rem; font-size:0.8rem; background:var(--danger); color:white;">Delete</button>
                </td>
            `;
        tbody.appendChild(tr);
      });
    })
    .catch((err) => {
      console.error(err);
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Error loading users.</td></tr>`;
    });
}

async function saveWorkingHours(event) {
  event.preventDefault();
  const hours = document.getElementById("setting-hours").value;

  try {
    const res = await fetch(`${API_BASE}/settings/hours`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours: parseFloat(hours) }),
    });

    const data = await res.json();
    if (res.ok) {
      if (window.showToast) showToast(data.message, "success");
    } else {
      if (window.showToast) showToast(data.message, "error");
    }
  } catch (err) {
    if (window.showToast) showToast("Server error", "error");
  }
}

async function addSystemUser(event) {
  event.preventDefault();

  // Only HEAD
  const role = sessionStorage.getItem("role");
  if (role !== "head") {
    if (window.showToast) showToast("Only HEAD can add users", "error");
    return;
  }

  const u = document.getElementById("new-user-name").value;
  const p = document.getElementById("new-user-pass").value;
  const r = document.getElementById("new-user-role").value;

  try {
    const res = await fetch(`${API_BASE}/users/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p, role: r }),
    });

    const data = await res.json();
    if (res.ok) {
      if (window.showToast) showToast(data.message, "success");
      document.getElementById("add-user-form").reset();
      loadSystemUsers();
    } else {
      if (window.showToast) showToast(data.message, "error");
    }
  } catch (err) {
    if (window.showToast) showToast("Server error", "error");
  }
}

async function updateUserPassword(userId) {
  const newPass = document.getElementById(`pass-${userId}`).value;
  if (!newPass) return;

  try {
    const res = await fetch(`${API_BASE}/users/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, password: newPass }),
    });

    const data = await res.json();
    if (res.ok) {
      if (window.showToast) showToast("Password updated", "success");
    } else {
      if (window.showToast) showToast(data.message, "error");
    }
  } catch (err) {
    if (window.showToast) showToast("Server error", "error");
  }
}

async function deleteSystemUser(userId) {
  const currentUserId = sessionStorage.getItem("user_id");

  showConfirmModal(
    "Delete this system user? This cannot be undone.",
    async () => {
      try {
        const res = await fetch(`${API_BASE}/users/delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            current_user_id: currentUserId,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          if (window.showToast) showToast(data.message, "success");
          loadSystemUsers();
        } else {
          if (window.showToast) showToast(data.message, "error");
        }
      } catch (err) {
        if (window.showToast) showToast("Server error", "error");
      }
    },
  );
}
