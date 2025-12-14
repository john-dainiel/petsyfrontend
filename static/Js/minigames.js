const backendUrl = "https://petsy-dow7.onrender.com";
// Show selected game
function showGame(game) {
  const games = document.querySelectorAll('.game-container');
  games.forEach(g => g.style.display = 'none');
  document.getElementById(game).style.display = 'block';

  if (game === 'runner') initRunner();
  if (game === 'quiz') initQuiz();
  if (game === 'memory') initMemory();
}

/* ================= RUNNER GAME ================= */
let runnerInterval, runnerY, runnerVy, obstacles, score, canvas, ctx;
let petImg = new Image();
petImg.src = 'static/images/pet.png';
let coinImg = new Image();
coinImg.src = 'static/images/coin.png';
let bgImg = new Image();
bgImg.src = 'static/images/background.png';

function initRunner() {
  clearInterval(runnerInterval);

  canvas = document.getElementById('runnerCanvas');
  ctx = canvas.getContext('2d');

  runnerY = 300;
  runnerVy = 0;
  obstacles = [];
  score = 0;

  document.onkeydown = function(e) {
    if (e.code === 'Space' && runnerY === 300) {
      runnerVy = -12;
    }
  };

  runnerInterval = setInterval(runGameLoop, 20);
}

function runGameLoop() {
  // Draw background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

  // Gravity
  runnerVy += 0.6;
  runnerY += runnerVy;
  if (runnerY > 300) runnerY = 300, runnerVy = 0;

  // Draw runner pet
  ctx.drawImage(petImg, 50 - 25, runnerY - 25, 50, 50);

  // Obstacles (coins)
  if (Math.random() < 0.02) obstacles.push({ x: 600, y: 320, w: 20, h: 20 });
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let ob = obstacles[i];
    ob.x -= 6;
    ctx.drawImage(coinImg, ob.x, ob.y, ob.w, ob.h);

    // Collision
    if (50 + 25 > ob.x && 50 - 25 < ob.x + ob.w && runnerY + 25 > ob.y) {
      obstacles.splice(i, 1);
      score += 1; // collect coin
    }

    if (ob.x + ob.w < 0) obstacles.splice(i, 1);
  }

  // Score
  ctx.fillStyle = 'black';
  ctx.font = '20px Arial';
  ctx.fillText('Score: ' + score, 500, 30);
}

/* ================= QUIZ GAME ================= */
const quizData = [
  { q: "Which is your pet?", a: ["static/images/pet.png", "static/images/coin.png"], correct: 0 },
  { q: "Which is a coin?", a: ["static/images/pet.png", "static/images/coin.png"], correct: 1 }
];

let currentQuiz = 0;

function initQuiz() {
  currentQuiz = 0;
  showQuizQuestion();
}

function showQuizQuestion() {
  const q = quizData[currentQuiz];
  document.getElementById('quizQuestion').innerText = q.q;

  const answersDiv = document.getElementById('quizAnswers');
  answersDiv.innerHTML = '';
  q.a.forEach((ans, i) => {
    const img = document.createElement('img');
    img.src = ans;
    img.width = 100;
    img.style.margin = '10px';
    img.style.cursor = 'pointer';
    img.onclick = () => checkQuizAnswer(i);
    answersDiv.appendChild(img);
  });
  document.getElementById('quizFeedback').innerText = '';
}

function checkQuizAnswer(i) {
  const feedback = document.getElementById('quizFeedback');
  if (i === quizData[currentQuiz].correct) feedback.innerText = '✅ Correct!';
  else feedback.innerText = '❌ Try again!';
  currentQuiz = (currentQuiz + 1) % quizData.length;
  setTimeout(showQuizQuestion, 1000);
}

/* ================= MEMORY GAME ================= */
let memoryCards = [], memorySelected = [], memoryMatched = [];
function initMemory() {
  const images = ['static/images/pet.png','static/images/coin.png'];
  memoryCards = [...images, ...images].sort(() => Math.random() - 0.5);
  memorySelected = [];
  memoryMatched = [];
  renderMemory();
}

function renderMemory() {
  const grid = document.getElementById('memoryGrid');
  grid.innerHTML = '';
  memoryCards.forEach((card, i) => {
    const btn = document.createElement('button');
    if (memoryMatched.includes(i) || memorySelected.includes(i)) {
      const img = document.createElement('img');
      img.src = card;
      img.width = 60;
      btn.appendChild(img);
    } else {
      btn.innerText = '?';
    }
    btn.onclick = () => selectMemoryCard(i);
    grid.appendChild(btn);
  });
  document.getElementById('memoryFeedback').innerText = `Matched: ${memoryMatched.length/2} pairs`;
}

function selectMemoryCard(i) {
  if (memorySelected.includes(i) || memoryMatched.includes(i)) return;
  memorySelected.push(i);
  if (memorySelected.length === 2) {
    if (memoryCards[memorySelected[0]] === memoryCards[memorySelected[1]]) {
      memoryMatched.push(...memorySelected);
    }
    setTimeout(() => { memorySelected = []; renderMemory(); }, 500);
  }
  renderMemory();
}
