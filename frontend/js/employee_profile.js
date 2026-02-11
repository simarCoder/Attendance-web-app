let CURRENT_EMPLOYEE_ID = null;

function openEmployeeProfile(employeeId) {
  CURRENT_EMPLOYEE_ID = employeeId;
  switchSection("employee-profile");
  loadEmployeeProfile(employeeId);
  loadEmployeeDocuments(employeeId);
}

function loadEmployeeProfile(employeeId) {
  fetch(`${API_BASE}/employee/${employeeId}`)
    .then((res) => res.json())
    .then((emp) => {
      document.getElementById("profile-employee-id").innerText = emp.id;
      document.getElementById("profile-name").innerText = emp.name;
      document.getElementById("profile-role").innerText = emp.role;
      document.getElementById("profile-phone").innerText = emp.phone || "-";
      document.getElementById("profile-address").innerText = emp.address || "-";
      document.getElementById("profile-status").innerText = emp.status;
    });
}

function loadEmployeeDocuments(employeeId) {
  fetch(`${API_BASE}/employee/${employeeId}/documents`)
    .then((res) => res.json())
    .then((docs) => {
      const tbody = document.getElementById("employee-docs-body");
      tbody.innerHTML = "";

      if (docs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No documents uploaded.</td></tr>`;
        return;
      }

      docs.forEach((doc) => {
        const tr = document.createElement("tr");

        const fileName = doc.file_path.split("\\").pop().split("/").pop();

        tr.innerHTML = `
          <td>${doc.doc_type}</td>
          <td>${doc.adhaar_no || "-"}</td>
          <td>${fileName}</td>
          <td>${doc.uploaded_at}</td>
          <td>
            <a href="${API_BASE}/${doc.file_path}" target="_blank">View</a>
          </td>
        `;

        tbody.appendChild(tr);
      });
    });
}

function loadProfileEmployeeList() {
  fetch(`${API_BASE}/employees`)
    .then((res) => res.json())
    .then((employees) => {
      const tbody = document.getElementById("profile-employee-list-body");
      tbody.innerHTML = "";

      if (employees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No employees found</td></tr>`;
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
          openEmployeeProfileFromList(emp.id);
        });

        tbody.appendChild(tr);
      });
    });
}

function openEmployeeProfileFromList(employeeId) {
  CURRENT_EMPLOYEE_ID = employeeId;

  document.getElementById("profile-list-view").style.display = "none";
  document.getElementById("profile-detail-view").style.display = "block";

  loadEmployeeProfile(employeeId);
  loadEmployeeDocuments(employeeId);
}

function openEmployeeDetailsSection(navElement) {
  switchSection("employee-profile", navElement);

  document.getElementById("profile-detail-view").style.display = "none";
  document.getElementById("profile-list-view").style.display = "block";

  loadProfileEmployeeList();
}

function backToEmployeeList() {
  document.getElementById("profile-detail-view").style.display = "none";
  document.getElementById("profile-list-view").style.display = "block";
}

document.getElementById("upload-doc-btn").addEventListener("click", () => {
  if (!CURRENT_EMPLOYEE_ID) {
    alert("Select employee first");
    return;
  }

  const docType = document.getElementById("doc-type").value;
  const adhaar = document.getElementById("doc-aadhaar").value;
  const fileInput = document.getElementById("doc-file");

  if (fileInput.files.length === 0) {
    alert("Select a file");
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
      alert("Uploaded successfully");
      fileInput.value = "";
      loadEmployeeDocuments(CURRENT_EMPLOYEE_ID);
    });
});
