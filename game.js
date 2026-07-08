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
    isPaused: false,
    currentSector: 1,
    coreSize: 40,
    coreX: canvas.width / 2,
    coreY: canvas.height / 2,
    particles: [],
    darkMatter: 0,
    absorbedCount: 0,
    targetAbsorbed: 500,
    startTime: 0,
    pausedTime: 0,
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
    
    // Sandbox settings
    sandboxMaxParticles: 50,
    sandboxSpeed: 2,
    sandboxGravity: 0.3,
};

// PARTICLES
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * gameState.particleSpeed;
        this.vy = (Math.random() - 0.5) * gameState.particleSpeed;
        this.radius = 4;
        this.createdAt = Date.now();
    }
    
    getColor() {
        const timeOffset = (Date.now() - this.createdAt) / 100;
        const hue = (timeOffset + (this.x / canvas.width) * 360) % 360;
        return `hsl(${hue}, 100%, 50%)`;
    }
    
    update() {
        const dx = gameState.coreX - this.x;
        const dy = gameState.coreY - this.y;
        const distSquared = dx * dx + dy * dy;
        const distance = Math.sqrt(distSquared);
        
        if (distance > gameState.coreSize + 10 && distance > 0) {
            const normalizedDist = Math.max(distance, 1);
            const forceX = (dx / normalizedDist) * gameState.gravityStrength;
            const forceY = (dy / normalizedDist) * gameState.gravityStrength;
            this.vx += forceX;
            this.vy += forceY;
        }
        
        // Velocity damping to prevent infinite acceleration
        const speedLimit = gameState.particleSpeed * 5;
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (currentSpeed > speedLimit) {
            const ratio = speedLimit / currentSpeed;
            this.vx *= ratio;
            this.vy *= ratio;
        }
        
        this.vx *= 0.97;
        this.vy *= 0.97;
        
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
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
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
        const distance = 200 + Math.random() * 150;
        const x = gameState.coreX + Math.cos(angle) * distance;
        const y = gameState.coreY + Math.sin(angle) * distance;
        gameState.particles.push(new Particle(x, y));
    }
}

// UPDATE GAME
function updateGame() {
    if (gameState.isPaused) return;
    
    gameState.elapsedTime = (Date.now() - gameState.startTime - gameState.pausedTime) / 1000;
    
    // Update particles
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        if (!gameState.particles[i]) continue;
        
        gameState.particles[i].update();
        
        if (gameState.particles[i].checkAbsorption()) {
            gameState.particles.splice(i, 1);
            gameState.absorbedCount++;
            gameState.darkMatter++;
            
            if (gameState.currentMode !== 'sandbox') {
                spawnParticle();
            }
            
            // Victory check for Standard
            if (gameState.currentMode === 'standard' && gameState.absorbedCount >= gameState.targetAbsorbed) {
                advanceSector();
            }
        }
    }
    
    // Gravity Well mode: shrink core over time
    if (gameState.currentMode === 'gravity' && gameState.isRunning) {
        gameState.coreSize -= 0.03;
        if (gameState.coreSize <= 0) {
            endGame();
        }
    }
    
    // Spawn particles periodically (not in sandbox)
    if (gameState.currentMode !== 'sandbox' && gameState.particles.length < gameState.maxParticles && Math.random() < 0.12) {
        spawnParticle();
    }
    
    // Sandbox: maintain particles at max
    if (gameState.currentMode === 'sandbox' && gameState.particles.length < gameState.maxParticles && Math.random() < 0.2) {
        spawnParticle();
    }
    
    updateHUD();
}

// DRAW GAME
function drawGame() {
    // Clear canvas
    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw background gradient
    const gradient = ctx.createRadialGradient(gameState.coreX, gameState.coreY, 0, gameState.coreX, gameState.coreY, 600);
    gradient.addColorStop(0, 'rgba(26, 42, 74, 0.4)');
    gradient.addColorStop(0.5, 'rgba(26, 42, 74, 0.1)');
    gradient.addColorStop(1, 'rgba(10, 14, 39, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw particles first (back layer)
    for (let particle of gameState.particles) {
        particle.draw();
    }
    
    // Draw core
    const coreHue = (Date.now() / 120) % 360;
    
    // Core shadow/glow layers
    ctx.fillStyle = `hsla(${coreHue}, 100%, 40%, 0.3)`;
    ctx.beginPath();
    ctx.arc(gameState.coreX, gameState.coreY, gameState.coreSize + 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Main core
    ctx.fillStyle = `hsl(${coreHue}, 100%, 50%)`;
    ctx.beginPath();
    ctx.arc(gameState.coreX, gameState.coreY, gameState.coreSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Core inner highlight
    ctx.fillStyle = `hsla(${coreHue}, 100%, 70%, 0.6)`;
    ctx.beginPath();
    ctx.arc(gameState.coreX - gameState.coreSize * 0.3, gameState.coreY - gameState.coreSize * 0.3, gameState.coreSize * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw rings around core
    for (let i = 1; i <= 3; i++) {
        const ringHue = (coreHue + i * 30) % 360;
        ctx.strokeStyle = `hsla(${ringHue}, 100%, 50%, ${0.4 - i * 0.1})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(gameState.coreX, gameState.coreY, gameState.coreSize + i * 8, 0, Math.PI * 2);
        ctx.stroke();
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
    try {
        const modeText = gameState.currentMode === 'standard' ? 'Standard Sector' : 
                         gameState.currentMode === 'gravity' ? 'Gravity Well' : 'Sandbox';
        
        const modeDisplay = document.getElementById('modeDisplay');
        const coreDisplay = document.getElementById('coreSize');
        const particleDisplay = document.getElementById('particleCount');
        const absorbedDisplay = document.getElementById('absorbed');
        const sectorDisplay = document.getElementById('sector');
        const timeDisplay = document.getElementById('timeDisplay');
        const dmDisplay = document.getElementById('dmAmount');
        
        if (modeDisplay) modeDisplay.textContent = modeText;
        if (coreDisplay) coreDisplay.textContent = Math.max(0, Math.floor(gameState.coreSize));
        if (particleDisplay) particleDisplay.textContent = gameState.particles.length;
        if (absorbedDisplay) absorbedDisplay.textContent = gameState.absorbedCount;
        if (sectorDisplay) sectorDisplay.textContent = gameState.currentSector;
        if (timeDisplay) timeDisplay.textContent = Math.floor(gameState.elapsedTime) + 's';
        if (dmDisplay) dmDisplay.textContent = gameState.darkMatter;
        
        // Update upgrade buttons
        if (gameState.currentMode !== 'sandbox') {
            updateUpgradeButtons();
        }
    } catch (e) {
        console.error('HUD update error:', e);
    }
}

// UPDATE UPGRADE BUTTONS
function updateUpgradeButtons() {
    try {
        const upgrades = [
            { cost: 50, id: 'upgrade1' },
            { cost: 100, id: 'upgrade2' },
            { cost: 150, id: 'upgrade3' }
        ];
        
        upgrades.forEach(upgrade => {
            const btn = document.getElementById(upgrade.id);
            if (btn) {
                if (gameState.darkMatter >= upgrade.cost) {
                    btn.classList.remove('disabled');
                } else {
                    btn.classList.add('disabled');
                }
            }
        });
    } catch (e) {
        console.error('Upgrade button update error:', e);
    }
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
    gameState.gravityStrength += 0.15;
    gameState.coreSize = 40;
    gameState.isRunning = false;
    
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
        const distSquared = dx * dx + dy * dy;
        const distance = Math.sqrt(distSquared);
        
        if (distance < gameState.shockwaveRadius && distance > 1) {
            const force = (gameState.shockwaveRadius - distance) / gameState.shockwaveRadius * 10;
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
    if (e.button === 2 && gameState.isRunning) {
        triggerShockwave();
    }
});

document.addEventListener('contextmenu', (e) => e.preventDefault());

// KEYBOARD EVENTS
document.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
        e.preventDefault();
        if (gameState.isRunning && gameState.currentMode !== 'sandbox') {
            gameState.isPaused = !gameState.isPaused;
        }
    }
});

// UI EVENTS - Mode Selection
try {
    document.getElementById('standardBtn').addEventListener('click', () => startGame('standard'));
    document.getElementById('gravityBtn').addEventListener('click', () => startGame('gravity'));
    document.getElementById('sandboxBtn').addEventListener('click', () => startGame('sandbox'));
} catch (e) {
    console.error('Mode button setup error:', e);
}

function startGame(mode) {
    gameState.currentMode = mode;
    gameState.isRunning = true;
    gameState.isPaused = false;
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
    gameState.pausedTime = 0;
    
    // Reset upgrades for non-sandbox modes
    if (mode !== 'sandbox') {
        gameState.upgradeGravity = 0;
        gameState.upgradeParticles = 0;
        gameState.upgradeShockwave = 0;
    } else {
        // Apply sandbox settings
        gameState.maxParticles = gameState.sandboxMaxParticles;
        gameState.particleSpeed = gameState.sandboxSpeed;
        gameState.gravityStrength = gameState.sandboxGravity;
    }
    
    // Spawn initial particles
    for (let i = 0; i < gameState.maxParticles / 2; i++) {
        spawnParticle();
    }
    
    try {
        const menuOverlay = document.getElementById('menuOverlay');
        const hud = document.getElementById('hud');
        const gearBtn = document.getElementById('gearBtn');
        const sidePanel = document.getElementById('sidePanel');
        
        if (menuOverlay) menuOverlay.classList.add('hidden');
        if (hud) hud.classList.add('show');
        
        if (mode === 'sandbox') {
            if (gearBtn) gearBtn.classList.add('show');
            if (sidePanel) sidePanel.classList.remove('show');
        } else {
            if (gearBtn) gearBtn.classList.remove('show');
            if (sidePanel) sidePanel.classList.add('show');
        }
    } catch (e) {
        console.error('UI setup error:', e);
    }
}

// GAME OVER SCREEN
function showGameOverScreen() {
    try {
        const screen = document.getElementById('gameOverScreen');
        document.getElementById('finalScore').textContent = gameState.absorbedCount;
        document.getElementById('finalDM').textContent = gameState.darkMatter;
        document.getElementById('survivalTime').textContent = Math.floor(gameState.elapsedTime) + 's';
        if (screen) screen.classList.add('show');
    } catch (e) {
        console.error('Game over screen error:', e);
    }
}

try {
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
} catch (e) {
    console.error('Retry/Menu button setup error:', e);
}

// VICTORY SCREEN
function showVictoryScreen() {
    try {
        const screen = document.getElementById('victoryScreen');
        document.getElementById('victoryScore').textContent = gameState.absorbedCount;
        if (screen) screen.classList.add('show');
        
        setTimeout(() => {
            if (screen) screen.classList.remove('show');
            gameState.isRunning = true;
        }, 3000);
    } catch (e) {
        console.error('Victory screen error:', e);
    }
}

// LEADERBOARD
function saveHighScore(score) {
    try {
        let scores = JSON.parse(localStorage.getItem('eventHorizonScores') || '[]');
        scores.push(score);
        scores.sort((a, b) => b - a);
        scores = scores.slice(0, 10);
        localStorage.setItem('eventHorizonScores', JSON.stringify(scores));
    } catch (e) {
        console.error('Leaderboard save error:', e);
    }
}

try {
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
} catch (e) {
    console.error('Leaderboard setup error:', e);
}

// UPGRADE BUTTONS
try {
    document.getElementById('upgrade1').addEventListener('click', () => buyUpgrade(0));
    document.getElementById('upgrade2').addEventListener('click', () => buyUpgrade(1));
    document.getElementById('upgrade3').addEventListener('click', () => buyUpgrade(2));
} catch (e) {
    console.error('Upgrade button setup error:', e);
}

// SANDBOX SETTINGS
try {
    document.getElementById('gearBtn').addEventListener('click', () => {
        document.getElementById('settingsMenu').classList.add('show');
    });

    document.getElementById('closeSettings').addEventListener('click', () => {
        document.getElementById('settingsMenu').classList.remove('show');
        applySandboxSettings();
    });
} catch (e) {
    console.error('Sandbox settings setup error:', e);
}

function applySandboxSettings() {
    try {
        const ballNum = Math.max(1, Math.min(500, parseInt(document.getElementById('settingsBallNum').value) || 50));
        const speed = Math.max(0.1, Math.min(10, parseFloat(document.getElementById('settingsSpeed').value) || 2));
        const gravity = Math.max(-2, Math.min(2, parseFloat(document.getElementById('settingsGravity').value) || 0.3));
        
        gameState.sandboxMaxParticles = ballNum;
        gameState.sandboxSpeed = speed;
        gameState.sandboxGravity = gravity;
        
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
    } catch (e) {
        console.error('Sandbox settings apply error:', e);
    }
}

// START GAME LOOP
gameLoop();
