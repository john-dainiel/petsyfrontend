const backendUrl = "https://petsy-dow7.onrender.com";

/* ==================== GAME SELECTION ==================== */
function showGame(game, petType = 'cat') {
  document.querySelectorAll('.game-container')
    .forEach(g => g.style.display = 'none');

  document.getElementById(game).style.display = 'block';

  if (game === 'runner') prepareRunner(petType);
  if (game === 'quiz') prepareQuiz();
  if (game === 'memory') prepareMemory();
}

/* ==================== RUNNER GAME ==================== */
let runnerInterval, runnerY, runnerVy, obstacles, score, canvas, ctx, speed;
let petImg = new Image(), coinImg = new Image();
let boneImg = new Image(), puddleImg = new Image();
let runnerRunning = false;

function prepareRunner(petType){
  canvas = document.getElementById('runnerCanvas');
  ctx = canvas.getContext('2d');

  petImg.src = petType==='cat'
    ? '/static/images/cat_happy.png'
    : '/static/images/dog_happy.png';

  coinImg.src = '/static/images/coin.png';
  boneImg.src = '/static/images/bone.png';
  puddleImg.src = '/static/images/puddle.png';

  document.getElementById('runnerStartBtn').onclick = startRunner;
}

function startRunner(){
  clearInterval(runnerInterval);

  runnerY = 320;
  runnerVy = 0;
  obstacles = [];
  score = 0;
  speed = 6;
  runnerRunning = true;

  runnerInterval = setInterval(runGameLoop, 20);
}

document.addEventListener('keydown', e => {
  if(e.code === 'Space' && runnerRunning){
    e.preventDefault();
    if(runnerY >= 320) runnerVy = -12;
  }
});

function runGameLoop(){
  ctx.clearRect(0,0,800,400);

  ctx.fillStyle = '#eaf6ff';
  ctx.fillRect(0,360,800,40);

  runnerVy += 0.6;
  runnerY += runnerVy;
  if(runnerY > 320) runnerY = 320, runnerVy = 0;

  if(Math.random() < 0.02)
    obstacles.push({x:800,y:330,w:30,h:30,type:'bone'});

  if(Math.random() < 0.01)
    obstacles.push({x:800,y:260,w:25,h:25,type:'coin'});

  obstacles.forEach((ob,i)=>{
    ob.x -= speed;

    if(ob.type==='bone') ctx.drawImage(boneImg,ob.x,ob.y,ob.w,ob.h);
    if(ob.type==='coin') ctx.drawImage(coinImg,ob.x,ob.y,ob.w,ob.h);

    if(75>ob.x && 25<ob.x+ob.w && runnerY+50>ob.y){
      if(ob.type==='coin'){
        score++;
        obstacles.splice(i,1);
      } else {
        clearInterval(runnerInterval);
        runnerRunning=false;
        showPopup(`💥 Game Over<br>Score: ${score}`);
      }
    }
  });

  speed = 6 + Math.floor(score/5);
  ctx.drawImage(petImg,25,runnerY,50,50);

  ctx.fillStyle='black';
  ctx.font='20px Arial';
  ctx.fillText(`Score: ${score}`,650,30);
}

/* ==================== QUIZ GAME ==================== */
let quizCoins=0, quizTimer, quizTimeLeft;

function prepareQuiz(){
  document.getElementById('quizStartBtn').onclick = startQuiz;
}

function startQuiz(){
  quizCoins = 0;
  quizTimeLeft = 15;
  showQuizQuestion();
  startQuizTimer();
}

function startQuizTimer(){
  clearInterval(quizTimer);
  quizTimer = setInterval(()=>{
    quizTimeLeft--;
    document.getElementById('quizTimer').innerText = `⏱️ ${quizTimeLeft}s`;
    if(quizTimeLeft<=0){
      clearInterval(quizTimer);
      showPopup(`⏰ Time's up!<br>Coins: ${quizCoins}`);
    }
  },1000);
}

function generateQuizQuestion(){
  const a=Math.floor(Math.random()*10)+1;
  const b=Math.floor(Math.random()*10)+1;
  const c=Math.floor(Math.random()*10)+1;
  const ans=a+b-c;
  const opts=[ans,ans+2,ans-2].sort(()=>Math.random()-0.5);
  return {q:`${a} + ${b} - ${c} = ?`,ans,opts};
}

function showQuizQuestion(){
  const q=generateQuizQuestion();
  quizTimeLeft=15;

  document.getElementById('quizQuestion').innerText=q.q;
  const box=document.getElementById('quizAnswers');
  box.innerHTML='';

  q.opts.forEach(o=>{
    const b=document.createElement('button');
    b.innerText=o;
    b.onclick=()=>{
      if(o===q.ans) quizCoins++;
      showQuizQuestion();
    };
    box.appendChild(b);
  });
}

/* ==================== MEMORY GAME (UNCHANGED LOGIC) ==================== */
function prepareMemory(){
  document.getElementById('memoryStartBtn').onclick = initMemory;
}

/* ==================== POPUP ==================== */
function showPopup(msg){
  const d=document.createElement('div');
  d.className='popup-overlay';
  d.innerHTML=`<div class="popup-box">${msg}<br><button>OK</button></div>`;
  document.body.appendChild(d);
  d.querySelector('button').onclick=()=>d.remove();
}
