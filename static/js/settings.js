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
    if (window.showToast) showToast("Backup failed: Connection error", "error");
  }
}

async function loadRenewalDate() {
  try {
    const res = await fetch(`${API_BASE}/settings/renewal`);
    const data = await res.json();
    if (data.date) {
      document.getElementById("setting-renewal-date").value = data.date;
    }
  } catch (err) {
    console.error("Renewal date load error", err);
  }
}

async function saveRenewalDate(event) {
  event.preventDefault();
  const date = document.getElementById("setting-renewal-date").value;

  try {
    const res = await fetch(`${API_BASE}/settings/renewal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: date }),
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

async function loadSystemUsers() {
  try {
    const response = await fetch(`${API_BASE}/users`);
    const users = await response.json();

    const tbody = document.getElementById("system-users-table-body");
    tbody.innerHTML = "";

    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No users found</td></tr>`;
      return;
    }

    users.forEach((u) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td>${u.id}</td>
                <td>${u.username}</td>
                <td><span class="status-badge" style="background:#334155; color:white;">${u.role}</span></td>
                <td style="font-family:monospace; color:var(--primary);">${u.password}</td>
                <td>
                    <button class="btn btn-primary" style="padding:4px 8px; font-size:0.8rem; margin-right:5px;" onclick="updateUserPassword(${u.id}, '${u.username}')">Change Pwd</button>
                    <button class="btn" style="padding:4px 8px; font-size:0.8rem; background:var(--danger); color:white;" onclick="deleteSystemUser(${u.id})">Delete</button>
                </td>
            `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Error loading users:", error);
    if (window.showToast) showToast("Failed to load users", "error");
  }
}

async function deleteSystemUser(targetUserId) {
  if (
    !confirm(
      "Are you sure you want to delete this user? IDs will be reordered.",
    )
  )
    return;

  // Get ID of person clicking the button
  const currentUserId = sessionStorage.getItem("user_id");

  try {
    const res = await fetch(`${API_BASE}/users/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: targetUserId,
        current_user_id: currentUserId, // Send this for security check
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
    console.error(err);
    if (window.showToast) showToast("Server error", "error");
  }
}

async function updateUserPassword(userId, username) {
  const newPass = prompt(`Enter new password for ${username}:`);
  if (!newPass) return; // Cancelled

  try {
    const res = await fetch(`${API_BASE}/users/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, password: newPass }),
    });

    const data = await res.json();
    if (res.ok) {
      if (window.showToast)
        showToast("Password updated successfully", "success");
      loadSystemUsers(); // Refresh table to show new password
    } else {
      if (window.showToast) showToast(data.message, "error");
    }
  } catch (err) {
    console.error(err);
    if (window.showToast) showToast("Server error", "error");
  }
}

async function saveWorkingHours(event) {
  event.preventDefault();

  const hours = document.getElementById("setting-hours").value;

  // Only Admin/Head
  const role = sessionStorage.getItem("role");
  if (!["admin", "head"].includes(role)) {
    if (window.showToast) showToast("Unauthorized", "error");
    return;
  }

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
      if (window.showToast) showToast("User added successfully", "success");
      document.getElementById("add-user-form").reset();
      loadSystemUsers(); // Refresh list immediately
    } else {
      if (window.showToast) showToast(data.message, "error");
    }
  } catch (err) {
    if (window.showToast) showToast("Server error", "error");
  }
}
