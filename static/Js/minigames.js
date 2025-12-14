const backendUrl = "https://petsy-dow7.onrender.com";

/* ==================== GAME SELECTION ==================== */
function showGame(game, petType = 'cat') {
  document.querySelectorAll('.game-container').forEach(g => g.style.display = 'none');
  document.getElementById(game).style.display = 'block';

  if (game === 'runner') initRunner(petType);
  if (game === 'quiz') showQuizStart();
  if (game === 'memory') showMemoryStart();
}

/* ==================== RUNNER GAME ==================== */
let canvas, ctx, runnerInterval;
let runnerY = 0, runnerVy = 0;
let obstacles = [];
let score = 0;
let speed = 6;
let runnerRunning = false;

const petImg = new Image();
const coinImg = new Image();
const boneImg = new Image();
const puddleImg = new Image();

function initRunner(petType = 'cat') {
  canvas = document.getElementById('runnerCanvas');
  ctx = canvas.getContext('2d');
  canvas.width = 800;
  canvas.height = 400;

  petImg.src = petType === 'cat'
    ? 'static/images/cat_happy.png'
    : 'static/images/dog_happy.png';

  coinImg.src = 'static/images/coin.png';
  boneImg.src = 'static/images/bone.png';
  puddleImg.src = 'static/images/puddle.png';

  runnerY = canvas.height - 90;
  runnerVy = 0;
  obstacles = [];
  score = 0;
  speed = 6;
  runnerRunning = false;

  clearInterval(runnerInterval);

  document.getElementById('runnerStartBtn').onclick = () => {
    if (!runnerRunning) {
      runnerRunning = true;
      runnerInterval = setInterval(runRunner, 20);
    }
  };
}

document.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (runnerY >= canvas.height - 90) {
      runnerVy = -14;
    }
  }
});

function runRunner() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ground
  ctx.fillStyle = "#e0e0e0";
  ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

  // gravity
  runnerVy += 0.7;
  runnerY += runnerVy;
  if (runnerY > canvas.height - 90) {
    runnerY = canvas.height - 90;
    runnerVy = 0;
  }

  // spawn
  if (Math.random() < 0.02)
    obstacles.push({ x: canvas.width, y: canvas.height - 70, w: 30, h: 30, type: 'bone' });

  if (Math.random() < 0.015)
    obstacles.push({ x: canvas.width, y: canvas.height - 140, w: 25, h: 25, type: 'coin' });

  // move & draw
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.x -= speed;

    if (o.type === 'bone') ctx.drawImage(boneImg, o.x, o.y, o.w, o.h);
    if (o.type === 'coin') ctx.drawImage(coinImg, o.x, o.y, o.w, o.h);

    // collision
    if (
      50 < o.x + o.w &&
      100 > o.x &&
      runnerY + 60 > o.y &&
      runnerY < o.y + o.h
    ) {
      if (o.type === 'coin') {
        score++;
        obstacles.splice(i, 1);
      } else {
        endRunner();
        return;
      }
    }

    if (o.x + o.w < 0) obstacles.splice(i, 1);
  }

  speed = 6 + Math.floor(score / 5);

  ctx.drawImage(petImg, 50, runnerY, 60, 60);

  ctx.fillStyle = "#000";
  ctx.font = "22px Arial";
  ctx.fillText(`Score: ${score}`, 20, 30);
}

function endRunner() {
  clearInterval(runnerInterval);
  runnerRunning = false;
  showPopup(`💥 Game Over<br>Score: ${score}`);
}

/* ==================== QUIZ GAME ==================== */
let quizCoins = 0;
let quizTime = 30;
let quizTimer = null;

function showQuizStart() {
  document.getElementById('quizQuestion').innerHTML = `
    <button onclick="startQuiz()" class="start-btn">Start Quiz</button>
  `;
  document.getElementById('quizAnswers').innerHTML = '';
}

function startQuiz() {
  quizCoins = 0;
  quizTime = 30;
  startQuizTimer();
  showQuizQuestion();
}

function startQuizTimer() {
  clearInterval(quizTimer);
  quizTimer = setInterval(() => {
    quizTime--;
    document.getElementById('quizTimer').innerText = `⏱️ ${quizTime}s`;
    if (quizTime <= 0) {
      clearInterval(quizTimer);
      showPopup(`⏰ Time's up!<br>Coins: 🪙 ${quizCoins}`);
    }
  }, 1000);
}

function generateQuizQuestion() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  const c = Math.floor(Math.random() * 10) + 1;
  const ops = ['+', '-'];

  const op1 = ops[Math.floor(Math.random() * 2)];
  const op2 = ops[Math.floor(Math.random() * 2)];

  let answer = eval(`${a}${op1}${b}${op2}${c}`);

  let options = [answer];
  while (options.length < 3) {
    let r = answer + Math.floor(Math.random() * 6) - 3;
    if (!options.includes(r)) options.push(r);
  }

  return {
    question: `What is ${a} ${op1} ${b} ${op2} ${c}?`,
    answer,
    options: options.sort(() => Math.random() - 0.5)
  };
}

function showQuizQuestion() {
  const q = generateQuizQuestion();
  document.getElementById('quizQuestion').innerText = q.question;

  const ans = document.getElementById('quizAnswers');
  ans.innerHTML = '';

  q.options.forEach(o => {
    const btn = document.createElement('button');
    btn.innerText = o;
    btn.onclick = () => {
      if (o === q.answer) quizCoins++;
      showQuizQuestion();
    };
    ans.appendChild(btn);
  });
}

/* ==================== MEMORY GAME (UNCHANGED) ==================== */
let memoryCards = [];
let memoryFlipped = [];
let memoryMatched = [];
let memoryLevel = 1;
let memoryCoins = 0;
let timeLeft = 30;
let timerInterval = null;

const memoryImages = [
  '/static/images/memory1.png',
  '/static/images/memory2.png',
  '/static/images/memory3.png',
  '/static/images/memory4.png'
];

function showMemoryStart() {
  document.getElementById('memoryGrid').innerHTML =
    `<button onclick="initMemory()" class="start-btn">Start Memory Game</button>`;
}

function initMemory() {
  memoryLevel = 1;
  memoryCoins = 0;
  startMemoryLevel();
}

/* === your memory logic BELOW stays the same === */

/* ==================== POPUP ==================== */
function showPopup(html) {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';
  overlay.innerHTML = `
    <div class="popup-box">
      <div class="popup-text">${html}</div>
      <button onclick="this.parentElement.parentElement.remove()">OK</button>
    </div>`;
  document.body.appendChild(overlay);
}
