# Crater Saturation: Interactive Demo

A playable version of my [crater saturation simulation](crater-simulation.html). It uses the same rules and numbers as my v2 notebook: a 500 km × 500 km surface, one 10–20 km impactor plus 100 power-law impactors (0.1–9.99 km, alpha = 2.5) every 1000 years, and a crater counts as visible while less than half of it is covered.

**Try it:** click the surface to drop a big impact, add random impacts, or run time forward. Turn on erosion or an atmosphere and watch coverage level off lower.

<div class="demo">
<canvas id="craterCanvas" width="500" height="500"></canvas>
<p class="readout">Coverage: <b id="coverageOut">0%</b> · Visible craters: <b id="visibleOut">0</b> · Time: <b id="timeOut">0 Myr</b></p>
<p><button id="runButton">Run time</button> <button id="addButton">Add</button> <input id="countInput" type="number" value="100" min="1" max="100000"> random impacts <button id="resetButton">Reset</button></p>
<p><label><input id="erosionBox" type="checkbox"> Erosion (5 m per 1000 yr)</label><br>
<label><input id="atmosphereBox" type="checkbox"> Atmosphere: impactors under <span id="cutoffLabel">1.0 km</span> burn up</label>
<input id="cutoffSlider" type="range" min="0.1" max="5" step="0.1" value="1"></p>
<p class="note">Colors: bright = fresh crater, dark purple = old, black = bare ground. Erosion and atmosphere apply to new craters from the moment you turn them on. Randomness is not seeded, so each run is a little different.</p>
</div>
<script src="../assets/js/craterDemo.js"></script>
