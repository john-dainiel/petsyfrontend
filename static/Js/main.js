// ===============================
// 🐾 PETSY MAIN.JS — Clean & Optimized
// Features: Play, Feed, Sleep, Shop, Community, Options, Mood/Images
// ===============================

const backendUrl = "https://petsy-dow7.onrender.com";
let petData = null;
let ageInterval = null;
let communityIntervalId = null;
let lastPopupIds = new Set();
let treatInventory = { small: 0, medium: 0, large: 0 };
let sleepEmojiInterval = null;
let petMoodInterval = null;
let energyRestoreInterval = null;
let playFrameInterval = null;

// -----------------------
// DOM helper
// -----------------------
const $ = (sel, root = document) => (root || document).querySelector(sel);

// -----------------------
// Pet Stage Helper
// -----------------------
function getPetStage(pet) {
    if (!pet || !pet.created_at) return 'adult';
    const birth = new Date(pet.created_at || localStorage.getItem('pet_birthdate'));
    const ageDays = Math.floor((new Date() - birth) / (1000*60*60*24));
    return ageDays < 10 ? 'baby' : 'adult';
}

// -----------------------
// DOM Ready
// -----------------------
document.addEventListener('DOMContentLoaded', () => {
    const playBtn = $('#playBtn');
    const restBtn = $('#restBtn');
    const miniGamesBtn = $('#miniGamesBtn');
    const logoutBtn = $('#logoutBtn');
    const shopBtn = $('#shopBtn');
    const communityBtn = $('#communityBtn');
    const shopModal = $('#shopModal');
    const shopResult = $('#shopResult');
    const closeShopBtn = $('#closeShopBtn');
    const shopOverlay = document.createElement('div');
    shopOverlay.className = 'modal-overlay hidden';
    document.body.appendChild(shopOverlay);

    const eatButton = $('#eatButton');
    const treatMenu = $('#treatOptions');
    const eatMenuContainer = $('.eat-menu');
    const shopButtons = Array.from(document.querySelectorAll('.shop-btn'));
    const treatOptionEls = Array.from(document.querySelectorAll('.treat-option'));

    const cleanBtn = $('#cleanBtn');
    const optionsBtn = $('#optionsBtn');
    const optionsModal = $('#optionsModal');
    const closeOptionsBtn = $('#closeOptionsBtn');
    const renameInput = $('#renameInput');
    const saveNameBtn = $('#saveNameBtn');
    const renameResult = $('#renameResult');
    const muteToggle = $('#muteToggle');
    const muteStatus = $('#muteStatus');

    // -----------------------
    // Buttons Wiring
    // -----------------------
    playBtn?.addEventListener('click', doPatAction);

    miniGamesBtn?.addEventListener('click', () => window.location.href = 'minigames.html');
    logoutBtn?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });

    shopBtn?.addEventListener('click', async () => {
        await loadTreatInventory();
        updateTreatMenu();
        shopModal?.classList.remove('hidden');
        shopOverlay.classList.remove('hidden');
        shopResult?.classList.add('hidden');
        shopResult && (shopResult.textContent = '');
        document.body.style.overflow = 'hidden';
    });

    closeShopBtn?.addEventListener('click', closeShop);
    shopOverlay?.addEventListener('click', closeShop);
    shopModal?.querySelector('.modal-content')?.addEventListener('click', e => e.stopPropagation());

    function closeShop() {
        shopModal?.classList.add('hidden');
        shopOverlay?.classList.add('hidden');
        document.body.style.overflow = '';
    }

    communityBtn?.addEventListener('click', () => window.location.href = 'community.html');

    // -----------------------
    // Shop Buy Handlers
    // -----------------------
    shopButtons.forEach(btn => btn.addEventListener('click', async () => {
        const treatType = btn.dataset.type;
        const pet_id = localStorage.getItem('pet_id');
        if (!pet_id) return showShopError('❌ No pet selected.');
        try {
            const res = await fetch(`${backendUrl}/buy_treat/${pet_id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ treat_type: treatType })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                await loadTreatInventory();
                updateTreatMenu();
                await updateStats();
                shopResult && showShopSuccess(`✅ You bought a ${treatType} treat!`);
            } else {
                showShopError(data.error || 'Purchase failed.');
            }
        } catch (err) {
            console.error('Shop error:', err);
            showShopError('❌ Network error.');
        }
    }));

    function showShopError(msg) {
        if (shopResult) {
            shopResult.textContent = msg;
            shopResult.classList.remove('hidden');
        }
    }
    function showShopSuccess(msg) {
        if (shopResult) {
            shopResult.textContent = msg;
            shopResult.classList.remove('hidden');
        }
    }

    // -----------------------
    // Treat Menu
    // -----------------------
    if (eatButton && treatMenu && eatMenuContainer) {
        eatButton.addEventListener('mouseenter', () => {
            updateTreatMenu();
            treatMenu.classList.remove('hidden');
        });
        eatMenuContainer.addEventListener('mouseleave', () => treatMenu.classList.add('hidden'));
        treatOptionEls.forEach(option => option.addEventListener('click', async () => {
            const treatType = option.dataset.type;
            await feedPet(treatType);
            treatMenu.classList.add('hidden');
        }));
    }

    // -----------------------
    // Clean Button
    // -----------------------
    cleanBtn?.addEventListener('click', async () => {
        const pet_id = localStorage.getItem('pet_id');
        if (!pet_id) return alert('No pet selected.');
        try {
            const res = await fetch(`${backendUrl}/clean_pet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pet_id })
            });
            const data = await res.json();
            if (res.ok && (data.success || data.cleaned)) {
                resetPlayCounter(pet_id);
                if (petData) petData.is_dirty = false;
                await updateStats();
                sparklesOnClean();
                showToast('✨ Your pet has been cleaned!');
            } else alert(data.error ? `❌ ${data.error}` : '❌ Cleaning failed.');
        } catch (err) {
            console.error('Clean error:', err);
            alert('Network error while cleaning.');
        }
    });

    // -----------------------
    // Options Modal
    // -----------------------
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

    // -----------------------
    // Rename Pet (Options Modal)
    // -----------------------
    saveNameBtn?.addEventListener('click', async () => {
        const newName = (renameInput?.value || '').trim();
        const pet_id = localStorage.getItem('pet_id');
        if (!pet_id) return showRenameError('❌ No pet selected.');
        if (!newName) return showRenameError('❌ Name cannot be empty.');

        const cooldownKey = `pet_rename_cooldown_${pet_id}`;
        const lastRename = parseInt(localStorage.getItem(cooldownKey) || '0', 10);
        const now = Date.now();
        const oneDayMs = 24*60*60*1000;
        if (lastRename && now - lastRename < oneDayMs) {
            const remaining = Math.ceil((oneDayMs - (now - lastRename))/(1000*60*60));
            return showRenameError(`❌ You can rename again in ${remaining} hour(s).`);
        }

        if (!confirm('⚠️ After renaming, you cannot change the name again for 1 day. Proceed?')) return;

        try {
            const res = await fetch(`${backendUrl}/rename_pet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pet_id, new_name: newName })
            });
            const data = await res.json();
            if (res.ok && (data.success || data.updated)) {
                $('#petName') && ($('#petName').textContent = newName);
                if (petData) petData.pet_name = newName;
                localStorage.setItem('pet_name', newName);
                localStorage.setItem(cooldownKey, now.toString());
                showRenameSuccess('✅ Name updated successfully!');
            } else showRenameError(data.error || '⚠️ Server rename failed.');
        } catch (err) {
            console.error('Rename error:', err);
            showRenameError('⚠️ Network error — try again later.');
        }
    });

    function showRenameError(msg) {
        if (renameResult) { renameResult.textContent = msg; renameResult.classList.remove('hidden'); }
    }
    function showRenameSuccess(msg) {
        if (renameResult) { renameResult.textContent = msg; renameResult.classList.remove('hidden'); }
    }

    // -----------------------
    // Mute Toggle
    // -----------------------
    muteToggle?.addEventListener('click', () => {
        const muted = localStorage.getItem('muted') === 'true';
        localStorage.setItem('muted', (!muted).toString());
        updateMuteUI(!muted);
    });
    function updateMuteUI(muted) {
        if (muteStatus) muteStatus.textContent = muted ? 'On' : 'Off';
        if (muteToggle) muteToggle.textContent = muted ? 'Unmute' : 'Mute';
    }

    // -----------------------
    // Display Pet Name
    // -----------------------
    const petNameDisplay = $('#petNameDisplay');
    if (petNameDisplay && localStorage.getItem('pet_name')) {
        petNameDisplay.textContent = localStorage.getItem('pet_name');
    }

    // -----------------------
    // Community Popups
    // -----------------------
    if (!communityIntervalId) startCommunityPopups();

    // -----------------------
    // Load Pet Data
    // -----------------------
    loadMain();

    // -----------------------
    // Sleep/Wake Button
    // -----------------------
    const storedSleeping = !!localStorage.getItem('pet_sleep_start');
    if (restBtn) {
        restBtn.textContent = storedSleeping ? '🌞 Wake Up' : '💤 Sleep';
        restBtn.addEventListener('click', async () => {
            const sleeping = !!localStorage.getItem('pet_sleep_start');
            const pet_id = localStorage.getItem('pet_id');
            if (!pet_id) return showToast('No pet selected.');
            if (!sleeping) {
                await handleSleep();
                startSleepTimer();
                await restoreEnergyOnce();
                restBtn.textContent = '🌞 Wake Up';
                showToast('💤 Your pet is now sleeping...');
            } else {
                await wakePet();
                restBtn.textContent = '💤 Sleep';
            }
        });
    }

    if (storedSleeping) {
        disableAllActions(true);
        startSleepEmoji();
        startEnergyRestore();
        if (restBtn) restBtn.textContent = '🌞 Wake Up';
    }

    setInterval(checkAutoWake, 60000);

});

// ===============================
// 🐾 CORE GAMEPLAY FUNCTIONS — Part 2
// ===============================

async function loadMain() {
    console.log('📦 loadMain() starting...');
    const user_id = localStorage.getItem('user_id');
    const pet_id = localStorage.getItem('pet_id');
    if (!user_id) {
        console.log('❌ No user_id found, redirecting to login...');
        window.location.href = 'login.html';
        return;
    }

    const idToLoad = pet_id || user_id;
    const endpoint = pet_id ? 'get_pet_by_id' : 'get_pet';

    try {
        const res = await fetch(`${backendUrl}/${endpoint}/${idToLoad}`);
        const data = await res.json();
        if (!res.ok || data.error) {
            console.error('Error loading pet:', data.error);
            return;
        }

        petData = data;
        normalizePetData();
        localStorage.setItem('pet_id', data.id);
        if (data.pet_name) localStorage.setItem('pet_name', data.pet_name);
        if (data.pet_type) localStorage.setItem('pet_type', data.pet_type.toLowerCase());
        if (data.created_at) localStorage.setItem('pet_birthdate', data.created_at.split(' ')[0]);

        displayPetInfo();
        setPetImage(petData.sleeping ? 'sleeping' : 'happy');
        updateBackground();
        displayAge();
        updateStats();
        await loadTreatInventory();
        updateTreatMenu();

        if (ageInterval) clearInterval(ageInterval);
        ageInterval = setInterval(displayAge, 60000);

        if (petMoodInterval) clearInterval(petMoodInterval);
        petMoodInterval = setInterval(() => startPetMoodMonitor(), 5000);

        setInterval(updateStats, 30000);
    } catch (err) {
        console.error('Failed to load main:', err);
    }
}

function normalizePetData() {
    if (!petData) return;
    petData.isDirty = petData.isDirty || petData.is_dirty || false;
    petData.is_dirty = petData.is_dirty || petData.isDirty || false;
    petData.sleeping = petData.sleeping || petData.is_sleeping || false;
    petData.ageDays = computeAgeDays(petData.created_at || localStorage.getItem('pet_birthdate'));
    petData.energy = typeof petData.energy === 'number' ? petData.energy : 100;
    petData.hunger = typeof petData.hunger === 'number' ? petData.hunger : 50;
    petData.happiness = typeof petData.happiness === 'number' ? petData.happiness : 50;
}

function displayPetInfo() {
    $('#petId') && ($('#petId').textContent = `#${petData.id}`);
    $('#petName') && ($('#petName').textContent = petData.pet_name || 'Pet');
    $('#petType') && ($('#petType').textContent = petData.pet_type || 'Unknown');
    $('#petCoins') && ($('#petCoins').textContent = petData.coins ?? 0);
}

function computeAgeDays(createdAtString) {
    if (!createdAtString) return 0;
    const createdAt = new Date(createdAtString);
    const now = new Date();
    return Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
}

function displayAge() {
    if (!petData || !localStorage.getItem('pet_birthdate')) return;
    const createdAt = new Date(localStorage.getItem('pet_birthdate'));
    const now = new Date();
    const diffDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    const el = $('#petAge');
    if (el) el.textContent = `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
}

// -----------------------
// 🐾 ACTIONS: PLAY / PAT
// -----------------------
async function doPatAction() {
    const pet_id = localStorage.getItem('pet_id');
    if (!pet_id || !petData) return;

    if (petData.sleeping) {
        showToast('😴 Your pet is sleeping.');
        return;
    }

    const playBtn = $('#playBtn');
    if (!playBtn) return;

    playBtn.disabled = true;
    playBtn.classList.add('disabled');

    let cooldown = 60;
    playBtn.textContent = getCooldownEmoji() + `${cooldown}s`;

    const cooldownInterval = setInterval(() => {
        cooldown--;
        playBtn.textContent = getCooldownEmoji() + `${cooldown}s`;
        if (cooldown <= 0) {
            clearInterval(cooldownInterval);
            playBtn.disabled = false;
            playBtn.classList.remove('disabled');
            playBtn.textContent = '▶️ Play';
        }
    }, 1000);

    // Floating emoji feedback
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

    // Play animation
    animatePlay(petData);

    incrementPlayCounter(pet_id);

    // Delay backend sync until animation completes
    setTimeout(async () => {
        try {
            const res = await fetch(`${backendUrl}/play_pet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pet_id })
            });
            const data = await res.json();
            if (data.success) await updateStats();
        } catch (err) {
            console.error('Play error:', err);
        }
    }, 4000);

    setTimeout(() => emoji.remove(), 1500);
}

function getCooldownEmoji() {
    const type = (localStorage.getItem('pet_type') || 'cat').toLowerCase();
    return type === 'dog' ? '⚽' : '🧶';
}

function animatePlay(pet) {
    const petImg = $('#petImage');
    if (!petImg || !pet) return;

    const baseType = (localStorage.getItem('pet_type') || 'cat').toLowerCase();
    const birthDate = new Date(pet.created_at);
    const ageDays = Math.floor((new Date() - birthDate) / (1000 * 60 * 60 * 24));
    const stage = ageDays < 10 ? "baby" : "adult";

    const frame1 = `static/images/${stage}_${baseType}_when_play1.png`;
    const frame2 = `static/images/${stage}_${baseType}_when_play2.png`;

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
            updatePetImage();
        }
    }, frameInterval);
}

function incrementPlayCounter(pet_id) {
    const key = `play_count_${pet_id}`;
    let count = parseInt(localStorage.getItem(key) || '0', 10);
    count += 1;
    localStorage.setItem(key, String(count));

    if (count >= 3) {
        markPetDirtyLocal(pet_id);
        showToast('💩 Your pet got dirty after playing a lot—time to clean!');
        localStorage.setItem(key, '0');
    }
}

function markPetDirtyLocal(pet_id) {
    if (!pet_id) return;
    if (!petData) petData = {};
    petData.is_dirty = true;
    petData.isDirty = true;
    localStorage.setItem(`pet_dirty_${pet_id}`, 'true');
    setPetImage('dirty');

    try {
        fetch(`${backendUrl}/mark_dirty`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pet_id })
        }).finally(() => setTimeout(updateStats, 800));
    } catch (err) {
        console.debug('mark_dirty not available or failed:', err);
    }
}

// -----------------------
// 🐾 SLEEP & ENERGY RESTORE
// -----------------------
async function handleSleep() {
    const pet_id = localStorage.getItem('pet_id');
    if (!pet_id) return;

    try {
        const res = await fetch(`${backendUrl}/sleep_pet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pet_id })
        });
        const data = await res.json();
        if (data.success) {
            if (data.sleeping) {
                disableAllActions(true);
                if (petData) petData.sleeping = true;
                setPetImage('sleeping');
            } else if (data.awake) {
                disableAllActions(false);
                if (petData) petData.sleeping = false;
                setPetImage('happy');
            }
        }
    } catch (err) {
        console.error('Sleep error:', err);
        showToast('⚠️ Could not update sleep status.');
    }
}

function startSleepTimer() {
    localStorage.setItem('pet_sleep_start', Date.now().toString());
    disableAllActions(true);
    startSleepEmoji();
    startEnergyRestore();
    if (petData) petData.sleeping = true;
    setPetImage('sleeping');
}

async function wakePet() {
    const pet_id = localStorage.getItem('pet_id');
    if (!pet_id) return;

    try {
        const res = await fetch(`${backendUrl}/wake_pet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pet_id })
        });
        const data = await res.json();
        if (res.ok && data && (data.success || data.awake)) {
            localStorage.removeItem('pet_sleep_start');
            stopEnergyRestore();
            stopSleepEmoji();
            disableAllActions(false);
            if (petData) petData.sleeping = false;
            setPetImage('happy');
            await updateStats();
            showToast('☀️ Your pet woke up!');
            return;
        }
    } catch (err) {
        console.debug('wake_pet endpoint missing or failed:', err);
    }

    // Client-side fallback
    localStorage.removeItem('pet_sleep_start');
    stopEnergyRestore();
    stopSleepEmoji();
    disableAllActions(false);
    if (petData) petData.sleeping = false;
    setPetImage('happy');
    await updateStats();
    showToast('☀️ Your pet woke up!');
}

function startSleepEmoji() {
    stopSleepEmoji();
    sleepEmojiInterval = setInterval(() => {
        const emoji = document.createElement('div');
        emoji.className = 'floating-emoji';
        emoji.textContent = '💤';
        document.body.appendChild(emoji);
        Object.assign(emoji.style, {
            position: 'fixed',
            fontSize: '4rem',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: '0',
            transition: 'opacity 1s ease'
        });
        setTimeout(() => (emoji.style.opacity = '1'), 50);
        setTimeout(() => emoji.remove(), 2000);
    }, 5000);
}

function stopSleepEmoji() {
    if (sleepEmojiInterval) {
        clearInterval(sleepEmojiInterval);
        sleepEmojiInterval = null;
    }
}

async function restoreEnergyOnce() {
    const pet_id = localStorage.getItem('pet_id');
    if (!pet_id) return;
    try {
        const res = await fetch(`${backendUrl}/restore_energy/${pet_id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 100 })
        });
        if (res.ok) {
            await updateStats();
            return;
        }
    } catch (err) {
        console.debug('restore_energy not available or failed:', err);
    }
    if (!petData) petData = {};
    petData.energy = 100;
    $('#energyBar') && ($('#energyBar').value = 100);
    await updateStats();
}

function startEnergyRestore() {
    stopEnergyRestore();
    restoreEnergyOnce();
    energyRestoreInterval = setInterval(() => {
        if (!localStorage.getItem('pet_sleep_start')) {
            stopEnergyRestore();
            return;
        }
        restoreEnergyOnce();
    }, 60 * 60 * 1000);
}

function stopEnergyRestore() {
    if (energyRestoreInterval) {
        clearInterval(energyRestoreInterval);
        energyRestoreInterval = null;
    }
}

// -----------------------
// 🐾 PET IMAGE & MOOD LOGIC
// -----------------------
function startPetMoodMonitor() {
    if (!petData) return;
    setPetImage(petData.sleeping ? 'sleeping' : 'happy');
}

function setPetImage(forcedState = null) {
    const petImg = $('#petImage');
    if (!petImg || !petData) return;

    const baseType = (localStorage.getItem('pet_type') || 'cat').toLowerCase();
    const isBaby = computeAgeDays(petData.created_at) < 10;
    const type = isBaby ? `baby_${baseType}` : baseType;

    if (forcedState) {
        petImg.src = `static/images/${type}_${forcedState}.png`;
        return;
    }

    const { hunger = 100, energy = 100, happiness = 100, sleeping, is_sleeping, isDirty, is_dirty } = petData;

    if (sleeping || is_sleeping) petImg.src = `static/images/${type}_sleeping.png`;
    else if (isDirty || is_dirty) petImg.src = `static/images/${type}_dirty.png`;
    else if (hunger <= 10) petImg.src = `static/images/${type}_hungry.png`;
    else if (energy <= 15) petImg.src = `static/images/${type}_tired.png`;
    else if (happiness <= 20) petImg.src = `static/images/${type}_sad.png`;
    else petImg.src = `static/images/${type}_happy.png`;

    petImg.onerror = () => {
        const fallbackType = baseType;
        const currentState = petImg.src.split("_").pop().replace(".png", "");
        petImg.src = `static/images/${fallbackType}_${currentState}.png`;
    };
}
