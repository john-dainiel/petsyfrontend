const backendUrl = "https://petsy-dow7.onrender.com";

// Forms
const loginForm = document.getElementById("loginForm");
const otpForm = document.getElementById("otpForm");
const resetForm = document.getElementById("resetForm");

// UI
const message = document.getElementById("message");

// Reset fields
const resetUsernameField = document.getElementById("resetUsername");
const resetOtpField = document.getElementById("resetOtp");
const newPasswordField = document.getElementById("newPassword");
const resetConfirmBtn = document.getElementById("resetConfirmBtn");

let currentUsername = "";
let resetUsernameCache = "";


// ==============================
// 💬 MESSAGE HANDLER
// ==============================
function showMessage(text, type = "info") {
  message.textContent = text;
  message.className = `msg ${type}`;
  message.style.display = text ? "block" : "none";
}


// ==============================
// 🔐 LOGIN
// ==============================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const remember = document.getElementById("remember").checked;

  if (!username || !password) {
    return showMessage("Enter username and password.", "warn");
  }

  try {
    const res = await fetch(`${backendUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, remember })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return showMessage(data.message || "Login failed.", "error");
    }

    // login successful → ask OTP
    currentUsername = username;

    loginForm.style.display = "none";
    otpForm.style.display = "block";

    showMessage("OTP sent to your email.", "info");

  } catch (err) {
    console.error(err);
    showMessage("Server unavailable.", "warn");
  }
});


// ==============================
// 🔐 OTP VERIFY
// ==============================
otpForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const otp = document.getElementById("otpCode").value.trim();

  if (!otp) return showMessage("Enter your OTP.", "warn");

  try {
    const res = await fetch(`${backendUrl}/verify_otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: currentUsername, otp }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return showMessage("Invalid OTP.", "error");
    }

    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("user_id", data.user_id);

    showMessage("Login successful! Redirecting...", "success");

    setTimeout(() => window.location.href = "greet.html", 600);

  } catch {
    showMessage("Server unavailable.", "warn");
  }
});


// ==============================
// 🔧 FORGOT PASSWORD
// ==============================
document.getElementById("forgotPassLink").addEventListener("click", () => {
  loginForm.style.display = "none";
  otpForm.style.display = "none";
  resetForm.style.display = "block";

  resetOtpField.style.display = "none";
  newPasswordField.style.display = "none";
  resetConfirmBtn.style.display = "none";

  showMessage("Enter your username to reset your password.", "info");
});


// STEP 1 — Request OTP
resetForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  resetUsernameCache = resetUsernameField.value.trim();

  if (!resetUsernameCache)
    return showMessage("Enter username.", "warn");

  try {
    const res = await fetch(`${backendUrl}/forgot_password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: resetUsernameCache })
    });

    const data = await res.json();

    if (!res.ok || !data.success)
      return showMessage(data.message || "Failed.", "error");

    showMessage("Reset OTP sent to your email.", "success");

    resetOtpField.style.display = "block";
    newPasswordField.style.display = "block";
    resetConfirmBtn.style.display = "block";

  } catch {
    showMessage("Server unavailable.", "warn");
  }
});


// STEP 2 — Submit new password
resetConfirmBtn.addEventListener("click", async () => {
  const otp = resetOtpField.value.trim();
  const new_pass = newPasswordField.value.trim();

  if (!otp || !new_pass)
    return showMessage("Enter OTP and new password.", "warn");

  try {
    const res = await fetch(`${backendUrl}/reset_password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: resetUsernameCache,
        otp,
        new_password: new_pass
      })
    });

    const data = await res.json();

    if (!res.ok || !data.success)
      return showMessage(data.message || "Reset failed.", "error");

    showMessage("Password reset successful!", "success");

    resetForm.style.display = "none";
    loginForm.style.display = "block";

  } catch {
    showMessage("Server unavailable.", "warn");
  }
});
