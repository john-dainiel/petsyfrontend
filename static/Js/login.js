// ==============================
// 🐾 PETSY LOGIN.JS — FULL FLOW
// ==============================

const backendUrl = "https://petsy-dow7.onrender.com";

const loginForm = document.getElementById("loginForm");
const otpForm = document.getElementById("otpForm");
const message = document.getElementById("message");

let currentUsername = "";
let currentRole = "";

// ==============================
// 💬 Show on-page messages
function showMessage(text, type = "info") {
  message.textContent = text;
  message.className = `msg ${type}`;
  message.style.display = text ? "block" : "none";
}

// ==============================
// Inject basic message styles
const style = document.createElement("style");
style.textContent = `
  #message { margin-top: 10px; font-size: 15px; text-align: center; min-height: 22px; }
  .msg.success { color: #28a745; }
  .msg.error { color: #dc3545; }
  .msg.warn { color: #ffc107; }
  .msg.info { color: #007bff; }
`;
document.head.appendChild(style);

// ==============================
// 🧩 Redirect user helper
async function redirectUser(userId, role) {
  if (role.toLowerCase() === "admin") {
    window.location.href = "admin.html";
    return;
  }

  try {
    const res = await fetch(`${backendUrl}/get_pet/${userId}`);
    if (res.status === 404) {
      window.location.href = "create_pet.html";
      return;
    }
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("pet_id", data.id);
      window.location.href = "greet.html";
      return;
    }
    window.location.href = "create_pet.html"; // fallback
  } catch (err) {
    console.error("Pet check failed:", err);
    window.location.href = "greet.html";
  }
}

// ==============================
// 🧩 Auto-login (Remember PC)
window.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("device_token");
  const username = localStorage.getItem("remember_username");
  if (!token || !username) return;

  try {
    const res = await fetch(`${backendUrl}/auto_login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_token: token })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      currentUsername = username;
      currentRole = data.user.role;

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("user_id", data.user.id);

      showMessage(`Welcome back, ${username}!`, "success");
      setTimeout(() => redirectUser(data.user.id, currentRole), 500);
    }
  } catch (err) {
    console.error("Auto-login error:", err);
    showMessage("Server unavailable. Try again later.", "warn");
  }
});

// ==============================
// 🧩 Login form submit
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const rememberPC = document.getElementById("rememberPC").checked;

  if (!username || !password) {
    showMessage("Please fill in both fields.", "warn");
    return;
  }

  currentUsername = username;

  try {
    const res = await fetch(`${backendUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      showMessage(data.message || "Wrong username or password.", "error");
      return;
    }

    // Login successful → request OTP
    const otpRes = await fetch(`${backendUrl}/request_otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, remember_pc: rememberPC })
    });
    const otpData = await otpRes.json();

    if (otpRes.ok && otpData.success) {
      showMessage("OTP sent! Check your email.", "info");
      loginForm.style.display = "none";
      otpForm.style.display = "block";
    } else {
      showMessage(otpData.message || "Failed to send OTP.", "error");
    }
  } catch (err) {
    console.error("Login error:", err);
    showMessage("Server unavailable. Try again later.", "warn");
  }
});

// ==============================
// 🧩 OTP verification submit
otpForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const otp = document.getElementById("otpCode").value.trim();
  if (!otp) {
    showMessage("Please enter your OTP.", "warn");
    return;
  }

  try {
    const res = await fetch(`${backendUrl}/verify_otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: currentUsername, otp, remember_pc: true })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("device_token", data.device_token);
      localStorage.setItem("remember_username", currentUsername);

      otpForm.style.display = "none";
      showMessage("Login complete!", "success");

      setTimeout(() => redirectUser(data.user_id, data.role), 500);
    } else {
      showMessage(data.message || "Invalid OTP.", "error");
    }
  } catch (err) {
    console.error("OTP verification error:", err);
    showMessage("Server unavailable. Try again later.", "warn");
  }
});

// ==============================
// 🔙 Back button to login
const backBtn = document.createElement("button");
backBtn.type = "button";
backBtn.textContent = "Back to Login";
backBtn.onclick = () => {
  otpForm.style.display = "none";
  loginForm.style.display = "block";
  showMessage("", "info");
};
otpForm.appendChild(backBtn);

// ==============================
// 🚪 Logout
async function logout() {
  const userId = localStorage.getItem("user_id");
  try {
    await fetch(`${backendUrl}/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId })
    });
  } catch (err) {
    console.error("Logout error:", err);
  }
  localStorage.clear();
  showMessage("Logged out successfully.", "success");
  setTimeout(() => (window.location.href = "index.html"), 1000);
}
