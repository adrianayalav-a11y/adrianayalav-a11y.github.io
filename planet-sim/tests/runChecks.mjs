// runChecks.mjs - run with: node tests/runChecks.mjs
import { readFileSync } from 'node:fs';
import { buildIcoGrid } from '../grid/icoGrid.js';
import { integrateProfile, gravityPressureProfile } from '../modules/radialStructure.js';
import { presets, computeShells } from '../modules/shellModel.js';

const config = JSON.parse(readFileSync(new URL('../config/earth.json', import.meta.url)));
const grid = buildIcoGrid(config.grid.frequency);
const f = config.grid.frequency;
const R = config.radiusKm * 1000;

const pentagons = grid.cells.filter((c) => c.isPentagon).length;
const hexagons = grid.cells.filter((c) => c.corners.length === 6).length;
const totalArea = grid.cells.reduce((s, c) => s + c.areaSr, 0) * R * R;
const exactArea = 4 * Math.PI * R * R;
const areasKm2 = grid.cells.map((c) => c.areaSr * R * R / 1e6);
const minA = Math.min(...areasKm2), maxA = Math.max(...areasKm2);
const meanA = areasKm2.reduce((s, a) => s + a, 0) / areasKm2.length;
const badNeighbors = grid.cells.filter((c) => c.neighbors.length !== c.corners.length).length;

console.log('--- GRID ---');
console.log(`cells: ${grid.cells.length} (expected 10*f^2+2 = ${10 * f * f + 2})`);
console.log(`pentagons: ${pentagons}, hexagons: ${hexagons}, small triangles: ${grid.triangleCount}`);
console.log(`cells whose neighbor count != corner count: ${badNeighbors}`);
console.log(`area sum: ${totalArea.toExponential(6)} m^2 vs 4*pi*R^2 = ${exactArea.toExponential(6)} (rel err ${((totalArea - exactArea) / exactArea).toExponential(2)})`);
console.log(`cell area km^2: min ${minA.toFixed(0)}, mean ${meanA.toFixed(0)}, max ${maxA.toFixed(0)}, max/min ${(maxA / minA).toFixed(3)}`);
console.log(`typical cell width ~ ${Math.sqrt(meanA).toFixed(0)} km`);

const r = integrateProfile(config);
const ref = config.reference;
const pct = (a, b) => ((a - b) / b * 100).toFixed(3) + '%';
console.log('--- PREM ---');
console.log(`mass: ${r.massKg.toExponential(5)} kg vs ${ref.massKg.toExponential(4)} (${pct(r.massKg, ref.massKg)})`);
console.log(`I/(MR^2): ${r.momentOfInertiaFactor.toFixed(5)} vs ${ref.momentOfInertiaFactor} (${pct(r.momentOfInertiaFactor, ref.momentOfInertiaFactor)})`);
console.log(`mean density: ${r.meanDensity.toFixed(1)} kg/m^3 vs ${ref.meanDensityKgM3}`);
console.log(`surface gravity: ${r.surfaceGravity.toFixed(3)} m/s^2 vs ${ref.surfaceGravityMs2}`);

console.log('--- GRAVITY + PRESSURE (PREM, hydrostatic) ---');
const gp = gravityPressureProfile(config);
console.log(`central pressure: ${gp.centralPressureGPa.toFixed(1)} GPa (PREM ~364)`);
console.log(`CMB pressure: ${gp.cmbPressureGPa.toFixed(1)} GPa (PREM ~136)`);
console.log(`ICB pressure: ${gp.icbPressureGPa.toFixed(1)} GPa (PREM ~329)`);
console.log(`g max: ${gp.gMax.toFixed(2)} m/s^2 at r = ${gp.gMaxRadiusKm.toFixed(0)} km (PREM ~10.7 near CMB, r=3480)`);
const gpOk = Math.abs(gp.centralPressureGPa - 364) < 5 && Math.abs(gp.cmbPressureGPa - 136) < 3
  && Math.abs(gp.gMax - 10.7) < 0.2 && Math.abs(gp.gMaxRadiusKm - 3480) < 50;

console.log('--- 4-SHELL MODEL vs completed ERTH 2001 lab spreadsheet ---');
console.log('Dante intentionally uses vacuum; source air density gives 2.7891714494949333 g/cm³.');
const expected = { step12: [4.009375, 4.34094e24], step3: [5.2887497, 5.72611e24], step4: [5.5497566, 6.0087044e24], dante: [2.7891672247125716, 3.0198227982306037e24] };
let shellOk = true;
for (const [key, [rhoLab, massLab]] of Object.entries(expected)) {
  const res = computeShells(presets[key].thickness, presets[key].density);
  const good = Math.abs(res.meanDensity - rhoLab) < 1e-5 && Math.abs(res.totalMass / massLab - 1) < 1e-5;
  shellOk = shellOk && good;
  console.log(`${key}: mean ${res.meanDensity.toFixed(4)} g/cm^3 (target ${rhoLab}), mass ${res.totalMass.toExponential(4)} kg ${good ? 'OK' : 'MISMATCH'}`);
}
const thick = computeShells(presets.step12.thickness, presets.step12.density).thicknessAverage;
console.log(`step 1 thickness-weighted average: ${thick.toFixed(2)} (lab 5.95)`);
shellOk = shellOk && Math.abs(thick - 5.95) < 1e-9;

const ok = gpOk && shellOk && grid.cells.length === 10 * f * f + 2 && pentagons === 12 && Math.abs(totalArea / exactArea - 1) < 1e-9
  && Math.abs(r.massKg / ref.massKg - 1) < 0.005 && Math.abs(r.momentOfInertiaFactor - ref.momentOfInertiaFactor) < 0.001;
console.log(ok ? 'ALL CHECKS PASS' : 'SOME CHECKS FAILED');
// Tighter regressions, not just agreement with rounded Earth reference values.
const assert = (condition, label) => { if (!condition) throw new Error(label); };
assert(Math.abs(r.massKg/5.97318e24-1)<1e-6, 'L1 mass regression');
assert(Math.abs(r.momentOfInertiaFactor-0.33080)<0.000005, 'L1 inertia regression');
assert(Math.abs(r.meanDensity-5514.3)<0.05, 'L1 density regression');
assert(Math.abs(r.surfaceGravity-9.821)<0.0005, 'L1 gravity regression');
assert(gp.g[0]===0 && gp.P.at(-1)===0, 'Center gravity and surface pressure');
assert(gp.P.every((v,i)=>Number.isFinite(v) && v>=0 && (!i || v<=gp.P[i-1])), 'Pressure monotonic');
const fine=gravityPressureProfile(config,0.5);
assert(Math.abs(fine.centralPressureGPa-gp.centralPressureGPa)<0.1, 'Pressure convergence');
for(const p of Object.values(presets)) {
  const m=computeShells(p.thickness,p.density);
  assert(Math.abs(m.totalVolume/((4/3)*Math.PI*6370**3)-1)<1e-12,'Volume conservation');
}
const empty=computeShells([0,0,0,6370],[0,0,0,0]);
assert(empty.totalMass===0 && empty.meanDensity===0,'Zero density edge case');
let rejected=false;try{computeShells([1,2,3,4],[1,2,3,4]);}catch{rejected=true;}
assert(rejected,'Reject incomplete radius');
console.log('EXTENDED REGRESSION / CONSERVATION / CONVERGENCE CHECKS PASS');
process.exit(ok ? 0 : 1);
