const backendUrl = "https://petsy-dow7.onrender.com";
// Show selected game
/* ==================== GAME SELECTION ==================== */
function showGame(game, petType = 'cat') {
  const games = document.querySelectorAll('.game-container');
  games.forEach(g => g.style.display = 'none');
  document.getElementById(game).style.display = 'block';

  if (game === 'runner') initRunner(petType);
  if (game === 'quiz') initQuiz();
  if (game === 'memory') initMemory();
}

/* ==================== SIMPLE PET RUNNER ==================== */
let runnerInterval, runnerY, runnerVy, obstacles, score, canvas, ctx;
let petImg = new Image();
let coinImg = new Image();
let bgImg = new Image();

function initRunner(petType = 'cat') {
  clearInterval(runnerInterval);

  canvas = document.getElementById('runnerCanvas');
  ctx = canvas.getContext('2d');

  // Load images depending on pet type
  petImg.src = petType === 'cat' ? 'static/images/cat_happy.png' : 'static/images/dog_happy.png';
  coinImg.src = 'static/images/coin.png';
  bgImg.src = 'static/images/background.png';

  runnerY = 300;
  runnerVy = 0;
  obstacles = [];
  score = 0;

  document.onkeydown = function(e) {
    if (e.code === 'Space' && runnerY === 300) runnerVy = -12;
  };

  runnerInterval = setInterval(runGameLoop, 20);
}

function runGameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw background
  ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

  // Gravity
  runnerVy += 0.6;
  runnerY += runnerVy;
  if (runnerY > 300) runnerY = 300, runnerVy = 0;

  // Draw pet
  ctx.drawImage(petImg, 50 - 25, runnerY - 25, 50, 50);

  // Coins
  if (Math.random() < 0.02) obstacles.push({ x: 600, y: 320, w: 20, h: 20, scale: 1 });
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let ob = obstacles[i];
    ob.x -= 6;

    // Draw coin
    ctx.drawImage(coinImg, ob.x, ob.y, ob.w, ob.h);

    // Collect coin
    if (50 + 25 > ob.x && 50 - 25 < ob.x + ob.w && runnerY + 25 > ob.y) {
      obstacles.splice(i, 1);
      score += 1;
    }

    if (ob.x + ob.w < 0) obstacles.splice(i, 1);
  }

  // Score
  ctx.fillStyle = 'black';
  ctx.font = '20px Arial';
  ctx.fillText('Score: ' + score, 500, 30);
}

/* ==================== QUIZ GAME ==================== */
let currentQuiz = 0;

function initQuiz() {
  currentQuiz = 0;
  showQuizQuestion();
}

function generateMathQuestion() {
  const nums = [
    1 + Math.floor(Math.random() * 10),
    1 + Math.floor(Math.random() * 10),
    1 + Math.floor(Math.random() * 10)
  ];
  const ops = [
    Math.random() < 0.5 ? '+' : '-',
    Math.random() < 0.5 ? '+' : '-'
  ];
  const question = `${nums[0]} ${ops[0]} ${nums[1]} ${ops[1]} ${nums[2]} = ?`;

  // Evaluate correct answer
  let answer = nums[0];
  answer = ops[0] === '+' ? answer + nums[1] : answer - nums[1];
  answer = ops[1] === '+' ? answer + nums[2] : answer - nums[2];

  // Generate options
  let options = [answer];
  while (options.length < 4) {
    let r = answer + Math.floor(Math.random() * 10) - 5;
    if (!options.includes(r)) options.push(r);
  }

  options.sort(() => Math.random() - 0.5);
  return { question, answer, options };
}

function showQuizQuestion() {
  const q = generateMathQuestion();
  document.getElementById('quizQuestion').innerText = q.question;

  const answersDiv = document.getElementById('quizAnswers');
  answersDiv.innerHTML = '';

  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.innerText = opt;
    btn.onclick = () => checkQuizAnswer(opt, q.answer);
    answersDiv.appendChild(btn);
  });
  document.getElementById('quizFeedback').innerText = '';
}

function checkQuizAnswer(selected, correct) {
  const feedback = document.getElementById('quizFeedback');
  if (selected === correct) feedback.innerText = '✅ Correct!';
  else feedback.innerText = '❌ Try again!';
  setTimeout(showQuizQuestion, 1000);
}

/* ==================== MEMORY GAME ==================== */
let memoryCards = [], memorySelected = [], memoryMatched = [];
let memoryLevel = 1, memoryAllImages = [];

function initMemory() {
  memoryAllImages = [];
  // Load all your saved images in static/images for memory
  for (let i = 1; i <= 20; i++) {
    memoryAllImages.push(`static/images/memory${i}.png`); // adjust filenames if necessary
  }
  memoryLevel = 1;
  startMemoryLevel(memoryLevel);
}

function startMemoryLevel(level) {
  const numPairs = Math.min(memoryAllImages.length, level + 1);
  const selectedImages = memoryAllImages.slice(0, numPairs);
  memoryCards = [...selectedImages, ...selectedImages].sort(() => Math.random() - 0.5);
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
  document.getElementById('memoryFeedback').innerText = `Level ${memoryLevel} - Matched: ${memoryMatched.length/2} pairs`;
}

function selectMemoryCard(i) {
  if (memorySelected.includes(i) || memoryMatched.includes(i)) return;
  memorySelected.push(i);
  if (memorySelected.length === 2) {
    if (memoryCards[memorySelected[0]] === memoryCards[memorySelected[1]]) {
      memoryMatched.push(...memorySelected);
    }
    setTimeout(() => {
      memorySelected = [];
      renderMemory();
      if (memoryMatched.length === memoryCards.length) {
        memoryLevel++;
        alert('🎉 Level Up!');
        startMemoryLevel(memoryLevel);
      }
    }, 500);
  }
  renderMemory();
}

