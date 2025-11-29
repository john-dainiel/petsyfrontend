// ===============================
// 🐾 PETSY LOGIN.JS — FIXED + CLEAN
// ===============================

const backendUrl = "https://petsy-dow7.onrender.com";

// FORM ELEMENTS
const loginForm = document.getElementById("loginForm");
const otpForm = document.getElementById("otpForm");
const resetForm = document.getElementById("resetForm");

const message = document.getElementById("message");

// INPUTS
const usernameField = document.getElementById("username");
const passwordField = document.getElementById("password");

const otpCodeField = document.getElementById("otpCode");

const resetUsernameField = document.getElementById("resetUsername");
const resetOtpField = document.getElementById("resetOtp");
const newPasswordField = document.getElementById("newPassword");

const rememberPC = document.getElementById("rememberPC");

// BUTTONS
const backToLogin = document.getElementById("backToLogin");
const resetBackBtn = document.getElementById("resetBackBtn");
const resetConfirmBtn = document.getElementById("resetConfirmBtn");
const forgotPassLink = document.getElementById("forgotPassLink");

let currentUsername = ""; // used for OTP login


// ===============================
// 🔔 MESSAGE SYSTEM
// ===============================
function showMessage(text, type = "info") {
  message.textContent = text;
  message.className = `msg ${type}`;
  message.style.display = text ? "block" : "none";
}


// ===============================
// 🔄 FORM SWITCH HELPERS
// ===============================
function showLogin() {
  loginForm.classList.remove("hidden");
  otpForm.classList.add("hidden");
  resetForm.classList.add("hidden");
  showMessage("");
}

function showOTP() {
  loginForm.classList.add("hidden");
  otpForm.classList.remove("hidden");
  resetForm.classList.add("hidden");
  showMessage("");
}

function showReset() {
  loginForm.classList.add("hidden");
  otpForm.classList.add("hidden");
  resetForm.classList.remove("hidden");
  showMessage("");
}


// ===============================
// 🚀 REDIRECT AFTER LOGIN
// ===============================
async function redirectUser(userId, role) {
  if (role === "admin") {
    window.location.href = "admin.html";
    return;
  }

  try {
    const res = await fetch(`${backendUrl}/get_pet/${userId}`);
    const data = await res.json();

    const pet = Array.isArray(data) ? data[0] : data;

    if (res.ok && pet && pet.id) {
      localStorage.setItem("pet_id", pet.id);
      window.location.href = "greet.html";
    } else {
      window.location.href = "create_pet.html";
    }
  } catch {
    window.location.href = "greet.html";
  }
}


// ===============================
// 🔐 LOGIN
// ===============================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = usernameField.value.trim();
  const password = passwordField.value.trim();

  if (!username || !password) {
    showMessage("Please fill in both fields.", "warn");
    return;
  }

  currentUsername = username;

  try {
    // Step 1 — login check
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

    // Step 2 — request OTP
    const otpRes = await fetch(`${backendUrl}/request_otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, remember_pc: rememberPC.checked }),
    });

    const otpData = await otpRes.json();

    if (otpRes.ok && otpData.success) {
      if (rememberPC.checked && otpData.remember_token) {
        localStorage.setItem("remember_token", otpData.remember_token);
        localStorage.setItem("remember_username", username);
      }

      showOTP();
      showMessage("OTP sent to your email!", "info");
    } else {
      showMessage(otpData.message || "Failed to send OTP.", "error");
    }
  } catch (err) {
    showMessage("Server unavailable. Try again later.", "warn");
  }
});


// ===============================
// 🔐 OTP VERIFY
// ===============================
otpForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const otp = otpCodeField.value.trim();
  if (!otp) {
    showMessage("Please enter your OTP.", "warn");
    return;
  }

  try {
    const res = await fetch(`${backendUrl}/verify_otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: currentUsername, otp }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showMessage(data.message || "Invalid OTP.", "error");
      return;
    }

    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("user_id", data.user_id);

    showMessage("Login complete!", "success");

    setTimeout(() => redirectUser(data.user_id, data.role), 500);
  } catch {
    showMessage("Server unavailable.", "warn");
  }
});


// ===============================
// 🔧 FORGOT PASSWORD FLOW
// ===============================
forgotPassLink.addEventListener("click", () => {
  showReset();
});

resetBackBtn.addEventListener("click", () => {
  showLogin();
});

resetForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    const res = await fetch(`${backendUrl}/forgot_password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: resetUsernameField.value }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showMessage(data.message || "Failed to send reset OTP.", "error");
      return;
    }

    showMessage("Reset OTP sent!", "info");

    resetOtpField.classList.remove("hidden");
    newPasswordField.classList.remove("hidden");
    resetConfirmBtn.classList.remove("hidden");

  } catch {
    showMessage("Server unavailable.", "warn");
  }
});

// Confirm reset
resetConfirmBtn.addEventListener("click", async () => {
  try {
    const res = await fetch(`${backendUrl}/reset_password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: resetUsernameField.value,
        otp: resetOtpField.value,
        new_password: newPasswordField.value,
      }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showMessage("Password reset successful!", "success");
      setTimeout(showLogin, 800);
    } else {
      showMessage(data.message || "Reset failed.", "error");
    }
  } catch {
    showMessage("Server unavailable.", "warn");
  }
});

// BACK BUTTON IN OTP FORM
backToLogin.addEventListener("click", showLogin);
