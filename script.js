const canvas = document.querySelector("#game-canvas");
const context = canvas.getContext("2d");
const gameArea = document.querySelector("#game-area");
const gameOverlay = document.querySelector("#game-overlay");
const startButton = document.querySelector("#start-button");
const restartButton = document.querySelector("#restart-button");
const scoreOutput = document.querySelector("#score");
const livesOutput = document.querySelector("#lives");
const waveOutput = document.querySelector("#wave");
const gameStatus = document.querySelector("#game-status");
const overlayKicker = document.querySelector("#overlay-kicker");
const overlayTitle = document.querySelector("#overlay-title");
const overlayCopy = document.querySelector("#overlay-copy");
const controlButtons = [...document.querySelectorAll("[data-control]")];

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const PLAYER_Y = HEIGHT - 52;
const keys = new Set();
const touch = { left: false, right: false, fire: false };
const stars = Array.from({ length: 95 }, (_, index) => ({
  x: (index * 127 + 13) % WIDTH,
  y: (index * 251 + 19) % HEIGHT,
  radius: 0.7 + (index % 4) * 0.35,
  phase: (index % 11) * 0.4,
}));

let state = "ready";
let playerX = WIDTH / 2;
let score = 0;
let lives = 3;
let wave = 1;
let spawnTimer = 0;
let fireCooldown = 0;
let elapsed = 0;
let lastFrame = 0;
let bullets = [];
let enemies = [];

function updateScoreboard() {
  scoreOutput.textContent = String(score).padStart(3, "0");
  livesOutput.textContent = String(lives);
  waveOutput.textContent = String(wave).padStart(2, "0");
}

function startGame() {
  state = "running";
  playerX = WIDTH / 2;
  score = 0;
  lives = 3;
  wave = 1;
  spawnTimer = 0.35;
  fireCooldown = 0;
  bullets = [];
  enemies = [];
  keys.clear();
  touch.left = false;
  touch.right = false;
  touch.fire = false;
  updateScoreboard();
  gameOverlay.hidden = true;
  gameStatus.textContent = "Game started. Move with the arrow keys or A and D; fire with Space.";
  gameArea.focus({ preventScroll: true });
}

function endGame() {
  state = "over";
  touch.left = false;
  touch.right = false;
  touch.fire = false;
  overlayKicker.textContent = "MISSION COMPLETE";
  overlayTitle.textContent = "Orbit lost.";
  overlayCopy.textContent = `You scored ${score}. Ready for another run?`;
  startButton.textContent = "Play again";
  gameOverlay.hidden = false;
  gameStatus.textContent = `Game over. Final score: ${score}.`;
}

function createEnemy() {
  const radius = 15 + Math.random() * 8;
  enemies.push({
    x: radius + 24 + Math.random() * (WIDTH - radius * 2 - 48),
    y: -radius,
    radius,
    speed: 48 + wave * 9 + Math.random() * 16,
    drift: (Math.random() - 0.5) * 32,
    phase: Math.random() * Math.PI * 2,
  });
}

function fire() {
  bullets.push({ x: playerX, y: PLAYER_Y - 22, speed: 540 });
  fireCooldown = 0.22;
}

function update(delta) {
  elapsed += delta;
  const movingLeft = keys.has("ArrowLeft") || keys.has("KeyA") || touch.left;
  const movingRight = keys.has("ArrowRight") || keys.has("KeyD") || touch.right;

  if (movingLeft !== movingRight) {
    playerX += (movingRight ? 1 : -1) * 340 * delta;
  }
  playerX = Math.max(28, Math.min(WIDTH - 28, playerX));

  fireCooldown = Math.max(0, fireCooldown - delta);
  if ((keys.has("Space") || touch.fire) && fireCooldown === 0) {
    fire();
  }

  spawnTimer -= delta;
  if (spawnTimer <= 0) {
    createEnemy();
    spawnTimer = Math.max(0.46, 1.12 - (wave - 1) * 0.08);
  }

  bullets = bullets.filter((bullet) => {
    bullet.y -= bullet.speed * delta;
    return bullet.y > -12;
  });

  for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
    const enemy = enemies[enemyIndex];
    enemy.y += enemy.speed * delta;
    enemy.x += enemy.drift * delta;
    if (enemy.x < enemy.radius || enemy.x > WIDTH - enemy.radius) {
      enemy.drift *= -1;
      enemy.x = Math.max(enemy.radius, Math.min(WIDTH - enemy.radius, enemy.x));
    }

    if (enemy.y > PLAYER_Y - 8) {
      enemies.splice(enemyIndex, 1);
      lives -= 1;
      updateScoreboard();
      gameStatus.textContent = `${lives} ${lives === 1 ? "life" : "lives"} remaining.`;
      if (lives <= 0) {
        endGame();
        return;
      }
      continue;
    }

    for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
      const bullet = bullets[bulletIndex];
      const dx = enemy.x - bullet.x;
      const dy = enemy.y - bullet.y;
      const hitRadius = enemy.radius + 5;
      if (dx * dx + dy * dy < hitRadius * hitRadius) {
        enemies.splice(enemyIndex, 1);
        bullets.splice(bulletIndex, 1);
        score += 10;
        wave = Math.floor(score / 100) + 1;
        updateScoreboard();
        gameStatus.textContent = `Target hit. Score ${score}, wave ${wave}.`;
        break;
      }
    }
  }
}

function drawBackground(time) {
  const gradient = context.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#0b192a");
  gradient.addColorStop(1, "#07111d");
  context.fillStyle = gradient;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  for (const star of stars) {
    const shimmer = 0.35 + (Math.sin(time * 0.0015 + star.phase) + 1) * 0.25;
    context.globalAlpha = shimmer;
    context.fillStyle = "#b9d9e6";
    context.beginPath();
    context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;

  context.strokeStyle = "rgb(80 127 151 / 7%)";
  context.lineWidth = 1;
  for (let y = HEIGHT - 110; y < HEIGHT; y += 26) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(WIDTH, y);
    context.stroke();
  }
}

function drawPlayer() {
  context.save();
  context.translate(playerX, PLAYER_Y);
  context.shadowColor = "#62efd0";
  context.shadowBlur = 20;
  context.fillStyle = "#8fffe5";
  context.beginPath();
  context.moveTo(0, -23);
  context.lineTo(22, 18);
  context.lineTo(8, 13);
  context.lineTo(0, 18);
  context.lineTo(-8, 13);
  context.lineTo(-22, 18);
  context.closePath();
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = "#247b80";
  context.beginPath();
  context.ellipse(0, 0, 5, 9, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.fillStyle = "rgb(82 222 191 / 32%)";
  context.beginPath();
  context.ellipse(playerX, PLAYER_Y + 23, 16, 3 + Math.sin(elapsed * 22) * 1.5, 0, 0, Math.PI * 2);
  context.fill();
}

function drawEnemy(enemy) {
  context.save();
  context.translate(enemy.x, enemy.y);
  context.rotate(Math.sin(elapsed * 2 + enemy.phase) * 0.08);
  context.shadowColor = "#ff718d";
  context.shadowBlur = 16;
  context.fillStyle = "#ff7d91";
  context.beginPath();
  context.moveTo(-enemy.radius, -2);
  context.lineTo(-enemy.radius * 0.56, -enemy.radius * 0.72);
  context.lineTo(enemy.radius * 0.56, -enemy.radius * 0.72);
  context.lineTo(enemy.radius, -2);
  context.lineTo(enemy.radius * 0.68, enemy.radius * 0.55);
  context.lineTo(enemy.radius * 0.35, enemy.radius * 0.25);
  context.lineTo(0, enemy.radius * 0.7);
  context.lineTo(-enemy.radius * 0.35, enemy.radius * 0.25);
  context.lineTo(-enemy.radius * 0.68, enemy.radius * 0.55);
  context.closePath();
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = "#4b213b";
  context.fillRect(-enemy.radius * 0.47, -enemy.radius * 0.2, enemy.radius * 0.28, 3);
  context.fillRect(enemy.radius * 0.19, -enemy.radius * 0.2, enemy.radius * 0.28, 3);
  context.restore();
}

function draw(time) {
  drawBackground(time);
  for (const enemy of enemies) {
    drawEnemy(enemy);
  }

  context.save();
  context.lineCap = "round";
  context.strokeStyle = "#8bffe5";
  context.shadowColor = "#59eaca";
  context.shadowBlur = 13;
  context.lineWidth = 4;
  for (const bullet of bullets) {
    context.beginPath();
    context.moveTo(bullet.x, bullet.y + 7);
    context.lineTo(bullet.x, bullet.y - 7);
    context.stroke();
  }
  context.restore();
  drawPlayer();
}

function frame(time) {
  const delta = Math.min((time - lastFrame) / 1000, 0.04);
  lastFrame = time;
  if (state === "running") {
    update(delta);
  }
  draw(time);
  requestAnimationFrame(frame);
}

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

window.addEventListener("keydown", (event) => {
  if (state !== "running") {
    return;
  }

  if (["ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }
  if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space"].includes(event.code)) {
    keys.add(event.code);
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

window.addEventListener("blur", () => {
  keys.clear();
  touch.left = false;
  touch.right = false;
  touch.fire = false;
});

controlButtons.forEach((button) => {
  const control = button.dataset.control;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    touch[control] = true;
  });
  const release = () => {
    touch[control] = false;
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

if (context) {
  updateScoreboard();
  requestAnimationFrame(frame);
} else {
  gameStatus.textContent = "Canvas is not available in this browser.";
  startButton.disabled = true;
  restartButton.disabled = true;
}
