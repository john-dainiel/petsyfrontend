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

let petData = null;
let ageInterval = null;
let communityIntervalId = null;
let lastPopupIds = new Set();
let treatInventory = { small: 0, medium: 0, large: 0 };
let sleepEmojiInterval = null;
let petMoodInterval = null;
let energyRestoreInterval = null;
let playFrameInterval = null;

// Safe selector helper
const $ = (sel, root = document) => (root || document).querySelector(sel);

// -----------------------
// DOM Ready — initialize once
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
  const eatMenuContainer = document.querySelector('.eat-menu');
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

  if (restBtn) {
    restBtn.style.fontSize = '12px';
    restBtn.style.padding = '0.4rem';
    restBtn.style.display = 'flex';
    restBtn.style.alignItems = 'center';
    restBtn.style.justifyContent = 'center';
    restBtn.style.textAlign = 'center';
    restBtn.style.whiteSpace = 'nowrap';
  }

  playBtn?.addEventListener('click', () => doPatAction());
  miniGamesBtn?.addEventListener('click', () => { window.location.href = 'minigames.html'; });
  logoutBtn?.addEventListener('click', () => { localStorage.clear(); window.location.href = 'index.html'; });

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

  communityBtn?.addEventListener('click', () => { window.location.href = 'community.html'; });

  shopButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const treatType = btn.dataset.type;
      const pet_id = localStorage.getItem('pet_id');
      if (!pet_id) { shopResult && (shopResult.textContent = '❌ No pet selected.'); shopResult?.classList.remove('hidden'); return; }
      try {
        const res = await fetch(`${backendUrl}/buy_treat/${pet_id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ treat_type: treatType })
        });
        const data = await res.json();
        if (res.ok && data?.success) {
          await loadTreatInventory();
          updateTreatMenu();
          await updateStats();
          if (shopResult) { shopResult.textContent = `✅ You bought a ${treatType} treat!`; shopResult.classList.remove('hidden'); }
        } else {
          shopResult && (shopResult.textContent = `❌ ${data?.error || 'Purchase failed.'}`) && shopResult.classList.remove('hidden');
        }
      } catch (err) {
        console.error('Shop error:', err);
        shopResult && (shopResult.textContent = '❌ Network error.') && shopResult.classList.remove('hidden');
      }
    });
  });

  if (eatButton && treatMenu && eatMenuContainer) {
    eatButton.addEventListener('mouseenter', () => { updateTreatMenu(); treatMenu.classList.remove('hidden'); });
    eatMenuContainer.addEventListener('mouseleave', () => { treatMenu.classList.add('hidden'); });
    treatOptionEls.forEach(option => {
      option.addEventListener('click', async () => { const treatType = option.dataset.type; await feedPet(treatType); treatMenu.classList.add('hidden'); });
    });
  }

  cleanBtn?.addEventListener('click', async () => {
    const pet_id = localStorage.getItem('pet_id');
    if (!pet_id) { alert('No pet selected.'); return; }
    try {
      const res = await fetch(`${backendUrl}/clean_pet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pet_id })
      });
      const data = await res.json();
      if (res.ok && (data.success || data.cleaned)) {
        resetPlayCounter(pet_id);
        if (petData) { petData.is_dirty = false; petData.isDirty = false; }
        await updateStats();
        sparklesOnClean();
        showToast('✨ Your pet has been cleaned!');
      } else {
        alert(data?.error || '❌ Cleaning failed.');
      }
    } catch (err) { console.error('Clean error:', err); alert('Network error while cleaning the pet.'); }
  });

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

  saveNameBtn?.addEventListener('click', async () => {
    const newName = (renameInput?.value || '').trim();
    const pet_id = localStorage.getItem('pet_id');
    if (!pet_id) { renameResult.textContent = '❌ No pet selected.'; renameResult.classList.remove('hidden'); return; }
    if (!newName) { renameResult.textContent = '❌ Name cannot be empty.'; renameResult.classList.remove('hidden'); return; }
    const cooldownKey = `pet_rename_cooldown_${pet_id}`;
    const lastRename = parseInt(localStorage.getItem(cooldownKey) || '0', 10);
    const now = Date.now();
    const oneDayMs = 24*60*60*1000;
    if (lastRename && now - lastRename < oneDayMs) {
      const remaining = Math.ceil((oneDayMs - (now - lastRename))/(1000*60*60));
      renameResult.textContent = `❌ You can rename again in ${remaining} hour(s).`; renameResult.classList.remove('hidden'); return;
    }
    if (!confirm('⚠️ After renaming, you cannot change the name again for 1 day. Proceed?')) return;
    try {
      const res = await fetch(`${backendUrl}/rename_pet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pet_id, new_name: newName })
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        $('#petName') && ($('#petName').textContent = newName);
        if (petData) petData.pet_name = newName;
        localStorage.setItem('pet_name', newName);
        localStorage.setItem(cooldownKey, now.toString());
        renameResult.textContent = '✅ Name updated successfully!'; renameResult.classList.remove('hidden');
      } else {
        renameResult.textContent = data?.error || '⚠️ Server rename failed.'; renameResult.classList.remove('hidden');
      }
    } catch (err) { console.error('Rename error:', err); renameResult.textContent = '⚠️ Network error — try again later.'; renameResult.classList.remove('hidden'); }
  });

  muteToggle?.addEventListener('click', () => {
    const muted = localStorage.getItem('muted') === 'true';
    localStorage.setItem('muted', (!muted).toString());
    updateMuteUI(!muted);
  });
  function updateMuteUI(muted) { if (muteStatus) muteStatus.textContent = muted ? 'On' : 'Off'; if (muteToggle) muteToggle.textContent = muted ? 'Unmute' : 'Mute'; }

  const petNameDisplay = $('#petNameDisplay');
  if (petNameDisplay && localStorage.getItem('pet_name')) petNameDisplay.textContent = localStorage.getItem('pet_name');

  if (!communityIntervalId) startCommunityPopups();
  loadMain();

  const storedSleeping = !!localStorage.getItem('pet_sleep_start');
  if (restBtn) {
    restBtn.textContent = storedSleeping ? '🌞 Wake Up' : '💤 Sleep';
    restBtn.addEventListener('click', async () => {
      const sleeping = !!localStorage.getItem('pet_sleep_start');
      const pet_id = localStorage.getItem('pet_id');
      if (!pet_id) { showToast('No pet selected.'); return; }
      if (!sleeping) { await handleSleep(); startSleepTimer(); await restoreEnergyOnce(); restBtn.textContent = '🌞 Wake Up'; showToast('💤 Your pet is now sleeping...'); }
      else { await wakePet(); restBtn.textContent = '💤 Sleep'; }
    });
  }
  if (storedSleeping) { disableAllActions(true); startSleepEmoji(); startEnergyRestore(); if (restBtn) restBtn.textContent = '🌞 Wake Up'; }

  setInterval(checkAutoWake, 60000);
});

// -----------------------
// Core functions (loadMain, updateStats, etc.)
// -----------------------
async function loadMain() {
  const user_id = localStorage.getItem('user_id');
  const pet_id = localStorage.getItem('pet_id');
  if (!user_id) { window.location.href='login.html'; return; }
  const idToLoad = pet_id ? pet_id : user_id;
  const endpoint = pet_id ? 'get_pet_by_id' : 'get_pet';
  try {
    const res = await fetch(`${backendUrl}/${endpoint}/${idToLoad}`);
    const data = await res.json();
    if (!res.ok || data.error) { console.error('Error loading pet:', data.error); return; }
    petData = data;
    petData.isDirty = petData.isDirty || petData.is_dirty || false;
    petData.is_dirty = petData.is_dirty || petData.isDirty || false;
    petData.sleeping = petData.sleeping || petData.is_sleeping || false;
    petData.ageDays = computeAgeDays(petData.created_at || localStorage.getItem('pet_birthdate'));
    petData.energy = (typeof petData.energy==='number')?petData.energy:(petData.energy??100);
    petData.hunger = (typeof petData.hunger==='number')?petData.hunger:(petData.hunger??50);
    petData.happiness = (typeof petData.happiness==='number')?petData.happiness:(petData.happiness??50);
    localStorage.setItem('pet_id', data.id);
    if (data.pet_name) localStorage.setItem('pet_name', data.pet_name);
    if (data.pet_type) localStorage.setItem('pet_type', data.pet_type.toLowerCase());
    if (data.created_at) localStorage.setItem('pet_birthdate', data.created_at.split(' ')[0]);
    $('#petId') && ($('#petId').textContent = `#${data.id}`);
    $('#petName') && ($('#petName').textContent = data.pet_name||'Pet');
    $('#petType') && ($('#petType').textContent = data.pet_type||'Unknown');
    $('#petCoins') && ($('#petCoins').textContent = data.coins??0);
    const localDirtyKey = `pet_dirty_${data.id}`;
    if (localStorage.getItem(localDirtyKey) === 'true') { petData.is_dirty=true; petData.isDirty=true; }
    setPetImage(petData.sleeping?'sleeping':'happy');
    updateBackground(); displayAge(); updateStats();
    await loadTreatInventory(); updateTreatMenu();
    if (ageInterval) clearInterval(ageInterval); ageInterval=setInterval(displayAge,60000);
    if (petMoodInterval) clearInterval(petMoodInterval); petMoodInterval=setInterval(()=>startPetMoodMonitor(),5000);
    setInterval(updateStats,30000);
  } catch(err){ console.error('Failed to load main:',err);}
}

function computeAgeDays(createdAtString) { if(!createdAtString) return 0; const createdAt=new Date(createdAtString); const now=new Date(); return Math.floor((now-createdAt)/(1000*60*60*24)); }

function displayAge() { if(!petData || !localStorage.getItem('pet_birthdate')) return; const createdAt=new Date(localStorage.getItem('pet_birthdate')); const now=new Date(); const diffDays=Math.floor((now-createdAt)/(1000*60*60*24)); const el=$('#petAge'); if(el) el.textContent=`${diffDays} day${diffDays!==1?'s':''}`; }

async function updateStats() {
  const pet_id=localStorage.getItem('pet_id'); if(!pet_id) return;
  try {
    const res=await fetch(`${backendUrl}/get_pet_by_id/${pet_id}`);
    const data=await res.json();
    if(!res.ok||data.error) return;
    petData=Object.assign({},petData||{},data);
    petData.isDirty=petData.isDirty||petData.is_dirty||false;
    petData.is_dirty=petData.is_dirty||petData.isDirty||false;
    petData.sleeping=petData.sleeping||petData.is_sleeping||false;
    const hunger=$('#hungerBar'); const energy=$('#energyBar'); const happiness=$('#happinessBar');
    if(hunger) hunger.value=data.hunger??hunger.value;
    if(energy) energy.value=data.energy??energy.value;
    if(happiness) happiness.value=data.happiness??happiness.value;
    $('#petCoins') && ($('#petCoins').textContent=data.coins??0);
    displayAge();
    if(typeof data.small_treats!=='undefined') { treatInventory.small=data.small_treats??0; treatInventory.medium=data.medium_treats??0; treatInventory.large=data.large_treats??0; updateTreatMenu(); }
    setPetImage(petData.sleeping?'sleeping':'happy');
  } catch(err){ console.error('Failed to update stats:',err);}
}

// ... rest of code continues with all other functions (sleep, play, feed, community popups, energy restore, pet image handling, toast helpers, etc.) ...



// -----------------------
// Core functions
// -----------------------

async function loadMain() {
  const user_id = localStorage.getItem('user_id');
  const pet_id = localStorage.getItem('pet_id');
  if (!user_id) { window.location.href = 'login.html'; return; }
  const idToLoad = pet_id || user_id;
  const endpoint = pet_id ? 'get_pet_by_id' : 'get_pet';
  try {
    const res = await fetch(`${backendUrl}/${endpoint}/${idToLoad}`);
    const data = await res.json();
    if (!res.ok || data.error) { console.error('Error loading pet:', data.error); return; }
    petData = data;
    petData.isDirty = petData.isDirty || petData.is_dirty || false;
    petData.is_dirty = petData.is_dirty || petData.isDirty || false;
    petData.sleeping = petData.sleeping || petData.is_sleeping || false;
    petData.ageDays = computeAgeDays(petData.created_at || localStorage.getItem('pet_birthdate'));
    petData.energy = typeof petData.energy === 'number' ? petData.energy : 100;
    petData.hunger = typeof petData.hunger === 'number' ? petData.hunger : 50;
    petData.happiness = typeof petData.happiness === 'number' ? petData.happiness : 50;
    localStorage.setItem('pet_id', data.id);
    if (data.pet_name) localStorage.setItem('pet_name', data.pet_name);
    if (data.pet_type) localStorage.setItem('pet_type', data.pet_type.toLowerCase());
    if (data.created_at) localStorage.setItem('pet_birthdate', data.created_at.split(' ')[0]);
    $('#petId') && ($('#petId').textContent = `#${data.id}`);
    $('#petName') && ($('#petName').textContent = data.pet_name || 'Pet');
    $('#petType') && ($('#petType').textContent = data.pet_type || 'Unknown');
    $('#petCoins') && ($('#petCoins').textContent = data.coins ?? 0);
    const localDirtyKey = `pet_dirty_${data.id}`;
    if (localStorage.getItem(localDirtyKey) === 'true') petData.is_dirty = petData.isDirty = true;
    setPetImage(petData.sleeping ? 'sleeping' : 'happy');
    updateBackground();
    displayAge();
    updateStats();
    await loadTreatInventory();
    updateTreatMenu();
    if (ageInterval) clearInterval(ageInterval);
    ageInterval = setInterval(displayAge, 60000);
    if (petMoodInterval) clearInterval(petMoodInterval);
    petMoodInterval = setInterval(startPetMoodMonitor, 5000);
    setInterval(updateStats, 30000);
  } catch (err) { console.error('Failed to load main:', err); }
}

function computeAgeDays(createdAtString) {
  if (!createdAtString) return 0;
  const createdAt = new Date(createdAtString);
  return Math.floor((Date.now() - createdAt) / (1000*60*60*24));
}

function displayAge() {
  if (!petData || !localStorage.getItem('pet_birthdate')) return;
  const createdAt = new Date(localStorage.getItem('pet_birthdate'));
  const diffDays = Math.floor((Date.now() - createdAt) / (1000*60*60*24));
  $('#petAge') && ($('#petAge').textContent = `${diffDays} day${diffDays !== 1 ? 's' : ''}`);
}

async function updateStats() {
  const pet_id = localStorage.getItem('pet_id');
  if (!pet_id) return;
  try {
    const res = await fetch(`${backendUrl}/get_pet_by_id/${pet_id}`);
    const data = await res.json();
    if (!res.ok || data.error) return;
    petData = Object.assign({}, petData || {}, data);
    petData.isDirty = petData.isDirty || petData.is_dirty || false;
    petData.is_dirty = petData.is_dirty || petData.isDirty || false;
    petData.sleeping = petData.sleeping || petData.is_sleeping || false;
    $('#hungerBar') && ($('#hungerBar').value = data.hunger ?? $('#hungerBar').value);
    $('#energyBar') && ($('#energyBar').value = data.energy ?? $('#energyBar').value);
    $('#happinessBar') && ($('#happinessBar').value = data.happiness ?? $('#happinessBar').value);
    $('#petCoins') && ($('#petCoins').textContent = data.coins ?? 0);
    displayAge();
    if (data.small_treats !== undefined) {
      treatInventory.small = data.small_treats ?? 0;
      treatInventory.medium = data.medium_treats ?? 0;
      treatInventory.large = data.large_treats ?? 0;
      updateTreatMenu();
    }
    setPetImage(petData.sleeping ? 'sleeping' : 'happy');
  } catch (err) { console.error('Failed to update stats:', err); }
}

function updateBackground() {
  const hour = new Date().getHours();
  const bg = document.querySelector('.background');
  if (!bg) return;
  bg.classList.add('fade-transition');
  bg.style.backgroundImage = hour>=6 && hour<12 ? "url('static/images/background/morning.png')" :
                             hour>=12 && hour<18 ? "url('static/images/background/afternoon.png')" :
                             "url('static/images/background/night.png')";
  setTimeout(() => bg.classList.remove('fade-transition'), 1500);
}

// -----------------------
// Actions: play / feed / sleep
// -----------------------

async function doAction(endpoint) {
  const pet_id = localStorage.getItem('pet_id'); if (!pet_id) return;
  const emoji = document.createElement('div'); emoji.className='floating-emoji'; emoji.textContent='✨';
  document.body.appendChild(emoji);
  Object.assign(emoji.style,{position:'fixed',fontSize:'3rem',top:'40%',left:'50%',transform:'translate(-50%,-50%)',opacity:'0',transition:'opacity 0.25s ease'});
  setTimeout(()=>emoji.style.opacity='1',50);
  try {
    const res = await fetch(`${backendUrl}/${endpoint}`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({pet_id})
    });
    const data = await res.json();
    if (data.success) await updateStats();
  } catch(err){console.error('Action error:',err);}
  setTimeout(()=>emoji.remove(),1200);
}

// ===============================
// 🐾 doPatAction
// ===============================
async function doPatAction() {
  const pet_id = localStorage.getItem('pet_id'); if (!pet_id) return;
  const playBtn = document.getElementById('playBtn'); if (!playBtn) return;
  if (petData && (petData.sleeping || petData.is_sleeping)) { showToast('😴 Your pet is sleeping.'); return; }
  playBtn.disabled = true; playBtn.classList.add('disabled'); let cooldown = 60;
  playBtn.textContent = getCooldownEmoji() + ` ${cooldown}s`;
  const cooldownInterval = setInterval(()=>{
    cooldown--; playBtn.textContent = getCooldownEmoji() + ` ${cooldown}s`;
    if(cooldown<=0){clearInterval(cooldownInterval); playBtn.disabled=false; playBtn.classList.remove('disabled'); playBtn.textContent='▶️ Play';}
  },1000);
  const emoji=document.createElement('div'); emoji.className='floating-emoji'; emoji.textContent=getCooldownEmoji();
  document.body.appendChild(emoji);
  Object.assign(emoji.style,{position:'fixed',fontSize:'3.5rem',top:'38%',left:'50%',transform:'translate(-50%,-50%)',opacity:'0',transition:'opacity 0.15s
