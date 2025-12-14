const backendUrl = "https://petsy-dow7.onrender.com";
const pet_id = localStorage.getItem("pet_id") || 1;
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const petCoinsEl = $("#petCoins");
const popupToast = $("#popupMessage");
const gamePanel = $("#gamePanel");
const gameBody = $("#gameBody");
const gameTitle = $("#gameTitle");
const closePanelBtn = $("#closePanel");
const playAgainBtn = $("#playAgain");
const claimRewardBtn = $("#claimReward");
const gameResultEl = $("#gameResult");
const petFaceEl = document.getElementById("petFace");

let currentGame = null;
let petType = "default"; // for expressions

// ===============================
// PET FACE LOADER
// ===============================
async function loadPetFace() {
  try {
    const res = await fetch(`${backendUrl}/get_pet_by_id/${pet_id}`);
    if (!res.ok) throw new Error("Failed to fetch pet info");
    const pet = await res.json();

    petType = pet.type?.toLowerCase() || "default";

    let imgSrc = "https://petsyfrontend.onrender.com/static/images/default_pet.png";
    if (petType === "cat") imgSrc = "https://petsyfrontend.onrender.com/static/images/cat.png";
    else if (petType === "dog") imgSrc = "https://petsyfrontend.onrender.com/static/images/dog.png";
    else if (pet.image) imgSrc = `https://petsyfrontend.onrender.com/static/images/${pet.image}`;

    petFaceEl.src = imgSrc;
  } catch (err) {
    console.error("loadPetFace error:", err);
  }
}

// ===============================
// TOAST
// ===============================
let toastTimer = null;
function showToast(msg, ms = 2200) {
  popupToast.textContent = msg;
  popupToast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => popupToast.classList.remove("show"), ms);
}

// ===============================
// ENABLE / DISABLE INTERACTION
// ===============================
function disableInteractive() {
  $$(".choice-btn").forEach((b) => { b.disabled = true; b.style.opacity = 0.6; });
  gameBody.querySelectorAll("input").forEach((i) => { i.disabled = true; i.style.opacity = 0.8; });
}
function enableInteractive() {
  $$(".choice-btn").forEach((b) => { b.disabled = false; b.style.opacity = ""; });
  gameBody.querySelectorAll("input").forEach((i) => { i.disabled = false; i.style.opacity = ""; });
}

// ===============================
// LOAD COINS & STATS
// ===============================
async function loadPetCoins() {
  try {
    const res = await fetch(`${backendUrl}/get_pet_by_id/${pet_id}`);
    const data = await res.json();
    petCoinsEl.textContent = `Your Coins: ${data.coins ?? 0} 🪙`;
  } catch { petCoinsEl.textContent = "Your Coins: 0 🪙"; }
}

async function loadGameStats() {
  try {
    const res = await fetch(`${backendUrl}/get_game_stats/${pet_id}?t=${Date.now()}`);
    const data = await res.json();
    const easy = data.easy_wins ?? 0;
    const medium = data.medium_wins ?? 0;
    const hard = data.hard_wins ?? 0;
    $("#easyWins").textContent = `Easy Wins: ${easy % 10 || (easy===0?0:10)} / 10 🎁 Small Treat`;
    $("#mediumWins").textContent = `Medium Wins: ${medium % 10 || (medium===0?0:10)} / 10 🎁 Medium Treat`;
    $("#hardWins").textContent = `Hard Wins: ${hard % 10 || (hard===0?0:10)} / 10 🎁 Large Treat`;
  } catch (err) { console.error(err); }
}

// ===============================
// RECORD WIN
// ===============================
async function recordWin(difficulty) {
  try {
    const res = await fetch(`${backendUrl}/record_game_win/${pet_id}`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({difficulty})
    });
    const data = await res.json();
    if(data.success){ loadGameStats(); loadPetCoins(); return data; }
    else showToast("⚠️ Couldn't record win.");
  } catch { showToast("⚠️ Could not record win."); }
}

// ===============================
// PANEL HELPERS
// ===============================
function openPanel(title){ gameTitle.textContent=title; gamePanel.classList.remove("hidden"); gameResultEl.textContent=""; playAgainBtn.classList.add("hidden"); claimRewardBtn.classList.remove("hidden"); enableInteractive(); }
function closePanel(){ gamePanel.classList.add("hidden"); gameBody.innerHTML=`<img id="petFace" class="pet-face" alt="Your Pet" width="80" height="80"/><p class="muted">Choose a game on the left to begin — results and actions appear here.</p>`; document.getElementById("petFace").src=petFaceEl.src; currentGame=null; }
function renderChoices(html){ gameBody.innerHTML=`<img id="petFace" class="pet-face" alt="Your Pet" width="80" height="80"/>`+html; document.getElementById("petFace").src=petFaceEl.src; }

// ===============================
// PET EXPRESSION
// ===============================
function setPetExpression(win=true){
  if(petType==="cat") petFaceEl.src=win?"https://petsyfrontend.onrender.com/static/images/cat_happy.png":"https://petsyfrontend.onrender.com/static/images/cat_sad.png";
  else if(petType==="dog") petFaceEl.src=win?"https://petsyfrontend.onrender.com/static/images/dog_happy.png":"https://petsyfrontend.onrender.com/static/images/dog_sad.png";
}

// ===============================
// GAMES
// ===============================
function startEasyGame(){
  currentGame="easy"; const correct=Math.random()<0.5?"heads":"tails"; openPanel("🪙 Heads or Tails");
  renderChoices(`<p>Pick heads or tails — win a small coin reward!</p><div class="choice-row"><button class="choice-btn" data-choice="heads">Heads</button><button class="choice-btn" data-choice="tails">Tails</button></div>`);
  gameBody.querySelectorAll(".choice-btn").forEach(b=>b.addEventListener("click",async ()=>{
    const choice=b.dataset.choice; disableInteractive();
    if(choice===correct){ gameResultEl.textContent="🎉 You won!"; showToast("🎉 Correct!"); setPetExpression(true); await recordWin("easy"); } 
    else{ gameResultEl.textContent=`😢 You lost — it was ${correct}`; showToast(`😢 It was ${correct}`); setPetExpression(false); }
    playAgainBtn.classList.remove("hidden");
  },{once:true}));
}

function startMediumGame(){
  currentGame="medium"; const number=Math.floor(Math.random()*3)+1; openPanel("🎯 Guess Number (1–3)");
  renderChoices(`<p>Guess a number from <strong>1</strong> to <strong>3</strong>:</p><div class="input-inline"><input id="guessInput" type="number" min="1" max="3"/><button id="guessBtn" class="choice-btn">Guess</button></div>`);
  const guessBtn=gameBody.querySelector("#guessBtn"), guessInput=gameBody.querySelector("#guessInput");
  guessBtn.addEventListener("click", async ()=>{
    const val=parseInt(guessInput.value,10); disableInteractive();
    if(val===number){ gameResultEl.textContent="🎉 Correct!"; showToast("🎉 Correct!"); setPetExpression(true); await recordWin("medium"); }
    else{ gameResultEl.textContent=`😢 Wrong — it was ${number}`; showToast(`😢 It was ${number}`); setPetExpression(false); }
    playAgainBtn.classList.remove("hidden");
  },{once:true});
}

function startHardGame(){
  currentGame="hard"; const a=Math.floor(Math.random()*10)+1, b=Math.floor(Math.random()*10)+1, c=Math.floor(Math.random()*10)+1, sum=a+b+c;
  openPanel("🧮 Add 3 Numbers");
  renderChoices(`<p class="muted">${a} + ${b} + ${c} = ?</p><div class="input-inline"><input id="mathInput" type="number"/><button id="mathBtn" class="choice-btn">Submit</button></div>`);
  const mathBtn=gameBody.querySelector("#mathBtn"), mathInput=gameBody.querySelector("#mathInput");
  mathBtn.addEventListener("click",async ()=>{
    const val=parseInt(mathInput.value,10); disableInteractive();
    if(val===sum){ gameResultEl.textContent="🎉 Correct!"; showToast("🎉 Correct!"); setPetExpression(true); await recordWin("hard"); }
    else{ gameResultEl.textContent=`😢 Wrong! It was ${sum}`; showToast(`😢 Wrong! It was ${sum}`); setPetExpression(false); }
    playAgainBtn.classList.remove("hidden");
  },{once:true});
}

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded",()=>{
  loadPetFace(); loadPetCoins(); loadGameStats();
  $("#easyGame")?.addEventListener("click",startEasyGame);
  $("#mediumGame")?.addEventListener("click",startMediumGame);
  $("#hardGame")?.addEventListener("click",startHardGame);
  closePanelBtn?.addEventListener("click",closePanel);
  $("#backToPetMenu")?.addEventListener("click",()=>window.location.href="main.html");
  playAgainBtn?.addEventListener("click",()=>{ enableInteractive(); gameResultEl.textContent=""; playAgainBtn.classList.add("hidden"); if(currentGame==="easy") startEasyGame(); else if(currentGame==="medium") startMediumGame(); else if(currentGame==="hard") startHardGame(); else showToast("Choose a game first!"); });
  if(claimRewardBtn) claimRewardBtn.addEventListener("click",()=>{ closePanel(); showToast("Game cancelled."); });
});
