let CURRENT_EMPLOYEE_ID = null;
let PREVIOUS_SECTION = null;

/* =========================
   OPEN PROFILE FROM EMPLOYEE TABLE
========================= */
function openEmployeeProfile(employeeId) {
  PREVIOUS_SECTION = document.querySelector(".section.active").id;

  CURRENT_EMPLOYEE_ID = employeeId;

  switchSection("employee-profile");

  document.getElementById("profile-list-view").style.display = "none";
  document.getElementById("profile-detail-view").style.display = "block";

  // FIX: Render Skeleton immediately to prevent race conditions and provide UI feedback
  const content = document.getElementById("profile-content-area");
  content.innerHTML = `
    <div id="profile-basic-info">
        <p style="color:var(--text-muted);">Loading details...</p>
    </div>
    <div id="profile-salary-section" style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border);">
        <p style="color:var(--text-muted);">Loading financial details...</p>
    </div>
  `;

  loadEmployeeProfile(employeeId);
  loadEmployeeDocuments(employeeId);
  // Ensure loadEmployeeSalary is defined or implemented, otherwise comment out
  if (typeof loadEmployeeSalary === "function") {
    loadEmployeeSalary(employeeId);
  }
}

/* =========================
   LOAD PROFILE DATA
========================= */
function loadEmployeeProfile(employeeId) {
  fetch(`${API_BASE}/employee/${employeeId}`)
    .then((res) => {
      if (!res.ok) throw new Error("Profile fetch failed");
      return res.json();
    })
    .then((emp) => {
      // FIX: Target specific container to avoid overwriting the salary section
      const content = document.getElementById("profile-basic-info");
      if (!content) return;

      // FIX: Use responsive grid (auto-fit) instead of hardcoded 1fr 1fr
      content.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
            <div>
                <p><strong style="color:var(--text-muted);">ID:</strong> ${emp.id}</p>
                <p><strong style="color:var(--text-muted);">Name:</strong> ${emp.name}</p>
                <p><strong style="color:var(--text-muted);">Role:</strong> ${emp.role}</p>
            </div>
            <div>
                <p><strong style="color:var(--text-muted);">Phone:</strong> ${emp.phone || "-"}</p>
                <p><strong style="color:var(--text-muted);">Address:</strong> ${emp.address || "-"}</p>
                <p><strong style="color:var(--text-muted);">Status:</strong> 
                    <span class="status-badge" style="
                        background: ${emp.status === "active" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)"};
                        color: ${emp.status === "active" ? "var(--success)" : "var(--danger)"};">
                        ${emp.status}
                    </span>
                </p>
            </div>
        </div>
      `;
    })
    .catch((err) => {
      console.error(err);
      if (window.showToast) showToast("Failed to load profile", "error");
    });
}

/* =========================
   LOAD SALARY DATA
========================= */
function loadEmployeeSalary(employeeId) {
  fetch(`${API_BASE}/employee/${employeeId}`)
    .then((res) => res.json())
    .then((emp) => {
      const salarySection = document.getElementById("profile-salary-section");
      if (salarySection) {
        // FIX: Use responsive grid here too
        salarySection.innerHTML = `
                <h4 style="margin-bottom: 0.5rem; color: var(--primary);">Financial Details</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                    <div>
                        <label class="form-label" style="font-size: 0.8rem;">Monthly Base Salary</label>
                        <div style="font-size: 1.2rem; font-weight: bold; color: var(--text-main);">
                            ₹${emp.monthly_salary ? emp.monthly_salary.toLocaleString() : "0"}
                        </div>
                    </div>
                </div>
            `;
      }
    })
    .catch((err) => console.error("Salary load error", err));
}

/* =========================
   LOAD DOCUMENTS
========================= */
function loadEmployeeDocuments(employeeId) {
  fetch(`${API_BASE}/employee/${employeeId}/documents`)
    .then((res) => {
      if (!res.ok) throw new Error("Docs fetch failed");
      return res.json();
    })
    .then((docs) => {
      const tbody = document.getElementById("employee-docs-body");
      tbody.innerHTML = "";

      if (!docs || docs.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center;">
              No documents uploaded.
            </td>
          </tr>
        `;
        return;
      }

      // Check privileges for VIEW/DELETE
      const role = sessionStorage.getItem("role");
      const hasPrivilege = ["admin", "head"].includes(role);

      docs.forEach((doc) => {
        const tr = document.createElement("tr");
        const fileName = doc.file_path.split("\\").pop().split("/").pop();

        let formattedDate = doc.uploaded_at;
        if (typeof formatDateTime12Hour === "function") {
          formattedDate = formatDateTime12Hour(doc.uploaded_at);
        }

        // Construct Actions
        let actions = "-";
        if (hasPrivilege) {
          // Ensure API_BASE doesn't have trailing slash if doc.file_path starts with one, or handle logic
          // Assuming API_BASE is e.g. http://localhost:5000 and doc.file_path is UPLOADS/employee_1/file.png
          const relativePath = doc.file_path.replace(/\\/g, "/");
          const viewBtn = `<a href="${API_BASE}/${relativePath}" target="_blank" class="btn btn-primary" style="padding:4px 8px; font-size:0.8rem; text-decoration:none; margin-right: 5px;">View</a>`;
          const deleteBtn = `<button onclick="deleteDocument(${doc.doc_id})" class="btn" style="background:var(--danger); color:white; padding:4px 8px; font-size:0.8rem;">Delete</button>`;
          actions = viewBtn + deleteBtn;
        }

        tr.innerHTML = `
          <td>${doc.doc_type}</td>
          <td>${doc.adhaar_no || "-"}</td>
          <td>${fileName}</td>
          <td>${formattedDate}</td>
          <td>${actions}</td>
        `;

        tbody.appendChild(tr);
      });
    })
    .catch((err) => {
      console.error(err);
      if (window.showToast) showToast("Failed to load documents", "error");
    });
}

// DELETE DOCUMENT FUNCTION
function deleteDocument(docId) {
  if (window.showConfirmModal) {
    showConfirmModal("Are you sure you want to delete this document?", () => {
      executeDelete(docId);
    });
  } else {
    if (confirm("Delete this document?")) executeDelete(docId);
  }
}

function executeDelete(docId) {
  fetch(`${API_BASE}/documents/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ doc_id: docId }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (window.showToast) showToast(data.message, "success");
      // Reload list to see changes
      loadEmployeeDocuments(CURRENT_EMPLOYEE_ID);
    })
    .catch((err) => {
      console.error(err);
      if (window.showToast) showToast("Error deleting document", "error");
    });
}

/* =========================
   LOAD EMPLOYEE LIST (DETAILS SECTION)
========================= */
function loadProfileEmployeeList() {
  fetch(`${API_BASE}/employees`)
    .then((res) => res.json())
    .then((employees) => {
      const tbody = document.getElementById("profile-employee-list-body");
      tbody.innerHTML = "";

      if (!employees || employees.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align:center;">
              No employees found
            </td>
          </tr>
        `;
        return;
      }

      employees.forEach((emp) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>#${emp.id}</td>
          <td>${emp.name}</td>
          <td>${emp.role}</td>
          <td>
            <button class="btn btn-primary" style="padding:4px 8px;">
              View Profile
            </button>
          </td>
        `;

        tr.querySelector("button").addEventListener("click", () => {
          openEmployeeProfile(emp.id);
        });

        tbody.appendChild(tr);
      });
    });
}

/* =========================
   SIDEBAR CLICK
========================= */
function openEmployeeDetailsSection(navElement) {
  switchSection("employee-profile", navElement);

  document.getElementById("profile-list-view").style.display = "block";
  document.getElementById("profile-detail-view").style.display = "none";

  loadProfileEmployeeList();
}

/* =========================
   BACK BUTTON
========================= */
function backToEmployeeList() {
  if (PREVIOUS_SECTION) {
    switchSection(PREVIOUS_SECTION);
  } else {
    switchSection("overview");
  }

  document.getElementById("profile-detail-view").style.display = "none";
  document.getElementById("profile-list-view").style.display = "block";
}

/* =========================
   HELPER: 12-HOUR DATE FORMATTER
========================= */
function formatDateTime12Hour(dateTimeStr) {
  if (!dateTimeStr) return "-";
  const parts = dateTimeStr.split(" ");
  const datePart = parts[0];
  const timePart = parts[1];

  if (!timePart) return dateTimeStr;

  const [hoursStr, minutesStr] = timePart.split(":");
  let hours = parseInt(hoursStr, 10);
  const suffix = hours >= 12 ? "PM" : "AM";

  hours = hours % 12 || 12;

  return `${datePart} ${hours}:${minutesStr} ${suffix}`;
}

document.addEventListener("DOMContentLoaded", () => {
  const uploadBtn = document.getElementById("upload-doc-btn");
  const docTypeSelect = document.getElementById("doc-type");
  const docNumberInput = document.getElementById("doc-aadhaar");
  const customTypeInput = document.getElementById("doc-custom-type");

  // Dynamic UI Change Listener
  if (docTypeSelect) {
    docTypeSelect.addEventListener("change", (e) => {
      const type = e.target.value;

      if (type === "Other") {
        if (customTypeInput) customTypeInput.style.display = "block";
        if (docNumberInput) docNumberInput.placeholder = "Document Number";
      } else {
        if (customTypeInput) customTypeInput.style.display = "none";
        if (docNumberInput) docNumberInput.placeholder = `${type} No`;
      }
    });
  }

  if (uploadBtn) {
    uploadBtn.addEventListener("click", () => {
      if (!CURRENT_EMPLOYEE_ID) {
        if (window.showToast) showToast("Select employee first", "error");
        return;
      }

      let docType = document.getElementById("doc-type").value;
      const adhaar = document.getElementById("doc-aadhaar").value;
      const fileInput = document.getElementById("doc-file");

      // Handle "Other" Logic
      if (docType === "Other") {
        const customVal = document
          .getElementById("doc-custom-type")
          .value.trim();
        if (!customVal) {
          if (window.showToast)
            showToast("Please enter the document name", "error");
          return;
        }
        docType = customVal; // Override docType with custom input
      }

      if (!adhaar) {
        if (window.showToast)
          showToast("Please enter document number", "error");
        return;
      }

      if (fileInput.files.length === 0) {
        if (window.showToast) showToast("Select a file", "error");
        return;
      }

      const formData = new FormData();
      formData.append("doc_type", docType);
      formData.append("adhaar_no", adhaar);
      formData.append("file", fileInput.files[0]);

      fetch(`${API_BASE}/employee/${CURRENT_EMPLOYEE_ID}/documents`, {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then(() => {
          if (window.showToast) showToast("Uploaded successfully", "success");
          fileInput.value = "";
          document.getElementById("doc-aadhaar").value = "";
          if (customTypeInput) customTypeInput.value = "";
          loadEmployeeDocuments(CURRENT_EMPLOYEE_ID);
        })
        .catch((err) => {
          console.error(err);
          if (window.showToast) showToast("Upload failed", "error");
        });
    });
  }
});

function loadDashboardEmployeeList() {
  fetch(`${API_BASE}/employees`)
    .then((res) => res.json())
    .then((employees) => {
      const tbody = document.getElementById("dashboard-employee-list-body");

      if (!tbody) return;

      tbody.innerHTML = "";

      if (!employees || employees.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align:center;">
              No employees found
            </td>
          </tr>
        `;
        return;
      }

      employees.forEach((emp) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>#${emp.id}</td>
          <td>${emp.name}</td>
          <td>${emp.role}</td>
          <td>
            <button class="btn btn-primary" style="padding:4px 8px;">
              View Profile
            </button>
          </td>
        `;

        tr.querySelector("button").addEventListener("click", () => {
          openEmployeeProfile(emp.id);
        });

        tbody.appendChild(tr);
      });
    });
}
