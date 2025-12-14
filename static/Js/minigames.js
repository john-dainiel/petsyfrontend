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
let runnerInterval, runnerY, runnerVy, obstacles, score, canvas, ctx;
let petImg = new Image(), coinImg = new Image(), bgImg = new Image();
let boneImg = new Image(), puddleImg = new Image();

function initRunner(petType='cat'){
  clearInterval(runnerInterval);

  canvas = document.getElementById('runnerCanvas');
  canvas.width = 800;
  canvas.height = 400;
  ctx = canvas.getContext('2d');

  petImg.src = petType==='cat'?'static/images/cat_happy.png':'static/images/dog_happy.png';
  coinImg.src = 'static/images/coin.png';
  bgImg.src = 'static/images/park.png';
  boneImg.src = 'static/images/bone.png';
  puddleImg.src = 'static/images/puddle.png';

  runnerY = canvas.height - 100; runnerVy = 0;
  obstacles = []; score = 0;

  alert("Instructions: Press SPACE to jump. Collect coins. Avoid bones and puddles!");

  document.onkeydown = function(e){
    if(e.code==='Space' && runnerY>=canvas.height-100) runnerVy=-12;
  };

  runnerInterval = setInterval(runGameLoop, 20);
}

function runGameLoop(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Background
  ctx.drawImage(bgImg,0,0,canvas.width,canvas.height);

  // Gravity
  runnerVy+=0.6;
  runnerY+=runnerVy;
  if(runnerY>canvas.height-100) runnerY=canvas.height-100, runnerVy=0;

  // Obstacles and coins
  if(Math.random()<0.02){
    const type = Math.random()<0.5?'bone':'puddle';
    obstacles.push({x:canvas.width, y:type==='puddle'?canvas.height-50:canvas.height-70, w:30, h:30, type});
  }
  if(Math.random()<0.01) obstacles.push({x:canvas.width, y:canvas.height-70, w:20, h:20, type:'coin'});

  for(let i=obstacles.length-1;i>=0;i--){
    const ob=obstacles[i];
    ob.x-=6;
    if(ob.type==='bone') ctx.drawImage(boneImg, ob.x, ob.y, ob.w, ob.h);
    else if(ob.type==='puddle') ctx.drawImage(puddleImg, ob.x, ob.y, ob.w, ob.h);
    else if(ob.type==='coin') ctx.drawImage(coinImg, ob.x, ob.y, ob.w, ob.h);

    // Collision
    if(50+25>ob.x && 50-25<ob.x+ob.w && runnerY+25>ob.y){
      if(ob.type==='coin'){score+=1;}
      else {alert('💦 You hit an obstacle!'); score=Math.max(score-1,0);}
      obstacles.splice(i,1);
    }
    if(ob.x+ob.w<0) obstacles.splice(i,1);
  }

  // Draw pet on top
  ctx.drawImage(petImg,50-25,runnerY-25,50,50);

  // Score
  ctx.fillStyle='black';
  ctx.font='20px Arial';
  ctx.fillText('Score: '+score,canvas.width-150,30);
}

/* ==================== QUIZ GAME ==================== */
let quizCoins=0, currentQuiz=0;

function initQuiz(){
  quizCoins=0;
  alert("Instructions: Solve the math questions. You have 1 coin per correct answer. Click your choice to answer.");
  showQuizQuestion();
}

function generateQuizQuestion(){
  const nums=[1+Math.floor(Math.random()*10),1+Math.floor(Math.random()*10),1+Math.floor(Math.random()*10)];
  const ops=[Math.random()<0.5?'+':'-', Math.random()<0.5?'+':'-'];
  const question=`What is ${nums[0]} ${ops[0]} ${nums[1]} ${ops[1]} ${nums[2]}?`;
  let answer=nums[0]; answer=ops[0]==='+'?answer+nums[1]:answer-nums[1]; answer=ops[1]==='+'?answer+nums[2]:answer-nums[2];
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
  document.getElementById('quizQuestion').innerText=q.question;
  const answersDiv=document.getElementById('quizAnswers');
  answersDiv.innerHTML='';
  q.options.forEach(opt=>{
    const btn=document.createElement('button');
    btn.innerText=opt;
    btn.style.fontSize='24px';
    btn.style.padding='10px 20px';
    btn.style.margin='5px';
    btn.style.backgroundColor='#FFD700';
    btn.style.border='2px solid #FFA500';
    btn.style.borderRadius='10px';
    btn.onclick=()=>checkQuizAnswer(opt,q.answer);
    answersDiv.appendChild(btn);
  });
  document.getElementById('quizFeedback').innerText='';
}

function checkQuizAnswer(selected,correct){
  const feedback=document.getElementById('quizFeedback');
  if(selected===correct){
    feedback.innerText='✅ Correct! +1 Coin';
    quizCoins+=1;
  } else feedback.innerText='❌ Wrong!';
  setTimeout(()=>{
    if(confirm('Do you want to continue?')) showQuizQuestion();
    else alert(`You earned ${quizCoins} coins!`);
  },800);
}

/* ==================== MEMORY GAME ==================== */
let memoryCards=[], memorySelected=[], memoryMatched=[];
let memoryLevel=1, memoryAllImages=[], memoryCoins=0, memoryTries=0;

function initMemory(){
  memoryAllImages=[];
  for(let i=1;i<=20;i++){
    memoryAllImages.push(`static/images/memory${i}.png`);
  }
  memoryLevel=1; memoryCoins=0; memoryTries=0;
  alert("Instructions: Match the images. You have 3 tries per level before it resets.");
  startMemoryLevel(memoryLevel);
}

function startMemoryLevel(level){
  const numPairs=Math.min(memoryAllImages.length,level+1);
  const selectedImages=memoryAllImages.slice(0,numPairs);
  memoryCards=[...selectedImages,...selectedImages].sort(()=>Math.random()-0.5);
  memorySelected=[]; memoryMatched=[];
  renderMemory();
}

function renderMemory(){
  const grid=document.getElementById('memoryGrid');
  grid.innerHTML='';
  memoryCards.forEach((card,i)=>{
    const btn=document.createElement('button');
    if(memoryMatched.includes(i)||memorySelected.includes(i)){
      const img=document.createElement('img');
      img.src=card; img.width=60;
      btn.appendChild(img);
    } else btn.innerText='?';
    btn.onclick=()=>selectMemoryCard(i);
    grid.appendChild(btn);
  });
  document.getElementById('memoryFeedback').innerText=`Level ${memoryLevel} - Matched: ${memoryMatched.length/2} pairs - Coins: ${memoryCoins} - Tries left: ${3-memoryTries}`;
}

function selectMemoryCard(i){
  if(memorySelected.includes(i)||memoryMatched.includes(i)) return;
  memorySelected.push(i);
  if(memorySelected.length===2){
    if(memoryCards[memorySelected[0]]===memoryCards[memorySelected[1]]){
      memoryMatched.push(...memorySelected);
      memoryCoins+=1;
    } else {
      memoryTries++;
      if(memoryTries>=3){
        alert('❌ You failed 3 tries! Back to Level 1. Coins collected: '+memoryCoins);
        memoryLevel=1; memoryCoins=0; memoryTries=0;
      }
      startMemoryLevel(memoryLevel);
      return;
    }
    setTimeout(()=>{
      memorySelected=[];
      renderMemory();
      if(memoryMatched.length===memoryCards.length){
        memoryLevel++;
        alert(`🎉 Level Up! Coins: ${memoryCoins}`);
        startMemoryLevel(memoryLevel);
      }
    },500);
  }
  renderMemory();
}
