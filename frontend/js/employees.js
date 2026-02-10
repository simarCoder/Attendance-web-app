/**
 * employees.js
 * Handles fetching, displaying, and adding employees.
 */

// const API_BASE = 'http://127.0.0.1:5000'; // Leave empty for relative paths or set http://localhost:5000

async function loadEmployees() {
  try {
    const response = await fetch(`${API_BASE}/employees`);
    if (!response.ok) throw new Error("Failed to fetch employees");

    const employees = await response.json();
    renderEmployeeTable(employees);
    updateDashboardStats(employees.length); // Update total count

    // Dispatch event so other modules (attendance/salary) can update their dropdowns
    const event = new CustomEvent("employeesLoaded", { detail: employees });
    window.dispatchEvent(event);
  } catch (error) {
    console.error("Error loading employees:", error);
    // Fallback for UI demo if backend is offline
    renderEmptyState("employee-table-body", "No connection to backend.");
  }
}

function renderEmployeeTable(employees) {
  const tbody = document.getElementById("employee-table-body");

  // Update Table Header if needed (optional, assuming header is static in HTML)
  // Ensure your HTML table header in dashboard.html has an extra <th>Action</th> at the end
  // But strictly speaking for this JS, we just append the column.

  tbody.innerHTML = "";

  employees.forEach((emp) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
          <td>#${emp.id}</td>
          <td>${emp.name}</td>
          <td>${emp.role}</td>
          <td>${emp.phone || "-"}</td>
          <td>${emp.address || "-"}</td>
          <td>₹${emp.monthly_salary}</td>
          <td><span class="status-badge">Active</span></td>
          <td>
            <button onclick="deleteEmployee(${emp.id})" style="background: var(--danger); color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Delete</button>
          </td>
  `;
    tbody.appendChild(tr);
  });
}

async function addEmployee(event) {
  event.preventDefault();

  const name = document.getElementById("emp-name").value;
  const role = document.getElementById("emp-role").value;
  const phone = document.getElementById("emp-contact").value; // ✅ FIX
  const address = document.getElementById("emp-address").value; // ✅ FIX
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
      alert("Employee added successfully");
      document.getElementById("add-employee-form").reset();
      loadEmployees();
    } else {
      const err = await response.json();
      alert(err.message || "Error adding employee");
    }
  } catch (error) {
    console.error("Add employee failed:", error);
    alert("Failed to connect to server");
  }
}

async function deleteEmployee(id) {
  if (
    !confirm(
      "Are you sure you want to permanently delete this employee? All attendance and salary data will be lost.",
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/employee/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_id: id }),
    });

    const data = await response.json();

    if (response.ok) {
      alert(data.message);
      loadEmployees(); // Refresh list
    } else {
      alert("Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Server connection failed");
  }
}

function renderEmptyState(elementId, message) {
  document.getElementById(elementId).innerHTML = `
        <tr><td colspan="6" style="text-align:center; color: var(--text-muted);">${message}</td></tr>
    `;
}
