/**
 * attendance.js
 * Handles Check-in, Check-out, and Attendance History.
 */

// Ensure global access if utils loaded, otherwise define locally or wait
window.addEventListener("employeesLoaded", (e) => {
  const employees = e.detail;
  if (typeof populateEmployeeDropdown === "function") {
    populateEmployeeDropdown("att-employee-select", employees);
  }
});

async function handleCheckIn() {
  const empId = document.getElementById("att-employee-select").value;

  // Get manual inputs if exist (Admin/Head features)
  const manualTimeInput = document.getElementById("att-manual-time");
  const manualDateInput = document.getElementById("att-manual-date");

  const manualTime = manualTimeInput ? manualTimeInput.value : null;
  const manualDate = manualDateInput ? manualDateInput.value : null;

  const role = sessionStorage.getItem("role");

  if (!empId) {
    if (window.showToast) showToast("Please select an employee", "error");
    else alert("Please select an employee");
    return;
  }

  try {
    const payload = {
      employee_id: parseInt(empId),
      manual_time: manualTime,
      manual_date: manualDate,
      role: role,
    };

    const response = await fetch(`${API_BASE}/attendance/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      if (window.showToast) showToast("Check-in Successful", "success");

      // Clear manual inputs if success
      if (manualTimeInput) manualTimeInput.value = "";
      if (manualDateInput) manualDateInput.value = "";

      setTimeout(() => loadAttendanceHistory(empId), 100);
    } else {
      const data = await response.json();
      if (window.showToast)
        showToast(data.message || "Check-in failed", "error");
    }
  } catch (error) {
    console.error(error);
    if (window.showToast) showToast("Server error", "error");
  }
}

async function handleCheckOut() {
  const empId = document.getElementById("att-employee-select").value;

  const manualTimeInput = document.getElementById("att-manual-time");
  const manualDateInput = document.getElementById("att-manual-date");

  const manualTime = manualTimeInput ? manualTimeInput.value : null;
  const manualDate = manualDateInput ? manualDateInput.value : null;

  const role = sessionStorage.getItem("role");

  if (!empId) {
    if (window.showToast) showToast("Please select an employee", "error");
    return;
  }

  try {
    const payload = {
      employee_id: parseInt(empId),
      manual_time: manualTime,
      manual_date: manualDate,
      role: role,
    };

    const response = await fetch(`${API_BASE}/attendance/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      if (window.showToast) showToast("Check-out Successful", "success");

      if (manualTimeInput) manualTimeInput.value = "";
      if (manualDateInput) manualDateInput.value = "";

      setTimeout(() => loadAttendanceHistory(empId), 200);
    } else {
      const data = await response.json();
      if (window.showToast)
        showToast(data.message || "Check-out failed", "error");
    }
  } catch (error) {
    console.error(error);
    if (window.showToast) showToast("Server error", "error");
  }
}

function formatTime12Hour(timeStr) {
  if (!timeStr) return "-";
  // Assuming timeStr is "HH:MM:SS" or "HH:MM"
  const [hours24, minutes] = timeStr.split(":");
  let hours = parseInt(hours24, 10);
  const suffix = hours >= 12 ? "PM" : "AM";

  hours = hours % 12 || 12; // Convert 0 to 12

  return `${hours}:${minutes} ${suffix}`;
}

async function loadAttendanceHistory(empId) {
  // If no ID passed, try to get from dropdown
  if (!empId) empId = document.getElementById("att-employee-select").value;
  if (!empId) return;

  const tbody = document.getElementById("attendance-table-body");
  if (tbody)
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Loading...</td></tr>`;

  try {
    // Cache busting timestamp
    const response = await fetch(
      `${API_BASE}/attendance/${empId}?t=${new Date().getTime()}`,
    );

    if (response.ok) {
      const data = await response.json();
      if (tbody) {
        tbody.innerHTML = "";

        if (data.length === 0) {
          tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No records found for this employee.</td></tr>`;
          return;
        }

        data.forEach((record) => {
          const tr = document.createElement("tr");
          const checkInTime = record.check_in
            ? formatTime12Hour(record.check_in)
            : "-";
          const checkOutTime = record.check_out
            ? formatTime12Hour(record.check_out)
            : "-";

          tr.innerHTML = `
                        <td>${record.date}</td>
                        <td>${checkInTime}</td>
                        <td>${checkOutTime}</td>
                        <td>${record.worked_hours ? record.worked_hours.toFixed(2) : "0.00"} hrs</td>
                    `;
          tbody.appendChild(tr);
        });
      }
    } else {
      console.error("Failed to fetch attendance history");
      if (tbody)
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: #ef4444;">Error loading records.</td></tr>`;
    }
  } catch (error) {
    console.error("Error fetching attendance:", error);
    if (tbody)
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: #ef4444;">Connection Error.</td></tr>`;
  }
}

// Trigger history load when dropdown changes
const attSelect = document.getElementById("att-employee-select");
if (attSelect) {
  attSelect.addEventListener("change", (e) => {
    loadAttendanceHistory(e.target.value);
  });
}
