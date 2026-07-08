// EVENT HORIZON: Quantum Harvest - Main Game Engine

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Resize canvas to window
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gameState.coreX = canvas.width / 2;
    gameState.coreY = canvas.height / 2;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// GAME STATE
const gameState = {
    currentMode: null,
    isRunning: false,
    currentSector: 1,
    coreSize: 40,
    coreX: canvas.width / 2,
    coreY: canvas.height / 2,
    particles: [],
    darkMatter: 0,
    absorbedCount: 0,
    targetAbsorbed: 500,
    startTime: 0,
    elapsedTime: 0,
    mouseX: canvas.width / 2,
    mouseY: canvas.height / 2,
    
    // Upgrade levels
    upgradeGravity: 0,
    upgradeParticles: 0,
    upgradeShockwave: 0,
    
    // Mode-specific
    maxParticles: 100,
    gravityStrength: 0.3,
    particleSpeed: 2,
    shockwaveRadius: 100,
};

// PARTICLES
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * gameState.particleSpeed;
        this.vy = (Math.random() - 0.5) * gameState.particleSpeed;
        this.radius = 4;
    }
    
    getColor() {
        const hue = (Date.now() / 50 + Math.random() * 100) % 360;
        return `hsl(${hue}, 100%, 50%)`;
    }
    
    update() {
        const dx = gameState.coreX - this.x;
        const dy = gameState.coreY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > gameState.coreSize + 10) {
            const forceX = (dx / (distance + 1)) * gameState.gravityStrength;
            const forceY = (dy / (distance + 1)) * gameState.gravityStrength;
            this.vx += forceX;
            this.vy += forceY;
        }
        
        // Add velocity damping to prevent infinite acceleration
        this.vx *= 0.98;
        this.vy *= 0.98;
        
        this.x += this.vx;
        this.y += this.vy;
        
        // Boundary wrap
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
    }
    
    draw() {
        ctx.fillStyle = this.getColor();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    checkAbsorption() {
        const dx = gameState.coreX - this.x;
        const dy = gameState.coreY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < gameState.coreSize;
    }
}

// SPAWN PARTICLES
function spawnParticle() {
    if (gameState.particles.length < gameState.maxParticles) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 200 + Math.random() * 100;
        const x = gameState.coreX + Math.cos(angle) * distance;
        const y = gameState.coreY + Math.sin(angle) * distance;
        gameState.particles.push(new Particle(x, y));
    }
}

// UPDATE GAME
function updateGame() {
    gameState.elapsedTime = (Date.now() - gameState.startTime) / 1000;
    
    // Update particles
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        gameState.particles[i].update();
        
        if (gameState.particles[i].checkAbsorption()) {
            gameState.particles.splice(i, 1);
            gameState.absorbedCount++;
            gameState.darkMatter++;
            
            spawnParticle();
            
            // Victory check for Standard
            if (gameState.currentMode === 'standard' && gameState.absorbedCount >= gameState.targetAbsorbed) {
                advanceSector();
            }
        }
    }
    
    // Gravity Well mode: shrink core over time
    if (gameState.currentMode === 'gravity') {
        gameState.coreSize -= 0.05;
        if (gameState.coreSize <= 0) {
            endGame();
        }
    }
    
    // Spawn particles periodically
    if (gameState.particles.length < gameState.maxParticles && Math.random() < 0.15) {
        spawnParticle();
    }
    
    updateHUD();
}

// DRAW GAME
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background gradient
    const gradient = ctx.createRadialGradient(gameState.coreX, gameState.coreY, 0, gameState.coreX, gameState.coreY, 500);
    gradient.addColorStop(0, 'rgba(26, 42, 74, 0.3)');
    gradient.addColorStop(1, 'rgba(10, 14, 39, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw core
    const coreHue = (Date.now() / 100) % 360;
    ctx.fillStyle = `hsl(${coreHue}, 100%, 50%)`;
    ctx.beginPath();
    ctx.arc(gameState.coreX, gameState.coreY, gameState.coreSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw core glow
    ctx.shadowColor = `hsl(${coreHue}, 100%, 50%)`;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = `hsla(${coreHue}, 100%, 50%, 0.5)`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(gameState.coreX, gameState.coreY, gameState.coreSize + 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Draw particles
    for (let particle of gameState.particles) {
        particle.draw();
    }
}

// GAME LOOP
function gameLoop() {
    if (gameState.isRunning) {
        updateGame();
    }
    drawGame();
    requestAnimationFrame(gameLoop);
}

// UPDATE HUD
function updateHUD() {
    const modeText = gameState.currentMode === 'standard' ? 'Standard Sector' : 
                     gameState.currentMode === 'gravity' ? 'Gravity Well' : 'Sandbox';
    document.getElementById('modeDisplay').textContent = modeText;
    document.getElementById('coreSize').textContent = Math.max(0, Math.floor(gameState.coreSize));
    document.getElementById('particleCount').textContent = gameState.particles.length;
    document.getElementById('absorbed').textContent = gameState.absorbedCount;
    document.getElementById('sector').textContent = gameState.currentSector;
    document.getElementById('timeDisplay').textContent = Math.floor(gameState.elapsedTime) + 's';
    document.getElementById('dmAmount').textContent = gameState.darkMatter;
    
    // Update upgrade buttons
    if (gameState.currentMode !== 'sandbox') {
        updateUpgradeButtons();
    }
}

// UPDATE UPGRADE BUTTONS
function updateUpgradeButtons() {
    const upgrades = [
        { cost: 50, id: 'upgrade1' },
        { cost: 100, id: 'upgrade2' },
        { cost: 150, id: 'upgrade3' }
    ];
    
    upgrades.forEach(upgrade => {
        const btn = document.getElementById(upgrade.id);
        if (gameState.darkMatter >= upgrade.cost) {
            btn.classList.remove('disabled');
        } else {
            btn.classList.add('disabled');
        }
    });
}

// BUY UPGRADE
function buyUpgrade(upgradeNum) {
    const costs = [50, 100, 150];
    const cost = costs[upgradeNum];
    
    if (gameState.darkMatter >= cost) {
        gameState.darkMatter -= cost;
        
        if (upgradeNum === 0) {
            gameState.gravityStrength *= 1.1;
            gameState.upgradeGravity++;
        } else if (upgradeNum === 1) {
            gameState.maxParticles += 5;
            gameState.upgradeParticles++;
        } else if (upgradeNum === 2) {
            gameState.shockwaveRadius *= 1.2;
            gameState.upgradeShockwave++;
        }
    }
}

// ADVANCE SECTOR
function advanceSector() {
    gameState.currentSector++;
    gameState.absorbedCount = 0;
    gameState.targetAbsorbed = 500 + (gameState.currentSector - 1) * 200;
    gameState.gravityStrength += 0.1;
    gameState.coreSize = 40;
    
    showVictoryScreen();
}

// END GAME
function endGame() {
    gameState.isRunning = false;
    if (gameState.currentMode !== 'sandbox') {
        saveHighScore(gameState.darkMatter);
    }
    showGameOverScreen();
}

// SHOCKWAVE
function triggerShockwave() {
    for (let particle of gameState.particles) {
        const dx = particle.x - gameState.mouseX;
        const dy = particle.y - gameState.mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < gameState.shockwaveRadius && distance > 0) {
            const force = (gameState.shockwaveRadius - distance) / gameState.shockwaveRadius * 8;
            particle.vx += (dx / distance) * force;
            particle.vy += (dy / distance) * force;
        }
    }
}

// MOUSE EVENTS
document.addEventListener('mousemove', (e) => {
    gameState.mouseX = e.clientX;
    gameState.mouseY = e.clientY;
});

document.addEventListener('mousedown', (e) => {
    if (e.button === 2) { // Right click
        triggerShockwave();
    }
});

document.addEventListener('contextmenu', (e) => e.preventDefault());

// UI EVENTS - Mode Selection
document.getElementById('standardBtn').addEventListener('click', () => startGame('standard'));
document.getElementById('gravityBtn').addEventListener('click', () => startGame('gravity'));
document.getElementById('sandboxBtn').addEventListener('click', () => startGame('sandbox'));

function startGame(mode) {
    gameState.currentMode = mode;
    gameState.isRunning = true;
    gameState.particles = [];
    gameState.absorbedCount = 0;
    gameState.darkMatter = 0;
    gameState.coreSize = 40;
    gameState.currentSector = 1;
    gameState.targetAbsorbed = 500;
    gameState.gravityStrength = 0.3;
    gameState.maxParticles = 100;
    gameState.particleSpeed = 2;
    gameState.shockwaveRadius = 100;
    gameState.startTime = Date.now();
    
    // Reset upgrades for non-sandbox modes
    if (mode !== 'sandbox') {
        gameState.upgradeGravity = 0;
        gameState.upgradeParticles = 0;
        gameState.upgradeShockwave = 0;
    }
    
    // Spawn initial particles
    for (let i = 0; i < gameState.maxParticles / 2; i++) {
        spawnParticle();
    }
    
    document.getElementById('menuOverlay').classList.add('hidden');
    document.getElementById('hud').classList.add('show');
    
    if (mode === 'sandbox') {
        document.getElementById('gearBtn').classList.add('show');
        document.getElementById('sidePanel').classList.remove('show');
    } else {
        document.getElementById('gearBtn').classList.remove('show');
        document.getElementById('sidePanel').classList.add('show');
    }
}

// GAME OVER SCREEN
function showGameOverScreen() {
    document.getElementById('gameOverScreen').classList.add('show');
    document.getElementById('finalScore').textContent = gameState.absorbedCount;
    document.getElementById('finalDM').textContent = gameState.darkMatter;
    document.getElementById('survivalTime').textContent = Math.floor(gameState.elapsedTime) + 's';
}

document.getElementById('retryBtn').addEventListener('click', () => {
    document.getElementById('gameOverScreen').classList.remove('show');
    startGame(gameState.currentMode);
});

document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('gameOverScreen').classList.remove('show');
    document.getElementById('menuOverlay').classList.remove('hidden');
    document.getElementById('sidePanel').classList.remove('show');
    document.getElementById('gearBtn').classList.remove('show');
    document.getElementById('hud').classList.remove('show');
    gameState.isRunning = false;
});

// VICTORY SCREEN
function showVictoryScreen() {
    document.getElementById('victoryScreen').classList.add('show');
    document.getElementById('victoryScore').textContent = gameState.absorbedCount;
    
    setTimeout(() => {
        document.getElementById('victoryScreen').classList.remove('show');
        gameState.isRunning = true;
    }, 3000);
}

// LEADERBOARD
function saveHighScore(score) {
    let scores = JSON.parse(localStorage.getItem('eventHorizonScores') || '[]');
    scores.push(score);
    scores.sort((a, b) => b - a);
    scores = scores.slice(0, 10);
    localStorage.setItem('eventHorizonScores', JSON.stringify(scores));
}

document.getElementById('leaderboardBtn').addEventListener('click', () => {
    document.getElementById('menuOverlay').classList.add('hidden');
    document.getElementById('leaderboard').classList.add('show');
    
    let scores = JSON.parse(localStorage.getItem('eventHorizonScores') || '[]');
    const list = document.getElementById('leaderboardList');
    list.innerHTML = '';
    
    if (scores.length === 0) {
        list.innerHTML = '<div class="leaderboard-entry"><span>No scores yet!</span></div>';
    } else {
        scores.forEach((score, index) => {
            const entry = document.createElement('div');
            entry.className = 'leaderboard-entry';
            entry.innerHTML = `<span>#${index + 1}</span><span>${score} DM</span>`;
            list.appendChild(entry);
        });
    }
});

document.getElementById('closeLeaderboard').addEventListener('click', () => {
    document.getElementById('leaderboard').classList.remove('show');
    document.getElementById('menuOverlay').classList.add('hidden');
});

// UPGRADE BUTTONS
document.getElementById('upgrade1').addEventListener('click', () => buyUpgrade(0));
document.getElementById('upgrade2').addEventListener('click', () => buyUpgrade(1));
document.getElementById('upgrade3').addEventListener('click', () => buyUpgrade(2));

// SANDBOX SETTINGS
document.getElementById('gearBtn').addEventListener('click', () => {
    document.getElementById('settingsMenu').classList.add('show');
});

document.getElementById('closeSettings').addEventListener('click', () => {
    document.getElementById('settingsMenu').classList.remove('show');
    applySandboxSettings();
});

function applySandboxSettings() {
    const ballNum = parseInt(document.getElementById('settingsBallNum').value) || 50;
    const speed = parseFloat(document.getElementById('settingsSpeed').value) || 2;
    const gravity = parseFloat(document.getElementById('settingsGravity').value) || 0.3;
    
    gameState.maxParticles = ballNum;
    gameState.particleSpeed = speed;
    gameState.gravityStrength = gravity;
    
    // Adjust particle count to match new max
    while (gameState.particles.length > gameState.maxParticles) {
        gameState.particles.pop();
    }
    
    // Spawn more if needed
    while (gameState.particles.length < gameState.maxParticles * 0.5) {
        spawnParticle();
    }
}

// START GAME LOOP
gameLoop();
