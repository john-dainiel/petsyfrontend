// ==============================
// 🐾 PETSY FRONTEND LOGIN FLOW
// Handles Login → OTP → Auto-login → Admin/User redirect
// ==============================

const backendUrl = "https://petsy-dow7.onrender.com";
let currentUsername = "";
let currentRole = "";

// ==============================
// 💬 Show message helper
function showMessage(text, type = "info") {
  const messageEl = document.getElementById("message");
  messageEl.textContent = text;
  messageEl.className = `msg ${type}`;
  messageEl.style.display = text ? "block" : "none";
}

// ==============================
// 🧩 Redirect Helper (Admin/User)
async function redirectUser(userId, role) {
  if (role.toLowerCase() === "admin") {
    window.location.href = "admin.html";
    return;
  }

  try {
    const res = await fetch(`${backendUrl}/get_pet/${userId}`);
    if (!res.ok) {
      window.location.href = "create_pet.html";
      return;
    }
    const data = await res.json();
    localStorage.setItem("pet_id", data.id);
    window.location.href = "greet.html";
  } catch (err) {
    console.error("Redirect error:", err);
    window.location.href = "create_pet.html";
  }
}

// ==============================
// 🧩 Auto-login (Remember PC)
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
    console.log("Auto-login response:", data);

    if (res.ok && data.success) {
      currentUsername = data.user.username;
      currentRole = data.user.role;

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("user_id", data.user.id);
      localStorage.setItem("remember_username", data.user.username);

      showMessage(`Welcome back, ${data.user.username}!`, "success");
      redirectUser(data.user.id, data.user.role);
    }
  } catch (err) {
    console.error("Auto-login error:", err);
  }
});

// ==============================
// 🧩 Request OTP
async function requestOTP(username, rememberPC = false) {
  try {
    const res = await fetch(`${backendUrl}/request_otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, remember_pc: rememberPC }),
    });
    const data = await res.json();
    console.log("Request OTP:", data);

    if (!res.ok || !data.success) {
      showMessage(data.message || "Failed to send OTP.", "error");
      return false;
    }

    // Save Remember token if present
    if (rememberPC && data.remember_token) {
      localStorage.setItem("remember_token", data.remember_token);
      localStorage.setItem("remember_username", username);
    }

    showMessage("✅ OTP sent to your email!", "info");
    return true;

  } catch (err) {
    console.error("Request OTP error:", err);
    showMessage("⚠️ Network error while requesting OTP.", "warn");
    return false;
  }
}

// ==============================
// 🧩 Verify OTP
async function verifyOTP(username, otpCode) {
  try {
    const res = await fetch(`${backendUrl}/verify_otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, otp: otpCode }),
    });
    const data = await res.json();
    console.log("Verify OTP:", data);

    if (!res.ok || !data.success) {
      showMessage(data.message || "Invalid OTP.", "error");
      return false;
    }

    // Save tokens for auto-login
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("user_id", data.user_id);
    localStorage.setItem("remember_username", username);
    if (data.device_token) localStorage.setItem("remember_token", data.device_token);

    showMessage("🎉 OTP verified! Logging in...", "success");
    redirectUser(data.user_id, data.role);
    return true;

  } catch (err) {
    console.error("OTP verify error:", err);
    showMessage("⚠️ Network error during OTP verification.", "warn");
    return false;
  }
}

// ==============================
// 🧩 Login Form Submit
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const rememberPC = document.getElementById("rememberPC").checked;

  if (!username || !password) {
    showMessage("Please fill in both fields.", "warn");
    return;
  }

  try {
    const res = await fetch(`${backendUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    console.log("Login response:", data);

    if (!res.ok || !data.success) {
      showMessage(data.message || "Wrong username or password.", "error");
      return;
    }

    currentUsername = username;

    // Check if Remember PC can skip OTP
    if (data.skip_otp) {
      // Save device token and redirect
      if (data.remember_token) localStorage.setItem("remember_token", data.remember_token);
      localStorage.setItem("user_id", data.user_id);
      redirectUser(data.user_id, currentRole || "user");
      return;
    }

    // Request OTP if not skipped
    const otpSent = await requestOTP(username, rememberPC);
    if (otpSent) {
      loginForm.style.display = "none";
      otpForm.style.display = "block";
    }

  } catch (err) {
    console.error("Login error:", err);
    showMessage("⚠️ Server unavailable. Try again later.", "warn");
  }
});

// ==============================
// 🧩 OTP Form Submit
otpForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const otpCode = document.getElementById("otpCode").value.trim();
  if (!otpCode) return showMessage("Enter OTP.", "warn");
  await verifyOTP(currentUsername, otpCode);
});
