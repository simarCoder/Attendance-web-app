/**
 * salary.js
 * Handles Salary Generation and Viewing.
 */

// Initialize Date Pickers on Load
document.addEventListener("DOMContentLoaded", () => {
  populateDateSelectors();
});

function populateDateSelectors() {
  const monthSelect = document.getElementById("salary-month-select");
  const yearSelect = document.getElementById("salary-year-select");

  if (!monthSelect || !yearSelect) return;

  // Populate Months
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  months.forEach((m, index) => {
    const option = document.createElement("option");
    option.value = (index + 1).toString().padStart(2, "0"); // 01, 02...
    option.textContent = m;
    monthSelect.appendChild(option);
  });

  // Set current month
  const currentMonth = new Date().getMonth();
  monthSelect.selectedIndex = currentMonth;

  // Populate Years (Current year - 2 to Current year + 1)
  const currentYear = new Date().getFullYear();
  for (let i = currentYear - 2; i <= currentYear + 1; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = i;
    yearSelect.appendChild(option);
  }

  // Set current year
  yearSelect.value = currentYear;
}

// Listen for employee load to populate dropdown
window.addEventListener("employeesLoaded", (e) => {
  populateEmployeeDropdown("salary-employee-select", e.detail);
});

// Helper to construct YYYY-MM
function getSelectedMonthStr() {
  const month = document.getElementById("salary-month-select").value;
  const year = document.getElementById("salary-year-select").value;

  if (!month || !year) return null;
  return `${year}-${month}`;
}

async function generateSalary() {
  const empId = document.getElementById("salary-employee-select").value;
  const monthStr = getSelectedMonthStr();
  const role = sessionStorage.getItem("role"); // Get current user role

  if (!empId || !monthStr) {
    if (window.showToast)
      showToast("Please select employee, month and year", "error");
    return;
  }

  try {
    // 1. Attempt to Generate
    const genRes = await fetch(`${API_BASE}/salary/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_id: parseInt(empId),
        month: monthStr,
        role: role, // Send role to authenticate possible override
      }),
    });

    const genData = await genRes.json();

    if (genData.status === "new") {
      if (window.showToast)
        showToast("Success: Salary Slip Generated!", "success");
      fetchSalaryView(empId, monthStr);
    } else if (genData.status === "exists") {
      if (window.showToast)
        showToast("Salary already exists. Loading details...", "success");
      fetchSalaryView(empId, monthStr);
    } else {
      if (window.showToast)
        showToast("Error: " + (genData.message || "Unknown error"), "error");
    }
  } catch (error) {
    console.error(error);
    if (window.showToast) showToast("Server Connection Error", "error");
  }
}

async function viewSalary() {
  const empId = document.getElementById("salary-employee-select").value;
  const monthStr = getSelectedMonthStr();

  if (!empId || !monthStr) {
    if (window.showToast)
      showToast("Please select employee, month and year", "error");
    return;
  }

  fetchSalaryView(empId, monthStr);
}

async function fetchSalaryView(empId, month) {
  try {
    const viewRes = await fetch(
      `${API_BASE}/salary/view?employee_id=${empId}&month=${month}`,
    );

    if (!viewRes.ok) {
      if (window.showToast)
        showToast("No salary slip found for this selection.", "error");
      document.getElementById("salary-result-container").innerHTML = "";
      return;
    }

    const data = await viewRes.json();
    displaySalaryCard(data);
  } catch (error) {
    console.error(error);
  }
}

function displaySalaryCard(data) {
  // Format hours to max 2 decimals
  const formattedHours = data.total_hours
    ? parseFloat(data.total_hours).toFixed(2)
    : "0.00";

  const currentRole = sessionStorage.getItem("role");
  const isHead = currentRole === "head";

  // Allow edit if NOT locked OR if user is HEAD
  const canEdit = !data.locked || isHead;

  const container = document.getElementById("salary-result-container");
  container.innerHTML = `
        <div class="card" style="border-left: 4px solid var(--primary);">
            <h3>Salary Slip Generated</h3>
            <div style="margin-top: 1rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                    <label class="form-label">Month</label>
                    <div class="value">${data.month}</div>
                </div>
                <div>
                    <label class="form-label">Employee ID</label>
                    <div class="value">#${data.employee_id}</div>
                </div>
                <div>
                    <label class="form-label">Total Hours</label>
                    <div class="value" style="color: var(--text-main); font-size: 1.25rem; font-weight: bold;">
                        ${formattedHours} hrs
                    </div>
                </div>
            <div>
              <label class="form-label">Total Payout</label>
              <div style="display:flex; align-items:center; gap:5px;">
                  <span style="font-size:1.2rem; font-weight:bold;">₹</span>
                  ${
                    !canEdit
                      ? `<input type="number" value="${data.total_salary}" disabled class="form-control" />`
                      : `
                        <input type="number" id="editable-salary" value="${data.total_salary}" class="form-control admin-only" />
                      `
                  }
              </div>
              
              ${
                canEdit
                  ? `
                <button onclick="saveEditedSalary(${data.employee_id}, '${data.month}')" 
                        class="btn btn-primary admin-only" style="margin-top:10px; width:100%;">
                    Save Changes
                </button>
                ${data.locked && isHead ? '<small style="color:#f59e0b; display:block; margin-top:5px;">* Unlocked via God Mode</small>' : ""}
              `
                  : '<small style="color:var(--text-muted); display:block; margin-top:5px;">* Locked</small>'
              }
              
          </div>

            </div>
        </div>
    `;
}

function saveEditedSalary(empId, month) {
  const newSalary = document.getElementById("editable-salary").value;
  const role = sessionStorage.getItem("role");

  fetch(`${API_BASE}/salary/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employee_id: empId,
      month: month,
      total_salary: parseFloat(newSalary),
      role: role, // Send role to authenticate God Mode edit
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      // Use showToast if available, else alert
      if (window.showToast) {
        if (data.message && data.message.includes("success"))
          showToast(data.message, "success");
        else showToast(data.message, "error");
      } else {
        // Fallback if toast not available
        console.log(data.message);
      }
      fetchSalaryView(empId, month);
    });
}
