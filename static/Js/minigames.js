const backendUrl = "https://petsy-dow7.onrender.com";
const pet_id = localStorage.getItem("pet_id") || 1;
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const petImg = new Image();
petImg.src = "cat.png"; // replace with your pet image or dynamic selection

const coinImg = new Image();
coinImg.src = "coin.png";

const obstacles = [
  {img: "rock.png"},
  {img: "bones.png"},
  {img: "puddle.png"}
].map(o => { let i = new Image(); i.src=o.img; return i; });

const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

// Pet
const pet = {x: 350, y: 300, width: 60, height: 60, speed:5};

// Coins
let coins = [];
const coinSpeed = 3;

// Obstacles
let obsArr = [];
const obsSpeed = 4;

// Score
let score = 0;

// Input
let keys = {};

// Handle input
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// Spawn coins
function spawnCoin() {
  coins.push({x: Math.random()*(canvasWidth-30), y:-30, width:30, height:30});
}

// Spawn obstacle
function spawnObstacle() {
  const obsImg = obstacles[Math.floor(Math.random()*obstacles.length)];
  obsArr.push({x: Math.random()*(canvasWidth-50), y:-50, width:50, height:50, img: obsImg});
}

// Collision detection
function isColliding(a,b){
  return a.x < b.x+b.width &&
         a.x+a.width > b.x &&
         a.y < b.y+b.height &&
         a.y+a.height > b.y;
}

// Update
function update() {
  // Move pet
  if(keys["ArrowLeft"] && pet.x>0) pet.x -= pet.speed;
  if(keys["ArrowRight"] && pet.x + pet.width < canvasWidth) pet.x += pet.speed;

  // Move coins
  coins.forEach(c=>c.y+=coinSpeed);
  coins = coins.filter(c=>{
    if(isColliding(c,pet)){ score++; document.getElementById("score").textContent=`Coins: ${score} 🪙`; return false;}
    return c.y < canvasHeight;
  });

  // Move obstacles
  obsArr.forEach(o=>o.y+=obsSpeed);
  obsArr = obsArr.filter(o=>{
    if(isColliding(o,pet)){ score = Math.max(0,score-1); return false;}
    return o.y < canvasHeight;
  });
}

// Draw
function draw() {
  ctx.clearRect(0,0,canvasWidth,canvasHeight);

  // Draw coins
  coins.forEach(c=>ctx.drawImage(coinImg,c.x,c.y,c.width,c.height));

  // Draw obstacles
  obsArr.forEach(o=>ctx.drawImage(o.img,o.x,o.y,o.width,o.height));

  // Draw pet
  ctx.drawImage(petImg,pet.x,pet.y,pet.width,pet.height);
}

// Game loop
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// Spawn intervals
setInterval(spawnCoin, 1200);
setInterval(spawnObstacle, 1800);

loop();
