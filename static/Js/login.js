// ==============================
// 🐾 PETSY LOGIN.JS — CLEAN & FIXED
// ==============================

const backendUrl = "https://petsy-dow7.onrender.com";

const loginForm = document.getElementById("loginForm");
const otpForm = document.getElementById("otpForm");
const message = document.getElementById("message");

let currentUsername = "";
// ==============================
// 💬 On-page Message Display
function showMessage(text, type = "info") {
  message.textContent = text;
  message.className = `msg ${type}`;
  message.style.display = text ? "block" : "none";
}

// ==============================
// Inject styles for messages
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
// 🧩 Redirect Helper
async function redirectUser(userId, role) {
  if (role.toLowerCase() === "admin") {
    window.location.href = "admin.html";
    return;
  }

  try {
    const res = await fetch(`${backendUrl}/get_pet/${userId}`);
    const data = await res.json();
    
    if (res.ok && data) {
      // If backend returns array
      const pet = Array.isArray(data) ? data[0] : data;
    
      if (pet && pet.id) {
        localStorage.setItem("pet_id", pet.id);
        window.location.href = "greet.html";
        return;
      }
    }
    
    // If no pet found
    window.location.href = "create_pet.html";
  } catch (err) {
    console.error("Pet check failed:", err);
    window.location.href = "greet.html";
  }
}

// ==============================
// 🧩 AUTO LOGIN (Remember PC)
window.addEventListener("DOMContentLoaded", async () => {
  const savedToken = localStorage.getItem("remember_token");
  const savedUsername = localStorage.getItem("remember_username");
  if (!savedToken || !savedUsername) return;

  try {
    const res = await fetch(`${backendUrl}/auto_login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_token: savedToken }),
    });
    const data = await res.json();

    if (res.ok && data.success) {
      currentUsername = savedUsername;
      const role = data.user.role || "user";

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("user_id", data.user.id);
      localStorage.setItem("remember_username", savedUsername);

      showMessage(`Welcome back, ${savedUsername}!`, "success");
      setTimeout(() => redirectUser(data.user.id, role), 500);
    }
  } catch (err) {
    console.error("Auto-login error:", err);
    showMessage("Server unavailable. Try again later.", "warn");
  }
});

// ==============================
// 🧩 LOGIN FORM
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
    // ✅ Login check
    const res = await fetch(`${backendUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || "Wrong username or password.", "error");
      return;
    }

    // ✅ Request OTP
    const otpRes = await fetch(`${backendUrl}/request_otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, remember_pc: rememberPC }),
    });
    const otpData = await otpRes.json();

    if (otpRes.ok && otpData.success) {
      if (rememberPC && otpData.remember_token) {
        localStorage.setItem("remember_token", otpData.remember_token);
        localStorage.setItem("remember_username", username);
      }
      showMessage("OTP sent to your email!", "info");

      loginForm.style.display = "none";
      otpForm.style.display = "block";

      // DEBUG: log OTP for testing
      // console.log("DEBUG OTP:", otpData.otp);

    } else {
      showMessage(otpData.message || "Failed to send OTP.", "error");
    }

  } catch (err) {
    console.error("Login error:", err);
    showMessage("Server unavailable. Try again later.", "warn");
  }
});

// ==============================
// 🧩 OTP VERIFICATION
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

    if (res.ok && data.success) {
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("user_id", data.user_id || "");
      localStorage.setItem("remember_username", currentUsername);

      loginForm.style.display = "none";
      otpForm.style.display = "none";

      showMessage("Login complete!", "success");

      // ✅ Use role from verify_otp response
      const role = data.role || "user";
      setTimeout(() => redirectUser(data.user_id, role), 500);
    } else {
      showMessage(data.message || "Invalid OTP.", "error");
    }

  } catch (err) {
    console.error("OTP verification error:", err);
    showMessage("Server unavailable. Try again later.", "warn");
  }
});

const resetForm = document.getElementById("resetForm");
const forgotPassLink = document.getElementById("forgotPassLink");
const resetConfirmBtn = document.getElementById("resetConfirmBtn");
const resetOtpField = document.getElementById("resetOtp");
const newPasswordField = document.getElementById("newPassword");

// Step 1 — show reset form
forgotPassLink.addEventListener("click", () => {
  loginForm.style.display = "none";
  otpForm.style.display = "none";
  resetForm.style.display = "block";
  showMessage("", "info");
});

// Step 2 — Send reset OTP
resetForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("resetUsername").value.trim();

  try {
    const res = await fetch(`${backendUrl}/forgot_password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      showMessage("Reset OTP sent to your email!", "info");
      resetOtpField.style.display = "block";
      newPasswordField.style.display = "block";
      resetConfirmBtn.style.display = "block";
    } else {
      showMessage(data.message || "Failed to send reset OTP.", "error");
    }

  } catch {
    showMessage("Server unavailable.", "warn");
  }
});

// Step 3 — Confirm reset
resetConfirmBtn.addEventListener("click", async () => {
  const username = document.getElementById("resetUsername").value.trim();
  const otp = resetOtpField.value.trim();
  const newPass = newPasswordField.value.trim();

  try {
    const res = await fetch(`${backendUrl}/reset_password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, otp, new_password: newPass })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      showMessage("Password reset successful! Please log in.", "success");
      resetForm.style.display = "none";
      loginForm.style.display = "block";
    } else {
      showMessage(data.message || "Reset failed.", "error");
    }

  } catch {
    showMessage("Server unavailable.", "warn");
  }
});

// 🔙 Back to login button
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
// 🚪 LOGOUT
async function logout() {
  const userId = localStorage.getItem("user_id");
  try {
    await fetch(`${backendUrl}/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
  } catch (err) {
    console.error("Logout error:", err);
  }
  localStorage.clear();
  showMessage("Logged out successfully.", "success");
  setTimeout(() => (window.location.href = "index.html"), 1000);
}
