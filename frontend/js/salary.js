/**
 * salary.js
 * Handles Salary Generation and Viewing.
 */

// Listen for employee load to populate dropdown
window.addEventListener("employeesLoaded", (e) => {
  populateEmployeeDropdown("salary-employee-select", e.detail);
});

async function generateSalary() {
  const empId = document.getElementById("salary-employee-select").value;
  const month = document.getElementById("salary-month").value;

  if (!empId || !month) return alert("Please select employee and month");

  try {
    // 1. Attempt to Generate
    const genRes = await fetch(`${API_BASE}/salary/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_id: parseInt(empId),
        month: month,
      }),
    });

    const genData = await genRes.json();

    if (genData.status === "new") {
      // alert("Success: Salary Slip Generated!");
      fetchSalaryView(empId, month);
    } else if (genData.status === "exists") {
      // alert("Salary already exists. Loading details...");
      fetchSalaryView(empId, month);
    } else {
      alert("Error: " + (genData.message || "Unknown error"));
    }
  } catch (error) {
    console.error(error);
    alert("Server Connection Error");
  }
}

async function viewSalary() {
  const empId = document.getElementById("salary-employee-select").value;
  const month = document.getElementById("salary-month").value;

  if (!empId || !month) return alert("Please select employee and month");

  fetchSalaryView(empId, month);
}

async function fetchSalaryView(empId, month) {
  try {
    const viewRes = await fetch(
      `${API_BASE}/salary/view?employee_id=${empId}&month=${month}`,
    );

    if (!viewRes.ok) {
      alert("No salary slip found for this selection.");
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
              ₹${
                data.locked
                  ? `<input type="number" value="${data.total_salary}" disabled class="form-control" />`
                  : `
                    <input type="number" id="editable-salary" value="${data.total_salary}" class="form-control" />
                    <button onclick="saveEditedSalary(${data.employee_id}, '${data.month}')" 
                            class="btn btn-primary" style="margin-top:10px;">
                        Save Changes
                    </button>
                  `
              }
          </div>

            </div>
        </div>
    `;
}

function saveEditedSalary(empId, month) {
  const newSalary = document.getElementById("editable-salary").value;

  fetch(`${API_BASE}/salary/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employee_id: empId,
      month: month,
      total_salary: parseFloat(newSalary),
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      alert(data.message);
      fetchSalaryView(empId, month);
    });
}
