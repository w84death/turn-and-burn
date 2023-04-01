const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let lastFrameTime = performance.now();
let gameStartTime = new Date();
let straightTime = 0;
let turnTime = 0;
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
let bikes = [
  {
    player: 0,
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    angle: 0,
    isTurning: false,
    speed: 0,
    maxSpeed: 300,
    turnRate: 3,
    brakeRate: 15,
    speedIncrease: 10,
    path: [],
    color: {r:24,g:24,b:255}
  },
  {
    player: 1,
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    angle: 0,
    isTurning: false,
    speed: 0,
    maxSpeed: 300,
    turnRate: 3,
    brakeRate: 15,
    speedIncrease: 10,
    path: [],
    color: {r:255,g:24,b:24}
  },
];

let imagesToLoad = 2;
const maskImage = new Image();
const trackImage = new Image();

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
  ctx.drawImage(trackImage, 0, 0, canvas.width, canvas.height);
}

function drawTireMark(bike) {
  bike.path.push({ x: bike.x, y: bike.y });

  if (bike.path.length > 50) {
    bike.path.shift();
  }

  ctx.lineWidth = 2;

  for (let i = 0; i < bike.path.length - 1; i++) {
    ctx.beginPath();
    ctx.moveTo(bike.path[i].x, bike.path[i].y);
    ctx.lineTo(bike.path[i + 1].x, bike.path[i + 1].y);
    ctx.strokeStyle = `rgba(${bike.color.r}, ${bike.color.g}, ${bike.color.b}, ${i / 50})`;
    ctx.stroke();
  }
}

function updateBike(bike, deltaTime) {
  bike.prevX = bike.x;
  bike.prevY = bike.y;

  if (bike.isTurning) {
    bike.angle -= bike.turnRate * deltaTime;
  } else
  if(!bike.brake){
    bike.speed += bike.speedIncrease * deltaTime;
  }

  // Apply brakes if the right mouse button is pressed
  if (bike.brake) {
    bike.speed -= bike.brakeRate * deltaTime;
    if (bike.speed < 0) {
      bike.speed = 0;
    }
  }

  bike.speed = Math.min(bike.speed, bike.maxSpeed);

  if (bike.speed > maxBikeSpeed) {
    maxBikeSpeed = bike.speed;
  }
  bike.x += bike.speed * Math.cos(bike.angle) * deltaTime;
  bike.y += bike.speed * Math.sin(bike.angle) * deltaTime;
}


function resetBike(bike) {
  bike.x = currentTrack.startPositions[bike.player].x;
  bike.y = currentTrack.startPositions[bike.player].y;
  bike.angle = 0;
  bike.prevX = bike.x;
  bike.prevY = bike.y;
  bike.speed = 0;
  bike.path = [];
}

function updateTimers() {
  const currentTime = new Date();
  const elapsedTime = (currentTime - gameStartTime) / 1000;

  document.getElementById("gameTime").textContent = `Game time: ${elapsedTime.toFixed(2)}s`;

  if (bikes[0].isTurning) {
    turnTime += 0.016; // Assuming 60 FPS
  } else {
    straightTime += 0.016; // Assuming 60 FPS
  }

  document.getElementById("straightTime").textContent = `Straight time: ${straightTime.toFixed(2)}s`;
  document.getElementById("turnTime").textContent = `Turning time: ${turnTime.toFixed(2)}s`;
  document.getElementById("bikeSpeed").textContent = `Bike speed: ${bikes[0].speed.toFixed(2)}px/s`;
}

function checkCollisions(bike) {
  const bikeCenterX = Math.floor(bike.x);
  const bikeCenterY = Math.floor(bike.y);
  const maskCtx = maskCanvas.getContext("2d");
  maskCtx.drawImage(maskImage, 0, 0, canvas.width, canvas.height);
  const pixelData = maskCtx.getImageData(bikeCenterX, bikeCenterY, 1, 1).data;

  return pixelData[0] === 0; // Check if the pixel color is black
}

function startTimer() {
  let count = 3;
  const timerElement = document.createElement("div");
  timerElement.id = "countdownTimer";
  timerElement.style.position = "absolute";
  timerElement.style.top = "50%";
  timerElement.style.left = "50%";
  timerElement.style.transform = "translate(-50%, -50%)";
  timerElement.style.fontSize = "48px";
  timerElement.textContent = count;
  document.body.appendChild(timerElement);

  const countdown = setInterval(() => {
    count -= 1;
    timerElement.textContent = count;
    if (count === 0) {
      clearInterval(countdown);
      timerElement.remove();
      changeGameState(GameState.RUNNING); // Change game state to RUNNING
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
    loadingScreen.setAttribute("hidden", "");
    mainMenu.removeAttribute("hidden");
    timerContainer.setAttribute("hidden", "");
  } else if (newState === GameState.PAUSED) {
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
    document.getElementById("total-time").textContent = "Total Time: " + totalTime.toFixed(2) + "s";
    document.getElementById("turn-time").textContent = "Turn Time: " + turnTime.toFixed(2) + "s";
    document.getElementById("max-speed").textContent = "Maximum Speed: " + maxBikeSpeed.toFixed(2) + "ps/s";
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

function resetGameVariables() {
  totalTime = 0;
  maxBikeSpeed = 0;
  straightTime = 0;
  turnTime = 0;
}

function gameLoop(currentTime) {
  const deltaTime = (currentTime - lastFrameTime) / 1000;
  lastFrameTime = currentTime;
  if (currentGameState === GameState.RUNNING) {
    totalTime += deltaTime;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTrackTexture();
    for (let i = 0; i < bikes.length; i++) {
      if (checkCollisions(bikes[i])) {
        if (players === 1) {
          changeGameState(GameState.GAMEOVER);
        }else{
          resetBike(bikes[i]);
        }
      }
      updateBike(bikes[i], deltaTime);
      drawTireMark(bikes[i]);
    }
    updateTimers();
  }else
  if (currentGameState === GameState.PAUSED) {
    drawTrackTexture();
    for (let i = 0; i < bikes.length; i++) {
      drawTireMark(bikes[i]);
    }
  }
  requestAnimationFrame(gameLoop);
}

canvas.addEventListener("mousedown", (event) => {
  if (currentGameState === GameState.RUNNING) {
    // If the left mouse button is pressed
    if (event.button === 0) {
      bikes[0].isTurning = true;
    }
    // If the right mouse button is pressed
    if (event.button === 2) {
      bikes[0].brake = true;
    }
  }
});

canvas.addEventListener("mouseup", (event) => {
  if (currentGameState === GameState.RUNNING) {
    // If the left mouse button is released
    if (event.button === 0) {
      bikes[0].isTurning = false;
    }
    // If the right mouse button is released
    if (event.button === 2) {
      bikes[0].brake = false;
    }
  }
});

document.addEventListener("keydown", (event) => {
  if (currentGameState === GameState.RUNNING && players>1) {
    if (event.key === "z") {
      bikes[1].isTurning = true;
    }
    if (event.key === "x") {
      bikes[1].brake = true;
    }
  }
});

document.addEventListener("keyup", (event) => {
  if (currentGameState === GameState.RUNNING && players>1) {
    if (event.key === "z") {
      bikes[1].isTurning = false;
    }
    if (event.key === "x") {
      bikes[1].brake = false;
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

document.getElementById("start-game").addEventListener("click", () => {
  const trackSelection = document.getElementById("track-selection");
  const selectedTrackIndex = parseInt(trackSelection.value);
  const numPlayers = parseInt(document.getElementById("num-players").value);
  loadTrack(tracks[selectedTrackIndex]);
  bikes = bikes.slice(0, numPlayers);
  players = numPlayers;
  changeGameState(GameState.PAUSED);
});

changeGameState(GameState.MAIN_MENU);
gameLoop(performance.now());
