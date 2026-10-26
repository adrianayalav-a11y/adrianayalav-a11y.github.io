# craterDemo.js: interactive crater saturation demo

This is a browser version of my v2 crater notebook (`CraterSim_v2.ipynb`). It runs on `projects/crater-demo.html`.

## Rules and values (all from the notebook's first code cell)
- **Grid:** 500 × 500 cells at 1 km per cell. One step is 1000 years (`gridSize`, `yearsPerStep`).
- **Impacts per step:** 1 large impactor (10–20 km) plus 100 power-law impactors, 0.1–9.99 km with alpha = 2.5, sampled by inverse CDF (`generateDiameterB`).
- **Crater size:** D = 1.161 · d^0.78 · v^0.44. Asteroids hit at 10–20 km/s and comets at 30–70 km/s, in a 9:1 ratio.
- **Visible:** a crater counts while it still owns at least 50% of its original cells (`countVisible`).
- **Erosion:** depth starts at 0.2·D and drops 5 m per step. The crater is gone below 20 m (`craterLifetime`, `erodeCraters`).
- **Atmosphere:** impactors smaller than the cutoff burn up. As in the notebook, the cutoff applies to the impactor size, not the crater size. The notebook used 1 km; the slider goes from 0.1 to 5 km.

## Differences from the notebook
- **Click:** a click drops one large (10–20 km) impactor where you clicked. "Add N" adds N power-law impactors without moving time forward.
- **Random seed:** there isn't one, so each run is a bit different.
- **Stop rules:** there are no stop rules. You pause it yourself.

## Code skeleton
- The simulation (`createSim`, `addImpact`, `runStep`, `getStats`) has no browser code, so node can test it.
- The browser part draws the grid into an ImageData (cells colored by age), runs 2 steps per frame, and wires up the buttons. `?steps=N` in the URL starts the run N steps in. I use it for screenshots.
