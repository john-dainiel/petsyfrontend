const backendUrl = "https://petsy-dow7.onrender.com";

/* ==================== GAME SELECTION ==================== */
function showGame(game, petType = 'cat') {
  const games = document.querySelectorAll('.game-container');
  games.forEach(g => g.style.display = 'none');
  document.getElementById(game).style.display = 'block';

  if (game === 'runner') initRunner(petType);
  if (game === 'quiz') initQuiz();
  if (game === 'memory') initMemory();
}

/* ==================== HELPER: GET USER INFO FROM TOKEN ==================== */
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function getUserId() {
  const token = localStorage.getItem('userToken');
  if (!token) return null;
  const payload = parseJwt(token);
  return payload?.id || null;
}

/* ==================== PLAYER INFO ==================== */
function loadPlayerInfo() {
  const playerDiv = document.getElementById('playerInfo');
  if (!playerDiv) return;

  const username = localStorage.getItem('username');
  const totalCoins = localStorage.getItem('totalCoins');

  if (!username || totalCoins === null) {
    playerDiv.innerText = "Loading player info...";
    return false;
  }

  playerDiv.innerText = `Player: ${username} • Total Coins: 🪙 ${totalCoins}`;
  return true;
}

/* ==================== FETCH USER DATA ==================== */
async function loadUserData() {
  const token = localStorage.getItem('userToken');
  if (!token) return;

  try {
    const res = await fetch(`${backendUrl}/get_user_info`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('username', data.username);
      localStorage.setItem('totalCoins', data.coins || 0);
      localStorage.setItem('userId', data.id);
      localStorage.setItem('petId', data.pet_id);
      loadPlayerInfo();
    } else {
      console.error("Failed to load user info:", data.error);
    }
  } catch(err) {
    console.error("Error fetching user data:", err);
  }
}

/* ==================== BACKEND COIN UPDATE ==================== */
function updateCoinsOnServer(coinsEarned, gameType) {
  const userToken = localStorage.getItem('userToken'); 
  const petId = localStorage.getItem('petId');
  const userId = getUserId();

  if (!userToken || !petId || !userId) {
    console.error("Missing user info. Coins not updated.");
    return;
  }

  fetch(`${backendUrl}/mini_game/win/${petId}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({ 
      coins_earned: coinsEarned,
      user_id: userId,
      game_type: gameType
    })
  })
  .then(res => res.json())
  .then(data => {
    if(data.success) {
      localStorage.setItem('totalCoins', data.coins || 0);
      loadPlayerInfo();
      refreshLeaderboard(gameType);
    } else {
      console.error('Error updating coins:', data.error);
    }
  })
  .catch(err => console.error('Error updating coins:', err));
}

/* ==================== LEADERBOARD ==================== */
function refreshLeaderboard(gameType = 'runner') {
  fetch(`${backendUrl}/leaderboard?game=${gameType}`)
    .then(res => res.json())
    .then(data => {
      const lbDiv = document.getElementById('leaderboard');
      if(!lbDiv) return;

      if(data.length === 0) {
        lbDiv.innerHTML = 'No scores yet';
      } else {
        lbDiv.innerHTML = data.slice(0, 10)
          .map((u, i) => `${i + 1}. ${u.username}: 🪙 ${u.coins}`)
          .join('<br>');
      }
    })
    .catch(err => console.error('Error fetching leaderboard:', err));
}

/* ==================== RUNNER GAME ==================== */
let canvas, ctx;
let petX, petY, petWidth = 80, petHeight = 80;
let coins = [], obstacles = [], score = 0;
let gameInterval = null, timerInterval = null;
let gameRunning = false, countdown = 30;
const petImg = new Image(), coinImg = new Image(), boneImg = new Image(), puddleImg = new Image();
let imagesLoaded = 0, TOTAL_IMAGES = 4;

function loadImage(img, src) {
  img.src = src;
  img.onload = () => imagesLoaded++;
  img.onerror = () => imagesLoaded++;
}

function initRunner(petType = 'cat') {
  canvas = document.getElementById('runnerCanvas');
  ctx = canvas.getContext('2d');

  petX = canvas.width / 2 - petWidth / 2;
  petY = canvas.height - petHeight - 10;

  score = 0;
  coins = [];
  obstacles = [];
  gameRunning = false;
  countdown = 30;
  imagesLoaded = 0;

  loadImage(petImg, petType === 'cat' ? 'static/images/cat_happy.png' : 'static/images/dog_happy.png');
  loadImage(coinImg, 'static/images/coin.png');
  loadImage(boneImg, 'static/images/bone.png');
  loadImage(puddleImg, 'static/images/puddle.png');

  const coinsDiv = document.getElementById('runnerCoins');
  if(coinsDiv) coinsDiv.innerText = `Coins 🪙 0`;

  drawStartScreen();
  updateTimerDisplay();
}

function drawStartScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#cce0ff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  ctx.font = '36px Arial';
  ctx.fillText('Click ▶ Start Game', canvas.width/2 - 150, canvas.height/2);
}

document.getElementById('runnerStartBtn').onclick = () => {
  if (gameRunning) return;
  if (imagesLoaded < TOTAL_IMAGES) { alert("Loading images, please wait..."); return; }
  startGame();
};

document.addEventListener('keydown', e => {
  if (!gameRunning) return;
  if (e.code === 'ArrowLeft') petX -= 15;
  if (e.code === 'ArrowRight') petX += 15;
  if (petX < 0) petX = 0;
  if (petX + petWidth > canvas.width) petX = canvas.width - petWidth;
});

function spawnCoin() { coins.push({ x: Math.random()*(canvas.width-40), y: -30, width: 40, height: 40 }); }
function spawnObstacle() {
  const type = Math.random()<0.5?'bone':'puddle';
  obstacles.push({ x: Math.random()*(canvas.width-40), y: -30, width: 50, height: 50, type });
}

function startGame() {
  gameRunning = true; score = 0; coins = []; obstacles = []; countdown = 30;
  const coinsDiv = document.getElementById('runnerCoins'); if(coinsDiv) coinsDiv.innerText = `Coins 🪙 0`;
  updateTimerDisplay();
  gameInterval = setInterval(gameLoop, 20);
  timerInterval = setInterval(()=>{
    countdown--; updateTimerDisplay();
    if(countdown<=0) endGame();
  },1000);
}

function updateTimerDisplay() { const timerEl=document.getElementById('gameTimer'); if(timerEl) timerEl.innerText=`Time left: ${countdown}s`; }

function gameLoop() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#cce0ff'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(petImg, petX, petY, petWidth, petHeight);

  if(Math.random()<0.02) spawnCoin();
  if(Math.random()<0.01) spawnObstacle();

  for(let i=coins.length-1;i>=0;i--){
    const c=coins[i]; c.y+=4;
    ctx.drawImage(coinImg, c.x,c.y,c.width,c.height);
    if(c.x<petX+petWidth && c.x+c.width>petX && c.y<petY+petHeight && c.y+c.height>petY){
      score++; coins.splice(i,1);
      const coinsDiv=document.getElementById('runnerCoins'); if(coinsDiv) coinsDiv.innerText=`Coins 🪙 ${score}`;
    }
    if(c.y>canvas.height) coins.splice(i,1);
  }

  for(let i=obstacles.length-1;i>=0;i--){
    const ob=obstacles[i]; ob.y+=5;
    if(ob.type==='bone') ctx.drawImage(boneImg, ob.x, ob.y, ob.width, ob.height);
    else ctx.drawImage(puddleImg, ob.x, ob.y, ob.width, ob.height);

    if(ob.x<petX+petWidth && ob.x+ob.width>petX && ob.y<petY+petHeight && ob.y+ob.height>petY){
      endGame(); return;
    }
    if(ob.y>canvas.height) obstacles.splice(i,1);
  }
}

function endGame() {
  clearInterval(gameInterval); clearInterval(timerInterval); gameRunning=false;

  ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#fff'; ctx.font='36px Arial'; ctx.fillText('Game Over!', canvas.width/2-100, canvas.height/2-20);
  ctx.font='24px Arial'; ctx.fillText(`Coins collected: ${score}`, canvas.width/2-90, canvas.height/2+20);

  updateCoinsOnServer(score,'runner'); // ✅ update server coins
}

/* ==================== QUIZ GAME ==================== */

let quizCoins = 0, currentQuestion = null, quizStarted = false;

function initQuiz() {
  quizCoins = 0; quizStarted = false; currentQuestion = null;

  document.getElementById('quizCoins').innerText = 'Coins 🪙 0';
  document.getElementById('quizQuestion').innerText = 'Click ▶ Start Quiz to begin';
  document.getElementById('quizAnswers').innerHTML = '';
  document.getElementById('quizControls').innerHTML = '';

  document.getElementById('quizStartBtn').disabled = false;
}

document.getElementById('quizStartBtn').onclick = () => {
  quizStarted = true; document.getElementById('quizStartBtn').disabled = true;
  showQuizQuestion();
};

function generateQuizQuestion() {
  const a = 1+Math.floor(Math.random()*10);
  const b = 1+Math.floor(Math.random()*10);
  const c = 1+Math.floor(Math.random()*10);
  const ops=['+','-']; const op1=ops[Math.floor(Math.random()*2)]; const op2=ops[Math.floor(Math.random()*2)];
  let answer=a; answer=op1==='+'?answer+b:answer-b; answer=op2==='+'?answer+c:answer-c;
  let options=[answer];
  while(options.length<4){ let r=answer+Math.floor(Math.random()*10)-5; if(!options.includes(r)) options.push(r);}
  options.sort(()=>Math.random()-0.5);
  return {question:`What is ${a} ${op1} ${b} ${op2} ${c}?`, answer, options};
}

function showQuizQuestion() {
  currentQuestion=generateQuizQuestion();
  const qDiv=document.getElementById('quizQuestion'); qDiv.innerText=currentQuestion.question;
  const answersDiv=document.getElementById('quizAnswers'); answersDiv.innerHTML='';
  currentQuestion.options.forEach(opt=>{
    const btn=document.createElement('button'); btn.className='quiz-btn'; btn.innerText=opt;
    btn.onclick=()=>checkQuizAnswer(opt); answersDiv.appendChild(btn);
  });
  document.getElementById('quizControls').innerHTML='';
}

function checkQuizAnswer(selected) {
  const correct=currentQuestion.answer;
  document.querySelectorAll('.quiz-btn').forEach(b=>b.disabled=true);
  const feedback=document.getElementById('quizQuestion');
  if(selected===correct){ quizCoins++; feedback.innerText='✅ Correct!'; }
  else feedback.innerText=`❌ Wrong! Correct answer was ${correct}`;
  document.getElementById('quizCoins').innerText=`Coins 🪙 ${quizCoins}`;
  showQuizControls();
}

function showQuizControls() {
  const controls=document.getElementById('quizControls'); controls.innerHTML='';
  const playAgain=document.createElement('button'); playAgain.innerText='▶ Play Again'; playAgain.className='quiz-control-btn'; playAgain.onclick=showQuizQuestion;
  const stop=document.createElement('button'); stop.innerText='⏹ Stop'; stop.className='quiz-control-btn stop';
  stop.onclick=()=>{ document.getElementById('quizQuestion').innerText=`🏁 Quiz ended! Total coins earned: 🪙 ${quizCoins}`;
    document.getElementById('quizAnswers').innerHTML=''; controls.innerHTML=''; document.getElementById('quizStartBtn').disabled=false;
    updateCoinsOnServer(quizCoins,'quiz'); };
  controls.appendChild(playAgain); controls.appendChild(stop);
}

/* ==================== MEMORY GAME ==================== */

let memoryCards=[], memoryFlipped=[], memoryMatched=[], memoryLevel=1, memoryCoins=0, timeLeft=30, memorytimerInterval=null;
const memoryImages=[
  '/static/images/memory1.png','/static/images/memory2.png','/static/images/memory3.png','/static/images/memory4.png',
  '/static/images/memory5.png','/static/images/memory6.png','/static/images/memory7.png','/static/images/memory8.png',
  '/static/images/memory9.png','/static/images/memory10.png','/static/images/memory11.png','/static/images/memory12.png'
];

function initMemory() {
  clearInterval(memorytimerInterval);
  memoryLevel=1; memoryCoins=0; memoryCards=[]; memoryFlipped=[]; memoryMatched=[];
  timeLeft=30;
  document.getElementById('memoryTimer').innerText='⏱️ 30s';
  document.getElementById('memoryInfo').innerText='Level 1 • Coins 🪙 0';
  document.getElementById('memoryGrid').innerHTML='<p style="font-size:20px;">Click ▶ Start Memory to begin</p>';
  document.getElementById('memoryStartBtn').disabled=false;
}

document.getElementById('memoryStartBtn').onclick=()=>{
  document.getElementById('memoryStartBtn').disabled=true; startMemoryLevel();
};

function startMemoryLevel() {
  clearInterval(memorytimerInterval);
  const pairs=Math.min(2+memoryLevel, memoryImages.length);
  const selected=memoryImages.slice(0,pairs);
  memoryCards=[...selected,...selected].sort(()=>Math.random()-0.5);
  memoryFlipped=[]; memoryMatched=[];
  timeLeft=Math.max(10,30-(memoryLevel-1)*3);
  startMemoryTimer();
  renderMemory();
}

function startMemoryTimer() {
  updateMemoryTimerUI();
  memorytimerInterval=setInterval(()=>{
    timeLeft--; updateMemoryTimerUI();
    if(timeLeft<=0){ clearInterval(memorytimerInterval);
      showPopup(`⏰ Time's up!<br>Coins earned: 🪙 ${memoryCoins}`,()=>initMemory());
      updateCoinsOnServer(memoryCoins,'memory');
    }
  },1000);
}

function updateMemoryTimerUI() { document.getElementById('memoryTimer').innerText=`⏱️ ${timeLeft}s`; }

function renderMemory() {
  const grid=document.getElementById('memoryGrid'); grid.innerHTML='';
  memoryCards.forEach((imgSrc,index)=>{
    const card=document.createElement('div'); card.className='memory-card';
    if(memoryFlipped.includes(index)||memoryMatched.includes(index)){ const img=document.createElement('img'); img.src=imgSrc; card.appendChild(img); }
    else card.innerText='❓';
    card.onclick=()=>flipMemoryCard(index);
    grid.appendChild(card);
  });
  document.getElementById('memoryInfo').innerText=`Level ${memoryLevel} • Coins 🪙 ${memoryCoins}`;
}

function flipMemoryCard(index){
  if(memoryFlipped.length===2||memoryFlipped.includes(index)||memoryMatched.includes(index)) return;
  memoryFlipped.push(index); renderMemory();
  if(memoryFlipped.length===2){
    const [a,b]=memoryFlipped;
    if(memoryCards[a]===memoryCards[b]){
      memoryMatched.push(a,b); memoryCoins++; memoryFlipped=[];
      if(memoryMatched.length===memoryCards.length){
        clearInterval(memorytimerInterval);
        showPopup(`🎉 Level ${memoryLevel} Complete!<br>Coins: 🪙 ${memoryCoins}`,()=>{
          memoryLevel++; startMemoryLevel(); updateCoinsOnServer(memoryCoins,'memory');
        });
      }
    } else setTimeout(()=>{ memoryFlipped=[]; renderMemory(); },700);
  }
}

/* ==================== POPUP ==================== */
function showPopup(html, onClose) {
  const overlay=document.createElement('div'); overlay.className='popup-overlay';
  overlay.innerHTML=`<div class="popup-box"><div class="popup-text">${html}</div><button class="popup-btn">OK</button></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('button').onclick=()=>{ overlay.remove(); if(onClose) onClose(); };
}

/* ==================== INITIALIZE ==================== */
document.addEventListener('DOMContentLoaded', async()=>{
  await loadUserData(); loadPlayerInfo(); initRunner('cat'); initQuiz(); initMemory();
  refreshLeaderboard('runner');
});
