import { initUpgrade } from './upgrade.js';
// main.js - wires the shared state, the levels, and the 3D view together.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createPlanet } from '../state/planet.js';
import { levels, applyLevel } from '../levels/levels.js';
import { premDensity, premLayerName } from '../modules/radialStructure.js';

const config = await (await fetch('config/earth.json')).json();
const planet = createPlanet(config);
applyLevel(planet, levels[0]); // the page opens on Level 1

// ---------- level dropdown (only Level 1 enabled for now) ----------
const levelSelect = document.getElementById('levelSelect');
levels.forEach((lvl) => levelSelect.add(new Option(lvl.title, lvl.id, false, lvl.id === 1)));
[...levelSelect.options].forEach((opt, i) => { opt.disabled = !levels[i].enabled; });

// ---------- density -> color (dark blue = light rock, yellow = dense iron) ----------
// A simple color ramp: we blend between these stops by density (kg/m^3).
const colorStops = [[1000, '#1f3c88'], [3000, '#2a9d8f'], [4500, '#8ac926'], [6000, '#f4a261'], [10000, '#e63946'], [13100, '#ffe066']];
function densityColor(rho) {
  for (let i = 1; i < colorStops.length; i++) {
    const [rhoHi, colorHi] = colorStops[i];
    if (rho <= rhoHi || i === colorStops.length - 1) {
      const [rhoLo, colorLo] = colorStops[i - 1];
      const t = Math.min(Math.max((rho - rhoLo) / (rhoHi - rhoLo), 0), 1);
      return new THREE.Color(colorLo).lerp(new THREE.Color(colorHi), t);
    }
  }
}

// ---------- scene ----------
const container = document.getElementById('globe');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.localClippingEnabled = true;
container.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(2.2, 1.2, 2.6);
const controls = new OrbitControls(camera, renderer.domElement);
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(5, 3, 4);
scene.add(sun);

// Cutaway plane: when on, hide everything with x > 0 (removes a half of the globe).
const cutPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);

// ---------- hex cells: filled faces + thin outlines ----------
const facePositions = [];
const linePositions = [];
for (const cell of planet.grid.cells) {
  const n = cell.corners.length;
  for (let k = 0; k < n; k++) {
    const a = cell.corners[k], b = cell.corners[(k + 1) % n];
    facePositions.push(...cell.center, ...a, ...b); // fan triangle from the cell center
    linePositions.push(...a, ...b);
  }
}
const faceGeometry = new THREE.BufferGeometry();
faceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(facePositions, 3));
faceGeometry.computeVertexNormals();
const cellMesh = new THREE.Mesh(faceGeometry, new THREE.MeshStandardMaterial({
  color: 0x3b6ea8, flatShading: true, clippingPlanes: [], side: THREE.DoubleSide,
}));
scene.add(cellMesh);
const lineGeometry = new THREE.BufferGeometry();
lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
lineGeometry.scale(1.0005, 1.0005, 1.0005); // sit just above the faces
const cellLines = new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({ color: 0x0b1a2e, transparent: true, opacity: 0.6, clippingPlanes: [] }));
scene.add(cellLines);
// ---------- interior slice: a disc in the x = 0 plane colored by PREM density ----------
function makeSliceTexture() {
  const size = 512, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  // Draw rings from the outside in; each ring is colored by density at that radius.
  for (let px = size / 2; px > 0; px--) {
    const rKm = (px / (size / 2)) * config.radiusKm;
    ctx.fillStyle = '#' + densityColor(premDensity(rKm, config)).getHexString();
    ctx.beginPath(); ctx.arc(size / 2, size / 2, px, 0, 2 * Math.PI); ctx.fill();
  }
  // Thin lines at the major boundaries (inner core, core-mantle, 660 km, Moho).
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  [1221.5, 3480, 5701, 6346.6].forEach((rKm) => {
    ctx.beginPath(); ctx.arc(size / 2, size / 2, rKm / config.radiusKm * size / 2, 0, 2 * Math.PI); ctx.stroke();
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; // keep colors matching the legend
  return texture;
}
const slice = new THREE.Mesh(new THREE.CircleGeometry(0.999, 128), new THREE.MeshBasicMaterial({ map: makeSliceTexture(), side: THREE.DoubleSide }));
slice.rotation.y = Math.PI / 2; // face along x
slice.visible = false;
scene.add(slice);

const sliceToggle = document.getElementById('sliceToggle');
sliceToggle.addEventListener('change', (e) => setCutaway(e.target.checked));
function setCutaway(on) {
  const planes = on ? [cutPlane] : [];
  cellMesh.material.clippingPlanes = planes;
  cellLines.material.clippingPlanes = planes;
  slice.visible = on;
  // Keep the switch's ARIA state in sync (iOS-style toggle).
  sliceToggle.checked = on;
  sliceToggle.setAttribute('aria-checked', on ? 'true' : 'false');
}

// ---------- side panel: checks, legend, plot ----------
const r = planet.radial, ref = config.reference;
// Pretty scientific notation for KaTeX: 5.10 \times 10^{8}
function sciTex(n, digits = 2) {
  if (!Number.isFinite(n)) return String(n);
  if (n === 0) return '0';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const exp = Math.floor(Math.log10(abs));
  const mant = abs / 10 ** exp;
  return `${sign}${mant.toFixed(digits)} \\times 10^{${exp}}`;
}
// Grid areas are steradians on the unit sphere; × R_PREM² → km².
const Rkm = config.radiusKm; // 6371 km (PREM)
const areaKm2 = planet.grid.cells.reduce((s, c) => s + c.areaSr, 0) * Rkm * Rkm;
const areaExactKm2 = 4 * Math.PI * Rkm * Rkm;
const rows = [
  ['Surface area', `\\(A = ${sciTex(areaKm2)}\\,\\mathrm{km^{2}}\\)`, `\\(A = ${sciTex(areaExactKm2)}\\,\\mathrm{km^{2}}\\)`],
  ['Mass (kg)', r.massKg.toExponential(4), ref.massKg.toExponential(4)],
  ['\\(I/(MR^{2})\\)', r.momentOfInertiaFactor.toFixed(4), ref.momentOfInertiaFactor],
  ['Mean density', r.meanDensity.toFixed(1) + ' kg/m³', ref.meanDensityKgM3],
  ['Surface g', r.surfaceGravity.toFixed(2) + ' m/s²', ref.surfaceGravityMs2],
];
document.getElementById('checks').innerHTML = '<tr><td></td><td><b>model</b></td><td><b>real</b></td></tr>'
  + rows.map((row) => `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td></tr>`).join('');

// [name, a radius in the middle of that layer (km)]
const legendLayers = [['Inner core', 600], ['Outer core', 2400], ['Lower mantle', 4600], ['Transition zone', 5850], ['Upper mantle', 6250], ['Crust', 6360], ['Ocean', 6370]];
document.getElementById('legend').innerHTML = legendLayers.map(([name, rKm]) => {
  const rho = premDensity(rKm, config);
  return `<div class="row"><span class="swatch" style="background:#${densityColor(rho).getHexString()}"></span>${name} (~${(rho / 1000).toFixed(1)} g/cm³)</div>`;
}).join('');
if (window.renderPageMath) window.renderPageMath(document.getElementById('checks'));

initUpgrade(planet, config, slice, camera, renderer, THREE);

function resizeGlobe() {
  const w = container.clientWidth, h = container.clientHeight;
  if (w < 2 || h < 2) return;
  camera.aspect = w / h;
  // Wider FOV on phones so the whole sphere fits in a tall narrow frame
  camera.fov = w < 520 ? 58 : 40;
  camera.updateProjectionMatrix();
  // false = don't write fixed CSS size onto the canvas; CSS keeps it fluid for phones
  renderer.setSize(w, h, false);
}
window.addEventListener('resize', resizeGlobe);
if (window.ResizeObserver) new ResizeObserver(resizeGlobe).observe(container);
resizeGlobe();

// ---------- render loop ----------
window.setCutaway = setCutaway; // handy for screenshots/tests
(function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
})();
// ?cut=1 in the URL opens with the cutaway on
if (new URLSearchParams(location.search).get('cut') === '1') { document.getElementById('sliceToggle').checked = true; setCutaway(true); }
