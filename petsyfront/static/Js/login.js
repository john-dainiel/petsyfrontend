// ==============================
// 🐾 PETSY LOGIN.JS — FINAL WITH PET CHECK (FIXED)
// - Admins → admin.html
// - Users without pet → create_pet.html
// - Users with pet → greet.html
// ==============================

const backendUrl = "https://petsy-backend.onrender.com";


const loginForm = document.getElementById("loginForm");
const otpForm = document.getElementById("otpForm");
const message = document.getElementById("message");

let currentUsername = "";
let currentRole = "";

// ==============================
// 🔔 Notification Popup
// ==============================
function showNotification(text, type = "info") {
  let notif = document.createElement("div");
  notif.textContent = text;
  notif.className = `notif ${type}`;
  document.body.appendChild(notif);

  setTimeout(() => notif.classList.add("show"), 100);
  setTimeout(() => {
    notif.classList.remove("show");
    setTimeout(() => notif.remove(), 500);
  }, 4000);
}

// ==============================
// 💬 On-page Message Display
// ==============================
function showMessage(text, type = "info") {
  message.textContent = text;
  message.className = `msg ${type}`;
}

// Inject styles
const style = document.createElement("style");
style.textContent = `
  .notif {
    position: fixed;
    bottom: -50px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 15px;
    opacity: 0;
    transition: all 0.4s ease;
    z-index: 9999;
  }
  .notif.show { bottom: 30px; opacity: 1; }
  .notif.success { background: #28a745; }
  .notif.error { background: #dc3545; }
  .notif.warn { background: #ffc107; color: #222; }

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
  // 🧭 Admins always go to admin.html
  if (role.toLowerCase() === "admin") {
    window.location.href = "admin.html";
    return;
  }

  try {
    const res = await fetch(`${backendUrl}/get_pet/${userId}`);

    // 🐾 If no pet found (404), go to create_pet.html
    if (res.status === 404) {
      showNotification("No pet found. Please create your first pet!", "info");
      window.location.href = "create_pet.html";
      return;
    }

    // 🐾 If pet exists, go to greet.html
    if (res.ok) {
      const data = await res.json();
      if (data && data.id) {
        localStorage.setItem("pet_id", data.id);
        showNotification("Welcome back to your pet!", "success");
        window.location.href = "greet.html";
        return;
      }
    }

    // Fallback
    window.location.href = "create_pet.html";

  } catch (err) {
    console.error("Pet check failed:", err);
    showNotification("Error checking pet data.", "warn");
    window.location.href = "greet.html"; // safe fallback
  }
}

// ==============================
// 🧩 AUTO LOGIN
// ==============================
window.addEventListener("DOMContentLoaded", async () => {
  const savedToken = localStorage.getItem("remember_token");
  const savedUsername = localStorage.getItem("remember_username");
  if (!savedToken || !savedUsername) return;

  try {
    const res = await fetch(`${backendUrl}/auto_login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: savedUsername,
        device_token: savedToken,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showNotification("Welcome back! PC recognized.", "success");
      showMessage("✅ Redirecting...", "success");

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("remember_username", savedUsername);

      setTimeout(() => redirectUser(data.user_id, data.role), 1000);
    }
  } catch (err) {
    console.error("Auto-login error:", err);
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
    showMessage("⚠️ Please fill in both fields.", "warn");
    showNotification("Please fill in both fields.", "warn");
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
      showMessage(data.error || "❌ Wrong username or password.", "error");
      showNotification(data.error || "Wrong username or password.", "error");
      return;
    }

    currentRole = data.role || "user";

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
        showMessage("✅ Login successful! Redirecting...", "success");
        showNotification("Welcome back!", "success");

        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("user_id", otpData.user_id || data.user_id || "");
        localStorage.setItem("remember_username", username);

        setTimeout(() => redirectUser(otpData.user_id || data.user_id, currentRole), 1000);
        return;
      }

      if (otpData.remember_token) {
        localStorage.setItem("remember_token", otpData.remember_token);
        localStorage.setItem("remember_username", username);
      }

      showMessage("📩 OTP sent to your email!", "success");
      showNotification("OTP sent to your email!", "success");

      loginForm.style.display = "none";
      otpForm.style.display = "block";
    } else {
      showMessage(otpData.error || "⚠️ Failed to send OTP.", "error");
      showNotification(otpData.error || "Failed to send OTP.", "error");
    }
  } catch (err) {
    console.error("Login error:", err);
    showMessage("⚠️ Server connection error.", "warn");
    showNotification("⚠️ Server connection error.", "warn");
  }
});

// ==============================
// 🧩 OTP VERIFICATION
// ==============================
otpForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const otpCode = document.getElementById("otpCode").value.trim();
  if (!otpCode) {
    showMessage("⚠️ Please enter your OTP.", "warn");
    showNotification("Please enter your OTP.", "warn");
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
      showMessage("✅ Login complete! Redirecting...", "success");
      showNotification("Login successful!", "success");

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("user_id", data.user_id || "");
      localStorage.setItem("remember_username", currentUsername);

      loginForm.style.display = "none";
      otpForm.style.display = "none";

      setTimeout(() => redirectUser(data.user_id, currentRole), 1000);
    } else {
      showMessage(data.error || "❌ Invalid OTP.", "error");
      showNotification(data.error || "Invalid OTP.", "error");
    }
  } catch (err) {
    console.error("OTP verify error:", err);
    showMessage("⚠️ Server connection error.", "warn");
    showNotification("⚠️ Server connection error.", "warn");
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
  showNotification("Logged out successfully.", "success");
  setTimeout(() => (window.location.href = "login.html"), 1000);
}
