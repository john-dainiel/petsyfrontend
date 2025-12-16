const backendUrl = "https://petsy-dow7.onrender.com";

/* ==================== SOUNDS ==================== */
const sounds = {
  coin: new Audio('static/sounds/coin.mp3'),
  quiz_correct: new Audio('static/sounds/quiz_correct.mp3'),
  quiz_wrong: new Audio('static/sounds/quiz_wrong.mp3'),
  runner_start: new Audio('static/sounds/runner_start.mp3'),
  runner_gameover: new Audio('static/sounds/runner_gameover.mp3'),
  memory_match: new Audio('static/sounds/memory_match.mp3'),
  memory_mismatch: new Audio('static/sounds/memory_mismatch.mp3'),
  popup: new Audio('static/sounds/popup.mp3')
};

/* ==================== PLAYER INFO ==================== */
function loadPlayerInfo() {
  const playerDiv = document.getElementById('playerInfo');
  if (!playerDiv) return;
  const username = localStorage.getItem('username') || 'Player';
  const totalCoins = localStorage.getItem('totalCoins') || 0;
  playerDiv.innerText = `User: ${username} • Coins: 🪙 ${totalCoins}`;
}

/* ==================== BACKEND COIN UPDATE ==================== */
let coinUpdateInProgress = false;

async function updateCoinsOnServer(coinsEarned, gameType) {
  if (coinUpdateInProgress) return false;
  coinUpdateInProgress = true;

  const token = localStorage.getItem("userToken");

  if (!token) {
    console.error("❌ No userToken in localStorage");
    coinUpdateInProgress = false;
    return false;
  }

  console.log("📤 Sending:", { coinsEarned, gameType });

  try {
    const res = await fetch(`${backendUrl}/mini_game/win`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        coins_earned: coinsEarned,
        game_type: gameType
      })
    });

    const data = await res.json();
    console.log("🎯 WIN RESPONSE:", data);

    if (!res.ok || !data.success) {
      console.error("❌ Coin update rejected:", data.error);
      coinUpdateInProgress = false;
      return false;
    }

    // ✅ Trust backend
    localStorage.setItem("totalCoins", data.coins);
    loadPlayerInfo();

    coinUpdateInProgress = false;
    return true;

  } catch (err) {
    console.error("❌ Network error:", err);
    coinUpdateInProgress = false;
    return false;
  }
}



/* ==================== LEADERBOARD ==================== */
async function updateLeaderboard(gameType) {
  try {
    const response = await fetch(`${backendUrl}/leaderboard?game=${gameType}`);
    const leaderboard = await response.json();
    const leaderboardDiv = document.getElementById(`${gameType}-leaderboard`);
    if (!leaderboardDiv) return;
    leaderboardDiv.innerHTML = '';
    leaderboard.forEach((entry, index) => {
      const el = document.createElement('div');
      el.textContent = `${index + 1}. ${entry.username} - ${entry.best_score} 🪙`;
      leaderboardDiv.appendChild(el);
    });
  } catch(err) {
    console.error(`Error loading ${gameType} leaderboard:`, err);
  }
}
function updateAllLeaderboards(){ ['runner','quiz','memory'].forEach(updateLeaderboard); }

/* ==================== GAME SELECTION ==================== */
function showGame(game, petType='cat') {
  document.querySelectorAll('.game-container').forEach(g => g.style.display = 'none');
  document.getElementById(game).style.display = 'block';
  if(game==='runner') initRunner(petType);
  if(game==='quiz') initQuiz();
  if(game==='memory') initMemory();
}

/* ==================== RUNNER GAME ==================== */
let canvas, ctx, petX, petY, petWidth = 80, petHeight = 80;
let coinsArr = [], obstacles = [], score = 0;
let gameInterval = null, timerInterval = null, countdown = 30, gameRunning = false;
const petImg = new Image(), coinImg = new Image(), boneImg = new Image(), puddleImg = new Image();
let imagesLoaded = 0;

// Load images helper
function loadImage(img, src) {
  img.src = src;
  img.onload = () => imagesLoaded++;
  img.onerror = () => imagesLoaded++;
}

// Init runner game
function initRunner(petType = 'cat') {
  canvas = document.getElementById('runnerCanvas');
  ctx = canvas.getContext('2d');
  petX = canvas.width / 2 - petWidth / 2;
  petY = canvas.height - petHeight - 10;
  score = 0;
  coinsArr = [];
  obstacles = [];
  countdown = 30;
  gameRunning = false;
  imagesLoaded = 0;

  loadImage(petImg, petType === 'cat' ? 'static/images/cat_happy.png' : 'static/images/dog_happy.png');
  loadImage(coinImg, 'static/images/coin.png');
  loadImage(boneImg, 'static/images/bones.png');
  loadImage(puddleImg, 'static/images/puddle.png');

  document.getElementById('runnerCoins').innerText = `Coins 🪙 0`;
  drawRunnerStartScreen();
  updateTimerDisplay();
}

// Start screen
function drawRunnerStartScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#cce0ff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  ctx.font = '36px Arial';
  ctx.fillText('Click ▶ Start Game', canvas.width / 2 - 150, canvas.height / 2);
}

// Fade out audio helper
function fadeOutAudio(audio, duration = 500) {
  if (!audio) return;
  let volStep = audio.volume / (duration / 50);
  let fade = setInterval(() => {
    if (audio.volume > volStep) {
      audio.volume -= volStep;
    } else {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;
      clearInterval(fade);
    }
  }, 50);
}

// Start button click
document.getElementById('runnerStartBtn').onclick = () => {
  if (gameRunning) return;
  if (imagesLoaded < 4) { alert("Loading images..."); return; }
  startRunnerGame();
  sounds.runner_start.loop = true;
  sounds.runner_start.play();
};

// Player movement
document.addEventListener('keydown', e => {
  if (!gameRunning) return;
  if (e.code === 'ArrowLeft') petX -= 15;
  if (e.code === 'ArrowRight') petX += 15;
  if (petX < 0) petX = 0;
  if (petX + petWidth > canvas.width) petX = canvas.width - petWidth;
});

// Spawn coin & obstacles
function spawnRunnerCoin() { coinsArr.push({ x: Math.random() * (canvas.width - 40), y: -30, width: 40, height: 40 }); }
function spawnRunnerObstacle() { 
  const type = Math.random() < 0.5 ? 'bone' : 'puddle'; 
  obstacles.push({ x: Math.random() * (canvas.width - 40), y: -30, width: 50, height: 50, type }); 
}

// Start the game
function startRunnerGame() {
  gameRunning = true;
  score = 0;
  coinsArr = [];
  obstacles = [];
  countdown = 30;
  document.getElementById('runnerCoins').innerText = `Coins 🪙 0`;
  gameInterval = setInterval(runnerGameLoop, 20);
  timerInterval = setInterval(() => {
    countdown--;
    updateTimerDisplay();
    if (countdown <= 0) endRunnerGame();
  }, 1000);
}

function updateTimerDisplay() { document.getElementById('gameTimer').innerText = `Time left: ${countdown}s`; }

// Game loop
function runnerGameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#cce0ff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(petImg, petX, petY, petWidth, petHeight);

  if (Math.random() < 0.02) spawnRunnerCoin();
  if (Math.random() < 0.01) spawnRunnerObstacle();

  // Coins
  for (let i = coinsArr.length - 1; i >= 0; i--) {
    const c = coinsArr[i];
    c.y += 4;
    ctx.drawImage(coinImg, c.x, c.y, c.width, c.height);
    if (c.x < petX + petWidth && c.x + c.width > petX && c.y < petY + petHeight && c.y + c.height > petY) {
      score++; coinsArr.splice(i, 1);
      document.getElementById('runnerCoins').innerText = `Coins 🪙 ${score}`;
      sounds.coin.play();
    }
    if (c.y > canvas.height) coinsArr.splice(i, 1);
  }

  // Obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const ob = obstacles[i];
    ob.y += 5;
    if (ob.type === 'bone') ctx.drawImage(boneImg, ob.x, ob.y, ob.width, ob.height);
    else ctx.drawImage(puddleImg, ob.x, ob.y, ob.width, ob.height);

    if (ob.x < petX + petWidth && ob.x + ob.width > petX && ob.y < petY + petHeight && ob.y + ob.height > petY) {
      endRunnerGame();
      return;
    }
    if (ob.y > canvas.height) obstacles.splice(i, 1);
  }
}

// End game
function endRunnerGame() {
  if (!gameRunning) return;
  gameRunning = false;

  clearInterval(gameInterval);
  clearInterval(timerInterval);

  // Fade out runner_start background
  fadeOutAudio(sounds.runner_start);

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#fff';
  ctx.font = '36px Arial';
  ctx.fillText('Game Over!', canvas.width / 2 - 100, canvas.height / 2 - 20);

  ctx.font = '24px Arial';
  ctx.fillText(`Coins collected: ${score}`, canvas.width / 2 - 90, canvas.height / 2 + 20);

  sounds.runner_gameover.play();

  showPopup(`Game Over! You earned 🪙 ${score}`, async () => {
    await updateCoinsOnServer(score, 'runner');
    initRunner('cat');
  });
}



/* ==================== QUIZ GAME ==================== */
let quizCoins=0, currentQuestion=null, quizStarted=false;
function initQuiz(){
  quizCoins=0; quizStarted=false; currentQuestion=null;
  document.getElementById('quizCoins').innerText='Coins 🪙 0';
  document.getElementById('quizQuestion').innerText='Click ▶ Start Quiz to begin';
  document.getElementById('quizAnswers').innerHTML=''; document.getElementById('quizControls').innerHTML='';
  document.getElementById('quizStartBtn').disabled=false;
}
document.getElementById('quizStartBtn').onclick = ()=>{
  quizStarted=true; document.getElementById('quizStartBtn').disabled=true;
  showQuizQuestion();
};
function generateQuizQuestion(){
  const a=1+Math.floor(Math.random()*10);
  const b=1+Math.floor(Math.random()*10);
  const c=1+Math.floor(Math.random()*10);
  const ops=['+','-']; const op1=ops[Math.floor(Math.random()*2)]; const op2=ops[Math.floor(Math.random()*2)];
  let answer=a; answer=op1==='+'?answer+b:answer-b; answer=op2==='+'?answer+c:answer-c;
  let options=[answer]; while(options.length<4){ let r=answer+Math.floor(Math.random()*10)-5; if(!options.includes(r)) options.push(r);}
  options.sort(()=>Math.random()-0.5);
  return {question:`What is ${a} ${op1} ${b} ${op2} ${c}?`, answer, options};
}
function showQuizQuestion(){
  currentQuestion=generateQuizQuestion();
  document.getElementById('quizQuestion').innerText=currentQuestion.question;
  const answersDiv=document.getElementById('quizAnswers'); answersDiv.innerHTML='';
  currentQuestion.options.forEach(opt=>{
    const btn=document.createElement('button'); btn.className='quiz-btn'; btn.innerText=opt;
    btn.onclick=()=>checkQuizAnswer(opt); answersDiv.appendChild(btn);
  });
  document.getElementById('quizControls').innerHTML='';
}
function checkQuizAnswer(selected){
  const correct=currentQuestion.answer;
  document.querySelectorAll('.quiz-btn').forEach(b=>b.disabled=true);
  const feedback=document.getElementById('quizQuestion');
  if(selected===correct){ quizCoins++; feedback.innerText='✅ Correct!'; sounds.quiz_correct.play(); }
  else { feedback.innerText=`❌ Wrong! Correct: ${correct}`; sounds.quiz_wrong.play(); }
  document.getElementById('quizCoins').innerText=`Coins 🪙 ${quizCoins}`;
  showQuizControls();
}
function showQuizControls(){
  const controls = document.getElementById('quizControls'); controls.innerHTML='';
  const playAgain = document.createElement('button');
  playAgain.innerText = '▶ Next'; playAgain.className='quiz-control-btn'; playAgain.onclick = showQuizQuestion;
  const stop = document.createElement('button'); stop.innerText = '⏹ Stop'; stop.className='quiz-control-btn stop';
  stop.onclick = () => {
    document.getElementById('quizQuestion').innerText = `Quiz ended! Coins earned: 🪙 ${quizCoins}`;
    document.getElementById('quizAnswers').innerHTML = ''; controls.innerHTML = ''; document.getElementById('quizStartBtn').disabled = false;
    showPopup(`Quiz finished! You earned 🪙 ${quizCoins}`, () => { updateCoinsOnServer(quizCoins,'quiz'); initQuiz(); });
  };
  controls.appendChild(playAgain); controls.appendChild(stop);
}

/* ==================== MEMORY GAME ==================== */
let memoryCards=[], memoryFlipped=[], memoryMatched=[], memoryLevel=1, memoryCoins=0, timeLeft=30, memorytimerInterval=null;
const memoryImages=['/static/images/memory1.png','/static/images/memory2.png','/static/images/memory3.png','/static/images/memory4.png','/static/images/memory5.png','/static/images/memory6.png','/static/images/memory7.png','/static/images/memory8.png'];

function initMemory(){
  clearInterval(memorytimerInterval);
  memoryLevel=1; memoryCoins=0; memoryCards=[]; memoryFlipped=[]; memoryMatched=[]; timeLeft=30;
  document.getElementById('memoryTimer').innerText='⏱️ 30s';
  document.getElementById('memoryInfo').innerText='Level 1 • Coins 🪙 0';
  document.getElementById('memoryGrid').innerHTML='<p style="font-size:20px;">Click ▶ Start Memory to begin</p>';
  document.getElementById('memoryStartBtn').disabled=false;
}
document.getElementById('memoryStartBtn').onclick=()=>{ document.getElementById('memoryStartBtn').disabled=true; startMemoryLevel(); };
function startMemoryLevel(){
  clearInterval(memorytimerInterval);
  const pairs = Math.min(2 + memoryLevel, memoryImages.length);
  const selected = memoryImages.slice(0, pairs);
  memoryCards = [...selected, ...selected].sort(() => Math.random() - 0.5);
  memoryFlipped = []; memoryMatched = [];
  timeLeft = Math.max(10, 30 - (memoryLevel - 1) * 3);
  renderMemory(); startMemoryTimer();
}
function startMemoryTimer(){
  updateMemoryTimerUI();
  memorytimerInterval = setInterval(() => {
    timeLeft--; updateMemoryTimerUI();
    if(timeLeft <= 0){
      clearInterval(memorytimerInterval);
      updateCoinsOnServer(memoryCoins,'memory');
      showPopup(`⏰ Time's up! Coins: 🪙 ${memoryCoins}`, () => initMemory());
    }
  },1000);
}
function updateMemoryTimerUI(){ document.getElementById('memoryTimer').innerText=`⏱️ ${timeLeft}s`; }
function renderMemory(){
  const grid=document.getElementById('memoryGrid'); grid.innerHTML='';
  memoryCards.forEach((imgSrc,index)=>{
    const card=document.createElement('div'); card.className='memory-card';
    if(memoryFlipped.includes(index)||memoryMatched.includes(index)){ 
      const img=document.createElement('img'); img.src=imgSrc; card.appendChild(img); 
    } else card.innerText='❓';
    card.onclick=()=>flipMemoryCard(index);
    grid.appendChild(card);
  });
  document.getElementById('memoryInfo').innerText=`Level ${memoryLevel} • Coins 🪙 ${memoryCoins}`;
}
function flipMemoryCard(index){
  if (memoryFlipped.length === 2 || memoryFlipped.includes(index) || memoryMatched.includes(index)) return;

  memoryFlipped.push(index);
  renderMemory();

  if (memoryFlipped.length === 2){
    const [a,b] = memoryFlipped;

    if (memoryCards[a] === memoryCards[b]) {
      memoryMatched.push(a, b);
      memoryCoins++;
      memoryFlipped = [];
      sounds.memory_match.play();
      renderMemory();

      // ✅ CHECK IF LEVEL IS COMPLETE
      if (memoryMatched.length === memoryCards.length) {
        clearInterval(memorytimerInterval);

        setTimeout(() => {
          memoryLevel++;
          showPopup(`🎉 Level ${memoryLevel - 1} complete!`, () => {
            startMemoryLevel(); // ▶ start next level
          });
        }, 500);
      }

    } else {
      setTimeout(() => {
        memoryFlipped = [];
        renderMemory();
        sounds.memory_mismatch.play();
      }, 700);
    }
  }
}
/* ==================== POPUP ==================== */
function showPopup(html,onClose){
  const overlay=document.createElement('div'); overlay.className='popup-overlay';
  overlay.innerHTML=`<div class="popup-box"><div class="popup-text">${html}</div><button class="popup-btn">OK</button></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('button').onclick=()=>{ overlay.remove(); sounds.popup.play(); if(onClose) onClose(); };
}

/* ==================== FETCH USER DATA ==================== */
async function loadUserData() {
  const token = localStorage.getItem('userToken'); if (!token) return;
  try {
    const res = await fetch(`${backendUrl}/get_user_info`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('username', data.username);
      localStorage.setItem('totalCoins', data.coins || 0);
      localStorage.setItem('userId', data.id);
      localStorage.setItem('petId', data.pet_id);
      loadPlayerInfo(); updateAllLeaderboards();
    }
  } catch(err) { console.error("Error fetching user data:", err); }
}

/* ==================== INITIALIZE ==================== */
document.addEventListener('DOMContentLoaded', async () => {
  await loadUserData(); loadPlayerInfo(); showGame('runner'); updateAllLeaderboards();
});








