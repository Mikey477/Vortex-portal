document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('vibeCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    // DOM Element Selectors
    const startMenu = document.getElementById('startMenu');
    const modePanel = document.getElementById('modePanel');
    const leaderPanel = document.getElementById('leaderPanel');
    const gameOverPanel = document.getElementById('gameOverPanel');
    const gameHUD = document.getElementById('gameHUD');
    const settingsPanel = document.getElementById('settingsPanel');

    const btnStart = document.getElementById('btnStart');
    const btnMode = document.getElementById('btnMode');
    const btnLeader = document.getElementById('btnLeader');
    const btnModeBack = document.getElementById('btnModeBack');
    const btnLeaderBack = document.getElementById('btnLeaderBack');
    const btnRestart = document.getElementById('btnRestart');
    const settingsBtn = document.getElementById('settingsBtn');
    const closeBtn = document.getElementById('closeBtn');

    const modeCards = document.querySelectorAll('.mode-card');
    const inputTrails = document.getElementById('trailLength');
    const inputLines = document.getElementById('toggleLines');
    const valTrails = document.getElementById('valTrails');

    // HUD Dynamic Selectors
    const hudSector = document.getElementById('hudSector');
    const hudScore = document.getElementById('hudScore');
    const hudTarget = document.getElementById('hudTarget');
    const hudDM = document.getElementById('hudDM');
    const hudTimer = document.getElementById('hudTimer');
    const shopDM = document.getElementById('shopDM');
    const finalScore = document.getElementById('finalScore');
    const gameOverReason = document.getElementById('gameOverReason');

    // Upgrade Button Elements
    const buyGrav = document.getElementById('buyGrav');
    const buyMax = document.getElementById('buyMax');
    const buyShock = document.getElementById('buyShock');

    // Game Core State Variables
    let currentMode = 'standard'; // standard, survival, chaos
    let isPlaying = false;
    let score = 0;
    let darkMatter = 0;
    let sector = 1;
    let gameTime = 0; // seconds tracker
    let timeLimit = 60; // For score attack modes
    let intervalTimer = null;

    // Core Properties (Mass / Size Simulation parameters)
    let coreRadius = 40;
    let targetCoreRadius = 40;
    let baseTargetScore = 500;

    // Real-Time Upgrade Constants Multipliers
    let upgradeModifiers = {
        gravPull: 1.0,
        maxParticlesBonus: 0,
        shockRadiusBonus: 1.0
    };

    let config = {
        trail: parseFloat(inputTrails.value),
        renderLines: inputLines.checked
    };

    const mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2, active: false };
    const pulses = [];
    const sparks = []; 
    const swarm = [];
    let baseHue = 190; 
    let solarFlareActive = false;
    let solarFlareTimer = 0;

    // LocalStorage Leaderboard Cache Engines
    let highScores = {
        standard: parseInt(localStorage.getItem('highStandard')) || 1,
        survival: parseInt(localStorage.getItem('highSurvival')) || 0,
        chaos: parseInt(localStorage.getItem('highChaos')) || 0
    };
    updateLeaderboardUI();

    // Menu View Toggles
    btnMode.addEventListener('click', () => { startMenu.classList.add('hidden'); modePanel.classList.remove('hidden'); });
    btnModeBack.addEventListener('click', () => { modePanel.classList.add('hidden'); startMenu.classList.remove('hidden'); });
    btnLeader.addEventListener('click', () => { startMenu.classList.add('hidden'); leaderPanel.classList.remove('hidden'); });
    btnLeaderBack.addEventListener('click', () => { leaderPanel.classList.add('hidden'); startMenu.classList.remove('hidden'); });
    settingsBtn.addEventListener('click', () => settingsPanel.classList.remove('hidden'));
    closeBtn.addEventListener('click', () => settingsPanel.classList.add('hidden'));

    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            modeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            currentMode = card.getAttribute('data-mode');
        });
    });

    btnStart.addEventListener('click', startGame);
    btnRestart.addEventListener('click', startGame);

    // --- QUANTUM SHOP ENGINE LOGIC ---
    function updateShopButtons() {
        hudDM.textContent = darkMatter;
        shopDM.textContent = darkMatter;

        [buyGrav, buyMax, buyShock].forEach(btn => {
            const cost = parseInt(btn.getAttribute('data-cost'));
            btn.disabled = darkMatter < cost;
        });
    }

    buyGrav.addEventListener('click', () => {
        deductDM(50);
        upgradeModifiers.gravPull += 0.15;
        matchSwarmCapacity();
    });
    buyMax.addEventListener('click', () => {
        deductDM(100);
        upgradeModifiers.maxParticlesBonus += 25;
        matchSwarmCapacity();
    });
    buyShock.addEventListener('click', () => {
        deductDM(150);
        upgradeModifiers.shockRadiusBonus += 0.25;
    });

    function deductDM(amount) {
        darkMatter -= amount;
        updateShopButtons();
    }

    // Slider inputs processing
    inputTrails.addEventListener('input', e => {
        config.trail = parseFloat(e.target.value);
        valTrails.textContent = config.trail <= 0.1 ? "Sharp" : config.trail <= 0.25 ? "Long" : "Hyper Fluid";
    });
    inputLines.addEventListener('change', e => { config.renderLines = e.target.checked; });

    // --- GAME ACTIONS INITIALIZATION ---
    function startGame() {
        startMenu.classList.add('hidden');
        modePanel.classList.add('hidden');
        gameOverPanel.classList.add('hidden');
        gameHUD.classList.remove('hidden');

        // Reset runtime values
        isPlaying = true;
        score = 0;
        gameTime = 0;
        sector = 1;
        coreRadius = 50;
        targetCoreRadius = 50;
        solarFlareActive = false;
        solarFlareTimer = 0;

        if (currentMode === 'survival') {
            baseTargetScore = Infinity; // Survival runs forever until collapse
            hudTarget.textContent = "∞";
            hudSector.textContent = "SURVIVAL";
        } else if (currentMode === 'chaos') {
            gameTime = timeLimit;
            hudTarget.textContent = "LIMITLESS";
            hudSector.textContent = "CHAOS ATTACK";
        } else {
            baseTargetScore = 500;
            hudTarget.textContent = baseTargetScore;
            hudSector.textContent = sector;
        }

        matchSwarmCapacity();
        updateShopButtons();

        // Run independent game clock
        if (intervalTimer) clearInterval(intervalTimer);
        intervalTimer = setInterval(gameClockTick, 1000);
    }

    function gameClockTick() {
        if (!isPlaying) return;

        if (currentMode === 'standard') {
            gameTime++;
            hudTimer.textContent = gameTime + "s";
        } else if (currentMode === 'survival') {
            gameTime++;
            hudTimer.textContent = gameTime + "s";
            // Core actively drops size over time
            targetCoreRadius -= (1.2 + (gameTime * 0.005)); 
            if (coreRadius <= 5) triggerGameOver("Core collapsed due to massive mass degradation!");
        } else if (currentMode === 'chaos') {
            gameTime--;
            hudTimer.textContent = gameTime + "s";
            
            // Handle solar flares execution intervals
            solarFlareTimer++;
            if (solarFlareTimer >= 10) {
                solarFlareTimer = 0;
                triggerSolarFlare();
            }

            if (gameTime <= 0) triggerGameOver("Time expired! Chaos harvest window closed.");
        }
    }

    function triggerSolarFlare() {
        solarFlareActive = true;
        baseHue = (baseHue + 120) % 360; // Violent color shift
        setTimeout(() => { solarFlareActive = false; }, 2500); // Inverse gravity flips back
    }

    function triggerGameOver(reason) {
        isPlaying = false;
        clearInterval(intervalTimer);
        gameHUD.classList.add('hidden');
        gameOverPanel.classList.remove('hidden');
        gameOverReason.textContent = reason;
        finalScore.textContent = currentMode === 'survival' ? gameTime + " seconds survived" : score + " orbs collected";

        // Evaluate Leaderboard cache updates
        if (currentMode === 'standard' && sector > highScores.standard) {
            highScores.standard = sector;
            localStorage.setItem('highStandard', sector);
        } else if (currentMode === 'survival' && gameTime > highScores.survival) {
            highScores.survival = gameTime;
            localStorage.setItem('highSurvival', gameTime);
        } else if (currentMode === 'chaos' && score > highScores.chaos) {
            highScores.chaos = score;
            localStorage.setItem('highChaos', score);
        }
        updateLeaderboardUI();
    }

    function updateLeaderboardUI() {
        document.getElementById('highStandard').textContent = "Sector " + highScores.standard;
        document.getElementById('highSurvival').textContent = highScores.survival + "s";
        document.getElementById('highChaos').textContent = highScores.chaos + " pts";
    }

    // --- SWARM AGENT ENGINE ATOM ---
    class Orb {
        constructor() {
            this.init();
        }
        init() {
            // Spawn loosely outside the core
            const angle = Math.random() * Math.PI * 2;
