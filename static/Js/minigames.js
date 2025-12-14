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

/* ==================== RUNNER GAME ==================== */
let runnerInterval, runnerY, runnerVy, obstacles, score, canvas, ctx, speed;
let petImg = new Image(), coinImg = new Image();
let boneImg = new Image(), puddleImg = new Image();
let runnerRunning = false;

function initRunner(petType='cat'){
  canvas = document.getElementById('runnerCanvas');
  canvas.width = 800;
  canvas.height = 400;
  ctx = canvas.getContext('2d');

  petImg.src = petType==='cat'?'static/images/cat_happy.png':'static/images/dog_happy.png';
  coinImg.src = 'static/images/coin.png';
  boneImg.src = 'static/images/bone.png';
  puddleImg.src = 'static/images/puddle.png';

  runnerY = canvas.height - 80;
  runnerVy = 0;
  obstacles = [];
  score = 0;
  speed = 6;
  runnerRunning = false;

  document.getElementById('runnerStartBtn').onclick = () => {
    if(!runnerRunning){
      runnerRunning = true;
      alert("Runner Instructions:\nPress SPACE to jump.\nCollect coins.\nAvoid obstacles!");
      runnerInterval = setInterval(runGameLoop, 20);
    }
  };

  document.onkeydown = function(e){
    if(e.code==='Space'){
      e.preventDefault();
      if(runnerY>=canvas.height-80) runnerVy = -12;
    }
  };
}

function runGameLoop(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Draw ground
  ctx.fillStyle = '#cce0ff';
  ctx.fillRect(0,canvas.height-40,canvas.width,40);

  // Gravity
  runnerVy += 0.6;
  runnerY += runnerVy;
  if(runnerY>canvas.height-80) runnerY=canvas.height-80, runnerVy=0;

  // Spawn obstacles and coins
  if(Math.random() < 0.02){ obstacles.push({x:canvas.width, y:canvas.height-70, w:30, h:30, type:'bone'}); }
  if(Math.random() < 0.01){ obstacles.push({x:canvas.width, y:canvas.height-120-Math.random()*50, w:25, h:25, type:'coin'}); }
  if(Math.random() < 0.01){ obstacles.push({x:canvas.width, y:canvas.height-70, w:30, h:30, type:'puddle'}); }

  // Move and draw obstacles
  for(let i=obstacles.length-1;i>=0;i--){
    const ob = obstacles[i];
    ob.x -= speed;

    if(ob.type==='bone') ctx.drawImage(boneImg, ob.x, ob.y, ob.w, ob.h);
    else if(ob.type==='puddle') ctx.drawImage(puddleImg, ob.x, ob.y, ob.w, ob.h);
    else if(ob.type==='coin') ctx.drawImage(coinImg, ob.x, ob.y, ob.w, ob.h);

    // Collision detection
    if(50+25 > ob.x && 50-25 < ob.x+ob.w && runnerY+50 > ob.y && runnerY < ob.y+ob.h){
      if(ob.type==='coin'){ score+=1; alert("💰 Coin collected!"); }
      else { 
        alert(`💥 Game Over! Score: ${score}`);
        clearInterval(runnerInterval);
        runnerRunning = false;
        initRunner(); // reset game
        return;
      }
      obstacles.splice(i,1);
    }

    // Remove off-screen
    if(ob.x + ob.w < 0) obstacles.splice(i,1);
  }

  // Increase speed gradually
  speed = 6 + Math.floor(score/5);

  // Pet bounce
  let petOffsetY = runnerY + Math.sin(Date.now()/100)*2;
  ctx.drawImage(petImg,50-25,petOffsetY-25,50,50);

  // Score
  ctx.fillStyle='black';
  ctx.font='22px Arial';
  ctx.fillText('Score: '+score,canvas.width-150,30);
}

/* ==================== QUIZ GAME ==================== */

let quizCoins = 0;
let currentQuestion = null;
let quizStarted = false;

/* ---------- INIT ---------- */
function initQuiz() {
  quizCoins = 0;
  quizStarted = false;
  currentQuestion = null;

  document.getElementById('quizCoins').innerText = 'Coins 🪙 0';
  document.getElementById('quizQuestion').innerText =
    'Click ▶ Start Quiz to begin';

  document.getElementById('quizAnswers').innerHTML = '';
  document.getElementById('quizControls').innerHTML = '';

  document.getElementById('quizStartBtn').disabled = false;
}

/* ---------- START BUTTON ---------- */
document.getElementById('quizStartBtn').onclick = () => {
  quizStarted = true;
  document.getElementById('quizStartBtn').disabled = true;
  showQuizQuestion();
};

/* ---------- QUESTION GENERATOR ---------- */
function generateQuizQuestion() {
  const a = 1 + Math.floor(Math.random() * 10);
  const b = 1 + Math.floor(Math.random() * 10);
  const c = 1 + Math.floor(Math.random() * 10);

  const ops = ['+', '-'];
  const op1 = ops[Math.floor(Math.random() * 2)];
  const op2 = ops[Math.floor(Math.random() * 2)];

  let answer = a;
  answer = op1 === '+' ? answer + b : answer - b;
  answer = op2 === '+' ? answer + c : answer - c;

  let options = [answer];
  while (options.length < 4) {
    let r = answer + Math.floor(Math.random() * 10) - 5;
    if (!options.includes(r)) options.push(r);
  }

  options.sort(() => Math.random() - 0.5);

  return {
    question: `What is ${a} ${op1} ${b} ${op2} ${c}?`,
    answer,
    options
  };
}

/* ---------- SHOW QUESTION ---------- */
function showQuizQuestion() {
  currentQuestion = generateQuizQuestion();

  const qDiv = document.getElementById('quizQuestion');
  qDiv.innerText = currentQuestion.question;

  const answersDiv = document.getElementById('quizAnswers');
  answersDiv.innerHTML = '';

  currentQuestion.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'quiz-btn';
    btn.innerText = opt;

    btn.onclick = () => checkQuizAnswer(opt);
    answersDiv.appendChild(btn);
  });

  document.getElementById('quizControls').innerHTML = '';
}

/* ---------- CHECK ANSWER ---------- */
function checkQuizAnswer(selected) {
  const correct = currentQuestion.answer;
  const feedback = document.getElementById('quizQuestion');

  document.querySelectorAll('.quiz-btn').forEach(b => b.disabled = true);

  if (selected === correct) {
    quizCoins++;
    feedback.innerText = '✅ Correct!';
  } else {
    feedback.innerText = `❌ Wrong! Correct answer was ${correct}`;
  }

  document.getElementById('quizCoins').innerText =
    `Coins 🪙 ${quizCoins}`;

  showQuizControls();
}

/* ---------- PLAY AGAIN / STOP ---------- */
function showQuizControls() {
  const controls = document.getElementById('quizControls');
  controls.innerHTML = '';

  const playAgain = document.createElement('button');
  playAgain.innerText = '▶ Play Again';
  playAgain.className = 'quiz-control-btn';
  playAgain.onclick = showQuizQuestion;

  const stop = document.createElement('button');
  stop.innerText = '⏹ Stop';
  stop.className = 'quiz-control-btn stop';
  stop.onclick = () => {
    document.getElementById('quizQuestion').innerText =
      `🏁 Quiz ended! Total coins earned: 🪙 ${quizCoins}`;
    document.getElementById('quizAnswers').innerHTML = '';
    controls.innerHTML = '';
    document.getElementById('quizStartBtn').disabled = false;
  };

  controls.appendChild(playAgain);
  controls.appendChild(stop);
}

/* ==================== MEMORY GAME ==================== */

let memoryCards = [];
let memoryFlipped = [];
let memoryMatched = [];
let memoryLevel = 1;
let memoryCoins = 0;
let timeLeft = 30;
let timerInterval = null;

/* 🔹 IMAGE PATHS */
const memoryImages = [
  '/static/images/memory1.png',
  '/static/images/memory2.png',
  '/static/images/memory3.png',
  '/static/images/memory4.png',
  '/static/images/memory5.png',
  '/static/images/memory6.png',
  '/static/images/memory7.png',
  '/static/images/memory8.png',
  '/static/images/memory9.png',
  '/static/images/memory10.png',
  '/static/images/memory11.png',
  '/static/images/memory12.png'
];

/* ---------- INIT (NO AUTO START) ---------- */
function initMemory() {
  clearInterval(timerInterval);

  memoryLevel = 1;
  memoryCoins = 0;
  memoryCards = [];
  memoryFlipped = [];
  memoryMatched = [];

  timeLeft = 30;

  document.getElementById('memoryTimer').innerText = '⏱️ 30s';
  document.getElementById('memoryInfo').innerText =
    'Level 1 • Coins 🪙 0';

  document.getElementById('memoryGrid').innerHTML =
    '<p style="font-size:20px;">Click ▶ Start Memory to begin</p>';

  document.getElementById('memoryStartBtn').disabled = false;
}

/* ---------- START BUTTON ---------- */
document.getElementById('memoryStartBtn').onclick = () => {
  document.getElementById('memoryStartBtn').disabled = true;
  startMemoryLevel();
};

/* ---------- START LEVEL ---------- */
function startMemoryLevel() {
  clearInterval(timerInterval);

  const pairs = Math.min(2 + memoryLevel, memoryImages.length);
  const selected = memoryImages.slice(0, pairs);

  memoryCards = [...selected, ...selected].sort(() => Math.random() - 0.5);
  memoryFlipped = [];
  memoryMatched = [];

  // ✅ FIXED LINE
  timeLeft = Math.max(10, 30 - (memoryLevel - 1) * 3);

  startTimer();
  renderMemory();
}

/* ---------- TIMER (FIXED) ---------- */
function startTimer() {
  updateTimerUI();   // 👈 shows 30 immediately

  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerUI();

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      showPopup(
        `⏰ Time's up!<br>Coins earned: 🪙 ${memoryCoins}`,
        () => initMemory()
      );
    }
  }, 1000);
}

function updateTimerUI() {
  document.getElementById('memoryTimer').innerText = `⏱️ ${timeLeft}s`;
}

/* ---------- RENDER ---------- */
function renderMemory() {
  const grid = document.getElementById('memoryGrid');
  grid.innerHTML = '';

  memoryCards.forEach((imgSrc, index) => {
    const card = document.createElement('div');
    card.className = 'memory-card';

    if (memoryFlipped.includes(index) || memoryMatched.includes(index)) {
      const img = document.createElement('img');
      img.src = imgSrc;
      card.appendChild(img);
    } else {
      card.innerText = '❓';
    }

    card.onclick = () => flipCard(index);
    grid.appendChild(card);
  });

  document.getElementById('memoryInfo').innerText =
    `Level ${memoryLevel} • Coins 🪙 ${memoryCoins}`;
}

/* ---------- GAME LOGIC ---------- */
function flipCard(index) {
  if (
    memoryFlipped.length === 2 ||
    memoryFlipped.includes(index) ||
    memoryMatched.includes(index)
  ) return;

  memoryFlipped.push(index);
  renderMemory();

  if (memoryFlipped.length === 2) {
    const [a, b] = memoryFlipped;

    if (memoryCards[a] === memoryCards[b]) {
      memoryMatched.push(a, b);
      memoryCoins++;
      memoryFlipped = [];

      if (memoryMatched.length === memoryCards.length) {
        clearInterval(timerInterval);
        showPopup(
          `🎉 Level ${memoryLevel} Complete!<br>Coins: 🪙 ${memoryCoins}`,
          () => {
            memoryLevel++;
            startMemoryLevel();
          }
        );
      }
    } else {
      setTimeout(() => {
        memoryFlipped = [];
        renderMemory();
      }, 700);
    }
  }
}

/* ---------- POPUP ---------- */
function showPopup(html, onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';

  overlay.innerHTML = `
    <div class="popup-box">
      <div class="popup-text">${html}</div>
      <button class="popup-btn">OK</button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('button').onclick = () => {
    overlay.remove();
    if (onClose) onClose();
  };
}


