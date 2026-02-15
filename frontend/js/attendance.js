/**
 * attendance.js
 * Handles Check-in, Check-out, and Attendance History.
 */

// Listen for the global employee load event to populate dropdowns
window.addEventListener("employeesLoaded", (e) => {
  const employees = e.detail;
  populateEmployeeDropdown("att-employee-select", employees);
});

function populateEmployeeDropdown(selectId, employees) {
  const select = document.getElementById(selectId);
  select.innerHTML = '<option value="">Select Employee...</option>';

  employees.forEach((emp) => {
    const option = document.createElement("option");
    option.value = emp.id || emp.employee_id;
    option.textContent = `${emp.name} (${emp.role})`;
    select.appendChild(option);
  });
}

async function handleCheckIn() {
  const empId = document.getElementById("att-employee-select").value;
  if (!empId) return alert("Please select an employee");

  try {
    const response = await fetch(`${API_BASE}/attendance/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_id: parseInt(empId) }),
    });

    if (response.ok) {
      // alert("Check-in Successful");
      // Load history immediately after success
      loadAttendanceHistory(empId);
    } else {
      const data = await response.json();
      alert(data.message || "Check-in failed");
    }
  } catch (error) {
    console.error(error);
    alert("Server error");
  }
}

async function handleCheckOut() {
  const empId = document.getElementById("att-employee-select").value;
  if (!empId) return alert("Please select an employee");

  try {
    const response = await fetch(`${API_BASE}/attendance/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_id: parseInt(empId) }),
    });

    if (response.ok) {
      // alert("Check-out Successful");
      loadAttendanceHistory(empId);
    } else {
      const data = await response.json();
      alert(data.message || "Check-out failed");
    }
  } catch (error) {
    console.error(error);
    alert("Server error");
  }
}

async function loadAttendanceHistory(empId) {
  // If no ID passed, try to get from dropdown
  if (!empId) empId = document.getElementById("att-employee-select").value;
  if (!empId) return;

  try {
    // FIX: Added '?t=' + new Date().getTime()
    // This forces the browser to fetch FRESH data from the server instead of using the cache
    const response = await fetch(
      `${API_BASE}/attendance/${empId}?t=${new Date().getTime()}`,
    );

    if (response.ok) {
      const data = await response.json();
      const tbody = document.getElementById("attendance-table-body");
      tbody.innerHTML = "";

      if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No records found for this employee.</td></tr>`;
        return;
      }

      data.forEach((record) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
                    <td>${record.date}</td>
                    <td>${record.check_in || "-"}</td>
                    <td>${record.check_out || "-"}</td>
                    <td>${record.worked_hours ? record.worked_hours.toFixed(2) : "0.00"} hrs</td>
                `;
        tbody.appendChild(tr);
      });
    } else {
      // FIX: Handle server errors (like 500 Internal Server Error)
      console.error("Failed to fetch attendance history");
      const tbody = document.getElementById("attendance-table-body");
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: #ef4444;">Error loading records. Check server logs.</td></tr>`;
    }
  } catch (error) {
    console.error("Error fetching attendance:", error);
    const tbody = document.getElementById("attendance-table-body");
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: #ef4444;">Connection Error.</td></tr>`;
  }
}

// Trigger history load when dropdown changes
document
  .getElementById("att-employee-select")
  .addEventListener("change", (e) => {
    loadAttendanceHistory(e.target.value);
  });
