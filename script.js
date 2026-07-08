// ============ CANVAS SETUP ============
const canvas = document.getElementById('vibeCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

canvas.width = canvasWidth;
canvas.height = canvasHeight;

// ============ GAME STATE ============
let gameRunning = false;
let currentMode = 'standard';
let particles = [];
let coreX = canvasWidth / 2;
let coreY = canvasHeight / 2;
let coreRadius = 50;
let coreMaxRadius = 50;
let coreHealth = 100;
let darkMatter = 0;
let sector = 1;
let progress = 0;
let survivalTime = 0;
let gameStartTime = 0;
let lastFlareTime = 0;
const FLARE_INTERVAL = 10000; // 10 seconds for chaos mode
let waveTimeout = null;

// ============ UPGRADES ============
let upgrades = {
    gravPull: 0,
    matterRepl: 0,
    shockwave: 0
};

// ============ LEADERBOARD ============
let leaderboard = {
    standard: 1,
    survival: '0.0s',
    chaos: 0
};

// Load from localStorage
function loadProgress() {
    try {
        const saved = localStorage.getItem('vortexProgress');
        if (saved) {
            const data = JSON.parse(saved);
            upgrades = data.upgrades || upgrades;
            leaderboard = data.leaderboard || leaderboard;
            darkMatter = data.darkMatter || 0;
            updateUpgradeDisplay();
        }
    } catch (e) {
        console.error('Failed to load progress:', e);
    }
}

function saveProgress() {
    try {
        localStorage.setItem('vortexProgress', JSON.stringify({
            upgrades,
            leaderboard,
            darkMatter
        }));
    } catch (e) {
        console.error('Failed to save progress:', e);
    }
}

loadProgress();

// ============ PARTICLE CLASS ============
class Particle {
    constructor(x, y, vx, vy, size = 5, color = '#00ffcc') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.color = color;
        this.life = 1;
        this.trail = [];
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.01;
        
        // Trail effect
        if (this.trail.length > 6) this.trail.shift();
        this.trail.push({ x: this.x, y: this.y, life: this.life });
    }

    draw(ctx) {
        // Trail
        if (this.trail.length > 1) {
            ctx.strokeStyle = this.color;
            for (let i = 0; i < this.trail.length - 1; i++) {
                const current = this.trail[i];
                const next = this.trail[i + 1];
                const alpha = (current.life * 0.4) * (i / this.trail.length);
                ctx.globalAlpha = Math.max(0, alpha);
                ctx.lineWidth = this.size * 0.3;
                ctx.beginPath();
                ctx.moveTo(current.x, current.y);
                ctx.lineTo(next.x, next.y);
                ctx.stroke();
            }
        }

        // Particle glow
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2.5);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.globalAlpha = this.life * 0.8;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Particle core
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
    }
}

// ============ BACKGROUND ============
function drawBackground() {
    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Dynamic grid
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 70;
    for (let x = 0; x < canvasWidth; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
    }
    for (let y = 0; y < canvasHeight; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
    }
}

// ============ CORE DRAWING ============
function drawCore() {
    const pulseEffect = Math.sin(Date.now() * 0.004) * 4;
    const effectiveRadius = Math.max(5, coreRadius + pulseEffect);
    
    // Determine core color based on mode
    let coreColor = '#00ffcc';
    let glowColor = 'rgba(0, 255, 200, 0.6)';
    
    if (currentMode === 'gravity') {
        coreColor = '#ff00ff';
        glowColor = 'rgba(255, 0, 255, 0.6)';
    } else if (currentMode === 'chaos') {
        coreColor = '#ffaa00';
        glowColor = 'rgba(255, 170, 0, 0.6)';
    } else if (sector > 1) {
        const hue = Math.max(0, 160 - sector * 15);
        coreColor = `hsl(${hue}, 100%, 50%)`;
        glowColor = `hsla(${hue}, 100%, 50%, 0.5)`;
    }

    // Outer glow
    const gradient = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, effectiveRadius + 45);
    gradient.addColorStop(0, glowColor);
    gradient.addColorStop(0.5, glowColor.replace('0.6', '0.2'));
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(coreX, coreY, effectiveRadius + 45, 0, Math.PI * 2);
    ctx.fill();

    // Core body
    ctx.fillStyle = coreColor;
    ctx.beginPath();
    ctx.arc(coreX, coreY, effectiveRadius, 0, Math.PI * 2);
    ctx.fill();

    // Inner core
    ctx.fillStyle = '#0a0e27';
    ctx.beginPath();
    ctx.arc(coreX, coreY, effectiveRadius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Core outline
    ctx.strokeStyle = coreColor;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(coreX, coreY, effectiveRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

// ============ PARTICLE SPAWNING ============
function spawnParticles(x, y, count = 8) {
    const colors = ['#00ffcc', '#00d4ff', '#9d4edd', '#00ff88', '#00ffcc'];
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const speed = 2 + Math.random() * 3;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push(new Particle(x, y, vx, vy, 5, color));
    }
}

function spawnWave() {
    if (!gameRunning) return;

    const maxParticles = 100 + upgrades.matterRepl * 5 + (currentMode === 'chaos' ? 50 : 0);
    const waveSize = Math.min(12 + (sector - 1) * 2, 30);
    
    for (let i = 0; i < waveSize && particles.length < maxParticles; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 250 + Math.random() * 350;
        const x = coreX + Math.cos(angle) * distance;
        const y = coreY + Math.sin(angle) * distance;
        const speed = 0.8 + Math.random() * 2 + (sector - 1) * 0.25;
        const vx = -Math.cos(angle) * speed;
        const vy = -Math.sin(angle) * speed;
        particles.push(new Particle(x, y, vx, vy, 5, '#00ffcc'));
    }

    waveTimeout = setTimeout(spawnWave, 900);
}

// ============ GRAVITY & COLLISION ============
function applyGravity() {
    particles.forEach(p => {
        const dx = coreX - p.x;
        const dy = coreY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const pullStrength = 0.07 * (1 + upgrades.gravPull * 0.12);
        
        if (dist > 0) {
            p.vx += (dx / dist) * pullStrength;
            p.vy += (dy / dist) * pullStrength;
        }

        // Boundary wrap
        if (p.x < -100) p.x = canvasWidth + 100;
        if (p.x > canvasWidth + 100) p.x = -100;
        if (p.y < -100) p.y = canvasHeight + 100;
        if (p.y > canvasHeight + 100) p.y = -100;
    });
}

function checkCollisions() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const dx = coreX - p.x;
        const dy = coreY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < coreRadius + p.size) {
            particles.splice(i, 1);
            darkMatter += 1;
            progress += 1;

            if (currentMode === 'standard') {
                if (progress >= 500) {
                    sector++;
                    progress = 0;
                    coreMaxRadius = 50 + sector * 5;
                }
            } else if (currentMode === 'gravity') {
                coreHealth = Math.min(coreHealth + 1.5, 100);
            } else if (currentMode === 'chaos') {
                progress += 1;
            }
        }
    }
}

// ============ GAME LOOP UPDATE ============
function updateGame() {
    if (!gameRunning) return;

    applyGravity();
    checkCollisions();

    // Mode-specific updates
    if (currentMode === 'standard') {
        // Standard mode doesn't need special updates
    } else if (currentMode === 'gravity') {
        coreHealth -= 0.08;
        if (coreHealth <= 0) {
            endGame(`Survived for ${survivalTime.toFixed(1)}s`);
        }
        coreRadius = (coreHealth / 100) * coreMaxRadius;
    } else if (currentMode === 'chaos') {
        const elapsed = (Date.now() - gameStartTime) / 1000;
        if (elapsed > 60) {
            endGame(`Final Score: ${progress} particles harvested`);
        }
        
        // Solar flares every 10 seconds
        if (Date.now() - lastFlareTime > FLARE_INTERVAL) {
            triggerSolarFlare();
            lastFlareTime = Date.now();
        }
    }

    survivalTime = (Date.now() - gameStartTime) / 1000;
}

function triggerSolarFlare() {
    // Reverse gravity briefly for particles
    particles.forEach(p => {
        p.vx *= -0.6;
        p.vy *= -0.6;
    });
    spawnParticles(canvasWidth / 2, canvasHeight / 2, 20);
}

// ============ HUD UPDATE ============
function updateHUD() {
    const hudMode = document.getElementById('hudMode');
    const hudSector = document.getElementById('hudSector');
    const hudDm = document.getElementById('hudDm');
    const hudProgress = document.getElementById('hudProgress');
    const hudCoreHealth = document.getElementById('hudCoreHealth');

    if (currentMode === 'standard') {
        hudMode.textContent = 'STANDARD';
        hudSector.textContent = sector;
        hudProgress.textContent = `${progress}/500`;
        hudCoreHealth.textContent = '100%';
    } else if (currentMode === 'gravity') {
        hudMode.textContent = 'SURVIVAL';
        hudSector.textContent = '⏱';
        hudProgress.textContent = `${survivalTime.toFixed(1)}s`;
        hudCoreHealth.textContent = `${Math.max(0, Math.floor(coreHealth))}%`;
    } else if (currentMode === 'chaos') {
        hudMode.textContent = 'CHAOS';
        const timeLeft = Math.max(0, 60 - Math.floor((Date.now() - gameStartTime) / 1000));
        hudSector.textContent = `${timeLeft}s`;
        hudProgress.textContent = `${progress}`;
        hudCoreHealth.textContent = '100%';
    }

    hudDm.textContent = darkMatter;
}

// ============ GAME LIFECYCLE ============
function startGame(mode) {
    currentMode = mode;
    gameRunning = true;
    particles = [];
    coreRadius = coreMaxRadius = 50;
    coreHealth = 100;
    progress = 0;
    sector = 1;
    survivalTime = 0;
    gameStartTime = Date.now();
    lastFlareTime = Date.now();

    document.getElementById('startMenu').classList.add('hidden');
    document.getElementById('gameOverMenu').classList.add('hidden');
    document.getElementById('gameHud').classList.remove('hud-tophidden');
    document.getElementById('settingsPanel').classList.add('hidden');

    spawnWave();
}

function endGame(reason) {
    gameRunning = false;
    clearTimeout(waveTimeout);
    
    document.getElementById('gameOverReason').textContent = reason;
    document.getElementById('finalScoreVal').textContent = `${darkMatter} Dark Matter collected`;

    // Update leaderboard
    if (currentMode === 'standard') {
        leaderboard.standard = Math.max(leaderboard.standard, sector);
    } else if (currentMode === 'gravity') {
        const prevSurvival = parseFloat(leaderboard.survival) || 0;
        leaderboard.survival = Math.max(prevSurvival, survivalTime).toFixed(1) + 's';
    } else if (currentMode === 'chaos') {
        leaderboard.chaos = Math.max(leaderboard.chaos, progress);
    }

    saveProgress();
    document.getElementById('gameOverMenu').classList.remove('hidden');
    document.getElementById('gameHud').classList.add('hud-tophidden');
}

// ============ ANIMATION LOOP ============
function gameLoop() {
    drawBackground();

    // Update and draw particles
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.update();
        p.draw(ctx);
    });

    updateGame();
    updateHUD();
    drawCore();

    requestAnimationFrame(gameLoop);
}

// ============ INPUT HANDLING ============
document.addEventListener('click', (e) => {
    if (!gameRunning) return;
    const target = e.target;
    if (target.tagName === 'BUTTON' || target.closest('button')) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const blastRadius = 120 + upgrades.shockwave * 25;
    let hitCount = 0;

    particles.forEach(p => {
        const dx = p.x - clickX;
        const dy = p.y - clickY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < blastRadius) {
            const force = 7 * (1 - dist / blastRadius);
            const dist_safe = Math.max(0.1, dist);
            p.vx = (dx / dist_safe) * force;
            p.vy = (dy / dist_safe) * force;
            hitCount++;
        }
    });

    spawnParticles(clickX, clickY, Math.min(Math.max(hitCount / 3, 3), 15));
});

// ============ MENU BUTTONS ============
function setupMenuHandlers() {
    document.getElementById('startGameBtn').addEventListener('click', () => startGame('standard'));

    document.getElementById('selectModeBtn').addEventListener('click', () => {
        document.getElementById('mainMenuButtons').classList.add('hidden');
        document.getElementById('modeView').classList.remove('hidden');
    });

    document.getElementById('leaderboardsBtn').addEventListener('click', () => {
        document.getElementById('mainMenuButtons').classList.add('hidden');
        document.getElementById('leaderboardView').classList.remove('hidden');
        document.getElementById('lbStandard').textContent = `Sector ${leaderboard.standard}`;
        document.getElementById('lbSurvival').textContent = leaderboard.survival;
        document.getElementById('lbChaos').textContent = `${leaderboard.chaos} DM`;
    });

    document.querySelectorAll('.back-to-menu').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('mainMenuButtons').classList.remove('hidden');
            document.getElementById('modeView').classList.add('hidden');
            document.getElementById('leaderboardView').classList.add('hidden');
        });
    });

    document.getElementById('modeStandardBtn').addEventListener('click', () => startGame('standard'));
    document.getElementById('modeGravityBtn').addEventListener('click', () => startGame('gravity'));
    document.getElementById('modeChaosBtn').addEventListener('click', () => startGame('chaos'));

    document.getElementById('restartGameBtn').addEventListener('click', () => {
        document.getElementById('gameOverMenu').classList.add('hidden');
        startGame(currentMode);
    });

    document.getElementById('exitToMenuBtn').addEventListener('click', () => {
        document.getElementById('gameOverMenu').classList.add('hidden');
        document.getElementById('startMenu').classList.remove('hidden');
        document.getElementById('gameHud').classList.add('hud-tophidden');
    });
}

// ============ SETTINGS PANEL ============
function setupSettingsHandlers() {
    document.getElementById('settingsBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('settingsPanel').classList.toggle('hidden');
        if (!document.getElementById('settingsPanel').classList.contains('hidden')) {
            document.getElementById('settingsPanel').setAttribute('aria-hidden', 'false');
        } else {
            document.getElementById('settingsPanel').setAttribute('aria-hidden', 'true');
        }
    });

    document.getElementById('closeBtn').addEventListener('click', () => {
        document.getElementById('settingsPanel').classList.add('hidden');
        document.getElementById('settingsPanel').setAttribute('aria-hidden', 'true');
    });
}

function updateUpgradeDisplay() {
    document.getElementById('dmDisplay').textContent = darkMatter;
    document.getElementById('lvlGravPull').textContent = upgrades.gravPull;
    document.getElementById('lvlMatterRepl').textContent = upgrades.matterRepl;
    document.getElementById('lvlShockwave').textContent = upgrades.shockwave;
}

// ============ UPGRADES ============
function setupUpgradeHandlers() {
    document.getElementById('buyGravPullBtn').addEventListener('click', () => {
        if (darkMatter >= 50) {
            darkMatter -= 50;
            upgrades.gravPull++;
            saveProgress();
            updateUpgradeDisplay();
        }
    });

    document.getElementById('buyMatterReplBtn').addEventListener('click', () => {
        if (darkMatter >= 100) {
            darkMatter -= 100;
            upgrades.matterRepl++;
            saveProgress();
            updateUpgradeDisplay();
        }
    });

    document.getElementById('buyShockwaveBtn').addEventListener('click', () => {
        if (darkMatter >= 150) {
            darkMatter -= 150;
            upgrades.shockwave++;
            saveProgress();
            updateUpgradeDisplay();
        }
    });
}

// ============ RESIZE HANDLER ============
window.addEventListener('resize', () => {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    coreX = canvasWidth / 2;
    coreY = canvasHeight / 2;
});

// ============ INITIALIZATION ============
function init() {
    setupMenuHandlers();
    setupSettingsHandlers();
    setupUpgradeHandlers();
    updateUpgradeDisplay();
    gameLoop();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
