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

  const startMenu = document.getElementById('startMenu');
  const mainMenuButtons = document.getElementById('mainMenuButtons');
  const modeView = document.getElementById('modeView');
  const leaderboardView = document.getElementById('leaderboardView');
  const gameOverMenu = document.getElementById('gameOverMenu');
  const gameHud = document.getElementById('gameHud');
  const settingsPanel = document.getElementById('settingsPanel');
  const settingsBtn = document.getElementById('settingsBtn');
  const closeBtn = document.getElementById('closeBtn');

  const startGameBtn = document.getElementById('startGameBtn');
  const selectModeBtn = document.getElementById('selectModeBtn');
  const leaderboardsBtn = document.getElementById('leaderboardsBtn');
  const restartGameBtn = document.getElementById('restartGameBtn');
  const exitToMenuBtn = document.getElementById('exitToMenuBtn');
  const backBtns = document.querySelectorAll('.back-to-menu');

  const modeStandardBtn = document.getElementById('modeStandardBtn');
  const modeGravityBtn = document.getElementById('modeGravityBtn');
  const modeChaosBtn = document.getElementById('modeChaosBtn');

  const buyGravPullBtn = document.getElementById('buyGravPullBtn');
  const buyMatterReplBtn = document.getElementById('buyMatterReplBtn');
  const buyShockwaveBtn = document.getElementById('buyShockwaveBtn');

  const hudMode = document.getElementById('hudMode');
  const hudDm = document.getElementById('hudDm');
  const hudObjective = document.getElementById('hudObjective');
  const lvlGravPull = document.getElementById('lvlGravPull');
  const lvlMatterRepl = document.getElementById('lvlMatterRepl');
  const lvlShockwave = document.getElementById('lvlShockwave');
  const finalScoreVal = document.getElementById('finalScoreVal');
  const gameOverReason = document.getElementById('gameOverReason');

  const lbStandard = document.getElementById('lbStandard');
  const lbSurvival = document.getElementById('lbSurvival');
  const lbChaos = document.getElementById('lbChaos');

  let gameState = {
    running: false,
    currentMode: 'standard', 
    sector: 1,
    absorbedCount: 0,
    targetObjective: 500,
    darkMatter: 0,
    coreRadius: 40,
    maxCoreRadius: 120,
    survivalSeconds: 0,
    chaosTimeLeft: 60,
    solarFlareActive: false,
    flareTimer: 0
  };

  let upgrades = {
    gravPullLevel: 0,
    matterReplLevel: 0,
    shockwaveLevel: 0
  };

  let scores = {
    standard: 1,
    survival: 0,
    chaos: 0
  };

  function loadScores() {
    const saved = localStorage.getItem('quantum_harvest_scores');
    if (saved) {
      scores = JSON.parse(saved);
    }
    lbStandard.textContent = scores.standard;
    lbSurvival.textContent = scores.survival + 's';
    lbChaos.textContent = scores.chaos + ' DM';
  }
  loadScores();

  function saveScores() {
    localStorage.setItem('quantum_harvest_scores', JSON.stringify(scores));
    lbStandard.textContent = scores.standard;
    lbSurvival.textContent = scores.survival + 's';
    lbChaos.textContent = scores.chaos + ' DM';
  }

  settingsBtn.addEventListener('click', () => settingsPanel.classList.remove('hidden'));
  closeBtn.addEventListener('click', () => settingsPanel.classList.add('hidden'));

  selectModeBtn.addEventListener('click', () => {
    mainMenuButtons.classList.add('hidden');
    modeView.classList.remove('hidden');
  });

  leaderboardsBtn.addEventListener('click', () => {
    mainMenuButtons.classList.add('hidden');
    leaderboardView.classList.remove('hidden');
    loadScores();
  });

  backBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeView.classList.add('hidden');
      leaderboardView.classList.add('hidden');
      mainMenuButtons.classList.remove('hidden');
    });
  });

  function setActiveModeCard(activeBtn) {
    [modeStandardBtn, modeGravityBtn, modeChaosBtn].forEach(b => b.classList.remove('active'));
    activeBtn.classList.add('active');
  }

  modeStandardBtn.addEventListener('click', () => { gameState.currentMode = 'standard'; setActiveModeCard(modeStandardBtn); });
  modeGravityBtn.addEventListener('click', () => { gameState.currentMode = 'gravity'; setActiveModeCard(modeGravityBtn); });
  modeChaosBtn.addEventListener('click', () => { gameState.currentMode = 'chaos'; setActiveModeCard(modeChaosBtn); });

  startGameBtn.addEventListener('click', initSession);
  restartGameBtn.addEventListener('click', initSession);
  exitToMenuBtn.addEventListener('click', () => {
    gameOverMenu.classList.add('hidden');
    startMenu.classList.remove('hidden');
    mainMenuButtons.classList.remove('hidden');
  });

  buyGravPullBtn.addEventListener('click', () => {
    const cost = 50 + upgrades.gravPullLevel * 25;
    if (gameState.darkMatter >= cost) {
      gameState.darkMatter -= cost;
      upgrades.gravPullLevel++;
      hudDm.textContent = gameState.darkMatter;
      lvlGravPull.textContent = upgrades.gravPullLevel;
      buyGravPullBtn.textContent = 'BUY [' + (50 + upgrades.gravPullLevel * 25) + ' DM]';
    }
  });

  buyMatterReplBtn.addEventListener('click', () => {
    const cost = 100 + upgrades.matterReplLevel * 50;
    if (gameState.darkMatter >= cost) {
      gameState.darkMatter -= cost;
      upgrades.matterReplLevel++;
      hudDm.textContent = gameState.darkMatter;
      lvlMatterRepl.textContent = upgrades.matterReplLevel;
      buyMatterReplBtn.textContent = 'BUY [' + (100 + upgrades.matterReplLevel * 50) + ' DM]';
      matchParticleLimit();
    }
  });

  buyShockwaveBtn.addEventListener('click', () => {
    const cost = 150 + upgrades.shockwaveLevel * 75;
    if (gameState.darkMatter >= cost) {
      gameState.darkMatter -= cost;
      upgrades.shockwaveLevel++;
      hudDm.textContent = gameState.darkMatter;
      lvlShockwave.textContent = upgrades.shockwaveLevel;
      buyShockwaveBtn.textContent = 'BUY [' + (150 + upgrades.shockwaveLevel * 75) + ' DM]';
    }
  });
  const mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2, active: false };
  const pulses = [];
  const sparks = []; 
  const swarm = [];

  class Particle {
    constructor() { this.init(); }
    init() {
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) { this.x = Math.random() * width; this.y = -20; }
      else if (edge === 1) { this.x = width + 20; this.y = Math.random() * height; }
      else if (edge === 2) { this.x = Math.random() * width; this.y = height + 20; }
      else { this.x = -20; this.y = Math.random() * height; }
      this.vx = (Math.random() - 0.5) * 4;
      this.vy = (Math.random() - 0.5) * 4;
      this.size = Math.random() * 2 + 1.5;
      this.angleOffset = Math.random() * Math.PI * 2;
    }
    update(time) {
      let targetX = width / 2;
      let targetY = height / 2;
      let dx = targetX - this.x;
      let dy = targetY - this.y;
      let distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5) {
        let baseForce = Math.min(0.6, 180 / distance);
        let pullMultiplier = 1.0 + (upgrades.gravPullLevel * 0.1);
        if (gameState.currentMode === 'standard') pullMultiplier += (gameState.sector * 0.15);
        let vectorDirection = gameState.solarFlareActive ? -1.8 : 1.0;

        this.vx += (dx / distance) * baseForce * vectorDirection * pullMultiplier;
        this.vy += (dy / distance) * baseForce * vectorDirection * pullMultiplier;
      }

      this.vx += Math.sin(time + this.angleOffset) * 0.22;
      this.vy += Math.cos(time + this.angleOffset) * 0.22;

      pulses.forEach(p => {
        let pdx = this.x - p.x;
        let pdy = this.y - p.y;
        let pDist = Math.sqrt(pdx * pdx + pdy * pdy);
        let diff = Math.abs(pDist - p.radius);
        if (diff < 120) {
          let push = (1 - diff / 120) * p.force * p.life;
          if (pDist > 0) {
            this.vx += (pdx / pDist) * push * 0.55;
            this.vy += (pdy / pDist) * push * 0.55;
          }
        }
      });

      this.vx *= 0.96; this.vy *= 0.96;
      let currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      let speedLimit = 9 + (gameState.sector * 0.5);
      if (currentSpeed > speedLimit) {
        this.vx = (this.vx / currentSpeed) * speedLimit;
        this.vy = (this.vy / currentSpeed) * speedLimit;
      }

      this.x += this.vx; this.y += this.vy;

      let eyeDx = (width / 2) - this.x;
      let eyeDy = (height / 2) - this.y;
      let eyeDist = Math.sqrt(eyeDx * eyeDx + eyeDy * eyeDy);

      if (eyeDist < gameState.coreRadius + this.size && gameState.running) {
        this.init();
        gameState.absorbedCount++;
        gameState.darkMatter++;
        hudDm.textContent = gameState.darkMatter;

        if (gameState.currentMode === 'standard') {
          hudObjective.textContent = gameState.absorbedCount + ' / ' + gameState.targetObjective;
          if (gameState.absorbedCount >= gameState.targetObjective) {
            gameState.sector++;
            gameState.absorbedCount = 0;
            gameState.targetObjective += 200;
            hudObjective.textContent = '0 / ' + gameState.targetObjective;
          }
        } else if (gameState.currentMode === 'gravity') {
          gameState.coreRadius = Math.min(gameState.maxCoreRadius, gameState.coreRadius + 1.2);
          hudObjective.textContent = 'Core Radius: ' + Math.floor(gameState.coreRadius) + 'px';
        } else if (gameState.currentMode === 'chaos') {
          hudObjective.textContent = 'Time Left: ' + gameState.chaosTimeLeft + 's';
        }
      }
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = gameState.solarFlareActive ? '#ff3333' : '#00ffcc';
      ctx.fill();
    }
  }

  function matchParticleLimit() {
    let baseCount = gameState.currentMode === 'chaos' ? 200 : 100;
    let allowedCount = baseCount + (upgrades.matterReplLevel * 5);
    if (swarm.length < allowedCount) {
      while (swarm.length < allowedCount) swarm.push(new Particle());
    } else {
      swarm.length = allowedCount;
    }
  }
  function initSession() {
    startMenu.classList.add('hidden');
    gameOverMenu.classList.add('hidden');
    gameHud.classList.remove('hud-tophidden');

    gameState.running = true;
    gameState.sector = 1;
    gameState.absorbedCount = 0;
    gameState.survivalSeconds = 0;
    gameState.chaosTimeLeft = 60;
    gameState.solarFlareActive = false;
    gameState.flareTimer = 0;

    hudDm.textContent = gameState.darkMatter;

    if (gameState.currentMode === 'standard') {
      gameState.coreRadius = 40;
      gameState.targetObjective = 500;
      hudMode.textContent = 'STANDARD (SECTOR ' + gameState.sector + ')';
      hudObjective.textContent = '0 / ' + gameState.targetObjective;
    } else if (gameState.currentMode === 'gravity') {
      gameState.coreRadius = 80;
      hudMode.textContent = 'GRAVITY WELL (SURVIVAL)';
      hudObjective.textContent = 'Core Radius: ' + gameState.coreRadius + 'px';
    } else if (gameState.currentMode === 'chaos') {
      gameState.coreRadius = 45;
      hudMode.textContent = 'CHAOS STORM (60s TIME ATTACK)';
      hudObjective.textContent = 'Time Left: ' + gameState.chaosTimeLeft + 's';
    }

    matchParticleLimit();
    swarm.forEach(p => p.init());
  }

  setInterval(() => {
    if (!gameState.running) return;

    if (gameState.currentMode === 'standard') {
      hudMode.textContent = 'STANDARD (SECTOR ' + gameState.sector + ')';
    } else if (gameState.currentMode === 'gravity') {
      gameState.survivalSeconds++;
      gameState.coreRadius -= (1.5 + (gameState.survivalSeconds * 0.02));
      hudObjective.textContent = 'Core Size: ' + Math.max(0, Math.floor(gameState.coreRadius)) + 'px';

      if (gameState.coreRadius <= 2) {
        triggerEnd('Supernova core collapse. You survived for ' + gameState.survivalSeconds + ' seconds.');
      }
    } else if (gameState.currentMode === 'chaos') {
      gameState.chaosTimeLeft--;
      hudObjective.textContent = 'Time Left: ' + gameState.chaosTimeLeft + 's';
      gameState.flareTimer++;

      if (gameState.flareTimer >= 10) {
        gameState.flareTimer = 0;
        gameState.solarFlareActive = !gameState.solarFlareActive;
      }

      if (gameState.chaosTimeLeft <= 0) {
        triggerEnd('Time Horizon expired. Harvest window closed.');
      }
    }
  }, 1000);

  function triggerEnd(reasonText) {
    gameState.running = false;
    gameHud.classList.add('hud-tophidden');
    gameOverMenu.classList.remove('hidden');
    gameOverReason.textContent = reasonText;

    let finalScore = 0;
    if (gameState.currentMode === 'standard') {
      finalScore = gameState.sector;
      finalScoreVal.textContent = 'Reached Sector ' + finalScore;
      if (finalScore > scores.standard) { scores.standard = finalScore; saveScores(); }
    } else if (gameState.currentMode === 'gravity') {
      finalScore = gameState.survivalSeconds;
      finalScoreVal.textContent = 'Survived for ' + finalScore + ' seconds';
      if (finalScore > scores.survival) { scores.survival = finalScore; saveScores(); }
    } else if (gameState.currentMode === 'chaos') {
      finalScore = gameState.absorbedCount;
      finalScoreVal.textContent = finalScore + ' Dark Matter collected during storm';
      if (finalScore > scores.chaos) { scores.chaos = finalScore; saveScores(); }
    }
  }

  window.addEventListener('mousemove', e => {
    mouse.targetX = e.clientX; mouse.targetY = e.clientY;
    mouse.active = true;
  });
  window.addEventListener('mouseleave', () => { mouse.active = false; });

  window.addEventListener('click', e => {
    if (settingsPanel.contains(e.target) || settingsBtn.contains(e.target) || startMenu.contains(e.target) || gameOverMenu.contains(e.target)) return;

    baseHue = (baseHue + 40) % 360;
    const forceRadius = 140 * (1.0 + (upgrades.shockwaveLevel * 0.2));

    pulses.push({
      x: e.clientX, y: e.clientY,
      radius: 0,
      maxRadius: forceRadius,
      force: 120, life: 1
    });

    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      sparks.push({
        x: e.clientX, y: e.clientY,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        size: Math.random() * 2 + 1,
        hue: baseHue, alpha: 1, decay: Math.random() * 0.04 + 0.02
      });
    }
  });

  window.addEventListener('contextmenu', e => { e.preventDefault(); });

  let time = 0;

  function draw() {
    ctx.fillStyle = 'rgba(2, 2, 5, 0.18)';
    ctx.fillRect(0, 0, width, height);

    mouse.x += (mouse.targetX - mouse.x) * 0.08;
    mouse.y += (mouse.targetY - mouse.y) * 0.08;
    time += 0.04;

    if (gameState.running) {
      let pulseGlow = gameState.coreRadius + Math.sin(time * 2) * 3;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, Math.max(2, pulseGlow), 0, Math.PI * 2);
      
      let gradient = ctx.createRadialGradient(width/2, height/2, 2, width/2, height/2, Math.max(5, pulseGlow));
      if (gameState.currentMode === 'standard') {
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(0.7, '#00ffcc');
        gradient.addColorStop(1, 'rgba(0,255,200,0)');
      } else if (gameState.currentMode === 'gravity') {
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(0.7, '#ff007f');
        gradient.addColorStop(1, 'rgba(255,0,127,0)');
      } else {
        gradient.addColorStop(0, gameState.solarFlareActive ? '#ff3333' : '#9d4edd');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
      }
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    for (let i = pulses.length - 1; i >= 0; i--) {
      let p = pulses[i];
      p.radius += 20; p.life -= 0.025;
      if (p.life <= 0 || p.radius > p.maxRadius) pulses.splice(i, 1);
    }

    swarm.forEach(p => {
      p.update(time);
      p.draw();
    });

    for (let i = sparks.length - 1; i >= 0; i--) {
      let s = sparks[i];
      s.x += s.vx; s.y += s.vy;
      s.vx *= 0.95; s.vy *= 0.95;
      s.alpha -= s.decay;
      if (s.alpha <= 0) { sparks.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + s.hue + ', 100%, 70%,' + s.alpha + ')';
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }
  draw();
});
