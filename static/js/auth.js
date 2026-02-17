/**
 * auth.js
 * Handles Login, Session Management, and Logout.
 */

// Check if we are on the dashboard but not logged in
function checkAuth() {
  const isLoggedIn = sessionStorage.getItem("isLoggedIn");
  const path = window.location.pathname;

  // Flask routes now use clean paths / and /dashboard (no .html)
  if (path === "/dashboard" && isLoggedIn !== "true") {
    window.location.href = "/";
  }

  if (path === "/" && isLoggedIn === "true") {
    window.location.href = "/dashboard";
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Use helper if available, otherwise fallback (for login page)
      if (window.showToast) showToast(data.error || "Login failed", "error");
      else alert(data.error || "Login failed");
      return;
    }

    sessionStorage.setItem("isLoggedIn", "true");
    sessionStorage.setItem("role", data.role);
    sessionStorage.setItem("user_id", data.user_id);
    window.location.href = "/dashboard";
  } catch (err) {
    if (window.showToast) showToast("Server error", "error");
    else alert("Server error");
  }
}

function logout() {
  // Use Custom Modal
  showConfirmModal("Are you sure you want to logout?", () => {
    sessionStorage.clear();
    localStorage.clear();
    window.location.href = "/";
  });
}

checkAuth();
