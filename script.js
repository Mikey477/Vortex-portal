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

  // UI Component bindings
  const startMenu = document.getElementById('startMenu');
  const gameOverMenu = document.getElementById('gameOverMenu');
  const gameHud = document.getElementById('gameHud');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const closeBtn = document.getElementById('closeBtn');
  
  const btnStartGame = document.getElementById('btnStartGame');
  const btnSelectMode = document.getElementById('btnSelectMode');
  const btnLeaderboard = document.getElementById('btnLeaderboard');
  const btnBackFromMode = document.getElementById('btnBackFromMode');
  const btnBackFromLeader = document.getElementById('btnBackFromLeader');
  const btnReturnToMenu = document.getElementById('btnReturnToMenu');

  const mainMenuButtons = document.getElementById('mainMenuButtons');
  const modeView = document.getElementById('modeView');
  const leaderboardView = document.getElementById('leaderboardView');

  // HUD and Stats DOM
  const hudSector = document.getElementById('hudSector');
  const hudObjective = document.getElementById('hudObjective');
  const hudDm = document.getElementById('hudDm');
  const hudTimer = document.getElementById('hudTimer');
  const hudTimerContainer = document.getElementById('hudTimerContainer');
  const finalScoreVal = document.getElementById('finalScoreVal');
  const gameOverReason = document.getElementById('gameOverReason');
  const shopDmWallet = document.getElementById('shopDmWallet');

  // Shop upgrade buttons
  const upgGrav = document.getElementById('upgGrav');
  const upgBalls = document.getElementById('upgBalls');
  const upgPulse = document.getElementById('upgPulse');
  const toggleLines = document.getElementById('toggleLines');

  // Game Engine State System
  let gameState = {
    running: false,
    currentMode: 'standard', // standard, survival, chaos
    sector: 1,
    darkMatter: 0,
    absorbedCount: 0,
    targetObjective: 500,
    timeLeft: 60,
    coreRadius: 35,
    maxCoreRadius: 100,
    lastSolarFlare: 0,
    solarFlareActive: false,
    flareTimer: 0
  };

  // Persistent Meta Upgrades Config
  let upgrades = {
    gravPullLevel: 0,
    maxBallsLevel: 0,
    pulseLevel: 0,
    renderLines: false
  };

  // High Scores Local Storage Management
  let scores = { standard: 1, survival: 0, chaos: 0 };
  if(localStorage.getItem('ev_scores')) {
      scores = JSON.parse(localStorage.getItem('ev_scores'));
  }
  function saveScores() {
      localStorage.setItem('ev_scores', JSON.stringify(scores));
  }

  // Active Simulation Buffers
  const mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2, active: false };
  const pulses = [];
  const sparks = [];
  const swarm = [];
  let baseHue = 190;
  let gameInterval = null;

  // Menu Navigation Listeners
  btnSelectMode.addEventListener('click', () => {
      mainMenuButtons.classList.add('hidden');
      modeView.classList.remove('hidden');
  });

  btnBackFromMode.addEventListener('click', () => {
      modeView.classList.add('hidden');
      mainMenuButtons.classList.remove('hidden');
  });

  btnLeaderboard.addEventListener('click', () => {
      document.getElementById('scoreStandard').textContent = scores.standard;
      document.getElementById('scoreSurvival').textContent = scores.survival;
      document.getElementById('scoreChaos').textContent = scores.chaos;
      mainMenuButtons.classList.add('hidden');
      leaderboardView.classList.remove('hidden');
  });

  btnBackFromLeader.addEventListener('click', () => {
      leaderboardView.classList.add('hidden');
      mainMenuButtons.classList.remove('hidden');
  });

  // Track selected game mode setting switches
  document.querySelectorAll('.mode-opt').forEach(btn => {
      btn.addEventListener('click', (e) => {
          document.querySelectorAll('.mode-opt').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          gameState.currentMode = e.target.getAttribute('data-mode');
      });
  });

  // Open/Close Side Customization Panel Drawer
  settingsBtn.addEventListener('click', () => {
      shopDmWallet.textContent = gameState.darkMatter;
      settingsPanel.classList.remove('hidden');
  });
  closeBtn.addEventListener('click', () => settingsPanel.classList.add('hidden'));
  toggleLines.addEventListener('change', (e) => { upgrades.renderLines = e.target.checked; });

  // Handle Shop Purchases
  upgGrav.addEventListener('click', () => buyUpgrade('grav', 50));
  upgBalls.addEventListener('click', () => buyUpgrade('balls', 100));
  upgPulse.addEventListener('click', () => buyUpgrade('pulse', 150));

  function buyUpgrade(type, cost) {
      if(gameState.darkMatter >= cost) {
          gameState.darkMatter -= cost;
          hudDm.textContent = gameState.darkMatter;
          shopDmWallet.textContent = gameState.darkMatter;
          
          if(type === 'grav') upgrades.gravPullLevel++;
          if(type === 'balls') {
              upgrades.maxBallsLevel++;
              matchSwarmCount();
          }
          if(type === 'pulse') upgrades.pulseLevel++;
          
          updateShopUiButtons();
      }
  }

  function updateShopUiButtons() {
      upgGrav.textContent = `${50 + (upgrades.gravPullLevel * 0)} DM (+${upgrades.gravPullLevel * 10}%)`;
      upgBalls.textContent = `${100 + (upgrades.maxBallsLevel * 0)} DM (+${upgrades.maxBallsLevel * 5})`;
      upgPulse.textContent = `${150 + (upgrades.pulseLevel * 0)} DM (+${upgrades.pulseLevel * 20}%)`;
  }

  // Kickstart Game Configuration
  btnStartGame.addEventListener('click', startGame);
  btnReturnToMenu.addEventListener('click', returnToMenu);

  function startGame() {
      startMenu.classList.add('hidden');
      gameOverMenu.classList.add('hidden');
      gameHud.classList.remove('hidden');
      
      gameState.running = true;
      gameState.absorbedCount = 0;
      gameState.sector = 1;
      gameState.timeLeft = 60;
      gameState.coreRadius = gameState.currentMode === 'survival' ? 60 : 35;
      gameState.solarFlareActive = false;
      gameState.lastSolarFlare = 0;

      // Adjust HUD interface configurations depending on selected timeline game modes
      if(gameState.currentMode === 'standard') {
          gameState.targetObjective = 500;
          hudObjective.textContent = `0 / ${gameState.targetObjective}`;
          document.getElementById('hudObjective').parentElement.classList.remove('hidden');
          hudTimerContainer.classList.add('hidden');
          hudSector.parentElement.classList.remove('hidden');
      } else if (gameState.currentMode === 'survival') {
          gameState.timeLeft = 0; // Tracks elapsed survival time instead
          hudTimer.textContent = "0";
          hudTimerContainer.classList.remove('hidden');
          document.getElementById('hudObjective').parentElement.classList.add('hidden');
          hudSector.parentElement.classList.add('hidden');
      } else if (gameState.currentMode === 'chaos') {
          gameState.timeLeft = 60; // Countdown 60s
          hudTimer.textContent = "60";
          hudTimerContainer.classList.remove('hidden');
          hudObjective.textContent = "0 Harvested";
          document.getElementById('hudObjective').parentElement.classList.remove('hidden');
          hudSector.parentElement.classList.add('hidden');
      }

      matchSwarmCount();
      
      // Secondary Clock Tick Pipeline Handler
      if(gameInterval) clearInterval(gameInterval);
      gameInterval = setInterval(gameClockTick, 1000);
  }

  function gameClockTick() {
      if(!gameState.running) return;

      if(gameState.currentMode === 'survival') {
          gameState.timeLeft++; // survival stopwatch counts up
          hudTimer.textContent = gameState.timeLeft;
          
          // Shrink the core survival entity over time actively
          gameState.coreRadius -= 1.8 + (gameState.timeLeft * 0.005);
          if(gameState.coreRadius <= 5) {
              triggerGameOver("The core shrank to zero mass and went supernova.");
          }
      } 
      else if(gameState.currentMode === 'chaos') {
          gameState.timeLeft--;
          hudTimer.textContent = gameState.timeLeft;
          
          if(gameState.timeLeft <= 0) {
              triggerGameOver("Time Expired! The containment grid shut down safely.");
          }
          
          // Check solar flare time limits metrics counters
          if(gameState.timeLeft % 10 === 0 && gameState.timeLeft < 60) {
              triggerSolarFlare();
          }
      }
  }

  function triggerSolarFlare() {
      gameState.solarFlareActive = true;
      gameState.flareTimer = 2.5; // active inverted burst time window
      baseHue = (baseHue + 120) % 360; // flash color fields
  }

  function triggerGameOver(reason) {
      gameState.running = false;
      clearInterval(gameInterval);
      
      gameOverReason.textContent = reason;
      gameHud.classList.add('hidden');
      gameOverMenu.classList.remove('hidden');

      let finalScore = 0;
      if(gameState.currentMode === 'standard') {
          finalScore = gameState.sector;
          finalScoreVal.textContent = `Sector ${finalScore}`;
          if(finalScore > scores.standard) { scores.standard = finalScore; saveScores(); }
      } else if(gameState.currentMode === 'survival') {
          finalScore = gameState.timeLeft;
          finalScoreVal.textContent = `${finalScore} seconds`;
