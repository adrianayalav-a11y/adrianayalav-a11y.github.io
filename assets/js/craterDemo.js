// craterDemo.js - playable version of my crater saturation sim (v2 notebook, CraterSim_v2.ipynb)
// Plain JavaScript, no libraries. The top half is the simulation (no browser code, so node can test it),
// the bottom half draws it on a canvas and hooks up the buttons.

// ---------- Parameters (same values as the notebook) ----------
const gridSize = 500;            // 500 x 500 cells, each cell is 1 km x 1 km
const yearsPerStep = 1000;       // one step = 1000 years
const asteroidSizeMin = 0.1;     // km, smallest power-law impactor
const asteroidSizeMax = 9.99;    // km, largest power-law impactor
const alpha = 2.5;               // power-law exponent: small impactors are much more common
const smallCratersPerStep = 100; // plus 1 large (10-20 km) impactor every step
const asteroidProbability = 0.9; // 9:1 asteroids to comets
const K = 1.161, M = 0.78, N = 0.44; // crater size: D = K * d^M * v^N
const depthRatio = 0.2;          // fresh crater depth = 0.2 * diameter
const erosionRate = 0.005;       // km of depth lost per step (5 m per 1000 yr)
const erodedDepth = 0.02;        // below 20 m deep the crater is gone

// ---------- Impactor and crater sizes ----------
function randomUniform(low, high) {
  return low + Math.random() * (high - low);
}

function powerLawImpactor() {
  // Inverse CDF method: turn a uniform random number into a power-law size between min and max
  const u = Math.random();
  const exponent = 1 - alpha;
  return Math.pow(u * (asteroidSizeMax ** exponent - asteroidSizeMin ** exponent) + asteroidSizeMin ** exponent, 1 / exponent);
}

function craterDiameter(impactorSize) {
  // Asteroids hit at 10-20 km/s, comets at 30-70 km/s; faster = bigger crater
  const velocity = Math.random() < asteroidProbability ? randomUniform(10, 20) : randomUniform(30, 70);
  return K * impactorSize ** M * velocity ** N;
}

function craterLifetime(diameter) {
  // Steps until erosion wears the crater down: (starting depth - gone depth) / erosion rate
  return Math.max(1, Math.ceil((depthRatio * diameter - erodedDepth) / erosionRate));
}

// ---------- The surface ----------
function createSim() {
  return {
    topCrater: new Int32Array(gridSize * gridSize).fill(-1), // id of the crater on top of each cell, -1 = bare
    craterCells: [],   // original number of cells of each crater
    birthStep: [],     // step each crater was made (used for its color)
    alive: [],         // false once eroded away
    erodeStep: new Map(), // step -> list of crater ids that erode at that step
    step: 0,
    erosion: false,
    atmosphereCutoff: 0,  // km, impactors smaller than this burn up (0 = airless)
  };
}

function stampCrater(sim, diameter, centerX, centerY) {
  // Mark every cell inside the circle as belonging to this new crater (it lands on top of older ones)
  const radius = diameter / 2;
  const craterId = sim.craterCells.length;
  const x0 = Math.max(Math.floor(centerX - radius), 0), x1 = Math.min(Math.floor(centerX + radius) + 1, gridSize);
  const y0 = Math.max(Math.floor(centerY - radius), 0), y1 = Math.min(Math.floor(centerY + radius) + 1, gridSize);
  let cells = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const dx = x + 0.5 - centerX, dy = y + 0.5 - centerY; // cell centers are at +0.5
      if (dx * dx + dy * dy <= radius * radius) {
        sim.topCrater[y * gridSize + x] = craterId;
        cells++;
      }
    }
  }
  // Craters smaller than one cell still mark the cell they land on
  if (cells === 0) {
    sim.topCrater[Math.floor(centerY) * gridSize + Math.floor(centerX)] = craterId;
    cells = 1;
  }
  sim.craterCells.push(cells);
  sim.birthStep.push(sim.step);
  sim.alive.push(true);
  // Erosion: schedule the step when this crater disappears
  if (sim.erosion) {
    const goneStep = sim.step + craterLifetime(diameter);
    if (!sim.erodeStep.has(goneStep)) sim.erodeStep.set(goneStep, []);
    sim.erodeStep.get(goneStep).push(craterId);
  }
}

function addImpact(sim, impactorSize, centerX, centerY) {
  // Atmosphere filter: small impactors burn up and make no crater
  if (impactorSize < sim.atmosphereCutoff) return false;
  const diameter = craterDiameter(impactorSize);
  const radius = diameter / 2;
  // No spot given = random spot, kept fully on the grid like the notebook
  if (centerX === undefined) {
    centerX = randomUniform(radius, gridSize - radius);
    centerY = randomUniform(radius, gridSize - radius);
  }
  stampCrater(sim, diameter, centerX, centerY);
  return true;
}

function erodeCraters(sim) {
  // Remove craters whose time is up: their cells that are still on top go back to bare
  const dueIds = sim.erodeStep.get(sim.step);
  if (!dueIds) return;
  sim.erodeStep.delete(sim.step);
  const due = new Set(dueIds);
  for (const id of dueIds) sim.alive[id] = false;
  for (let i = 0; i < sim.topCrater.length; i++) {
    if (due.has(sim.topCrater[i])) sim.topCrater[i] = -1;
  }
}

function runStep(sim) {
  // One 1000-year step: erosion first, then 1 large + 100 power-law impactors
  sim.step++;
  if (sim.erosion) erodeCraters(sim);
  addImpact(sim, randomUniform(10, 20));
  for (let i = 0; i < smallCratersPerStep; i++) addImpact(sim, powerLawImpactor());
}

function getStats(sim) {
  // Coverage = fraction of cells with any crater on top.
  // Visible = craters that still own at least 50% of their original cells (and are not eroded).
  const cellsOnTop = new Int32Array(sim.craterCells.length);
  let covered = 0;
  for (const id of sim.topCrater) {
    if (id >= 0) { covered++; cellsOnTop[id]++; }
  }
  let visible = 0;
  for (let id = 0; id < cellsOnTop.length; id++) {
    if (sim.alive[id] && cellsOnTop[id] >= 0.5 * sim.craterCells[id]) visible++;
  }
  return { coverage: covered / sim.topCrater.length, visible, years: sim.step * yearsPerStep };
}

// Let node load the simulation part for testing
if (typeof module !== "undefined") module.exports = { createSim, runStep, addImpact, getStats, powerLawImpactor, gridSize };

// ---------- Browser part: drawing and controls ----------
if (typeof document !== "undefined") {
  const canvas = document.getElementById("craterCanvas");
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(gridSize, gridSize);
  const $ = (id) => document.getElementById(id);
  let sim = createSim();
  let running = false;

  function readOptions() {
    sim.erosion = $("erosionBox").checked;
    sim.atmosphereCutoff = $("atmosphereBox").checked ? Number($("cutoffSlider").value) : 0;
    $("cutoffLabel").textContent = Number($("cutoffSlider").value).toFixed(1) + " km";
  }

  function draw() {
    // Color each cell by the age of its top crater: bright yellow = fresh, dark purple = old, black = bare
    for (let i = 0; i < sim.topCrater.length; i++) {
      const id = sim.topCrater[i];
      let r = 0, g = 0, b = 0;
      if (id >= 0) {
        const age = Math.min((sim.step - sim.birthStep[id]) / 500, 1); // 0 = new, 1 = 500+ steps old
        r = 250 - 150 * age; g = 220 - 210 * age; b = 60 + 60 * age;
      }
      image.data[4 * i] = r; image.data[4 * i + 1] = g; image.data[4 * i + 2] = b; image.data[4 * i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    const stats = getStats(sim);
    $("coverageOut").textContent = (100 * stats.coverage).toFixed(1) + "%";
    $("visibleOut").textContent = stats.visible.toLocaleString();
    $("timeOut").textContent = (stats.years / 1e6).toFixed(3) + " Myr";
  }

  function loop() {
    // While running: 2 steps (2000 years) per frame keeps phones smooth
    if (!running) return;
    for (let i = 0; i < 2; i++) runStep(sim);
    draw();
    requestAnimationFrame(loop);
  }

  // Click = drop one large (10-20 km) impactor where you clicked
  canvas.addEventListener("click", (event) => {
    const box = canvas.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width * gridSize;
    const y = (event.clientY - box.top) / box.height * gridSize;
    addImpact(sim, randomUniform(10, 20), x, y);
    draw();
  });

  $("addButton").addEventListener("click", () => {
    const count = Math.min(Number($("countInput").value) || 0, 100000);
    for (let i = 0; i < count; i++) addImpact(sim, powerLawImpactor());
    draw();
  });
  $("runButton").addEventListener("click", () => {
    running = !running;
    $("runButton").textContent = running ? "Pause" : "Run time";
    if (running) loop();
  });
  $("resetButton").addEventListener("click", () => {
    sim = createSim();
    readOptions();
    draw();
  });
  for (const id of ["erosionBox", "atmosphereBox", "cutoffSlider"]) $(id).addEventListener("input", readOptions);

  readOptions();
  // Optional: ?steps=200 in the URL starts the page already 200 steps in (I use it for screenshots)
  const startSteps = Number(new URLSearchParams(location.search).get("steps")) || 0;
  for (let i = 0; i < Math.min(startSteps, 3000); i++) runStep(sim);
  draw();
}
