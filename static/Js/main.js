

// ===============================
// 🐾 PETSY MAIN.JS — All features combined & cleaned
// - Shop (buy, inventory)
// - Treats / feed system
// - Community popups
// - Sleep / wake persistence + emoji animation
// - Clean, Options modal (rename, mute)
// - Pet image / mood logic (baby/adult)
// - Background by time of day


// - Hunger, dirty/clean logic, play counter (dirty after 3 plays/pets)
// - Small sparkle animation on cleaning
// - FIXES: play button local-only lock, wakePet(), hourly energy restore while sleeping
// ===============================

const backendUrl = "https://petsy-dow7.onrender.com";


let pet = null;
let ageInterval = null;
let communityIntervalId = null;
let lastPopupIds = new Set();
let sleepEmojiInterval = null;
let petMoodInterval = null;
let energyRestoreInterval = null; // restores energy each hour while sleeping
let playFrameInterval = null; // interval for play animation frames



const sClick = new Audio("static/sounds/click.mp3");
const sEat = new Audio("static/sounds/eat.mp3");
const sPlay = new Audio("static/sounds/play.mp3");
const sClean = new Audio("static/sounds/clean.mp3");
const sSleep = new Audio("static/sounds/sleep.mp3");
// Safe selector helper
const $ = (sel, root = document) => (root || document).querySelector(sel);

// -----------------------
// DOM Ready — initialize once
// -----------------------
document.addEventListener('DOMContentLoaded', () => {
  // Element refs (some may be optional depending on page)
  const petImage = document.getElementById('petImage');
  const playBtn = $('#playBtn');
  const restBtn = $('#restBtn');   // sleep/wake button
  const miniGamesBtn = $('#miniGamesBtn');
  const logoutBtn = $('#logoutBtn');
  
  const communityBtn = $('#communityBtn');
  const shopModal = $('#shopModal');
  const shopResult = $('#shopResult');
  const shopOverlay = document.createElement('div');
  shopOverlay.className = 'modal-overlay hidden';
  document.body.appendChild(shopOverlay);
  
  const treatOptions = document.getElementById("treatOptions");
  const eatButton = $('#eatButton');
  const eatMenuContainer = document.querySelector('.eat-menu');
  const shopButtons = Array.from(document.querySelectorAll('.shop-btn'));
  document.getElementById("closeFeedMenu")?.addEventListener("click", () => {
  document.getElementById("treatOptions")?.classList.add("hidden");
  });

  // cleaning & options
  const cleanBtn = $('#cleanBtn');
  const optionsBtn = $('#optionsBtn');
  const optionsModal = $('#optionsModal');
  const closeOptionsBtn = $('#closeOptionsBtn');
  const renameInput = $('#renameInput');
  const saveNameBtn = $('#saveNameBtn');
  const renameResult = $('#renameResult');
  const muteToggle = $('#muteToggle');
  const muteStatus = $('#muteStatus');


  const item = [
  { name: "Apple", emoji: "🍎", size: "small", price: 5 },
  { name: "Carrot", emoji: "🥕", size: "small", price: 4 },
  { name: "Cookie", emoji: "🍪", size: "small", price: 6 },
  { name: "Cheese", emoji: "🧀", size: "small", price: 5 },
  { name: "Banana", emoji: "🍌", size: "small", price: 5 },

  { name: "Burger", emoji: "🍔", size: "medium", price: 15 },
  { name: "Pizza", emoji: "🍕", size: "medium", price: 18 },
  { name: "Sushi", emoji: "🍣", size: "medium", price: 20 },
  { name: "Sandwich", emoji: "🥪", size: "medium", price: 16 },
  { name: "Pasta", emoji: "🍝", size: "medium", price: 17 },

  { name: "Cake", emoji: "🍰", size: "large", price: 30 },
  { name: "Steak", emoji: "🥩", size: "large", price: 35 },
  { name: "Pineapple", emoji: "🍍", size: "large", price: 25 },
  { name: "Watermelon", emoji: "🍉", size: "large", price: 28 },
  { name: "Turkey", emoji: "🦃", size: "large", price: 40 }
];

  const ITEM_LOOKUP = {};
item.forEach(item => {
  ITEM_LOOKUP[item.name] = item;
});

  // Background music element
const bgMusic = document.getElementById('bgMusic');
if (bgMusic) {
  bgMusic.volume = 0.5; // Set to 50% volume for subtlety
  const muted = localStorage.getItem('muted') === 'true';
  bgMusic.muted = muted;
  if (!muted) {
    bgMusic.play().catch(err => console.log('Background music autoplay blocked:', err));
  }
}
// Pet image interaction: cursor change on hover, sound on click
if (petImage) {
  petImage.addEventListener('mouseenter', () => {
    petImage.style.cursor = 'pointer'; // Change to pointer (hand) on hover
  });
  petImage.addEventListener('mouseleave', () => {
    petImage.style.cursor = 'default'; // Revert to default on leave
  });
  petImage.addEventListener('click', playPetSound); // Play sound on click
}

  
  // UI tweaks: ensure restBtn text fits circle and is centered if present
  if (restBtn) {
    restBtn.style.fontSize = '12px';
    restBtn.style.padding = '0.4rem';
    restBtn.style.display = 'flex';
    restBtn.style.alignItems = 'center';
    restBtn.style.justifyContent = 'center';
    restBtn.style.textAlign = 'center';
    restBtn.style.whiteSpace = 'nowrap';
  }

  // Buttons wiring
  playBtn?.addEventListener('click', () => doPatAction()); // play/pat action

  miniGamesBtn?.addEventListener('click', () => {
    window.location.href = 'minigames.html';
  });

  logoutBtn?.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'index.html';
  });
  
  const shopBtn = document.getElementById("shopBtn");
  shopBtn.addEventListener("click", () => {
  window.location.href = "shop.html"; // go to the shop page
});

  communityBtn?.addEventListener('click', () => {
    window.location.href = 'community.html';
  });

  eatButton.addEventListener("click", () => {
  loadTreatInventory();
  });

 
  // Clean button
  cleanBtn?.addEventListener('click', async () => {
    const petId = localStorage.getItem('petId');
    if (!petId) {
      alert('No pet selected.');
      return;
    }
    try {
      const res = await fetch(`${backendUrl}/clean_pet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId })
      });
      const data = await res.json();
      if (res.ok && (data.success || data.cleaned)) {
        // reset local play counter and dirty flag
        resetPlayCounter(petId);
        if (pet) { pet.is_dirty = false; pet.isDirty = false; }
        await updateStats();
        sparklesOnClean();
        sClean.play();
        showToast('✨ Your pet has been cleaned!');
      } else {
        alert((data && data.error) ? (`❌ ${data.error}`) : '❌ Cleaning failed or not supported on server.');
      }
    } catch (err) {
      console.error('Clean error:', err);
      alert('Network error while cleaning the pet.');
    }
  });

  // Options modal
  optionsBtn?.addEventListener('click', () => {
    optionsModal?.classList.remove('hidden');
    shopOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    const muted = localStorage.getItem('muted') === 'true';
    updateMuteUI(muted);
  });

  closeOptionsBtn?.addEventListener('click', closeOptions);
  optionsModal?.querySelector('.modal-content')?.addEventListener('click', e => e.stopPropagation());

  function closeOptions() {
    optionsModal?.classList.add('hidden');
    shopOverlay?.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // Rename pet (options modal)
  // -----------------------
// Rename pet with 1-day cooldown
// -----------------------
saveNameBtn?.addEventListener('click', async () => {
  const newName = (renameInput?.value || '').trim();
  const petId = localStorage.getItem('petId');
  if (!petId) {
    renameResult.textContent = '❌ No pet selected.';
    renameResult.classList.remove('hidden');
    return;
  }
  if (!newName) {
    renameResult.textContent = '❌ Name cannot be empty.';
    renameResult.classList.remove('hidden');
    return;
  }

  const cooldownKey = `pet_rename_cooldown_${petId}`;
  const lastRename = parseInt(localStorage.getItem(cooldownKey) || '0', 10);
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Check cooldown
  if (lastRename && now - lastRename < oneDayMs) {
    const remaining = Math.ceil((oneDayMs - (now - lastRename)) / (1000 * 60 * 60));
    renameResult.textContent = `❌ You can rename again in ${remaining} hour(s).`;
    renameResult.classList.remove('hidden');
    return;
  }

  // Confirm user knows about cooldown
  if (!confirm('⚠️ After renaming, you cannot change the name again for 1 day. Proceed?')) return;

  try {
    const res = await fetch(`${backendUrl}/rename_pet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ petId, new_name: newName })
    });
    const data = await res.json();

    if (res.ok && data && (data.success || data.updated)) {
      // ✅ update UI immediately
      $('#petName') && ($('#petName').textContent = newName);
      if (pet) pet.pet_name = newName;
      localStorage.setItem('pet_name', newName);

      // store cooldown timestamp
      localStorage.setItem(cooldownKey, now.toString());

      renameResult.textContent = '✅ Name updated successfully!';
      renameResult.classList.remove('hidden');
    } else {
      renameResult.textContent = data.error || '⚠️ Server rename failed.';
      renameResult.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Rename error:', err);
    renameResult.textContent = '⚠️ Network error — try again later.';
    renameResult.classList.remove('hidden');
  }
});


  // Mute toggle
  muteToggle?.addEventListener('click', () => {
    const muted = localStorage.getItem('muted') === 'true';
  localStorage.setItem('muted', (!muted).toString());
  updateMuteUI(!muted);
  if (bgMusic) bgMusic.muted = !muted; // Mute/unmute background music
  });
  function updateMuteUI(muted) {
    if (muteStatus) muteStatus.textContent = muted ? 'On' : 'Off';
    if (muteToggle) muteToggle.textContent = muted ? 'Unmute' : 'Mute';
  }

  // Show pet_name on header when available
  const petNameDisplay = $('#petNameDisplay');
  if (petNameDisplay && localStorage.getItem('pet_name')) {
    petNameDisplay.textContent = localStorage.getItem('pet_name');
  }

  // start community popups if not running
  if (!communityIntervalId) startCommunityPopups();

  // Load main data
  loadMain();

  // Register sleep/wake rest button behavior and initialize sleep state
  const storedSleeping = !!localStorage.getItem('pet_sleep_start');
  if (restBtn) {
    // initialize button text
    restBtn.textContent = storedSleeping ? '🌞 Wake Up' : '💤 Sleep';

    restBtn.addEventListener('click', async () => {
      const sleeping = !!localStorage.getItem('pet_sleep_start');
      const petId = localStorage.getItem('petId');
      if (!petId) { showToast('No pet selected.'); return; }

      if (!sleeping) {
        // put pet to sleep
        await handleSleep();
        startSleepTimer();
        // immediately restore one hour worth of energy (makes UX feel responsive)
        await restoreEnergyOnce();
        restBtn.textContent = '🌞 Wake Up';
        showToast('💤 Your pet is now sleeping...');
      } else {
        // wake pet
        await wakePet(); // uses central wake path
        restBtn.textContent = '💤 Sleep';
      }
    });
  }

  // If pet was already sleeping on load, set UI accordingly
  if (storedSleeping) {
    disableAllActions(true);
    startSleepEmoji();
    startEnergyRestore();
    if (restBtn) restBtn.textContent = '🌞 Wake Up';
  }

  // Periodically check auto-wake
  setInterval(checkAutoWake, 60000);
}); // end DOMContentLoaded

// Safe image setter
function safeSetPetImage(imgEl, src) {
  const temp = new Image();
  temp.onload = () => { imgEl.src = src; };
  temp.onerror = () => { console.warn('Image not found:', src); };
  temp.src = src;
}


// -----------------------
// Core functions: loadMain, updateStats, etc.
// -----------------------

async function loadMain() {
  console.log('📦 loadMain() starting...');
  const user_id = localStorage.getItem('user_id');
  const petId = localStorage.getItem('petId');

  if (!user_id) {
    console.log('❌ No user_id found, redirecting to login...');
    window.location.href = 'index.html';
    return;
  }

  const idToLoad = petId ? petId : user_id;
  const endpoint = petId ? 'get_pet_by_id' : 'get_pet';

  try {
    const res = await fetch(`${backendUrl}/${endpoint}/${idToLoad}`);
    const data = await res.json();

    if (!res.ok || data.error) {
      console.error('Error loading pet:', data.error);
      return;
    }

    pet = data;
    // normalize some common fields
    pet.isDirty = pet.isDirty || pet.is_dirty || false;
    pet.is_dirty = pet.is_dirty || pet.isDirty || false;
    pet.sleeping = pet.sleeping || pet.is_sleeping || false;
    pet.ageDays = computeAgeDays(pet.created_at || localStorage.getItem('pet_birthdate'));

    // ensure energy/hunger/happiness default numbers if missing
    pet.energy = (typeof pet.energy === 'number') ? pet.energy : (pet.energy ?? 100);
    pet.hunger = (typeof pet.hunger === 'number') ? pet.hunger : (pet.hunger ?? 50);
    pet.happiness = (typeof pet.happiness === 'number') ? pet.happiness : (pet.happiness ?? 50);

    localStorage.setItem('petId', data.id);
    if (data.pet_name) localStorage.setItem('pet_name', data.pet_name);
    if (data.pet_type) localStorage.setItem('pet_type', data.pet_type.toLowerCase());
    if (data.created_at) localStorage.setItem('pet_birthdate', data.created_at.split(' ')[0]);

    // Display Info
    $('#petId') && ($('#petId').textContent = `#${data.id}`);
    $('#petName') && ($('#petName').textContent = data.pet_name || 'Pet');
    $('#petType') && ($('#petType').textContent = data.pet_type || 'Unknown');
    $('#petCoins') && ($('#petCoins').textContent = data.coins ?? 0);

    // apply dirty flag from local storage if present (keeps client-side persistent)
    const localDirtyKey = `pet_dirty_${data.id}`;
    if (localStorage.getItem(localDirtyKey) === 'true') {
      pet.is_dirty = true;
      pet.isDirty = true;
    }

    // Pet image logic based on age/type - initial set
    setPetImage(pet.sleeping ? 'sleeping' : 'happy');

    updateBackground();
    displayAge();
    updateStats();

    // load treats from server and show
    await loadTreatInventory();
  

    // Auto refresh stats and age
    if (ageInterval) clearInterval(ageInterval);
    ageInterval = setInterval(displayAge, 60000);
    if (petMoodInterval) clearInterval(petMoodInterval);
    petMoodInterval = setInterval(() => startPetMoodMonitor(), 5000);
    setInterval(updateStats, 30000);

  } catch (err) {
    console.error('Failed to load main:', err);
  }

  if (bgMusic.paused) {
    bgMusic.play().catch(() => {
        console.log("🔇 Waiting for user interaction to start audio.");
    });
}
}

// Fetch latest pet stats from backend
async function refreshPetStats() {
  if (!pet?.id) return;

  try {
    const res = await fetch(`${backendUrl}/get_pet_by_id/${pet.id}`);
    const data = await res.json();
    if (!res.ok || data.error) return;

    // Validate before updating
    if (typeof data.hunger === 'number') pet.hunger = data.hunger;
    if (typeof data.energy === 'number') pet.energy = data.energy;
    if (typeof data.happiness === 'number') pet.happiness = data.happiness;

    startPetMoodMonitor(); // always update mood after refresh
  } catch (e) {
    console.error('Failed to refresh pet stats:', e);
  }
}

// Update pet image based on current stats
function startPetMoodMonitor() {
  if (!pet) return;

  let mood = 'happy';
  if (pet.sleeping) mood = 'sleeping';
  else if (pet.hunger <= 30) mood = 'hungry';
  else if (pet.energy <= 20) mood = 'tired';
  else if (pet.happiness <= 30) mood = 'sad';

  setPetImage(mood);
}

// Update <img> element
function setPetImage(mood) {
  const img = document.getElementById('petImage');
  if (!img || !pet.pet_type) return;

  img.src = `static/images/${pet.pet_type}_${mood}.png`;
}


function computeAgeDays(createdAtString) {
  if (!createdAtString) return 0;
  const createdAt = new Date(createdAtString);
  const now = new Date();
  return Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
}

function displayAge() {
  if (!pet || !localStorage.getItem('pet_birthdate')) return;
  const createdAt = new Date(localStorage.getItem('pet_birthdate'));
  const now = new Date();
  const diffDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
  const el = $('#petAge');
  if (el) el.textContent = `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
}

async function updateStats() {
  const petId = localStorage.getItem('petId');
  if (!petId) return;

  try {
    const res = await fetch(`${backendUrl}/get_pet_by_id/${petId}`);
    const data = await res.json();
    if (!res.ok || data.error) return;

    pet = Object.assign({}, pet || {}, data);
    pet.isDirty = pet.isDirty || pet.is_dirty || false;
    pet.is_dirty = pet.is_dirty || pet.isDirty || false;
    pet.sleeping = pet.sleeping || pet.is_sleeping || false;

    const hunger = $('#hungerBar');
    const energy = $('#energyBar');
    const happiness = $('#happinessBar');
    const thirst = $('#thirstBar'); // <-- added

    function setBarColor(bar, value) {
      if (!bar) return;
      if (value > 70) bar.style.setProperty("--progress-color", "#4caf50");
      else if (value > 35) bar.style.setProperty("--progress-color", "#ffb300");
      else bar.style.setProperty("--progress-color", "#ff3d00");
    }

    // set values
    if (hunger) hunger.value = data.hunger ?? hunger.value;
    if (energy) energy.value = data.energy ?? energy.value;
    if (happiness) happiness.value = data.happiness ?? happiness.value;

    if (thirst) thirst.value = data.thirst ?? thirst.value; // <-- added

    // set colors
    setBarColor(hunger, data.hunger);
    setBarColor(energy, data.energy);
    setBarColor(happiness, data.happiness);
    setBarColor(thirst, data.thirst); // <-- added

    $('#petCoins') && ($('#petCoins').textContent = data.coins ?? 0);
    displayAge();

    if (typeof data.small_treats !== 'undefined') {
      treatInventory.small = data.small_treats ?? 0;
      treatInventory.medium = data.medium_treats ?? 0;
      treatInventory.large = data.large_treats ?? 0;

    }

    setPetImage(pet.sleeping ? 'sleeping' : 'happy');

  } catch (err) {
    console.error('Failed to update stats:', err);
  }
}


function updateBackground() {
  const hour = new Date().getHours();
  const bg = document.querySelector('.background');
  if (!bg) return;
  bg.classList.add('fade-transition');
  if (hour >= 6 && hour < 12) {
    bg.style.backgroundImage = "url('static/images/background/morning.png')";
  } else if (hour >= 12 && hour < 18) {
    bg.style.backgroundImage = "url('static/images/background/afternoon.png')";
  } else {
    bg.style.backgroundImage = "url('static/images/background/night.png')";
  }
  setTimeout(() => bg.classList.remove('fade-transition'), 1500);
}

// -----------------------
// Actions: sleep / play / feed
// -----------------------

// generic endpoint action with small floating emoji feedback
async function doAction(endpoint) {
  const petId = localStorage.getItem('petId');
  if (!petId) return;

  const emoji = document.createElement('div');
  emoji.className = 'floating-emoji';
  emoji.textContent = '✨';
  document.body.appendChild(emoji);

  Object.assign(emoji.style, {
    position: 'fixed', fontSize: '3rem', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
    opacity: '0', transition: 'opacity 0.25s ease'
  });
  setTimeout(() => (emoji.style.opacity = '1'), 50);

  try {
    const res = await fetch(`${backendUrl}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ petId }),
    });
    const data = await res.json();
    if (data.success) await updateStats();
  } catch (err) {
    console.error('Action error:', err);
  }

  setTimeout(() => {
    emoji.remove();
  }, 1200);
}

// Play / pat action — cooldown 60s, but only play button disabled (others still clickable).
// -----------------------
// Play / pat action — cooldown 60s with visual countdown
// -----------------------
// ===============================
// 🐾 doPatAction — Play with pet (fixed dirty/baby logic)
// ===============================
async function doPatAction() {
  const petId = localStorage.getItem('petId');
  if (!petId) return;

  const playBtn = document.getElementById('playBtn');
  if (!playBtn) return;

  // If pet sleeping, ignore
  if (pet && (pet.sleeping || pet.is_sleeping)) {
    showToast('😴 Your pet is sleeping.');
    return;
  }

  playBtn.disabled = true;
  playBtn.classList.add('disabled');

// Cooldown display
let cooldown = 60;
playBtn.disabled = true;
playBtn.classList.add('disabled');
const cooldownInterval = setInterval(() => {
  cooldown--;
  playBtn.textContent = getCooldownEmoji() + ` ${cooldown}s`;
  if (cooldown <= 0) {
    clearInterval(cooldownInterval);
    playBtn.disabled = false;
    playBtn.classList.remove('disabled');
    playBtn.textContent = '▶️ Play';
  }
}, 1000);

  // Floating emoji
  const emoji = document.createElement('div');
  emoji.className = 'floating-emoji';
  emoji.textContent = getCooldownEmoji();
  document.body.appendChild(emoji);
  Object.assign(emoji.style, {
    position: 'fixed',
    fontSize: '3.5rem',
    top: '38%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    opacity: '0',
    transition: 'opacity 0.15s ease'
  });
  setTimeout(() => (emoji.style.opacity = '1'), 30);

  // Animation frames
  const petImg = document.getElementById('petImage');
  const baseType = (localStorage.getItem('pet_type') || pet?.pet_type || 'cat').toLowerCase();

  // Determine baby or adult
  const ageDays =
    typeof pet?.ageDays === 'number'
      ? pet.ageDays
      : pet?.created_at
      ? Math.floor((Date.now() - new Date(pet.created_at)) / (1000 * 60 * 60 * 24))
      : 999;

  const stage = ageDays < 10 ? 'baby' : 'adult';

  const candidateFrames = [
    `static/images/${stage}_${baseType}_when_play1.png`,
    `static/images/${baseType}_when_play1.png`
  ];
  const candidateFrames2 = [
    `static/images/${stage}_${baseType}_when_play2.png`,
    `static/images/${baseType}_when_play2.png`
  ];

  // Helper to find valid image
  function firstExisting(srcList, cb) {
    let idx = 0;
    const tryNext = () => {
      if (idx >= srcList.length) return cb(null);
      const img = new Image();
      img.onload = () => cb(srcList[idx]);
      img.onerror = () => {
        idx++;
        tryNext();
      };
      img.src = srcList[idx];
    };
    tryNext();
  }

  // Animate
  firstExisting(candidateFrames, (f1) => {
    if (!f1) return;
    firstExisting(candidateFrames2, (f2) => {
      if (!f2) f2 = f1;
      if (!petImg) return;

      let toggle = false;
      let cycles = 0;
      const maxCycles = 6;

      const interval = setInterval(() => {
        toggle = !toggle;
        petImg.src = toggle ? f1 : f2;
        cycles++;
        if (cycles >= maxCycles) {
          clearInterval(interval);
          setPetImage(); // restore correct image
        }
      }, 600);
    });
  });

  // Local happiness increase
  pet.happiness = Math.min(100, (Number(pet.happiness) || 0) + 5);
  const happinessEl = $('#happinessBar');
  if (happinessEl) happinessEl.value = pet.happiness;

  // Mark dirty after 3 plays
  incrementPlayCounter(petId);

  // Backend sync after animation
  setTimeout(async () => {
    try {
      const res = await fetch(`${backendUrl}/play_pet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId })
      });

      await updateStats();
    } catch (err) {
      console.error('Play error:', err);
    }
  }, 4000);

  setTimeout(() => emoji.remove(), 1500);
}



// Helper to pick emoji for cooldown display
function getCooldownEmoji() {
  const type = (localStorage.getItem('pet_type') || 'cat').toLowerCase();
  if (type === 'dog') return '⚽'; // small ball
  return '🧶'; // yarn for cat
}


function getPlayKey(petId) { return `play_count_${petId}`; }
function incrementPlayCounter(petId) {
  const key = getPlayKey(petId);
  let count = parseInt(localStorage.getItem(key) || '0', 10);
  count += 1;
  localStorage.setItem(key, String(count));
  // if reaches 3, mark dirty and reset counter
  if (count >= 3) {
    markPetDirtyLocal(petId);
    showToast('💩 Your pet got dirty after playing a lot—time to clean!');
    localStorage.setItem(key, '0');
  }
}
function resetPlayCounter(petId) { const key = getPlayKey(petId); localStorage.setItem(key, '0'); }

// try to persist dirty state on server if endpoint exists; otherwise keep client-side
async function markPetDirtyLocal(petId) {
  if (!petId) return;

  // optimistic local update
  if (!pet) pet = {};
  pet.is_dirty = true;
  pet.isDirty = true;
  localStorage.setItem(`pet_dirty_${petId}`, 'true');

  // ✅ Fix: set dirty image
  setPetImage('dirty');

  // try notifying server (optional)
  try {
    await fetch(`${backendUrl}/mark_dirty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ petId })
    });
    setTimeout(updateStats, 800);
  } catch (err) {
    console.debug('mark_dirty not available or failed:', err);
  }
}

// -----------------------
// Feed / Treats
// -----------------------

async function loadTreatInventory() {
  const petId = localStorage.getItem("petId");
  const token = localStorage.getItem("userToken");
  if (!petId || !token) return;

  const res = await fetch(`${backendUrl}/get_pet_inventory/${petId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();

  
  treatOptions.innerHTML = "";

  if (!data.success || data.inventory.length === 0) {
    treatOptions.innerHTML = "<p>No food available</p>";
    treatOptions.classList.remove("hidden");
    return;
  }

data.inventory.forEach(item => {
  const baseItem = ITEM_LOOKUP[item.name];

  // fallback safety
  const hungerGain = baseItem?.price || 0;
  const size = baseItem?.size || item.size;
  const emoji = baseItem?.emoji || "🍽️";

  const div = document.createElement("div");
  div.className = "treat-item";

  div.innerHTML = `
    <div class="treat-info">
      <strong>${emoji} ${item.name}</strong><br>
      <span class="treat-size">Category: ${capitalize(size)}</span><br>
      <span class="treat-effects">+${hungerGain} Hunger</span><br>
      <span class="treat-qty">Owned: ${item.quantity}</span>
    </div>
    <button onclick="feedPet('${item.name}', '${size}')">
      Feed
    </button>
  `;

  treatOptions.appendChild(div);
});

}

function feedPet(name, size) {
  const petId = localStorage.getItem("petId");
  const token = localStorage.getItem("userToken");

  fetch(`${backendUrl}/feed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      petId: petId,
      treatName: name,
      treatSize: size
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      alert("Failed to feed: " + data.error);
    } else {
      alert(`${name} fed to your pet!`);
      // Update inventory in the UI
      treatOptions.innerHTML = "";
      data.inventory.forEach(item => {
        const div = document.createElement("div");
        div.classList.add("treat-item");
        div.innerHTML = `
          <span>${item.emoji} ${item.name} x ${item.quantity}</span>
          <button onclick="feedPet('${item.name}', '${item.size}')">Feed</button>
        `;
        treatOptions.appendChild(div);
      });
      document.getElementById("treatOptions")?.classList.add("hidden");
      // Optionally, update pet stats progress bars
      if (data.petStats) {
        document.getElementById("hungerBar").value = data.petStats.hunger;
        document.getElementById("happinessBar").value = data.petStats.happiness;
        document.getElementById("energyBar").value = data.petStats.energy;
        document.getElementById("thirstBar").value = data.petStats.thirst;
      }
    }
  })
  .catch(err => console.error(err));
}

function capitalize(s = '') { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

// -----------------------
// Community popups
// -----------------------

async function fetchRecentPosts() {
  try {
    const res = await fetch(`${backendUrl}/get_recent_posts`);
    if (!res.ok) return [];
    const posts = await res.json();
    return Array.isArray(posts) ? posts : [];
  } catch (err) { console.error('Error fetching posts:', err); return []; }
}

function showPostPopup(post) {
  if (!post || !post.id) return;
  if (lastPopupIds.has(post.id)) return;
  lastPopupIds.add(post.id);
  const popup = document.createElement('div');
  popup.className = 'post-popup';
  popup.innerHTML = `<strong>💬 ${post.username || 'Someone'}</strong><br>${post.content || ''}`;
  document.body.appendChild(popup);
  setTimeout(() => popup.classList.add('show'), 50);
  setTimeout(() => { popup.classList.remove('show'); popup.remove(); }, 7000);
}

function startCommunityPopups() {
  if (communityIntervalId) return;
  (async () => {
    const posts = await fetchRecentPosts();
    posts.forEach(p => showPostPopup(p));
  })();
  communityIntervalId = setInterval(async () => {
    const posts = await fetchRecentPosts();
    posts.forEach(p => showPostPopup(p));
  }, 10000);
}

// -----------------------
// Sleep / wake persistent behavior
// -----------------------

async function handleSleep() {
  const petId = localStorage.getItem('petId');
  if (!petId) return;
  try {
    const res = await fetch(`${backendUrl}/sleep_pet`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ petId })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Sleeping...');
      if (data.sleeping) {
        disableAllActions(true);
        if (pet) { pet.sleeping = true; pet.is_sleeping = true; }
        setPetImage('sleeping');
      } else if (data.awake) {
        disableAllActions(false);
        if (pet) { pet.sleeping = false; pet.is_sleeping = false; }
        setPetImage('happy');
      }
    }
  } catch (err) { console.error('Sleep error:', err); showToast('⚠️ Could not update sleep status.'); }
}

function startSleepTimer() {
  localStorage.setItem('pet_sleep_start', Date.now().toString());
  // disable only actions we want to restrict (play, eat, clean)
  disableAllActions(true);
  startSleepEmoji();
  startEnergyRestore();
  sSleep.play();
  // mark local state too
  if (pet) { pet.sleeping = true; pet.is_sleeping = true; }
  setPetImage('sleeping');
}

async function wakePet() {
  
  // Unified wake logic — used by rest button and auto-wake
  const petId = localStorage.getItem('petId');
  if (!petId) return;
  // attempt server wake endpoint; fallback to client-side
  try {
    const res = await fetch(`${backendUrl}/wake_pet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ petId })
    });
    const data = await res.json();
    // if server confirms, use server state; otherwise fall through
    if (res.ok && data && (data.success || data.awake)) {
      localStorage.removeItem('pet_sleep_start');
      stopEnergyRestore();
      stopSleepEmoji();
      disableAllActions(false);
      if (pet) { pet.sleeping = false; pet.is_sleeping = false; }
      setPetImage('happy');
      await updateStats();
      showToast('☀️ Your pet woke up!');
      return;
    }
  } catch (err) {
    console.debug('wake_pet endpoint missing or failed:', err);
    // continue to client fallback
  }

  // client-side fallback wake behavior
  localStorage.removeItem('pet_sleep_start');
  stopEnergyRestore();
  stopSleepEmoji();
  disableAllActions(false);
  if (pet) { pet.sleeping = false; pet.is_sleeping = false; }
  setPetImage('happy');
  await updateStats();
  showToast('☀️ Your pet woke up!');
}

function checkAutoWake() {
  const sleepStart = parseInt(localStorage.getItem('pet_sleep_start') || '0', 10);
  if (!sleepStart) return;
  const now = Date.now();
  const eightHours = 8 * 60 * 60 * 1000;
  if (now - sleepStart >= eightHours) {
    // auto wake path uses unified function so intervals/flags cleared consistently
    wakePet();
    const restBtn = document.getElementById('restBtn');
    if (restBtn) restBtn.textContent = '💤 Sleep';
  }
}

function startSleepEmoji() {
  stopSleepEmoji();
  sleepEmojiInterval = setInterval(() => {
    const emoji = document.createElement('div');
    emoji.className = 'floating-emoji';
    emoji.textContent = '💤';
    document.body.appendChild(emoji);
    Object.assign(emoji.style, { position: 'fixed', fontSize: '4rem', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', opacity: '0', transition: 'opacity 1s ease' });
    setTimeout(() => (emoji.style.opacity = '1'), 50);
    setTimeout(() => emoji.remove(), 2000);
  }, 5000);
}

function stopSleepEmoji() { if (sleepEmojiInterval) { clearInterval(sleepEmojiInterval); sleepEmojiInterval = null; } }

async function checkSleepStatus() {
  const petId = localStorage.getItem('petId');
  if (!petId) return;
  try {
    const res = await fetch(`${backendUrl}/check_sleep_status/${petId}`);
    const data = await res.json();
    if (data.sleeping) {
      disableAllActions(true);
      if (pet) pet.sleeping = true;
      setPetImage('sleeping');
    }
    else {
      disableAllActions(false);
      if (pet) pet.sleeping = false;
      setPetImage('happy');
    }
  } catch (err) { console.error('Check sleep error:', err); }
}

function disableAllActions(disabled) {
  const limitedBtns = [document.getElementById('playBtn'), document.getElementById('cleanBtn'), document.getElementById('eatButton')].filter(Boolean);
  limitedBtns.forEach(btn => {
    btn.disabled = disabled;
    btn.style.opacity = disabled ? '0.5' : '1';
    btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
  });
}


// Keep a background check for server sleep status
setInterval(checkSleepStatus, 60000);

// -----------------------
// Pet image & mood handling
// -----------------------

const petImage = document.getElementById('petImage');

function getPetType() {
  // Return the pet type from the pet object, fallback to localStorage, default to 'cat'
  return (pet?.pet_type) || localStorage.getItem('pet_type') || 'cat';
}

function isBabyPetLocal() {
  // Use pet.ageDays if available; treat pet as baby if ageDays < 10
  return (pet?.ageDays ?? 0) < 10;
}

function setPetImage(forcedState = null) {
  const petImg = document.getElementById("petImage");
  if (!petImg || !pet) return;

  const baseType = (localStorage.getItem("pet_type") || pet.pet_type || "cat").toLowerCase();
  // Determine if baby or adult
  const ageDays = (typeof pet.ageDays === "number") ? pet.ageDays :
                  (pet.created_at ? computeAgeDays(pet.created_at) : 999);
  const isBaby = ageDays < 10;

  // Stats
  const hunger = Number(pet.hunger ?? 100);
  const energy = Number(pet.energy ?? 100);
  const happiness = Number(pet.happiness ?? 100);
  const sleeping = pet.sleeping || pet.is_sleeping || false;
  const is_dirty = pet.is_dirty || pet.isDirty || false;

  // Decide which state image to use
  let filenameState = "happy";
  if (sleeping) {
    filenameState = "sleeping";
  } else if (is_dirty) {
    filenameState = "dirty";
  } else if (baseType === "cat" && hunger <= 40) {
    filenameState = "hungry";
  } else if (baseType === "dog" && hunger <= 40) {
   filenameState = "hungry";
  } else if (energy <= 15) {
    filenameState = "tired";
  } else {
    filenameState = "happy";
  }

  // Build image paths
  const babyPath = `static/images/baby_${baseType}_${filenameState}.png`;
  const adultPath = `static/images/${baseType}_${filenameState}.png`;

  // Try loading baby first if baby; otherwise adult. Use safeSetPetImage for fallback.
  safeSetPetImage(petImg, isBaby ? babyPath : adultPath);
}




let idleTimeout;
function returnToHappy() { clearTimeout(idleTimeout); idleTimeout = setTimeout(() => setPetImage('happy'), 3000); }
function animatePetAction(action) { setPetImage(action); returnToHappy(); }

// connect action triggers if present (these are optional quick-trigger buttons)
const eatBtn = document.getElementById('eatBtn');
const playBtnQuick = document.getElementById('playBtn');
const sleepBtnQuick = document.getElementById('sleepBtn');
if (eatBtn) eatBtn.addEventListener('click', () => animatePetAction('eating'));
if (playBtnQuick) playBtnQuick.addEventListener('click', () => animatePetAction('playing'));
if (sleepBtnQuick) sleepBtnQuick.addEventListener('click', () => animatePetAction('sleeping'));
window.addEventListener('load', () => setPetImage('happy'));

function startPetMoodMonitor() {
  if (!pet) return;
  setPetImage(pet.sleeping ? 'sleeping' : 'happy');
}

// -----------------------
// ENERGY RESTORE WHILE SLEEPING
// -----------------------
// New behaviour: every hour while pet is sleeping we ensure energy is full (100).
// This uses a client-side interval; if the server provides `/restore_energy` or `/add_energy` endpoints
// this will attempt to call them; otherwise it will update locally and call updateStats().

async function restoreEnergyOnce() {
  const petId = localStorage.getItem('petId');
  if (!petId) return;

  // Try server endpoint first (optional). If it fails, do local update.
  try {
    const res = await fetch(`${backendUrl}/restore_energy/${petId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 100 })
    });
    if (res.ok) {
      await updateStats();
      return;
    }
  } catch (err) {
    // endpoint might not exist — we'll patch locally
    console.debug('restore_energy not available or failed:', err);
  }

  // Local fallback: set energy to 100 and push an updateStats call
  if (!pet) pet = {};
  pet.energy = 100;
  const energyEl = $('#energyBar');
  if (energyEl) energyEl.value = 100;
  await updateStats();
}

function startEnergyRestore() {
  stopEnergyRestore();
  // restore immediately (UX) and then schedule hourly
  restoreEnergyOnce();
  // set interval to every hour
  energyRestoreInterval = setInterval(() => {
    // if pet is no longer sleeping, stop interval
    if (!localStorage.getItem('pet_sleep_start')) { stopEnergyRestore(); return; }
    restoreEnergyOnce();
  }, 60 * 60 * 1000); // 1 hour
}

function stopEnergyRestore() { if (energyRestoreInterval) { clearInterval(energyRestoreInterval); energyRestoreInterval = null; } }

// -----------------------
// UI & Toast helpers
// -----------------------
async function drinkWater() {
  const petId = localStorage.getItem("petId"); // or however you store current pet
  const response = await fetch(`${backendUrl}/update_thirst`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ petId: petId, amount: 10 })
  });
  
  const data = await response.json();
  if (data.success) {
    console.log("💧 Thirst updated!");
    updateStats();
  }
}


function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.className = 'toast';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// sparkle animation when cleaning
function sparklesOnClean() {
  const s = document.createElement('div');
  s.className = 'sparkles';
  s.textContent = '✨';
  Object.assign(s.style, {
    position: 'absolute', fontSize: '2.5rem', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', opacity: '0', pointerEvents: 'none', transition: 'opacity 400ms ease'
  });
  document.body.appendChild(s);
  requestAnimationFrame(() => (s.style.opacity = '1'));
  setTimeout(() => (s.style.opacity = '0'), 700);
  setTimeout(() => s.remove(), 1200);
}


// Play pet sound on click (meow for cat, bark for dog)
function playPetSound() {
  const type = getPetType().toLowerCase();
  const soundFile = type === 'dog' ? 'static/sounds/bark.mp3' : 'static/sounds/meow.mp3';
  playSound(soundFile);
}

// Generic sound player (respects mute)
function playSound(src) {
  if (!src) return;
  const muted = localStorage.getItem('muted') === 'true';
  if (muted) return;
  const audio = new Audio(src);
  audio.volume = 0.5;
  audio.play().catch(err => console.log('Audio play blocked:', err));
}

// Now attach the click listener
if (petImage) {
  petImage.addEventListener('click', playPetSound);
}

// ===============================
// 🐾 doDrinkAction — pet drinks water
// ===============================
const sDrink = new Audio("static/sounds/drink.mp3"); // make sure drink.mp3 exists

async function doDrinkAction() {
  const petId = localStorage.getItem("petId");
  if (!petId) return;

  // If pet sleeping, ignore
  if (pet && (pet.sleeping || pet.is_sleeping)) {
    showToast("😴 Your pet is sleeping.");
    return;
  }

  // Play drinking sound
  sDrink.play();

  // Floating emoji
  const emoji = document.createElement('div');
  emoji.className = 'floating-emoji';
  emoji.textContent = '💧';
  document.body.appendChild(emoji);
  Object.assign(emoji.style, {
    position: 'fixed',
    fontSize: '3.5rem',
    top: '38%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    opacity: '0',
    transition: 'opacity 0.15s ease'
  });
  setTimeout(() => (emoji.style.opacity = '1'), 30);
  setTimeout(() => emoji.remove(), 1500);

  // Update thirst on server
  try {
    const res = await fetch(`${backendUrl}/update_thirst`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ petId: petId, amount: 100 }) // +10 thirst
    });
    const data = await res.json();
    if (data.success) {
      // locally update UI
      if (pet) pet.thirst = Math.min(100, (pet.thirst || 0) + 10);
      const thirstBar = document.getElementById("thirstBar");
      if (thirstBar) {
        thirstBar.value = pet.thirst;
        // optional: change color
        if (pet.thirst > 70) thirstBar.style.setProperty("--progress-color", "#4caf50");
        else if (pet.thirst > 35) thirstBar.style.setProperty("--progress-color", "#ffb300");
        else thirstBar.style.setProperty("--progress-color", "#ff3d00");
      }
      showToast("💧 Your pet drank water!");
    }
  } catch (err) {
    console.error("Drink action failed:", err);
    showToast("⚠️ Failed to drink water.");
  }
}

// ===============================
// 🐾 THIRST DRAIN SYSTEM
// ===============================

let thirstDrainInterval = null;

// start thirst drain — call once on page load
function startThirstDrain() {
  stopThirstDrain(); // ensure no duplicates

  // drain every 5 minutes (300000 ms)
  thirstDrainInterval = setInterval(() => {
    if (!pet) return;

    // don't drain if sleeping
    if (pet.sleeping || pet.is_sleeping) return;

    // reduce thirst
    pet.thirst = Math.max(0, (pet.thirst || 100) - 5); // -5 per interval

    // update thirst bar
    const thirstBar = document.getElementById("thirstBar");
    if (thirstBar) {
      thirstBar.value = pet.thirst;
      // bar color
      if (pet.thirst > 70) thirstBar.style.setProperty("--progress-color", "#4caf50");
      else if (pet.thirst > 35) thirstBar.style.setProperty("--progress-color", "#ffb300");
      else thirstBar.style.setProperty("--progress-color", "#ff3d00");
    }

    // low thirst warning
    if (pet.thirst <= 20) {
      showToast("⚠️ Your pet is thirsty! Give it water 💧");
    }

    // optionally sync with backend every hour
    if (Date.now() % (60*60*1000) < 300000) { // every hour
      fetch(`${backendUrl}/update_thirst`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId: localStorage.getItem("petId"), amount: 0 }) // sync current thirst
      }).catch(() => console.debug("Thirst sync failed"));
    }

  }, 5 * 60 * 1000); // 5 minutes
}

function stopThirstDrain() {
  if (thirstDrainInterval) {
    clearInterval(thirstDrainInterval);
    thirstDrainInterval = null;
  }
}

// call this on DOMContentLoaded or after loading pet
startThirstDrain();


// Hook button
document.getElementById('drinkBtn')?.addEventListener('click', doDrinkAction);
// -----------------------
// Misc dev helpers
// -----------------------

// ==============================
// 🐾 LOAD PET DATA (with baby/adult logic)
// ==============================
// ==============================
// 🐾 LOAD PET DATA (cleaned, unified with global pet)
// ==============================
async function loadpet() {
  // Just delegate to loadMain()
  await loadMain();
}



// -----------------------
// Run once sanity checks
// -----------------------
(function sanity() {
  // ensure there's a petId set for dev if not present
  if (!localStorage.getItem('petId')) {
    // don't overwrite user's data; only set for dev local testing
    // localStorage.setItem('petId', '1');
  }
})();

// End of main.js






