// ===============================
// 🐾 PETSY MAIN.JS — Cleaned & Consolidated
// Features:
// - Shop / Inventory / Treats
// - Sleep/Wake persistence with emoji animation
// - Play/pat cooldown 60s with animations
// - Dirty / Clean logic (dirty after 3 plays)
// - Age & mood based image logic (baby/adult)
// - Background changes by time of day
// - Options modal (rename, mute)
// - Community popups
// - Hourly energy restore while sleeping
// - Sparkle animation on cleaning
// - Fully synced with backend
// ===============================

const backendUrl = "https://petsy-dow7.onrender.com";
let petData = null;
let ageInterval = null;
let petMoodInterval = null;
let communityIntervalId = null;
let lastPopupIds = new Set();
let treatInventory = { small: 0, medium: 0, large: 0 };
let sleepEmojiInterval = null;
let energyRestoreInterval = null;

// Helper selector
const $ = (sel, root = document) => (root || document).querySelector(sel);

// -----------------------
// DOM Ready
// -----------------------
document.addEventListener("DOMContentLoaded", () => {
  // -----------------------
  // Buttons & Modals
  // -----------------------
  const playBtn = $("#playBtn");
  const restBtn = $("#restBtn");
  const miniGamesBtn = $("#miniGamesBtn");
  const logoutBtn = $("#logoutBtn");
  const shopBtn = $("#shopBtn");
  const communityBtn = $("#communityBtn");
  const shopModal = $("#shopModal");
  const shopOverlay = document.createElement("div");
  shopOverlay.className = "modal-overlay hidden";
  document.body.appendChild(shopOverlay);
  const eatButton = $("#eatButton");
  const treatMenu = $("#treatOptions");
  const eatMenuContainer = document.querySelector(".eat-menu");
  const shopButtons = Array.from(document.querySelectorAll(".shop-btn"));
  const treatOptionEls = Array.from(document.querySelectorAll(".treat-option"));
  const cleanBtn = $("#cleanBtn");
  const optionsBtn = $("#optionsBtn");
  const optionsModal = $("#optionsModal");
  const closeOptionsBtn = $("#closeOptionsBtn");
  const renameInput = $("#renameInput");
  const saveNameBtn = $("#saveNameBtn");
  const renameResult = $("#renameResult");
  const muteToggle = $("#muteToggle");
  const muteStatus = $("#muteStatus");

  // Rest button UI tweaks
  if (restBtn) {
    restBtn.style.fontSize = "12px";
    restBtn.style.padding = "0.4rem";
    restBtn.style.display = "flex";
    restBtn.style.alignItems = "center";
    restBtn.style.justifyContent = "center";
    restBtn.style.textAlign = "center";
    restBtn.style.whiteSpace = "nowrap";
  }

  // -----------------------
  // Button Event Listeners
  // -----------------------
  playBtn?.addEventListener("click", doPatAction);
  miniGamesBtn?.addEventListener("click", () => (window.location.href = "minigames.html"));
  logoutBtn?.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "index.html";
  });
  shopBtn?.addEventListener("click", async () => {
    await loadTreatInventory();
    updateTreatMenu();
    shopModal?.classList.remove("hidden");
    shopOverlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  });
  closeOptionsBtn?.addEventListener("click", closeOptions);
  optionsBtn?.addEventListener("click", () => {
    optionsModal?.classList.remove("hidden");
    shopOverlay?.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    const muted = localStorage.getItem("muted") === "true";
    updateMuteUI(muted);
  });
  muteToggle?.addEventListener("click", () => {
    const muted = localStorage.getItem("muted") === "true";
    localStorage.setItem("muted", (!muted).toString());
    updateMuteUI(!muted);
  });
  saveNameBtn?.addEventListener("click", renamePet);

  // Shop buy handlers
  shopButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const treatType = btn.dataset.type;
      const pet_id = localStorage.getItem("pet_id");
      if (!pet_id) return showShopMessage("❌ No pet selected.");
      try {
        const res = await fetch(`${backendUrl}/buy_treat/${pet_id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ treat_type: treatType }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          await loadTreatInventory();
          updateTreatMenu();
          await updateStats();
          showShopMessage(`✅ You bought a ${treatType} treat!`);
        } else {
          showShopMessage(`❌ ${data.error || "Purchase failed."}`);
        }
      } catch (err) {
        console.error(err);
        showShopMessage("❌ Network error.");
      }
    });
  });

  function showShopMessage(msg) {
    const shopResult = $("#shopResult");
    if (shopResult) {
      shopResult.textContent = msg;
      shopResult.classList.remove("hidden");
    }
  }

  // -----------------------
  // Treat Menu
  // -----------------------
  if (eatButton && treatMenu && eatMenuContainer) {
    eatButton.addEventListener("mouseenter", () => {
      updateTreatMenu();
      treatMenu.classList.remove("hidden");
    });
    eatMenuContainer.addEventListener("mouseleave", () => treatMenu.classList.add("hidden"));
    treatOptionEls.forEach((option) => {
      option.addEventListener("click", async () => {
        const treatType = option.dataset.type;
        await feedPet(treatType);
        treatMenu.classList.add("hidden");
      });
    });
  }

  // -----------------------
  // Clean Button
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
        petData.is_dirty = false;
        setPetImage();
        await updateStats();
        sparklesOnClean();
        showToast("✨ Your pet has been cleaned!");
      } else alert(data.error || "Cleaning failed.");
    } catch (err) {
      console.error(err);
      alert("Network error while cleaning the pet.");
    }
  });

  // -----------------------
  // Sleep/Wake Button
  // -----------------------
  const storedSleeping = !!localStorage.getItem("pet_sleep_start");
  if (restBtn) {
    restBtn.textContent = storedSleeping ? "🌞 Wake Up" : "💤 Sleep";
    restBtn.addEventListener("click", async () => {
      const sleeping = !!localStorage.getItem("pet_sleep_start");
      const pet_id = localStorage.getItem("pet_id");
      if (!pet_id) return showToast("No pet selected.");
      if (!sleeping) {
        await handleSleep();
        startSleepTimer();
        await restoreEnergyOnce();
        restBtn.textContent = "🌞 Wake Up";
        showToast("💤 Your pet is now sleeping...");
      } else {
        await wakePet();
        restBtn.textContent = "💤 Sleep";
      }
    });
  }
  if (storedSleeping) {
    disableAllActions(true);
    startSleepEmoji();
    startEnergyRestore();
    if (restBtn) restBtn.textContent = "🌞 Wake Up";
  }

  // -----------------------
  // Initialize Data
  // -----------------------
  startCommunityPopups();
  loadMain();
  setInterval(checkAutoWake, 60000);
});

// ========================
// Core Functions
// ========================

async function loadMain() {
  const user_id = localStorage.getItem("user_id");
  const pet_id = localStorage.getItem("pet_id");
  if (!user_id) return (window.location.href = "login.html");
  const idToLoad = pet_id ? pet_id : user_id;
  const endpoint = pet_id ? "get_pet_by_id" : "get_pet";
  try {
    const res = await fetch(`${backendUrl}/${endpoint}/${idToLoad}`);
    const data = await res.json();
    if (!res.ok || data.error) return console.error("Error loading pet:", data.error);
    petData = data;
    petData.is_dirty = petData.is_dirty || petData.isDirty || false;
    petData.sleeping = petData.sleeping || petData.is_sleeping || false;
    petData.ageDays = computeAgeDays(petData.created_at || localStorage.getItem("pet_birthdate"));
    petData.energy = petData.energy ?? 100;
    petData.hunger = petData.hunger ?? 50;
    petData.happiness = petData.happiness ?? 50;

    localStorage.setItem("pet_id", data.id);
    if (data.pet_name) localStorage.setItem("pet_name", data.pet_name);
    if (data.pet_type) localStorage.setItem("pet_type", data.pet_type.toLowerCase());
    if (data.created_at) localStorage.setItem("pet_birthdate", data.created_at.split(" ")[0]);

    $("#petId") && ($("#petId").textContent = `#${data.id}`);
    $("#petName") && ($("#petName").textContent = data.pet_name || "Pet");
    $("#petType") && ($("#petType").textContent = data.pet_type || "Unknown");
    $("#petCoins") && ($("#petCoins").textContent = data.coins ?? 0);

    setPetImage(petData.sleeping ? "sleeping" : "happy");
    updateBackground();
    displayAge();
    await updateStats();
    await loadTreatInventory();
    updateTreatMenu();

    if (ageInterval) clearInterval(ageInterval);
    ageInterval = setInterval(displayAge, 60000);

    if (petMoodInterval) clearInterval(petMoodInterval);
    petMoodInterval = setInterval(() => setPetImage(), 5000);
    setInterval(updateStats, 30000);
  } catch (err) {
    console.error("Failed to load main:", err);
  }
}

function computeAgeDays(createdAtString) {
  if (!createdAtString) return 0;
  const createdAt = new Date(createdAtString);
  const now = new Date();
  return Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
}

function displayAge() {
  if (!petData) return;
  const createdAt = new Date(localStorage.getItem("pet_birthdate"));
  const now = new Date();
  const diffDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
  const el = $("#petAge");
  if (el) el.textContent = `${diffDays} day${diffDays !== 1 ? "s" : ""}`;
}

// -----------------------
// Pet Image / Mood
// -----------------------
function setPetImage(forcedState = null) {
  if (!petData) return;
  const petImg = $("#petImage");
  if (!petImg) return;

  const baseType = (localStorage.getItem("pet_type") || "cat").toLowerCase();
  const isBaby = petData.ageDays < 10;
  const type = isBaby ? `baby_${baseType}` : baseType;

  let state = forcedState;
  if (!state) {
    if (petData.sleeping) state = "sleeping";
    else if (petData.is_dirty) state = "dirty";
    else if (petData.hunger <= 10) state = "hungry";
    else if (petData.energy <= 15) state = "tired";
    else if (petData.happiness <= 20) state = "sad";
    else state = "happy";
  }

  petImg.src = `static/images/${type}_${state}.png`;
  petImg.onerror = () => {
    petImg.src = `static/images/${baseType}_${state}.png`;
  };
}

// -----------------------
// Sleep / Wake
// -----------------------
async function handleSleep() {
  const pet_id = localStorage.getItem("pet_id");
  if (!pet_id) return;
  try {
    await fetch(`${backendUrl}/sleep_pet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pet_id }),
    });
    startSleepTimer();
  } catch (err) {
    console.error(err);
  }
}

function startSleepTimer() {
  localStorage.setItem("pet_sleep_start", Date.now().toString());
  disableAllActions(true);
  petData.sleeping = true;
  startSleepEmoji();
  startEnergyRestore();
  setPetImage("sleeping");
}

async function wakePet() {
  const pet_id = localStorage.getItem("pet_id");
  if (!pet_id) return;
  try {
    await fetch(`${backendUrl}/wake_pet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pet_id }),
    });
  } catch (err) {
    console.debug(err);
  }
  localStorage.removeItem("pet_sleep_start");
  stopEnergyRestore();
  stopSleepEmoji();
  disableAllActions(false);
  petData.sleeping = false;
  setPetImage("happy");
  await updateStats();
  showToast("☀️ Your pet woke up!");
}

function checkAutoWake() {
  const sleepStart = parseInt(localStorage.getItem("pet_sleep_start") || "0", 10);
  if (!sleepStart) return;
  const now = Date.now();
  const eightHours = 8 * 60 * 60 * 1000;
  if (now - sleepStart >= eightHours) wakePet();
}

function disableAllActions(disabled) {
  [$("#playBtn"), $("#cleanBtn"), $("#eatButton")]
    .filter(Boolean)
    .forEach((btn) => {
      btn.disabled = disabled;
      btn.style.opacity = disabled ? "0.5" : "1";
      btn.style.cursor = disabled ? "not-allowed" : "pointer";
    });
}

function startSleepEmoji() {
  stopSleepEmoji();
  sleepEmojiInterval = setInterval(() => {
    const emoji = document.createElement("div");
    emoji.className = "floating-emoji";
    emoji.textContent = "💤";
    Object.assign(emoji.style, {
      position: "fixed",
      fontSize: "4rem",
      top: "40%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      opacity: "0",
      transition: "opacity 1s ease",
    });
    document.body.appendChild(emoji);
    setTimeout(() => (emoji.style.opacity = "1"), 50);
    setTimeout(() => emoji.remove(), 2000);
  }, 5000);
}

function stopSleepEmoji() {
  if (sleepEmojiInterval) {
    clearInterval(sleepEmojiInterval);
    sleepEmojiInterval = null;
  }
}

// -----------------------
// Play / Pat
// -----------------------
async function doPatAction() {
  const pet_id = localStorage.getItem("pet_id");
  const playBtn = $("#playBtn");
  if (!pet_id || !playBtn) return;
  if (petData.sleeping) return showToast("😴 Your pet is sleeping.");

  playBtn.disabled = true;
  playBtn.classList.add("disabled");

  let cooldown = 60;
  const emoji = petData.pet_type === "dog" ? "⚽" : "🧶";

  const intervalId = setInterval(() => {
    playBtn.textContent = `${emoji} ${cooldown}s`;
    cooldown--;
    if (cooldown < 0) {
      clearInterval(intervalId);
      playBtn.disabled = false;
      playBtn.classList.remove("disabled");
      playBtn.textContent = "▶️ Play";
    }
  }, 1000);

  // Floating emoji
  const floatEmoji = document.createElement("div");
  floatEmoji.className = "floating-emoji";
  floatEmoji.textContent = emoji;
  Object.assign(floatEmoji.style, {
    position: "fixed",
    fontSize: "3.5rem",
    top: "38%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    opacity: "0",
    transition: "opacity 0.15s ease",
  });
  document.body.appendChild(floatEmoji);
  setTimeout(() => (floatEmoji.style.opacity = "1"), 30);
  setTimeout(() => floatEmoji.remove(), 1500);

  // Animation frames
  const petImg = $("#petImage");
  const baseType = (localStorage.getItem("pet_type") || "cat").toLowerCase();
  const stage = petData.ageDays < 10 ? "baby" : "adult";
  const frame1 = `static/images/${stage}_${baseType}_when_play1.png`;
  const frame2 = `static/images/${stage}_${baseType}_when_play2.png`;
  if (petImg) {
    let toggle = false,
      cycles = 0;
    const maxCycles = 6;
    const frameInterval = 600;
    const frameTimer = setInterval(() => {
      toggle = !toggle;
      petImg.src = toggle ? frame1 : frame2;
      cycles++;
      if (cycles >= maxCycles) {
        clearInterval(frameTimer);
        setPetImage(); // restore default state
      }
    }, frameInterval);
  }

  incrementPlayCounter(pet_id);

  // Backend sync after animation
  setTimeout(async () => {
    try {
      await fetch(`${backendUrl}/play_pet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pet_id }),
      });
      await updateStats();
    } catch (err) {
      console.error(err);
    }
  }, 4000);
}

function getPlayKey(pet_id) {
  return

// ===============================
// 🐾 FINALIZED PET IMAGE & RENAME HANDLING
// ===============================

// Unified pet image updater (baby/adult + mood + dirty + sleep)
function updatePetImage(mood = "happy") {
    if (!petData) return;
    const petImg = document.getElementById("petImage");
    if (!petImg) return;

    // Compute age in days
    const birthDate = new Date(localStorage.getItem('pet_birthdate') || petData.created_at);
    const today = new Date();
    const ageDays = Math.floor((today - birthDate) / (1000 * 60 * 60 * 24));
    const stage = ageDays < 10 ? "baby" : "adult";

    // Determine mood priority
    let displayMood = mood;
    if (petData.is_dirty || petData.isDirty || petData.is_dirty === true) {
        displayMood = "dirty";
    } else if (petData.sleeping || petData.is_sleeping) {
        displayMood = "sleeping";
    } else if (petData.hunger <= 10) {
        displayMood = "hungry";
    } else if (petData.energy <= 15) {
        displayMood = "tired";
    } else if (petData.happiness <= 20) {
        displayMood = "sad";
    }

    // Determine pet type
    const baseType = (localStorage.getItem("pet_type") || petData.pet_type || "cat").toLowerCase();

    const imageFile = `static/images/${stage}_${baseType}_${displayMood}.png`;
    petImg.src = imageFile;

    // Fallback to adult if baby image missing
    petImg.onerror = () => {
        petImg.src = `static/images/${baseType}_${displayMood}.png`;
    };
}

// Unified rename function with 1-day cooldown
async function renamePet() {
    const newName = (document.getElementById("renameInput")?.value || "").trim();
    const pet_id = localStorage.getItem("pet_id");
    if (!pet_id) return showToast("❌ No pet selected.");
    if (!newName) return showToast("❌ Name cannot be empty.");

    const cooldownKey = `pet_rename_cooldown_${pet_id}`;
    const lastRename = parseInt(localStorage.getItem(cooldownKey) || "0", 10);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (lastRename && now - lastRename < oneDayMs) {
        const remaining = Math.ceil((oneDayMs - (now - lastRename)) / (1000 * 60 * 60));
        return showToast(`❌ You can rename again in ${remaining} hour(s).`);
    }

    if (!confirm("⚠️ After renaming, you cannot change the name again for 1 day. Proceed?")) return;

    try {
        const res = await fetch(`${backendUrl}/rename_pet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pet_id, new_name: newName })
        });
        const data = await res.json();
        if (res.ok && (data.success || data.updated)) {
            document.getElementById("petName").textContent = newName;
            if (petData) petData.pet_name = newName;
            localStorage.setItem("pet_name", newName);
            localStorage.setItem(cooldownKey, now.toString());
            showToast("✅ Name updated successfully!");
        } else {
            showToast(`❌ ${data.error || "Server rename failed."}`);
        }
    } catch (err) {
        console.error("Rename error:", err);
        showToast("⚠️ Network error — try again later.");
    }
}

// Bind rename button
document.getElementById("renameBtn")?.addEventListener("click", renamePet);

// ===============================
// 🐾 UTILITY HELPERS
// ===============================
function showToast(msg) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function capitalize(str = "") {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

// ===============================
// 🐾 INITIALIZATION
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    // Load main pet data
    loadMain();

    // Ensure UI shows pet image correctly
    setPetImage("happy");
});

