/**
 * auth.js
 * Handles Login, Session Management, and Logout.
 * Fake authentication for frontend demo, stores flag in sessionStorage.
 */

// Check if we are on the dashboard but not logged in
function checkAuth() {
  const isLoggedIn = sessionStorage.getItem("isLoggedIn");
  const path = window.location.pathname;

  // If on dashboard and not logged in
  if (path.includes("dashboard.html") && isLoggedIn !== "true") {
    window.location.href = "login.html";
  }

  // If on login and already logged in
  if (path.includes("login.html") && isLoggedIn === "true") {
    window.location.href = "dashboard.html";
  }
}

// Handle Login Form Submit
function handleLogin(event) {
  event.preventDefault();

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  // Fake Auth Check
  if (usernameInput.value === "admin" && passwordInput.value === "admin") {
    sessionStorage.setItem("isLoggedIn", "true");
    window.location.href = "dashboard.html";
  } else {
    alert("Invalid credentials. Try admin / admin");
  }
}

// Handle Logout
function logout() {
  if (confirm("Are you sure you want to logout?")) {
    sessionStorage.clear();
    window.location.href = "login.html";
  }
}

// Run auth check immediately
checkAuth();
