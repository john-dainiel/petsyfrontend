// ==============================
// 🐾 PETSY LOGIN.JS — COMPLETE & CORRECTED
// ==============================

const backendUrl = "https://petsy-dow7.onrender.com";

const loginForm = document.getElementById("loginForm");
const otpForm = document.getElementById("otpForm");
const resetForm = document.getElementById("resetForm");
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
// Inject styles for messages (optional, since CSS already has them)
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
    window.location.href = "create_pet.html";  // Better fallback
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
    console.log("Attempting login for:", username);
    
    // ✅ Login check
    const res = await fetch(`${backendUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    console.log("Login response:", res.ok, data);

    if (!res.ok) {
      showMessage(data.message || "Wrong username or password.", "error");
      return;
    }

    console.log("Login successful, requesting OTP...");
    
    // ✅ Request OTP
    const otpRes = await fetch(`${backendUrl}/request_otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, remember_pc: rememberPC }),
    });
    const otpData = await otpRes.json();
    console.log("OTP request response:", otpRes.ok, otpData);

    if (otpRes.ok && otpData.success) {
      if (rememberPC && otpData.remember_token) {
        localStorage.setItem("remember_token", otpData.remember_token);
        localStorage.setItem("remember_username", username);
      }
      showMessage("OTP sent to your email!", "info");

      // Toggle classes instead of direct style (avoids !important conflict)
      loginForm.classList.add("hidden");
      otpForm.classList.remove("hidden");
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
      // ✅ THIS IS WHERE YOU ADD IT:
      localStorage.setItem("userToken", data.device_token); // save token for minigames
      localStorage.setItem("username", currentUsername);
      localStorage.setItem("userId", data.user_id);
      localStorage.setItem("petId", data.pet?.id || null);
      localStorage.setItem("totalCoins", data.pet?.coins || 0);

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("remember_username", currentUsername);

      loginForm.classList.add("hidden");
      otpForm.classList.add("hidden");

      showMessage("Login complete!", "success");

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


// ==============================
// 🧩 FORGOT PASSWORD & RESET
const forgotPassLink = document.getElementById("forgotPassLink");
const resetConfirmBtn = document.getElementById("resetConfirmBtn");
const resetOtpField = document.getElementById("resetOtp");
const newPasswordField = document.getElementById("newPassword");
const confirmPasswordField = document.getElementById("confirmPassword");

// Step 1 — Show reset form
forgotPassLink.addEventListener("click", (e) => {
  e.preventDefault();  // Prevent default link behavior
  loginForm.classList.add("hidden");
  otpForm.classList.add("hidden");
  resetForm.classList.remove("hidden");
  showMessage("", "info");
});

// Step 2 — Send reset OTP
document.getElementById("sendResetOtpBtn").addEventListener("click", async () => {
  const username = document.getElementById("resetUsername").value.trim();
  if (!username) {
    showMessage("Please enter your username.", "warn");
    return;
  }

  try {
    const res = await fetch(`${backendUrl}/forgot_password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      showMessage("Reset OTP sent to your email!", "info");
      resetOtpField.classList.remove("hidden");
      newPasswordField.classList.remove("hidden");
      confirmPasswordField.classList.remove("hidden");
      resetConfirmBtn.classList.remove("hidden");
    } else {
      showMessage(data.message || "Failed to send reset OTP.", "error");
    }
  } catch (err) {
    console.error("Reset OTP error:", err);
    showMessage("Server unavailable.", "warn");
  }
});

// Step 3 — Confirm reset
resetConfirmBtn.addEventListener("click", async () => {
  const username = document.getElementById("resetUsername").value.trim();
  const otp = resetOtpField.value.trim();
  const newPass = newPasswordField.value.trim();
  const confirmPass = confirmPasswordField.value.trim();

  if (!username || !otp || !newPass || !confirmPass) {
    showMessage("Please fill in all fields.", "warn");
    return;
  }

  // ✅ Password match check
  if (newPass !== confirmPass) {
    showMessage("Passwords do not match.", "warn");
    return;
  }

  // ✅ Password security check: at least 1 uppercase, 1 lowercase, 1 number, 1 symbol, min 8 chars
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  if (!passwordRegex.test(newPass)) {
    showMessage("Password must be 8+ chars with uppercase, lowercase, number & symbol.", "warn");
    return;
  }

  try {
    const res = await fetch(`${backendUrl}/reset_password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, otp, new_password: newPass })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      showMessage("Password reset successful! Please log in.", "success");
      resetForm.classList.add("hidden");
      loginForm.classList.remove("hidden");

      // Clear fields
      resetOtpField.value = "";
      newPasswordField.value = "";
      confirmPasswordField.value = "";
      document.getElementById("resetUsername").value = "";
      resetOtpField.classList.add("hidden");
      newPasswordField.classList.add("hidden");
      confirmPasswordField.classList.add("hidden");
      resetConfirmBtn.classList.add("hidden");
    } else {
      showMessage(data.message || "Reset failed.", "error");
    }
  } catch (err) {
    console.error("Reset confirm error:", err);
    showMessage("Server unavailable.", "warn");
  }
});

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


