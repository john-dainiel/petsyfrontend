// ==============================
// 🐾 PETSY LOGIN.JS — CLEANED & INLINE NOTIFICATIONS
// ==============================

const backendUrl = "https://petsy-dow7.onrender.com";

const loginForm = document.getElementById("loginForm");
const otpForm = document.getElementById("otpForm");
const message = document.getElementById("message");

let currentUsername = "";
let currentRole = "";

// ==============================
// 💬 Inline Message Display
// ==============================
function showMessage(text = "", type = "info") {
  message.textContent = text;
  message.className = `msg ${type}`; // success, error, warn, info
}

// Inject styles for message
const style = document.createElement("style");
style.textContent = `
  #message {
    margin-top: 10px;
    font-size: 15px;
    text-align: center;
    min-height: 22px;
  }
  .msg.success { color: #28a745; }
  .msg.error { color: #dc3545; }
  .msg.warn { color: #ffc107; }
  .msg.info { color: #007bff; }
`;
document.head.appendChild(style);

// ==============================
// 🧩 Redirect Helper (with pet check)
// ==============================
async function redirectUser(userId, role) {
  if (role.toLowerCase() === "admin") {
    window.location.href = "admin.html";
    return;
  }

  try {
    const res = await fetch(`${backendUrl}/get_pet/${userId}`);
    if (res.status === 404) {
      showMessage("No pet found. Redirecting to create your pet...", "info");
      window.location.href = "create_pet.html";
      return;
    }

    if (res.ok) {
      const data = await res.json();
      if (data && data.id) {
        localStorage.setItem("pet_id", data.id);
        showMessage("Welcome back to your pet!", "success");
        window.location.href = "greet.html";
        return;
      }
    }

    window.location.href = "create_pet.html";
  } catch (err) {
    console.error("Pet check failed:", err);
    showMessage("Error checking pet data. Redirecting...", "warn");
    window.location.href = "greet.html";
  }
}

// ==============================
// 🧩 AUTO LOGIN (only shows message if successful)
// ==============================
window.addEventListener("DOMContentLoaded", async () => {
  const savedToken = localStorage.getItem("remember_token");
  const savedUsername = localStorage.getItem("remember_username");
  if (!savedToken || !savedUsername) return;

  try {
    const res = await fetch(`${backendUrl}/auto_login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: savedUsername, device_token: savedToken }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showMessage("Welcome back! PC recognized.", "success");
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("user_id", data.user.id);
      localStorage.setItem("remember_username", savedUsername);

      setTimeout(() => redirectUser(data.user.id, data.user.role), 500);
    }
  } catch (err) {
    console.error("Auto-login error:", err);
    // No message shown if auto-login fails
  }
});

// ==============================
// 🧩 LOGIN FORM
// ==============================
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
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error || "Wrong username or password.", "error");
      return;
    }

    currentRole = data.role || "user";

    // Request OTP
    const otpRes = await fetch(`${backendUrl}/request_otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        remember_pc: rememberPC,
        device_token: localStorage.getItem("remember_token") || null,
      }),
    });
    const otpData = await otpRes.json();

    if (otpRes.ok) {
      if (otpData.skip_otp) {
        showMessage("Login successful! Redirecting...", "success");
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("user_id", otpData.user_id || data.user_id || "");
        localStorage.setItem("remember_username", username);
        setTimeout(() => redirectUser(otpData.user_id || data.user_id, currentRole), 500);
        return;
      }

      if (otpData.remember_token) {
        localStorage.setItem("remember_token", otpData.remember_token);
        localStorage.setItem("remember_username", username);
      }

      showMessage("OTP sent to your email!", "info");
      loginForm.style.display = "none";
      otpForm.style.display = "block";
    } else {
      showMessage(otpData.error || "Failed to send OTP.", "error");
    }
  } catch (err) {
    console.error("Login error:", err);
    showMessage("Server connection error.", "warn");
  }
});

// ==============================
// 🧩 OTP VERIFICATION
// ==============================
otpForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const otpCode = document.getElementById("otpCode").value.trim();
  if (!otpCode) {
    showMessage("Please enter your OTP.", "warn");
    return;
  }

  try {
    const res = await fetch(`${backendUrl}/verify_otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: currentUsername, otp: otpCode }),
    });
    const data = await res.json();

    if (res.ok) {
      showMessage("Login complete! Redirecting...", "success");
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("user_id", data.user_id || "");
      localStorage.setItem("remember_username", currentUsername);

      loginForm.style.display = "none";
      otpForm.style.display = "none";

      setTimeout(() => redirectUser(data.user_id, currentRole), 500);
    } else {
      showMessage(data.error || "Invalid OTP.", "error");
    }
  } catch (err) {
    console.error("OTP verify error:", err);
    showMessage("Server connection error.", "warn");
  }
});

// 🔙 Back to login button
const backBtn = document.createElement("button");
backBtn.type = "button";
backBtn.textContent = "Back to Login";
backBtn.classList.add("secondary");
backBtn.onclick = () => {
  otpForm.style.display = "none";
  loginForm.style.display = "block";
  showMessage("", "info");
};
otpForm.appendChild(backBtn);

// ==============================
// 🚪 LOGOUT FUNCTION
// ==============================
async function logout() {
  const userId = localStorage.getItem("user_id");
  await fetch(`${backendUrl}/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  localStorage.clear();
  showMessage("Logged out successfully.", "success");
  setTimeout(() => (window.location.href = "index.html"), 500);
}
