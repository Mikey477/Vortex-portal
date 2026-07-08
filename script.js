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
let frameCount = 0;

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
        this.maxTrailLength = 8;
    }

    update() {
        // Apply friction
        this.vx *= 0.998;
        this.vy *= 0.998;
        
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.008;
        
        // Trail effect
        if (this.trail.length > this.maxTrailLength) this.trail.shift();
        this.trail.push({ x: this.x, y: this.y, life: this.life });
    }

    draw(ctx) {
        if (this.life <= 0) return;

        // Trail with proper blending
        if (this.trail.length > 1) {
            ctx.strokeStyle = this.color;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            for (let i = 0; i < this.trail.length - 1; i++) {
                const current = this.trail[i];
                const next = this.trail[i + 1];
                const alpha = Math.max(0, current.life * 0.3 * (i / this.trail.length));
                ctx.globalAlpha = alpha;
                ctx.lineWidth = this.size * 0.4;
                ctx.beginPath();
                ctx.moveTo(current.x, current.y);
                ctx.lineTo(next.x, next.y);
                ctx.stroke();
            }
        }

        // Particle glow
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(0.6, this.color.replace(/[^,]+$/, '0.5)'));
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.globalAlpha = Math.max(0, this.life * 0.6);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Particle core
        ctx.globalAlpha = Math.max(0, this.life * 0.9);
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

    // Optimized grid - only draw every other frame
    if (frameCount % 2 === 0) {
        ctx.strokeStyle = 'rgba(0, 255, 200, 0.04)';
        ctx.lineWidth = 1;
        const gridSize = 80;
        const offsetX = (frameCount / 20) % gridSize;
        
        for (let x = -offsetX; x < canvasWidth; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasHeight);
            ctx.stroke();
        }
        for (let y = -offsetX; y < canvasHeight; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidth, y);
            ctx.stroke();
        }
    }
}

// ============ CORE DRAWING ============
function drawCore() {
    const pulseEffect = Math.sin(Date.now() * 0.003) * 3;
    const effectiveRadius = Math.max(8, coreRadius + pulseEffect);
    
    // Determine core color based on mode
    let coreColor = '#00ffcc';
    let glowColor = 'rgba(0, 255, 200, 0.7)';
    
    if (currentMode === 'gravity') {
        coreColor = '#ff00ff';
        glowColor = 'rgba(255, 0, 255, 0.7)';
    } else if (currentMode === 'chaos') {
        coreColor = '#00d4ff';
        glowColor = 'rgba(0, 212, 255, 0.7)';
    } else if (sector > 1) {
        const hue = Math.max(0, Math.min(360, 160 - sector * 12));
        coreColor = `hsl(${hue}, 100%, 50%)`;
        glowColor = `hsla(${hue}, 100%, 50%, 0.6)`;
    }

    // Outer glow - multiple rings for better effect
    for (let i = 3; i > 0; i--) {
        const r = effectiveRadius + (15 * i);
        const gradient = ctx.createRadialGradient(coreX, coreY, effectiveRadius, coreX, coreY, r);
        gradient.addColorStop(0, glowColor.replace(/[\d.]+\)$/, `${0.3 / i})`));
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(coreX, coreY, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Core body with solid fill
    ctx.fillStyle = coreColor;
    ctx.beginPath();
    ctx.arc(coreX, coreY, effectiveRadius, 0, Math.PI * 2);
    ctx.fill();

    // Inner core highlight
    const innerGradient = ctx.createRadialGradient(coreX - 5, coreY - 5, 0, coreX, coreY, effectiveRadius * 0.6);
    innerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    innerGradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.arc(coreX, coreY, effectiveRadius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Core outline
    ctx.strokeStyle = coreColor;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(coreX, coreY, effectiveRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

// ============ PARTICLE SPAWNING ============
function spawnParticles(x, y, count = 8) {
    const colors = ['#00ffcc', '#00d4ff', '#9d4edd', '#00ff88'];
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
        const speed = 1.5 + Math.random() * 3.5;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push(new Particle(x, y, vx, vy, 4, color));
    }
}

function spawnWave() {
    if (!gameRunning) return;

    const maxParticles = 100 + upgrades.matterRepl * 5 + (currentMode === 'chaos' ? 60 : 0);
    const waveSize = Math.min(10 + sector, 25);
    
    for (let i = 0; i < waveSize && particles.length < maxParticles; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 280 + Math.random() * 320;
        const x = coreX + Math.cos(angle) * distance;
        const y = coreY + Math.sin(angle) * distance;
        const speed = 0.9 + Math.random() * 1.8 + (sector - 1) * 0.2;
        const vx = -Math.cos(angle) * speed;
        const vy = -Math.sin(angle) * speed;
        particles.push(new Particle(x, y, vx, vy, 4, '#00ffcc'));
    }

    waveTimeout = setTimeout(spawnWave, 850);
}

// ============ GRAVITY & COLLISION ============
function applyGravity() {
    const gravityStrength = 0.08 * (1 + upgrades.gravPull * 0.14);
    
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = coreX - p.x;
        const dy = coreY - p.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        
        if (dist > 0.1) {
            const force = gravityStrength / Math.max(1, dist * 0.01);
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
        }

        // Boundary wrap with padding
        const padding = 150;
        if (p.x < -padding) p.x = canvasWidth + padding;
        if (p.x > canvasWidth + padding) p.x = -padding;
        if (p.y < -padding) p.y = canvasHeight + padding;
        if (p.y > canvasHeight + padding) p.y = -padding;
    }
}

function checkCollisions() {
    const collisionRadius = coreRadius + 8;
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const dx = coreX - p.x;
        const dy = coreY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < collisionRadius) {
            particles.splice(i, 1);
            darkMatter++;
            progress++;

            if (currentMode === 'standard') {
                if (progress >= 500) {
                    sector++;
                    progress = 0;
                    coreMaxRadius = 50 + sector * 4;
                }
            } else if (currentMode === 'gravity') {
                coreHealth = Math.min(coreHealth + 2, 100);
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
        // Nothing special needed
    } else if (currentMode === 'gravity') {
        coreHealth -= 0.06;
        if (coreHealth <= 0) {
            endGame(`Survived for ${survivalTime.toFixed(1)}s`);
        }
        coreRadius = Math.max(8, (coreHealth / 100) * coreMaxRadius);
    } else if (currentMode === 'chaos') {
        const elapsed = (Date.now() - gameStartTime) / 1000;
        if (elapsed > 60) {
            endGame(`Final Score: ${progress} particles`);
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
    // Add visual feedback
    particles.forEach(p => {
        p.vx *= -0.7;
        p.vy *= -0.7;
    });
    spawnParticles(canvasWidth / 2, canvasHeight / 2, 25);
}

// ============ HUD UPDATE ============
function updateHUD() {
    const hudMode = document.getElementById('hudMode');
    const hudSector = document.getElementById('hudSector');
    const hudDm = document.getElementById('hudDm');
    const hudProgress = document.getElementById('hudProgress');
    const hudCoreHealth = document.getElementById('hudCoreHealth');

    if (currentMode === 'standard') {
        if (hudMode) hudMode.textContent = 'STANDARD';
        if (hudSector) hudSector.textContent = sector;
        if (hudProgress) hudProgress.textContent = `${progress}/500`;
        if (hudCoreHealth) hudCoreHealth.textContent = '100%';
    } else if (currentMode === 'gravity') {
        if (hudMode) hudMode.textContent = 'SURVIVAL';
        if (hudSector) hudSector.textContent = '⏱';
        if (hudProgress) hudProgress.textContent = `${survivalTime.toFixed(1)}s`;
        if (hudCoreHealth) hudCoreHealth.textContent = `${Math.max(0, Math.floor(coreHealth))}%`;
    } else if (currentMode === 'chaos') {
        if (hudMode) hudMode.textContent = 'CHAOS';
        const timeLeft = Math.max(0, 60 - Math.floor((Date.now() - gameStartTime) / 1000));
        if (hudSector) hudSector.textContent = `${timeLeft}s`;
        if (hudProgress) hudProgress.textContent = `${progress}`;
        if (hudCoreHealth) hudCoreHealth.textContent = '100%';
    }

    if (hudDm) hudDm.textContent = darkMatter;
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
    frameCount = 0;

    document.getElementById('startMenu').classList.add('hidden');
    document.getElementById('gameOverMenu').classList.add('hidden');
    document.getElementById('gameHud').classList.remove('hud-tophidden');
    document.getElementById('settingsPanel').classList.add('hidden');

    // Close panel on mobile
    if (window.innerWidth < 768) {
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) settingsBtn.style.display = 'block';
    }

    spawnWave();
}

function endGame(reason) {
    gameRunning = false;
    clearTimeout(waveTimeout);
    
    const gameOverReason = document.getElementById('gameOverReason');
    const finalScoreVal = document.getElementById('finalScoreVal');
    if (gameOverReason) gameOverReason.textContent = reason;
    if (finalScoreVal) finalScoreVal.textContent = `${darkMatter} Dark Matter collected`;

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
    frameCount++;
    
    drawBackground();

    // Update and draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        } else {
            particles[i].update();
            particles[i].draw(ctx);
        }
    }

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

    const blastRadius = 130 + upgrades.shockwave * 30;
    let hitCount = 0;

    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = p.x - clickX;
        const dy = p.y - clickY;
        const distSq = dx * dx + dy * dy;
        const blastRadiusSq = blastRadius * blastRadius;

        if (distSq < blastRadiusSq) {
            const dist = Math.sqrt(distSq);
            const force = 8 * Math.max(0, 1 - dist / blastRadius);
            const dist_safe = Math.max(1, dist);
            p.vx = (dx / dist_safe) * force;
            p.vy = (dy / dist_safe) * force;
            hitCount++;
        }
    }

    const spawnCount = Math.min(Math.max(hitCount / 4, 4), 18);
    spawnParticles(clickX, clickY, spawnCount);
});

// ============ MENU BUTTONS ============
function setupMenuHandlers() {
    const startBtn = document.getElementById('startGameBtn');
    const selectModeBtn = document.getElementById('selectModeBtn');
    const leaderboardsBtn = document.getElementById('leaderboardsBtn');

    if (startBtn) startBtn.addEventListener('click', () => startGame('standard'));
    if (selectModeBtn) selectModeBtn.addEventListener('click', () => {
        document.getElementById('mainMenuButtons').classList.add('hidden');
        document.getElementById('modeView').classList.remove('hidden');
    });
    if (leaderboardsBtn) leaderboardsBtn.addEventListener('click', () => {
        document.getElementById('mainMenuButtons').classList.add('hidden');
        document.getElementById('leaderboardView').classList.remove('hidden');
        const lbStandard = document.getElementById('lbStandard');
        const lbSurvival = document.getElementById('lbSurvival');
        const lbChaos = document.getElementById('lbChaos');
        if (lbStandard) lbStandard.textContent = `Sector ${leaderboard.standard}`;
        if (lbSurvival) lbSurvival.textContent = leaderboard.survival;
        if (lbChaos) lbChaos.textContent = `${leaderboard.chaos} DM`;
    });

    document.querySelectorAll('.back-to-menu').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('mainMenuButtons').classList.remove('hidden');
            document.getElementById('modeView').classList.add('hidden');
            document.getElementById('leaderboardView').classList.add('hidden');
        });
    });

    const modeStandardBtn = document.getElementById('modeStandardBtn');
    const modeGravityBtn = document.getElementById('modeGravityBtn');
    const modeChaosBtn = document.getElementById('modeChaosBtn');

    if (modeStandardBtn) modeStandardBtn.addEventListener('click', () => startGame('standard'));
    if (modeGravityBtn) modeGravityBtn.addEventListener('click', () => startGame('gravity'));
    if (modeChaosBtn) modeChaosBtn.addEventListener('click', () => startGame('chaos'));

    const restartBtn = document.getElementById('restartGameBtn');
    const exitBtn = document.getElementById('exitToMenuBtn');

    if (restartBtn) restartBtn.addEventListener('click', () => {
        document.getElementById('gameOverMenu').classList.add('hidden');
        startGame(currentMode);
    });
    if (exitBtn) exitBtn.addEventListener('click', () => {
        document.getElementById('gameOverMenu').classList.add('hidden');
        document.getElementById('startMenu').classList.remove('hidden');
        document.getElementById('gameHud').classList.add('hud-tophidden');
    });
}

// ============ SETTINGS PANEL ============
function setupSettingsHandlers() {
    const settingsBtn = document.getElementById('settingsBtn');
    const closeBtn = document.getElementById('closeBtn');
    const settingsPanel = document.getElementById('settingsPanel');

    if (settingsBtn) settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsPanel.classList.toggle('hidden');
        settingsPanel.setAttribute('aria-hidden', settingsPanel.classList.contains('hidden'));
    });

    if (closeBtn) closeBtn.addEventListener('click', () => {
        settingsPanel.classList.add('hidden');
        settingsPanel.setAttribute('aria-hidden', 'true');
    });

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
        if (!settingsPanel.contains(e.target) && e.target !== settingsBtn) {
            if (!settingsPanel.classList.contains('hidden')) {
                settingsPanel.classList.add('hidden');
                settingsPanel.setAttribute('aria-hidden', 'true');
            }
        }
    });
}

function updateUpgradeDisplay() {
    const dmDisplay = document.getElementById('dmDisplay');
    const lvlGravPull = document.getElementById('lvlGravPull');
    const lvlMatterRepl = document.getElementById('lvlMatterRepl');
    const lvlShockwave = document.getElementById('lvlShockwave');

    if (dmDisplay) dmDisplay.textContent = darkMatter;
    if (lvlGravPull) lvlGravPull.textContent = upgrades.gravPull;
    if (lvlMatterRepl) lvlMatterRepl.textContent = upgrades.matterRepl;
    if (lvlShockwave) lvlShockwave.textContent = upgrades.shockwave;
}

// ============ UPGRADES ============
function setupUpgradeHandlers() {
    const buyGravPullBtn = document.getElementById('buyGravPullBtn');
    const buyMatterReplBtn = document.getElementById('buyMatterReplBtn');
    const buyShockwaveBtn = document.getElementById('buyShockwaveBtn');

    if (buyGravPullBtn) buyGravPullBtn.addEventListener('click', () => {
        if (darkMatter >= 50) {
            darkMatter -= 50;
            upgrades.gravPull++;
            saveProgress();
            updateUpgradeDisplay();
        }
    });

    if (buyMatterReplBtn) buyMatterReplBtn.addEventListener('click', () => {
        if (darkMatter >= 100) {
            darkMatter -= 100;
            upgrades.matterRepl++;
            saveProgress();
            updateUpgradeDisplay();
        }
    });

    if (buyShockwaveBtn) buyShockwaveBtn.addEventListener('click', () => {
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
