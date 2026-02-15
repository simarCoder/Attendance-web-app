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

  loadEmployeeProfile(employeeId);
  loadEmployeeDocuments(employeeId);
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
      const content = document.getElementById("profile-content-area");

      content.innerHTML = `
        <p><strong>ID:</strong> ${emp.id}</p>
        <p><strong>Name:</strong> ${emp.name}</p>
        <p><strong>Role:</strong> ${emp.role}</p>
        <p><strong>Phone:</strong> ${emp.phone || "-"}</p>
        <p><strong>Address:</strong> ${emp.address || "-"}</p>
        <p><strong>Status:</strong> ${emp.status}</p>
      `;
    })
    .catch((err) => {
      console.error(err);
      if (window.showToast) showToast("Failed to load profile", "error");
    });
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

        // Construct Actions
        let actions = "-";
        if (hasPrivilege) {
          // VIEW BUTTON
          const relativePath = doc.file_path.replace(/\\/g, "/");
          const viewBtn = `<a href="${API_BASE}/${relativePath}" target="_blank" class="btn btn-primary" style="padding:4px 8px; font-size:0.8rem; text-decoration:none; margin-right: 5px;">View</a>`;

          // DELETE BUTTON
          const deleteBtn = `<button onclick="deleteDocument(${doc.doc_id})" class="btn" style="background:var(--danger); color:white; padding:4px 8px; font-size:0.8rem;">Delete</button>`;

          actions = viewBtn + deleteBtn;
        }

        tr.innerHTML = `
          <td>${doc.doc_type}</td>
          <td>${doc.adhaar_no || "-"}</td>
          <td>${fileName}</td>
          <td>${doc.uploaded_at}</td>
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

document.addEventListener("DOMContentLoaded", () => {
  const uploadBtn = document.getElementById("upload-doc-btn");

  if (uploadBtn) {
    uploadBtn.addEventListener("click", () => {
      if (!CURRENT_EMPLOYEE_ID) {
        if (window.showToast) showToast("Select employee first", "error");
        return;
      }

      const docType = document.getElementById("doc-type").value;
      const adhaar = document.getElementById("doc-aadhaar").value;
      const fileInput = document.getElementById("doc-file");

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
