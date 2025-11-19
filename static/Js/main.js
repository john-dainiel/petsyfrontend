// ===============================
// 🐾 PETSY MAIN.JS — Frontend Only, Clean & Structured
// ===============================

const backendUrl = "https://petsy-dow7.onrender.com";

// -----------------------
// Global Variables
// -----------------------
let petData = null;
let treatInventory = { small: 0, medium: 0, large: 0 };
let ageInterval = null;
let petMoodInterval = null;
let sleepEmojiInterval = null;
let energyRestoreInterval = null;
let communityIntervalId = null;
let lastPopupIds = new Set();

// -----------------------
// Safe selector helper
// -----------------------
const $ = (selector, root = document) => root.querySelector(selector);

// -----------------------
// DOM Ready — Initialize
// -----------------------
document.addEventListener("DOMContentLoaded", () => {
  // Button references
  const playBtn = $("#playBtn");
  const restBtn = $("#restBtn");
  const eatButton = $("#eatButton");
  const cleanBtn = $("#cleanBtn");
  const optionsBtn = $("#optionsBtn");
  const miniGamesBtn = $("#miniGamesBtn");
  const logoutBtn = $("#logoutBtn");
  const shopBtn = $("#shopBtn");
  const communityBtn = $("#communityBtn");

  // Modals
  const shopModal = $("#shopModal");
  const shopResult = $("#shopResult");
  const closeShopBtn = $("#closeShopBtn");
  const shopOverlay = document.createElement("div");
  shopOverlay.className = "modal-overlay hidden";
  document.body.appendChild(shopOverlay);

  const optionsModal = $("#optionsModal");
  const closeOptionsBtn = $("#closeOptionsBtn");

  // -----------------------
  // Button Actions
  // -----------------------
  playBtn?.addEventListener("click", () => doPatAction());
  restBtn?.addEventListener("click", () => toggleSleep(restBtn));
  eatButton?.addEventListener("mouseenter", () => showTreatMenu());
  cleanBtn?.addEventListener("click", () => cleanPet());
  optionsBtn?.addEventListener("click", () => openOptionsModal());
  miniGamesBtn?.addEventListener("click", () => window.location.href = "minigames.html");
  logoutBtn?.addEventListener("click", () => { localStorage.clear(); window.location.href = "index.html"; });
  shopBtn?.addEventListener("click", () => openShopModal());

  closeShopBtn?.addEventListener("click", closeShop);
  shopOverlay?.addEventListener("click", closeShop);

  closeOptionsBtn?.addEventListener("click", closeOptions);
  optionsModal?.querySelector(".modal-content")?.addEventListener("click", e => e.stopPropagation());

  // -----------------------
  // Initialize App State
  // -----------------------
  loadMain();
  startCommunityPopups();

  // Start intervals for mood and age display
  if (ageInterval) clearInterval(ageInterval);
  ageInterval = setInterval(displayAge, 60000);

  if (petMoodInterval) clearInterval(petMoodInterval);
  petMoodInterval = setInterval(() => setPetImage(), 5000);
});

// -----------------------
// 🐾 Load Main Pet Data
// -----------------------
async function loadMain() {
    const user_id = localStorage.getItem("user_id");
    const pet_id = localStorage.getItem("pet_id");

    if (!user_id) {
        console.log("❌ No user_id found, redirecting to login...");
        window.location.href = "login.html";
        return;
    }

    const idToLoad = pet_id || user_id;
    const endpoint = pet_id ? "get_pet_by_id" : "get_pet";

    try {
        const res = await fetch(`${backendUrl}/${endpoint}/${idToLoad}`);
        const data = await res.json();
        if (!res.ok || data.error) return;

        petData = data;

        // Normalize keys
        petData.isDirty = petData.isDirty || petData.is_dirty || false;
        petData.is_dirty = petData.is_dirty || petData.isDirty || false;
        petData.sleeping = petData.sleeping || petData.is_sleeping || false;

        petData.ageDays = computeAgeDays(petData.created_at || localStorage.getItem("pet_birthdate"));
        petData.energy = typeof petData.energy === "number" ? petData.energy : 100;
        petData.hunger = typeof petData.hunger === "number" ? petData.hunger : 50;
        petData.happiness = typeof petData.happiness === "number" ? petData.happiness : 50;

        // Save local storage
        localStorage.setItem("pet_id", data.id);
        if (data.pet_name) localStorage.setItem("pet_name", data.pet_name);
        if (data.pet_type) localStorage.setItem("pet_type", data.pet_type.toLowerCase());
        if (data.created_at) localStorage.setItem("pet_birthdate", data.created_at.split(" ")[0]);

        // Update DOM
        $("#petId") && ($("#petId").textContent = `#${data.id}`);
        $("#petName") && ($("#petName").textContent = data.pet_name || "Pet");
        $("#petType") && ($("#petType").textContent = data.pet_type || "Unknown");
        $("#petCoins") && ($("#petCoins").textContent = data.coins ?? 0);

        // Check local dirty state
        const localDirtyKey = `pet_dirty_${data.id}`;
        if (localStorage.getItem(localDirtyKey) === "true") {
            petData.is_dirty = true;
            petData.isDirty = true;
        }

        // Pet image logic
        setPetImage(petData.sleeping ? "sleeping" : "happy");
        updateBackground();
        displayAge();

        // Load treats
        await loadTreatInventory();
        updateTreatMenu();

    } catch (err) {
        console.error("Failed to load main:", err);
    }
}

// -----------------------
// 🐾 Compute age in days
// -----------------------
function computeAgeDays(createdAtString) {
    if (!createdAtString) return 0;
    const createdAt = new Date(createdAtString);
    const now = new Date();
    return Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
}

// -----------------------
// 🐾 Display age in DOM
// -----------------------
function displayAge() {
    if (!petData || !localStorage.getItem("pet_birthdate")) return;
    const createdAt = new Date(localStorage.getItem("pet_birthdate"));
    const now = new Date();
    const diffDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    const el = $("#petAge");
    if (el) el.textContent = `${diffDays} day${diffDays !== 1 ? "s" : ""}`;
}

// -----------------------
// 🐾 Update stats from server
// -----------------------
async function updateStats() {
    const pet_id = localStorage.getItem("pet_id");
    if (!pet_id) return;

    try {
        const res = await fetch(`${backendUrl}/get_pet_by_id/${pet_id}`);
        const data = await res.json();
        if (!res.ok || data.error) return;

        petData = { ...petData, ...data };
        petData.isDirty = petData.isDirty || petData.is_dirty || false;
        petData.is_dirty = petData.is_dirty || petData.isDirty || false;
        petData.sleeping = petData.sleeping || petData.is_sleeping || false;

        $("#hungerBar") && ($("#hungerBar").value = data.hunger ?? 50);
        $("#energyBar") && ($("#energyBar").value = data.energy ?? 100);
        $("#happinessBar") && ($("#happinessBar").value = data.happiness ?? 50);
        $("#petCoins") && ($("#petCoins").textContent = data.coins ?? 0);

        displayAge();

        // Treat counts
        if (typeof data.small_treats !== "undefined") {
            treatInventory.small = data.small_treats ?? 0;
            treatInventory.medium = data.medium_treats ?? 0;
            treatInventory.large = data.large_treats ?? 0;
            updateTreatMenu();
        }

        setPetImage(petData.sleeping ? "sleeping" : "happy");

    } catch (err) {
        console.error("Failed to update stats:", err);
    }
}

// -----------------------
// 🐾 Update background image
// -----------------------
function updateBackground() {
    const hour = new Date().getHours();
    const bg = document.querySelector(".background");
    if (!bg) return;

    bg.classList.add("fade-transition");

    if (hour >= 6 && hour < 12) {
        bg.style.backgroundImage = "url('static/images/background/morning.png')";
    } else if (hour >= 12 && hour < 18) {
        bg.style.backgroundImage = "url('static/images/background/afternoon.png')";
    } else {
        bg.style.backgroundImage = "url('static/images/background/night.png')";
    }

    setTimeout(() => bg.classList.remove("fade-transition"), 1500);
}

// -----------------------
// 🐾 Load Treat Inventory
// -----------------------
async function loadTreatInventory() {
    const pet_id = localStorage.getItem("pet_id");
    if (!pet_id) return;

    try {
        const res = await fetch(`${backendUrl}/get_treats/${pet_id}`);
        if (!res.ok) return;
        const data = await res.json();

        treatInventory.small = data.small_treats ?? 0;
        treatInventory.medium = data.medium_treats ?? 0;
        treatInventory.large = data.large_treats ?? 0;

        updateTreatMenu();
    } catch (err) {
        console.error("Failed to load treats:", err);
    }
}

// -----------------------
// 🐾 Update Treat Menu
// -----------------------
function updateTreatMenu() {
    document.querySelectorAll(".treat-option").forEach(option => {
        const type = option.dataset.type;
        const count = treatInventory[type] ?? 0;
        const emoji = type === "small" ? "🍪" : type === "medium" ? "🥩" : "🍗";
        option.innerHTML = `${emoji} ${capitalize(type)} Treat ×${count}`;
        count <= 0 ? option.classList.add("disabled") : option.classList.remove("disabled");
    });

    $("#smallCount") && ($("#smallCount").textContent = treatInventory.small);
    $("#mediumCount") && ($("#mediumCount").textContent = treatInventory.medium);
    $("#largeCount") && ($("#largeCount").textContent = treatInventory.large);
}

function capitalize(s = "") {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

// -----------------------
// 🐾 Generic action with floating emoji feedback
// -----------------------
async function doAction(endpoint) {
    const pet_id = localStorage.getItem("pet_id");
    if (!pet_id) return;

    const emoji = document.createElement("div");
    emoji.className = "floating-emoji";
    emoji.textContent = "✨";
    document.body.appendChild(emoji);
    Object.assign(emoji.style, {
        position: "fixed",
        fontSize: "3rem",
        top: "40%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        opacity: "0",
        transition: "opacity 0.25s ease",
    });
    setTimeout(() => (emoji.style.opacity = "1"), 50);

    try {
        const res = await fetch(`${backendUrl}/${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pet_id }),
        });
        const data = await res.json();
        if (data.success) await updateStats();
    } catch (err) {
        console.error("Action error:", err);
    }

    setTimeout(() => emoji.remove(), 1200);
}

// -----------------------
// 🐾 Play / Pat action with cooldown
// -----------------------
async function doPatAction() {
    const pet_id = localStorage.getItem("pet_id");
    if (!pet_id || !petData) return;

    const playBtn = document.getElementById("playBtn");
    if (!playBtn) return;

    if (petData.sleeping || petData.is_sleeping) {
        showToast("😴 Your pet is sleeping.");
        return;
    }

    playBtn.disabled = true;
    playBtn.classList.add("disabled");

    // 60s cooldown
    let cooldown = 60;
    playBtn.textContent = getCooldownEmoji() + `${cooldown}s`;
    const cooldownInterval = setInterval(() => {
        cooldown--;
        playBtn.textContent = getCooldownEmoji() + `${cooldown}s`;
        if (cooldown <= 0) {
            clearInterval(cooldownInterval);
            playBtn.disabled = false;
            playBtn.classList.remove("disabled");
            playBtn.textContent = "▶️ Play";
        }
    }, 1000);

    // Floating emoji feedback
    const emoji = document.createElement("div");
    emoji.className = "floating-emoji";
    emoji.textContent = getCooldownEmoji();
    document.body.appendChild(emoji);
    Object.assign(emoji.style, {
        position: "fixed",
        fontSize: "3.5rem",
        top: "38%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        opacity: "0",
        transition: "opacity 0.15s ease",
    });
    setTimeout(() => (emoji.style.opacity = "1"), 30);

    // Play animation frames
    const petImg = document.getElementById("petImage");
    const baseType = (localStorage.getItem("pet_type") || "cat").toLowerCase();
    const birthDate = petData.created_at ? new Date(petData.created_at) : null;
    const today = new Date();
    const ageDays = birthDate ? Math.floor((today - birthDate) / (1000 * 60 * 60 * 24)) : 999;
    const stage = ageDays < 10 ? "baby" : "adult";
    const frame1 = `static/images/${stage}_${baseType}_when_play1.png`;
    const frame2 = `static/images/${stage}_${baseType}_when_play2.png`;

    if (petImg) {
        let toggle = false;
        let cycles = 0;
        const maxCycles = 6;
        const frameInterval = 600;
        const playFrameInterval = setInterval(() => {
            toggle = !toggle;
            petImg.src = toggle ? frame1 : frame2;
            cycles++;
            if (cycles >= maxCycles) {
                clearInterval(playFrameInterval);
                updatePetImage(); // respects mood/dirty/sleeping
            }
        }, frameInterval);
    }

    incrementPlayCounter(pet_id);

    // Send play to backend after animation
    setTimeout(async () => {
        try {
            const res = await fetch(`${backendUrl}/play_pet`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pet_id }),
            });
            const data = await res.json();
            if (data.success) await updateStats();
        } catch (err) {
            console.error("Play error:", err);
        }
    }, 4000);

    setTimeout(() => emoji.remove(), 1500);
}

function getCooldownEmoji() {
    const type = (localStorage.getItem("pet_type") || "cat").toLowerCase();
    return type === "dog" ? "⚽" : "🧶";
}

// -----------------------
// 🐾 Play counter / dirty logic
// -----------------------
function getPlayKey(pet_id) { return `play_count_${pet_id}`; }

function incrementPlayCounter(pet_id) {
    const key = getPlayKey(pet_id);
    let count = parseInt(localStorage.getItem(key) || "0", 10);
    count++;
    localStorage.setItem(key, String(count));

    if (count >= 3) {
        markPetDirtyLocal(pet_id);
        showToast("💩 Your pet got dirty after playing a lot—time to clean!");
        localStorage.setItem(key, "0");
    }
}

function resetPlayCounter(pet_id) {
    localStorage.setItem(getPlayKey(pet_id), "0");
}

async function markPetDirtyLocal(pet_id) {
    if (!pet_id) return;
    if (!petData) petData = {};
    petData.is_dirty = true;
    petData.isDirty = true;
    localStorage.setItem(`pet_dirty_${pet_id}`, "true");

    setPetImage("dirty");

    try {
        await fetch(`${backendUrl}/mark_dirty`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pet_id }),
        });
        setTimeout(updateStats, 800);
    } catch (err) {
        console.debug("mark_dirty not available or failed:", err);
    }
}

// -----------------------
// 🐾 Feed / Treats
// -----------------------
async function feedPet(treatType) {
    const pet_id = localStorage.getItem("pet_id");
    if (!pet_id) return;
    if (!treatInventory[treatType] || treatInventory[treatType] <= 0) {
        alert("❌ You're out of this treat!");
        return;
    }

    try {
        const res = await fetch(`${backendUrl}/feed_pet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pet_id, treatType }),
        });
        const data = await res.json();
        if (!res.ok) {
            alert(data.error || "Failed to feed pet.");
            return;
        }

        if (data.success) {
            treatInventory[treatType] = Math.max(0, treatInventory[treatType] - 1);
            await loadTreatInventory();
            updateTreatMenu();
            await updateStats();

            const hungerBoost = { small: 10, medium: 25, large: 50 }[treatType] || 0;
            showToast(`🍗 ${capitalize(treatType)} treat eaten! Hunger +${hungerBoost}`);

            // Reduce play fatigue slightly
            const key = getPlayKey(pet_id);
            const current = parseInt(localStorage.getItem(key) || "0", 10);
            if (current > 0) localStorage.setItem(key, String(Math.max(0, current - 1)));
        } else {
            alert(data.error || "Failed to feed pet.");
        }
    } catch (err) {
        console.error("Feeding failed:", err);
        alert("Network error while feeding pet.");
    }
}

// -----------------------
// 🐾 Clean Pet
// -----------------------
cleanBtn?.addEventListener("click", async () => {
    const pet_id = localStorage.getItem("pet_id");
    if (!pet_id) return alert("No pet selected.");

    try {
        const res = await fetch(`${backendUrl}/clean_pet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pet_id }),
        });
        const data = await res.json();

        if (res.ok && (data.success || data.cleaned)) {
            resetPlayCounter(pet_id);
            if (petData) petData.is_dirty = false;
            await updateStats();
            sparklesOnClean();
            showToast("✨ Your pet has been cleaned!");
        } else {
            alert(data?.error ? `❌ ${data.error}` : "❌ Cleaning failed.");
        }
    } catch (err) {
        console.error("Clean error:", err);
        alert("Network error while cleaning the pet.");
    }
});

// -----------------------
// 🐾 Rename Pet
// -----------------------
saveNameBtn?.addEventListener("click", async () => {
    const newName = (renameInput?.value || "").trim();
    const pet_id = localStorage.getItem("pet_id");
    if (!pet_id) return renameResult.textContent = "❌ No pet selected.";

    if (!newName) return renameResult.textContent = "❌ Name cannot be empty.";

    const cooldownKey = `pet_rename_cooldown_${pet_id}`;
    const lastRename = parseInt(localStorage.getItem(cooldownKey) || "0", 10);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (lastRename && now - lastRename < oneDayMs) {
        const remaining = Math.ceil((oneDayMs - (now - lastRename)) / (1000 * 60 * 60));
        renameResult.textContent = `❌ You can rename again in ${remaining} hour(s).`;
        return;
    }

    if (!confirm("⚠️ After renaming, you cannot change the name again for 1 day. Proceed?")) return;

    try {
        const res = await fetch(`${backendUrl}/rename_pet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pet_id, new_name: newName }),
        });
        const data = await res.json();

        if (res.ok && data && (data.success || data.updated)) {
            $("#petName") && ($("#petName").textContent = newName);
            if (petData) petData.pet_name = newName;
            localStorage.setItem("pet_name", newName);
            localStorage.setItem(cooldownKey, now.toString());
            renameResult.textContent = "✅ Name updated successfully!";
        } else {
            renameResult.textContent = data.error || "⚠️ Server rename failed.";
        }
    } catch (err) {
        console.error("Rename error:", err);
        renameResult.textContent = "⚠️ Network error — try again later.";
    }
});

// -----------------------
// 🐾 Mute Toggle
// -----------------------
muteToggle?.addEventListener("click", () => {
    const muted = localStorage.getItem("muted") === "true";
    localStorage.setItem("muted", (!muted).toString());
    updateMuteUI(!muted);
});

function updateMuteUI(muted) {
    if (muteStatus) muteStatus.textContent = muted ? "On" : "Off";
    if (muteToggle) muteToggle.textContent = muted ? "Unmute" : "Mute";
}

// -----------------------
// 🐾 Sleep / Wake Logic
// -----------------------
async function putPetToSleep() {
    const pet_id = localStorage.getItem("pet_id");
    if (!pet_id) return;

    if (petData.sleeping || petData.is_sleeping) {
        showToast("😴 Your pet is already sleeping.");
        return;
    }

    try {
        const res = await fetch(`${backendUrl}/sleep_pet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pet_id }),
        });
        const data = await res.json();
        if (data.success) {
            petData.sleeping = true;
            setPetImage("sleeping");
            showToast("💤 Your pet is now sleeping.");
        }
    } catch (err) {
        console.error("Sleep error:", err);
    }
}

async function wakePetUp() {
    const pet_id = localStorage.getItem("pet_id");
    if (!pet_id) return;

    if (!petData.sleeping && !petData.is_sleeping) {
        showToast("😊 Your pet is already awake.");
        return;
    }

    try {
        const res = await fetch(`${backendUrl}/wake_pet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pet_id }),
        });
        const data = await res.json();
        if (data.success) {
            petData.sleeping = false;
            updatePetImage();
            showToast("🌞 Your pet woke up!");
        }
    } catch (err) {
        console.error("Wake error:", err);
    }
}

// -----------------------
// 🐾 Energy restore over time
// -----------------------
function startEnergyRestore() {
    setInterval(async () => {
        if (!petData || petData.sleeping) return;

        const pet_id = localStorage.getItem("pet_id");
        try {
            await fetch(`${backendUrl}/restore_energy`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pet_id }),
            });
            await updateStats();
        } catch (err) {
            console.error("Energy restore failed:", err);
        }
    }, 60000); // every 60 seconds
}

// -----------------------
// 🐾 Update Pet Image / Mood
// -----------------------
function setPetImage(state = "") {
    if (!petData || !petData.pet_type) return;
    const petImg = document.getElementById("petImage");
    const type = petData.pet_type.toLowerCase();
    const ageDays = petData.created_at ? Math.floor((new Date() - new Date(petData.created_at)) / (1000*60*60*24)) : 999;
    const stage = ageDays < 10 ? "baby" : "adult";

    let mood = petData.is_dirty ? "dirty" :
               petData.sleeping ? "sleeping" :
               petData.mood || "happy";

    if (state) mood = state;

    if (petImg) {
        petImg.src = `static/images/${stage}_${type}_${mood}.png`;
    }
}

// Update image with proper mood/status
function updatePetImage() { setPetImage(); }

// -----------------------
// 🐾 Community / Popup Messages
// -----------------------
function showToast(message, duration = 3000) {
    const toast = document.createElement("div");
    toast.className = "toast-message";
    toast.textContent = message;
    document.body.appendChild(toast);
    Object.assign(toast.style, {
        position: "fixed",
        bottom: "5%",
        left: "50%",
        transform: "translateX(-50%)",
        background: "#333",
        color: "#fff",
        padding: "0.8rem 1.2rem",
        borderRadius: "0.5rem",
        opacity: "0",
        transition: "opacity 0.3s",
        zIndex: 9999,
    });

    setTimeout(() => (toast.style.opacity = "1"), 50);
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 350);
    }, duration);
}

// -----------------------
// 🐾 Sparkles for Clean Animation
// -----------------------
function sparklesOnClean() {
    const petImg = document.getElementById("petImage");
    if (!petImg) return;

    for (let i = 0; i < 8; i++) {
        const sparkle = document.createElement("div");
        sparkle.className = "sparkle";
        Object.assign(sparkle.style, {
            position: "absolute",
            width: "10px",
            height: "10px",
            background: "gold",
            borderRadius: "50%",
            top: `${Math.random() * 80 + 10}%`,
            left: `${Math.random() * 80 + 10}%`,
            opacity: "0",
            pointerEvents: "none",
            transform: "scale(0)",
            transition: "transform 0.3s, opacity 0.3s",
            zIndex: 10000,
        });
        petImg.parentElement.appendChild(sparkle);

        setTimeout(() => {
            sparkle.style.opacity = "1";
            sparkle.style.transform = "scale(1)";
        }, 50);

        setTimeout(() => {
            sparkle.style.opacity = "0";
            sparkle.style.transform = "scale(0)";
            setTimeout(() => sparkle.remove(), 300);
        }, 500);
    }
}

// -----------------------
// 🐾 Helper Utilities
// -----------------------
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// -----------------------
// 🐾 Initialization
// -----------------------
window.addEventListener("load", async () => {
    await updateStats();
    loadTreatInventory();
    updatePetImage();
    startEnergyRestore();
    updateMuteUI(localStorage.getItem("muted") === "true");
});
