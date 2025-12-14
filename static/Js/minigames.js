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

/* ==================== COIN CATCHER WITH OBSTACLES ==================== */

let canvas, ctx;
let petX, petY, petWidth = 80, petHeight = 80;
let coins = [];
let obstacles = [];
let score = 0;
let gameInterval = null;
let gameRunning = false;
let countdown = 30; // seconds
let timerInterval = null;

// Load pet and asset images
const petImg = new Image();
const coinImg = new Image();
const boneImg = new Image();
const puddleImg = new Image();

let imagesLoaded = 0;
const TOTAL_IMAGES = 4;

function loadImage(img, src) {
  img.src = src;
  img.onload = () => imagesLoaded++;
  img.onerror = () => imagesLoaded++;
}

// Initialize game
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

  drawStartScreen();
  updateTimerDisplay();
}

// Start button
document.getElementById('runnerStartBtn').onclick = () => {
  if (gameRunning) return;
  if (imagesLoaded < TOTAL_IMAGES) {
    alert("Loading images, please wait...");
    return;
  }
  startGame();
};

// Keyboard input
document.addEventListener('keydown', e => {
  if (!gameRunning) return;
  if (e.code === 'ArrowLeft') petX -= 15;
  if (e.code === 'ArrowRight') petX += 15;

  if (petX < 0) petX = 0;
  if (petX + petWidth > canvas.width) petX = canvas.width - petWidth;
});

// Spawn coins and obstacles
function spawnCoin() {
  const x = Math.random() * (canvas.width - 40);
  coins.push({ x: x, y: -30, width: 40, height: 40 });
}

function spawnObstacle() {
  const x = Math.random() * (canvas.width - 40);
  const type = Math.random() < 0.5 ? 'bone' : 'puddle';
  obstacles.push({ x: x, y: -30, width: 50, height: 50, type: type });
}

// Start game
function startGame() {
  gameRunning = true;
  score = 0;
  coins = [];
  obstacles = [];
  countdown = 30;
  updateTimerDisplay();

  gameInterval = setInterval(gameLoop, 20);
  timerInterval = setInterval(() => {
    countdown--;
    updateTimerDisplay();
    if (countdown <= 0) endGame();
  }, 1000);
}

// Update timer UI
function updateTimerDisplay() {
  const timerEl = document.getElementById('gameTimer');
  timerEl.innerText = `Time left: ${countdown}s`;
}

// Game loop
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = '#cce0ff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw pet
  ctx.drawImage(petImg, petX, petY, petWidth, petHeight);

  // Spawn coins & obstacles occasionally
  if (Math.random() < 0.02) spawnCoin();
  if (Math.random() < 0.01) spawnObstacle();

  // Move coins
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    c.y += 4;
    ctx.drawImage(coinImg, c.x, c.y, c.width, c.height);

    if (c.x < petX + petWidth &&
        c.x + c.width > petX &&
        c.y < petY + petHeight &&
        c.y + c.height > petY) {
      score++;
      coins.splice(i, 1);
    }

    if (c.y > canvas.height) coins.splice(i, 1);
  }

  // Move obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const ob = obstacles[i];
    ob.y += 5;

    if (ob.type === 'bone') ctx.drawImage(boneImg, ob.x, ob.y, ob.width, ob.height);
    else ctx.drawImage(puddleImg, ob.x, ob.y, ob.width, ob.height);

    // Collision → Game Over
    if (ob.x < petX + petWidth &&
        ob.x + ob.width > petX &&
        ob.y < petY + petHeight &&
        ob.y + ob.height > petY) {
      endGame();
      return;
    }

    if (ob.y > canvas.height) obstacles.splice(i, 1);
  }

  // Score display
  ctx.fillStyle = '#000';
  ctx.font = '24px Arial';
  ctx.fillText(`Coins: ${score}`, 10, 30);
}

// End game
function endGame() {
  clearInterval(gameInterval);
  clearInterval(timerInterval);
  gameRunning = false;

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#fff';
  ctx.font = '36px Arial';
  ctx.fillText('Game Over!', canvas.width / 2 - 100, canvas.height / 2 - 20);
  ctx.font = '24px Arial';
  ctx.fillText(`Coins collected: ${score}`, canvas.width / 2 - 90, canvas.height / 2 + 20);

  // Retry button
  const retryBtn = document.createElement('button');
  retryBtn.innerText = 'Retry';
  retryBtn.style.position = 'absolute';
  retryBtn.style.left = canvas.getBoundingClientRect().left + canvas.width / 2 - 40 + 'px';
  retryBtn.style.top = canvas.getBoundingClientRect().top + canvas.height / 2 + 50 + 'px';
  retryBtn.style.padding = '10px 20px';
  retryBtn.style.fontSize = '18px';
  retryBtn.style.zIndex = 1000;

  document.body.appendChild(retryBtn);

  retryBtn.onclick = () => {
    retryBtn.remove();
    initRunner(petImg.src.includes('cat') ? 'cat' : 'dog');
  };
}

// Initialize default pet
initRunner('cat');



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







