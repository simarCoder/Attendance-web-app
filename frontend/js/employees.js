/**
 * employees.js
 * Handles fetching, displaying, and adding employees.
 */

async function loadEmployees() {
  try {
    const response = await fetch(`${API_BASE}/employees`);
    if (!response.ok) throw new Error("Failed to fetch employees");

    const employees = await response.json();
    renderEmployeeTable(employees);
    updateDashboardStats(employees.length);

    const event = new CustomEvent("employeesLoaded", { detail: employees });
    window.dispatchEvent(event);
  } catch (error) {
    console.error("Error loading employees:", error);
    renderEmptyState("employee-table-body", "No connection to backend.");
  }
}

function deactivateEmployee(id, event) {
  if (event) event.stopPropagation();

  // Role check handled by server mainly, but also UI check
  const role = sessionStorage.getItem("role");
  if (!["admin", "head"].includes(role)) {
    showToast("Access Denied", "error");
    return;
  }

  showConfirmModal("Deactivate this employee account?", async () => {
    const response = await fetch(`${API_BASE}/employee/deactivate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_id: id }),
    });

    if (response.ok) {
      showToast("Employee Deactivated", "success");
      loadEmployees();
    } else {
      showToast("Failed to deactivate", "error");
    }
  });
}

async function activateEmployee(id, event) {
  if (event) event.stopPropagation();

  // Only Admin or Head can activate
  const role = sessionStorage.getItem("role");
  if (!["admin", "head"].includes(role)) {
    showToast("Access Denied. Only Admin/Head can activate.", "error");
    return;
  }

  const response = await fetch(`${API_BASE}/employee/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employee_id: id }),
  });

  if (response.ok) {
    showToast("Employee Activated", "success");
    loadEmployees();
  } else {
    showToast("Failed to activate", "error");
  }
}

async function deleteEmployee(id, event) {
  if (event) event.stopPropagation();

  // Only Admin or Head can delete
  const role = sessionStorage.getItem("role");
  if (!["admin", "head"].includes(role)) {
    showToast("Access Denied.", "error");
    return;
  }

  showConfirmModal(
    "PERMANENTLY DELETE this employee? All data will be lost.",
    async () => {
      const response = await fetch(`${API_BASE}/employee/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: id }),
      });

      const data = await response.json();
      if (response.ok) {
        showToast(data.message, "success");
        loadEmployees();
      } else {
        showToast("Error: " + data.message, "error");
      }
    },
  );
}

function renderEmployeeTable(employees) {
  const tbody = document.getElementById("employee-table-body");
  tbody.innerHTML = "";

  const currentUserRole = sessionStorage.getItem("role");
  const canModify = ["admin", "head"].includes(currentUserRole);

  employees.forEach((emp) => {
    const tr = document.createElement("tr");

    // Action Buttons Logic
    let actionButtons = "";

    // 1. Activate/Deactivate (Only Admin/Head)
    if (canModify) {
      if (emp.status === "active") {
        actionButtons += `<button class="btn btn-warning" style="padding:4px 8px; margin-right:5px;" onclick="deactivateEmployee(${emp.id}, event)">Deactivate</button>`;
      } else {
        actionButtons += `<button class="btn btn-primary" style="padding:4px 8px; margin-right:5px;" onclick="activateEmployee(${emp.id}, event)">Activate</button>`;
      }

      // 2. Delete (Only Admin/Head)
      actionButtons += `<button class="btn" style="background:#ef4444; color:white; padding:4px 8px;" onclick="deleteEmployee(${emp.id}, event)">Delete</button>`;
    } else {
      actionButtons = `<span style="color:var(--text-muted); font-size:0.8rem;">Read Only</span>`;
    }

    tr.innerHTML = `
      <td>#${emp.id}</td>
      <td>${emp.name}</td>
      <td>${emp.role}</td>
      <td>${emp.phone || "-"}</td>
      <td>${emp.address || "-"}</td>
      <td>₹${emp.monthly_salary}</td>
      <td>
        <span class="status-badge"
              style="
                background: ${emp.status === "active" ? "#16a34a" : "#fa6515c4"};
                color: black;
                padding: 4px 8px;
                border-radius: 6px;
              ">
          ${emp.status}
        </span>
      </td>
      <td>${actionButtons}</td>
    `;

    tr.addEventListener("click", () => {
      openEmployeeProfile(emp.id);
    });

    tbody.appendChild(tr);
  });
}

async function addEmployee(event) {
  event.preventDefault();

  const name = document.getElementById("emp-name").value;
  const role = document.getElementById("emp-role").value;
  const phone = document.getElementById("emp-contact").value;
  const address = document.getElementById("emp-address").value;
  const salary = document.getElementById("emp-salary").value;

  const payload = {
    name: name,
    role: role,
    phone: phone,
    address: address,
    monthly_salary: parseFloat(salary),
  };

  try {
    const response = await fetch(`${API_BASE}/employee/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      showToast("Employee added successfully", "success");
      document.getElementById("add-employee-form").reset();
      loadEmployees();
    } else {
      const err = await response.json();
      showToast(err.message || "Error adding employee", "error");
    }
  } catch (error) {
    console.error("Add employee failed:", error);
    showToast("Failed to connect to server", "error");
  }
}

function renderEmptyState(elementId, message) {
  document.getElementById(elementId).innerHTML = `
        <tr><td colspan="6" style="text-align:center; color: var(--text-muted);">${message}</td></tr>
    `;
}
