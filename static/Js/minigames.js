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

function initRunner(petType='cat'){
  clearInterval(runnerInterval);

  canvas = document.getElementById('runnerCanvas');
  canvas.width = 800;
  canvas.height = 400;
  ctx = canvas.getContext('2d');

  petImg.src = petType==='cat'?'static/images/cat_happy.png':'static/images/dog_happy.png';
  coinImg.src = 'static/images/coin.png';
  boneImg.src = 'static/images/bone.png';
  puddleImg.src = 'static/images/puddle.png';

  runnerY = canvas.height - 80; // ground level
  runnerVy = 0;
  obstacles = [];
  score = 0;
  speed = 6;

  alert("Runner Instructions:\nPress SPACE to jump.\nCollect coins.\nAvoid bones and puddles!");

  document.onkeydown = function(e){
    if(e.code==='Space'){
      e.preventDefault(); // prevents page scroll
      if(runnerY>=canvas.height-80) runnerVy = -12;
    }
  };

  runnerInterval = setInterval(runGameLoop, 20);
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
  if(Math.random() < 0.02){ 
    obstacles.push({x:canvas.width, y:canvas.height-70, w:30, h:30, type:'bone'});
  }
  if(Math.random() < 0.01){
    obstacles.push({x:canvas.width, y:canvas.height-120-Math.random()*40, w:25, h:25, type:'coin'});
  }
  if(Math.random() < 0.01){
    obstacles.push({x:canvas.width, y:canvas.height-70, w:30, h:30, type:'puddle'});
  }

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
      else { score = Math.max(score-1,0); alert("💦 Hit obstacle!"); }
      obstacles.splice(i,1);
    }

    // Remove off-screen
    if(ob.x + ob.w < 0) obstacles.splice(i,1);
  }

  // Gradually increase speed
  speed = 6 + Math.floor(score/5);

  // Pet bounce animation
  let petOffsetY = runnerY + Math.sin(Date.now()/100)*2;
  ctx.drawImage(petImg,50-25,petOffsetY-25,50,50);

  // Score display
  ctx.fillStyle='black';
  ctx.font='22px Arial';
  ctx.fillText('Score: '+score,canvas.width-150,30);
}

/* ==================== QUIZ GAME ==================== */
let quizCoins=0;

function initQuiz(){
  quizCoins=0;
  alert("Quiz Instructions:\nSolve math questions.\nClick your choice to answer.\nCorrect answers give coins!");
  showQuizQuestion();
}

function generateQuizQuestion(){
  const nums=[1+Math.floor(Math.random()*10),1+Math.floor(Math.random()*10),1+Math.floor(Math.random()*10)];
  const ops=[Math.random()<0.5?'+':'-', Math.random()<0.5?'+':'-'];
  const question=`What is ${nums[0]} ${ops[0]} ${nums[1]} ${ops[1]} ${nums[2]}?`;
  let answer=nums[0]; 
  answer=ops[0]==='+'?answer+nums[1]:answer-nums[1]; 
  answer=ops[1]==='+'?answer+nums[2]:answer-nums[2];
  let options=[answer];
  while(options.length<3){
    let r=answer+Math.floor(Math.random()*6)-3;
    if(!options.includes(r)) options.push(r);
  }
  options.sort(()=>Math.random()-0.5);
  return {question,answer,options};
}

function showQuizQuestion(){
  const q=generateQuizQuestion();
  const qDiv=document.getElementById('quizQuestion');
  qDiv.innerText=q.question;
  qDiv.style.fontSize='36px';

  const answersDiv=document.getElementById('quizAnswers');
  answersDiv.innerHTML='';
  q.options.forEach(opt=>{
    const btn=document.createElement('button');
    btn.innerText=opt;
    btn.style.fontSize='28px';
    btn.style.padding='12px 20px';
    btn.style.margin='5px';
    btn.style.backgroundColor='#FFD700';
    btn.style.border='2px solid #FFA500';
    btn.style.borderRadius='10px';
    btn.onclick=()=>checkQuizAnswer(opt,q.answer);
    answersDiv.appendChild(btn);
  });
}

function checkQuizAnswer(selected,correct){
  if(selected===correct){
    alert("✅ Correct! +1 Coin");
    quizCoins+=1;
  } else {
    alert(`❌ Wrong! Correct answer was: ${correct}`);
  }
  if(confirm("Do you want to continue to the next question?")){
    showQuizQuestion();
  } else {
    alert(`You earned ${quizCoins} coins in total!`);
  }
}

/* ==================== MEMORY GAME WITH TIMER ==================== */
let memoryCards=[], memorySelected=[], memoryMatched=[];
let memoryLevel=1, memoryCoins=0, memoryTime=0, memoryTimerInterval=0;
const emojiList=['🍎','🍌','🍒','🥕','🍪','🧀','🍇','🍉','🥦','🥩','🍋','🍑'];

function initMemory(){
  memoryLevel=1; memoryCoins=0;
  alert("Memory Instructions:\nMatch all emoji cards before time runs out.\nHigher levels = less time!");
  startMemoryLevel(memoryLevel);
}

function startMemoryLevel(level){
  const numPairs = Math.min(emojiList.length, level+2);
  const selected = emojiList.slice(0,numPairs);
  memoryCards = [...selected,...selected];
  memoryCards.sort(()=>Math.random()-0.5);
  memorySelected=[]; memoryMatched=[];
  memoryTime = 30 - level*2; // less time per level
  renderMemory();
  if(memoryTimerInterval) clearInterval(memoryTimerInterval);
  memoryTimerInterval = setInterval(()=>{ 
    memoryTime--;
    if(memoryTime<=0){
      clearInterval(memoryTimerInterval);
      alert(`⏰ Time's up! Coins collected: ${memoryCoins}`);
      memoryLevel = 1; memoryCoins=0;
      startMemoryLevel(memoryLevel);
    }
    renderMemory();
  },1000);
}

function renderMemory(){
  const grid = document.getElementById('memoryGrid');
  grid.innerHTML='';
  memoryCards.forEach((card,i)=>{
    const btn = document.createElement('button');
    btn.style.fontSize='40px'; btn.style.width='70px'; btn.style.height='70px'; btn.style.margin='5px';
    btn.innerText = (memoryMatched.includes(i) || memorySelected.includes(i)) ? card : '❓';
    btn.onclick = () => selectMemoryCard(i);
    grid.appendChild(btn);
  });
  document.getElementById('memoryFeedback').innerText=
    `Level ${memoryLevel} - Matched: ${memoryMatched.length/2} - Coins: ${memoryCoins} - Time left: ${memoryTime}s`;
}

function selectMemoryCard(i){
  if(memorySelected.includes(i)||memoryMatched.includes(i)) return;
  memorySelected.push(i);

  if(memorySelected.length===2){
    if(memoryCards[memorySelected[0]]===memoryCards[memorySelected[1]]){
      memoryMatched.push(...memorySelected);
      memoryCoins+=1;
      alert("✅ Matched! +1 Coin");
    } else {
      alert("❌ Not matched!");
    }
    memorySelected=[];
    renderMemory();
    if(memoryMatched.length===memoryCards.length){
      clearInterval(memoryTimerInterval);
      memoryLevel++;
      alert(`🎉 Level Up! Coins: ${memoryCoins}`);
      startMemoryLevel(memoryLevel);
    }
  }
}
