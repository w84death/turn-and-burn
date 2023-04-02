const canvas = document.getElementById("track-canvas");
const trackCtx = canvas.getContext("2d");
const tireTrailsCanvas = document.getElementById("tire-trails-canvas");
const tireTrailsCtx = tireTrailsCanvas.getContext("2d");
const gameplayCanvas = document.getElementById("gameplay-canvas");
const gameplayCtx = gameplayCanvas.getContext("2d");
let lastFrameTime = performance.now();
let gameStartTime = new Date();
let totalTime = 0;
let maxBikeSpeed = 0;
let players = 1;
let currentTrack = {};
const GameState = {
  LOADING: "loading",
  MAIN_MENU: "main-menu",
  PAUSED: "paused",
  RUNNING: "running",
  GAMEOVER: "gameover",
  RESTART: "restart",
};

let currentGameState = GameState.LOADING;
const bikeTypes = [
  {
    name: "Rocket Racer",
    speedIncrease: 50,
    maxSpeed: 300,
    turnRate: 4,
  },
  {
    name: "Steady Cruiser",
    speedIncrease: 25,
    maxSpeed: 200,
    turnRate: 3,
  },
  {
    name: "Cautious Crawler",
    speedIncrease: 10,
    maxSpeed: 100,
    turnRate: 2.5,
  },
];
let bikes = [
  {
    player: 0,
    type: 1,
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    angle: 0,
    isTurning: false,
    speed: 0,
    maxRecordedSpeed:0,
    path: [],
    color: {r:255,g:255,b:255},
    raceTime: 0,
    crossedCheckpoint: false,
    crossedFinishLine: false,
    laps:0
  },
  {
    player: 1,
    type: 1,
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    angle: 0,
    isTurning: false,
    speed: 0,
    maxRecordedSpeed:0,
    path: [],
    color: {r:255,g:24,b:24},
    raceTime: 0,
    crossedCheckpoint: false,
    crossedFinishLine: false,
    laps:0
  },
];

let imagesToLoad = 2;
const maskImage = new Image();
const trackImage = new Image();
const cloudImages = [];

for (let i = 1; i <= 3; i++) {
  const cloudImage = new Image();
  cloudImage.src = `cloud-${i}.png`;
  cloudImages.push(cloudImage);
}

const clouds = [
  { img: cloudImages[0], x: Math.random()*gameplayCanvas.width, y: Math.random()*gameplayCanvas.height, speed:1+Math.random()*5 },
  { img: cloudImages[1], x: Math.random()*gameplayCanvas.width, y: Math.random()*gameplayCanvas.height, speed:1+Math.random()*5 },
  { img: cloudImages[2], x: Math.random()*gameplayCanvas.width, y: Math.random()*gameplayCanvas.height, speed:1+Math.random()*5 },
  { img: cloudImages[2], x: Math.random()*gameplayCanvas.width, y: Math.random()*gameplayCanvas.height, speed:1+Math.random()*5 },
  { img: cloudImages[1], x: Math.random()*gameplayCanvas.width, y: Math.random()*gameplayCanvas.height, speed:1+Math.random()*5 }
];


fetch("tracks.json")
  .then((response) => response.json())
  .then((data) => {
    tracks = data;
    populateTrackSelection();
  });

function populateTrackSelection() {
  const trackSelection = document.getElementById("track-selection");
  tracks.forEach((track, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = track.name;
    trackSelection.appendChild(option);
  });
}

function loadTrack(track) {
  currentTrack = track;
  trackImage.src = track.textureImage;
  maskImage.src = track.maskImage;
}


function imageLoaded() {
  imagesToLoad--;
  if (imagesToLoad === 0) {
    changeGameState(GameState.PAUSED);
  }
}

trackImage.onload = imageLoaded;
maskImage.onload = imageLoaded;

const maskCanvas = document.createElement("canvas");
maskCanvas.width = canvas.width;
maskCanvas.height = canvas.height;

function drawTrackTexture() {
  trackCtx.drawImage(trackImage, 0, 0, canvas.width, canvas.height);
   // Draw finish line
  const finishLine = currentTrack.finishLine;
  drawLine(trackCtx, finishLine.x, finishLine.y, finishLine.width, finishLine.height, 'white');

  // // Draw checkpoint line
  // const checkpoint = currentTrack.checkpoint;
  // drawLine(trackCtx, checkpoint.x, checkpoint.y, checkpoint.width, checkpoint.height, 'blue');
}


function drawClouds() {
  for (const cloud of clouds) {
    gameplayCtx.drawImage(cloud.img, cloud.x, cloud.y);
  }
}

function drawTireMark(bike) {
  tireTrailsCtx.lineWidth = 4;
  if(bike.path.length<2) return;

  for (let i = bike.path.length-2; i < bike.path.length - 1; i++) {
    tireTrailsCtx.beginPath();
    tireTrailsCtx.moveTo(bike.path[i].x, bike.path[i].y);
    tireTrailsCtx.lineTo(bike.path[i + 1].x, bike.path[i + 1].y);
    tireTrailsCtx.strokeStyle = `rgba(0,0,0,0.15)`;
    tireTrailsCtx.stroke();
  }
}

function updateClouds(deltaTime){
  for (const cloud of clouds) {
      cloud.x += cloud.speed * deltaTime;
      if (cloud.x > gameplayCanvas.width) {
        cloud.x = -cloud.img.width;
        cloud.y = Math.random()*gameplayCanvas.height;
      }
    }
}
function drawBike(bike) {
  bike.path.push({ x: bike.x, y: bike.y });
  gameplayCtx.lineWidth = 2;

  if (bike.path.length > 50) {
    bike.path.shift();
  }

  for (let i = 0; i < bike.path.length - 1; i++) {
    gameplayCtx.beginPath();
    gameplayCtx.moveTo(bike.path[i].x, bike.path[i].y);
    gameplayCtx.lineTo(bike.path[i + 1].x, bike.path[i + 1].y);
    if (i > bike.path.length-25) {
      gameplayCtx.strokeStyle = `rgba(${bike.color.r}, ${bike.color.g}, ${bike.color.b}, ${i / 50})`;
    }else{
      gameplayCtx.strokeStyle = `rgba(0,0,0,${i / 50})`;
    }
    gameplayCtx.stroke();
  }
}

function updateBike(bike, deltaTime) {
  bike.prevX = bike.x;
  bike.prevY = bike.y;
  const bikeType = bikeTypes[bike.type];
  // TURNING
  if (bike.isTurning) {
    bike.angle -= bikeType.turnRate * deltaTime;
  } else
  if(!bike.brake){
    bike.speed += bikeType.speedIncrease * deltaTime;
  }

  // SPEED
  bike.speed = Math.min(bike.speed, bikeType.maxSpeed);

  bike.x += bike.speed * Math.cos(bike.angle) * deltaTime;
  bike.y += bike.speed * Math.sin(bike.angle) * deltaTime;

  // LAPS/CHECKPOINTS
  if (isBikeInsideCheckpoint(bike)) {
    bike.crossedCheckpoint = true;
  }

  const insideFinishLine = isBikeInsideFinishLine(bike);
  if (insideFinishLine && !bike.crossedFinishLine && bike.crossedCheckpoint) {
    bike.crossedFinishLine = true;
    bike.crossedCheckpoint = false;
    bike.laps++;
    flashInfo(`Player ${bike.player + 1} completed a lap. Total laps: ${bike.laps}`);
  } else if (!insideFinishLine && bike.crossedFinishLine) {
    bike.crossedFinishLine = false;
  }
}

function resetBike(bike) {
  bike.x = currentTrack.startPositions[bike.player].x;
  bike.y = currentTrack.startPositions[bike.player].y;
  bike.angle = 0;
  bike.prevX = bike.x;
  bike.prevY = bike.y;
  bike.speed = 0;
  bike.path = [];
  bike.raceTime = 0;
  bike.crossedCheckpoint = false;
  bike.crossedFinishLine = false;
  bike.laps = 0;
  bike.type = getSelectedBikeType(bike.player);
  flashInfo(`Player ${bike.player} on start position.`);
}

function checkCollisions(bike) {
  const bikeCenterX = Math.floor(bike.x);
  const bikeCenterY = Math.floor(bike.y);
  const maskCtx = maskCanvas.getContext("2d");
  maskCtx.drawImage(maskImage, 0, 0, canvas.width, canvas.height);
  const pixelData = maskCtx.getImageData(bikeCenterX, bikeCenterY, 1, 1).data;

  return pixelData[0] === 0; // Check if the pixel color is black
}

function isBikeInsideCheckpoint(bike) {
  const checkpoint = currentTrack.checkpoint;
  return (
    bike.x > checkpoint.x &&
    bike.x < checkpoint.x + checkpoint.width &&
    bike.y > checkpoint.y &&
    bike.y < checkpoint.y + checkpoint.height
  );
}

function isBikeInsideFinishLine(bike) {
  const finishLine = currentTrack.finishLine;
  return (
    bike.x > finishLine.x &&
    bike.x < finishLine.x + finishLine.width &&
    bike.y > finishLine.y &&
    bike.y < finishLine.y + finishLine.height
  );
}

function startTimer() {
  let count = 3;

  const countdown = setInterval(() => {
    count -= 1;
    flashInfo(`Race in ${count}...`);
    if (count === 0) {
      clearInterval(countdown);
      changeGameState(GameState.RUNNING);
      flashInfo(`START!`);
    }
  }, 1000);
}

function changeGameState(newState) {
  const loadingScreen = document.getElementById("loading-screen");
  const gameOverScreen = document.getElementById("game-over-screen");
  const timerContainer = document.getElementById("timer-container");
  const mainMenu = document.getElementById("main-menu");
  currentGameState = newState;

  if (newState === GameState.LOADING) {
    loadingScreen.removeAttribute("hidden");
  }else if (newState === GameState.MAIN_MENU) {
    playTitleMusic();
    loadingScreen.setAttribute("hidden", "");
    mainMenu.removeAttribute("hidden");
    timerContainer.setAttribute("hidden", "");
  } else if (newState === GameState.PAUSED) {
    playGameMusic();
    loadingScreen.setAttribute("hidden", "");
    gameOverScreen.setAttribute("hidden", "");
    timerContainer.setAttribute("hidden", "");
    mainMenu.setAttribute("hidden", "");
    for (let i = 0; i < bikes.length; i++) {
      resetBike(bikes[i]);
    }
    startTimer();
  } else if (newState === GameState.RUNNING) {
    gameOverScreen.setAttribute("hidden", "");
    timerContainer.removeAttribute("hidden");
    gameStartTime = new Date();
  } else if (newState === GameState.GAMEOVER) {
    document.getElementById("summary-track").textContent = currentTrack.name;
    document.getElementById("player1-bike-name").textContent = bikeTypes[bikes[0].type].name;
    document.getElementById("player1-race-time-sum").textContent = bikes[0].raceTime.toFixed(2);
    document.getElementById("player1-laps-sum").textContent = bikes[0].laps;
    gameOverScreen.removeAttribute("hidden");
    timerContainer.setAttribute("hidden", "");
  } else if (newState === GameState.RESTART) {
    for (let i = 0; i < bikes.length; i++) {
      resetBike(bikes[i]);
    }
    resetGameVariables();
    changeGameState(GameState.PAUSED);
  }
}

function drawLine(ctx, x, y, width, height, color) {
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.closePath();
}

function resetGameVariables() {
  totalTime = 0;
  maxBikeSpeed = 0;
  straightTime = 0;
}

function gameLoop(currentTime) {
  const deltaTime = (currentTime - lastFrameTime) / 1000;
  lastFrameTime = currentTime;
  updateClouds(deltaTime);

  if (currentGameState === GameState.RUNNING) {
    totalTime += deltaTime;
    gameplayCtx.clearRect(0, 0, gameplayCanvas.width, gameplayCanvas.height);
    //drawTrackTexture();
    for (let i = 0; i < bikes.length; i++) {
      if (checkCollisions(bikes[i])) {
        playBikeHit();
        if (players === 1) {
          changeGameState(GameState.GAMEOVER);
        }else{
          resetBike(bikes[i]);
        }
      }
      updateBike(bikes[i], deltaTime);
      drawTireMark(bikes[i]);
      drawBike(bikes[i]);

      bikes[i].raceTime += deltaTime;

      // Update the stats for each player
      const bikeType = bikeTypes[bikes[i].type];
      document.getElementById(`player${i + 1}-bike`).innerText = bikeType.name;
      document.getElementById(`player${i + 1}-race-time`).innerText = bikes[i].raceTime.toFixed(2);
      document.getElementById(`player${i + 1}-current-speed`).innerText = bikes[i].speed.toFixed(2);
      document.getElementById(`player${i + 1}-laps`).innerText = bikes[i].laps;
    }
    drawClouds();
  }else
  if (currentGameState === GameState.PAUSED) {
    drawTrackTexture();
    //drawClouds();
    for (let i = 0; i < bikes.length; i++) {
      drawTireMark(bikes[i]);
    }
  }
  requestAnimationFrame(gameLoop);
}

document.addEventListener("mousedown", (event) => {
  if (currentGameState === GameState.RUNNING) {
    // If the left mouse button is pressed
    if (event.button === 0) {
      bikes[0].isTurning = true;
    }
  }
});

document.addEventListener("mouseup", (event) => {
  if (currentGameState === GameState.RUNNING) {
    // If the left mouse button is released
    if (event.button === 0) {
      bikes[0].isTurning = false;
    }
  }
});

document.addEventListener("keydown", (event) => {
  if (currentGameState === GameState.RUNNING && players>1) {
    if (event.key === "z") {
      bikes[1].isTurning = true;
    }
  }
});

document.addEventListener("keyup", (event) => {
  if (currentGameState === GameState.RUNNING && players>1) {
    if (event.key === "z") {
      bikes[1].isTurning = false;
    }
  }
});


// Prevent the context menu from appearing on right-click
canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

document.getElementById("restart-button").addEventListener("click", () => {
  changeGameState(GameState.RESTART);
});

function startGame(selectedTrackIndex, numPlayers) {
  loadTrack(tracks[selectedTrackIndex]);
  bikes = bikes.slice(0, numPlayers);
  players = numPlayers;
  const player2Stats = document.getElementById("player2-stats");
  if (bikes.length === 2) {
    player2Stats.style.display = "block";
  } else {
    player2Stats.style.display = "none";
  }
  changeGameState(GameState.PAUSED);
}

document.getElementById("start-single-race").addEventListener("click", () => {
  const trackSelection = document.getElementById("track-selection");
  const selectedTrackIndex = parseInt(trackSelection.value);
  startGame(selectedTrackIndex, 1);
});

document.getElementById("start-two-player-race").addEventListener("click", () => {
  const trackSelection = document.getElementById("track-selection");
  const selectedTrackIndex = parseInt(trackSelection.value);
  startGame(selectedTrackIndex, 2);
});

const bikeImages = [
  document.getElementsByClassName("bike-image p1"),
  document.getElementsByClassName("bike-image p2")
]

function getSelectedBikeType(player) {
  for (let i = 0; i < bikeImages[player].length; i++) {
    if (bikeImages[player][i].classList.contains("selected")) {
      return parseInt(bikeImages[player][i].dataset.index, 10);
    }
  }
  return 0;
}

for (let bi = 0; bi < bikeImages.length; bi++) {
  for (let i = 0; i < bikeImages[bi].length; i++) {
    const img = bikeImages[bi][i];
    img.addEventListener("click", function () {
      // Deselect the previously selected bike image
      const selectedIndex = getSelectedBikeType(bi);
      bikeImages[bi][selectedIndex].classList.remove("selected");
      // Select the clicked bike image
      this.classList.add("selected");
    });
  }
}

function flashInfo(message, duration = 2000) {
  const infoBox = document.getElementById("infoBox");
  infoBox.textContent = message;
  infoBox.classList.add("visible");

  setTimeout(() => {
    infoBox.classList.remove("visible");
  }, duration);
}

function playTitleMusic() {
  const titleMusic = document.getElementById("titleMusic");
  titleMusic.volume = 0.5;
  titleMusic.play();
}

function playGameMusic() {
  const titleMusic = document.getElementById("titleMusic");
  titleMusic.pause();
  titleMusic.currentTime = 0;

  const gameMusic = document.getElementById("gameMusic");
  gameMusic.volume = 0.5;
  gameMusic.play();
}

function playButtonClick() {
  const buttonClick = document.getElementById("buttonClick");
  buttonClick.volume = 0.5;
  buttonClick.play();
}

const buttons = document.getElementsByTagName("button");
for (let i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener("click", playButtonClick);
}


function playBikeHit() {
  const bikeHit = document.getElementById("bikeHit");
  bikeHit.volume = 0.5;
  bikeHit.play();
}

changeGameState(GameState.MAIN_MENU);
gameLoop(performance.now());
