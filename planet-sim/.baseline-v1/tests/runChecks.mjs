// runChecks.mjs - run with: node tests/runChecks.mjs
import { readFileSync } from 'node:fs';
import { buildIcoGrid } from '../grid/icoGrid.js';
import { integrateProfile } from '../modules/radialStructure.js';

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
const ok = grid.cells.length === 10 * f * f + 2 && pentagons === 12 && Math.abs(totalArea / exactArea - 1) < 1e-9
  && Math.abs(r.massKg / ref.massKg - 1) < 0.005 && Math.abs(r.momentOfInertiaFactor - ref.momentOfInertiaFactor) < 0.001;
console.log(ok ? 'ALL CHECKS PASS' : 'SOME CHECKS FAILED');
process.exit(ok ? 0 : 1);
