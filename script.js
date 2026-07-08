// Canvas Setup
const canvas = document.getElementById('vibeCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game Variables
let gameRunning = false;
let currentMode = 'standard'; // standard, gravity, chaos
let particles = [];
let coreX = canvas.width / 2;
let coreY = canvas.height / 2;
let coreRadius = 40;
let coreMaxRadius = 40;
let score = 0;
let darkMatter = 0;
let sector = 1;
let survivalTime = 0;
let gameStartTime = 0;

// Upgrades
let upgrades = {
  gravPull: 0,
  matterRepl: 0,
  shockwave: 0
};

// Leaderboard
let leaderboard = {
  standard: 1,
  survival: 0,
  chaos: 0
};

// Particle Class
class Particle {
  constructor(x, y, vx, vy, size = 4, color = '#00ffcc') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.color = color;
    this.life = 1;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 0.015;
  }

  draw(ctx) {
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// Background Animation
function drawBackground() {
  ctx.fillStyle = '#020205';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid background
  ctx.strokeStyle = 'rgba(0, 255, 200, 0.03)';
  ctx.lineWidth = 1;
  const gridSize = 50;
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

// Draw Core
function drawCore() {
  // Outer glow
  const gradient = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, coreRadius + 30);
  gradient.addColorStop(0, 'rgba(0, 255, 200, 0.4)');
  gradient.addColorStop(1, 'rgba(0, 255, 200, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(coreX, coreY, coreRadius + 30, 0, Math.PI * 2);
  ctx.fill();

  // Core body
  ctx.fillStyle = '#00ffcc';
  ctx.beginPath();
  ctx.arc(coreX, coreY, coreRadius, 0, Math.PI * 2);
  ctx.fill();

  // Inner dark
  ctx.fillStyle = '#020205';
  ctx.beginPath();
  ctx.arc(coreX, coreY, coreRadius * 0.6, 0, Math.PI * 2);
  ctx.fill();
}

// Generate Particles
function spawnParticles(x, y, count = 5) {
  const baseSpeed = 1 + upgrades.gravPull * 0.1;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = baseSpeed + Math.random() * 2;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const colors = ['#00ffcc', '#ff007f', '#9d4edd', '#ffffff'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push(new Particle(x, y, vx, vy, 4, color));
  }
}

// Collision Detection
function checkParticleCollision() {
  particles.forEach((p, idx) => {
    const dx = coreX - p.x;
    const dy = coreY - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < coreRadius + p.size) {
      particles.splice(idx, 1);
      darkMatter += 1;
      score += 10;

      if (currentMode === 'standard') {
        score += 10;
        if (score % 500 === 0) {
          sector++;
        }
      } else if (currentMode === 'gravity') {
        coreRadius = Math.min(coreRadius + 0.5, coreMaxRadius);
      } else if (currentMode === 'chaos') {
        score += 15;
      }
    }
  });
}

// Update HUD
function updateHUD() {
  const hudMode = document.getElementById('hudMode');
  const hudDm = document.getElementById('hudDm');
  const hudObjective = document.getElementById('hudObjective');

  if (currentMode === 'standard') {
    hudMode.textContent = `STANDARD (SECTOR ${sector})`;
    hudObjective.textContent = `${score % 500} / 500`;
  } else if (currentMode === 'gravity') {
    hudMode.textContent = 'GRAVITY WELL';
    hudObjective.textContent = `CORE RADIUS: ${coreRadius.toFixed(1)}`;
  } else if (currentMode === 'chaos') {
    hudMode.textContent = 'CHAOS STORM';
    hudObjective.textContent = `${Math.floor((Date.now() - gameStartTime) / 1000)} / 60s`;
  }

  hudDm.textContent = darkMatter;
}

// Game Loop
function gameLoop() {
  drawBackground();

  // Update and draw particles
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => {
    p.update();
    p.draw(ctx);
  });

  if (gameRunning) {
    // Gravity effect on particles
    particles.forEach(p => {
      const dx = coreX - p.x;
      const dy = coreY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const pullStrength = 0.05 * (1 + upgrades.gravPull * 0.1);
      if (dist > 0) {
        p.vx += (dx / dist) * pullStrength;
        p.vy += (dy / dist) * pullStrength;
      }
    });

    checkParticleCollision();
    updateHUD();

    // Mode-specific logic
    if (currentMode === 'gravity') {
      coreRadius = Math.max(coreRadius - 0.15, 5);
      if (coreRadius <= 5) {
        endGame(`Core collapsed. Survival time: ${survivalTime.toFixed(1)}s`);
      }
    } else if (currentMode === 'chaos') {
      const elapsed = (Date.now() - gameStartTime) / 1000;
      if (elapsed > 60) {
        endGame(`Time's up! Score: ${score}`);
      }
    }

    survivalTime = (Date.now() - gameStartTime) / 1000;
  }

  drawCore();

  requestAnimationFrame(gameLoop);
}

// Spawn Waves
function spawnWave() {
  if (!gameRunning) return;

  const waveSize = 10 + upgrades.matterRepl * 5 + (currentMode === 'chaos' ? 10 : 0);
  for (let i = 0; i < waveSize; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 200 + Math.random() * 300;
    const x = coreX + Math.cos(angle) * distance;
    const y = coreY + Math.sin(angle) * distance;
    const speed = 1 + Math.random() * 2;
    const vx = -Math.cos(angle) * speed;
    const vy = -Math.sin(angle) * speed;
    particles.push(new Particle(x, y, vx, vy, 4, '#00ffcc'));
  }

  setTimeout(spawnWave, 1000);
}

// End Game
function endGame(reason) {
  gameRunning = false;
  document.getElementById('gameOverReason').textContent = reason;
  document.getElementById('finalScoreVal').textContent = `${darkMatter} Dark Matter collected`;

  // Update leaderboard
  if (currentMode === 'standard') {
    leaderboard.standard = Math.max(leaderboard.standard, sector);
  } else if (currentMode === 'gravity') {
    leaderboard.survival = Math.max(leaderboard.survival, survivalTime);
  } else if (currentMode === 'chaos') {
    leaderboard.chaos = Math.max(leaderboard.chaos, score);
  }

  document.getElementById('gameOverMenu').classList.remove('hidden');
  document.getElementById('gameHud').classList.add('hud-tophidden');
}

// Start Game
function startGame(mode) {
  currentMode = mode;
  gameRunning = true;
  particles = [];
  coreRadius = coreMaxRadius;
  score = 0;
  darkMatter = 0;
  sector = 1;
  survivalTime = 0;
  gameStartTime = Date.now();

  document.getElementById('startMenu').classList.add('hidden');
  document.getElementById('gameOverMenu').classList.add('hidden');
  document.getElementById('gameHud').classList.remove('hud-tophidden');

  spawnWave();
}

// Mouse Click Handler
document.addEventListener('click', (e) => {
  if (!gameRunning) return;

  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const blastRadius = 80 + upgrades.shockwave * 20;
  particles.forEach((p, idx) => {
    const dx = p.x - clickX;
    const dy = p.y - clickY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < blastRadius) {
      const blastVx = (dx / dist) * 3;
      const blastVy = (dy / dist) * 3;
      p.vx = blastVx;
      p.vy = blastVy;
    }
  });

  // Visual feedback
  spawnParticles(clickX, clickY, 8);
});

// Menu Buttons
document.getElementById('startGameBtn').addEventListener('click', () => {
  startGame('standard');
});

document.getElementById('selectModeBtn').addEventListener('click', () => {
  document.getElementById('mainMenuButtons').classList.add('hidden');
  document.getElementById('modeView').classList.remove('hidden');
});

document.getElementById('leaderboardsBtn').addEventListener('click', () => {
  document.getElementById('mainMenuButtons').classList.add('hidden');
  document.getElementById('leaderboardView').classList.remove('hidden');
  document.getElementById('lbStandard').textContent = `Sector ${leaderboard.standard}`;
  document.getElementById('lbSurvival').textContent = `${leaderboard.survival.toFixed(1)}s`;
  document.getElementById('lbChaos').textContent = `${leaderboard.chaos} DM`;
});

document.querySelectorAll('.back-to-menu').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('mainMenuButtons').classList.remove('hidden');
    document.getElementById('modeView').classList.add('hidden');
    document.getElementById('leaderboardView').classList.add('hidden');
  });
});

document.getElementById('modeStandardBtn').addEventListener('click', () => {
  startGame('standard');
});

document.getElementById('modeGravityBtn').addEventListener('click', () => {
  startGame('gravity');
});

document.getElementById('modeChaosBtn').addEventListener('click', () => {
  startGame('chaos');
});

document.getElementById('restartGameBtn').addEventListener('click', () => {
  document.getElementById('gameOverMenu').classList.add('hidden');
  startGame(currentMode);
});

document.getElementById('exitToMenuBtn').addEventListener('click', () => {
  document.getElementById('gameOverMenu').classList.add('hidden');
  document.getElementById('startMenu').classList.remove('hidden');
  document.getElementById('gameHud').classList.add('hud-tophidden');
});

// Settings Panel
document.getElementById('settingsBtn').addEventListener('click', () => {
  document.getElementById('settingsPanel').classList.toggle('hidden');
});

document.getElementById('closeBtn').addEventListener('click', () => {
  document.getElementById('settingsPanel').classList.add('hidden');
});

// Upgrades
document.getElementById('buyGravPullBtn').addEventListener('click', () => {
  if (darkMatter >= 50) {
    darkMatter -= 50;
    upgrades.gravPull++;
    document.getElementById('lvlGravPull').textContent = upgrades.gravPull;
  }
});

document.getElementById('buyMatterReplBtn').addEventListener('click', () => {
  if (darkMatter >= 100) {
    darkMatter -= 100;
    upgrades.matterRepl++;
    document.getElementById('lvlMatterRepl').textContent = upgrades.matterRepl;
  }
});

document.getElementById('buyShockwaveBtn').addEventListener('click', () => {
  if (darkMatter >= 150) {
    darkMatter -= 150;
    upgrades.shockwave++;
    document.getElementById('lvlShockwave').textContent = upgrades.shockwave;
  }
});

// Handle Window Resize
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  coreX = canvas.width / 2;
  coreY = canvas.height / 2;
});

// Start animation loop
gameLoop();
