# Planet Sim (personal project) - Level 1: "What's inside?"

A personal project by Adrian Ayala (not coursework): a teaching-toy planet simulator with simplified physics and real Earth values, built level by level. See the framework doc for the full plan.

Run: `python3 -m http.server 8000` in this folder, open http://localhost:8000. Checks: `node tests/runChecks.mjs`.

- `config/earth.json`  Earth values + PREM coefficients with sources (a new world = a new json)
- `grid/icoGrid.js`    our own icosahedral geodesic hex grid (10,242 cells, 12 pentagons)
- `state/planet.js`    the one shared planet state
- `modules/radialStructure.js`  L1 physics: PREM density, mass, gravity, I/(MR^2)
- `levels/levels.js`   a level = a list of modules
- `viz/main.js`        Three.js globe, cutaway, legend, plot
- `ASSUMPTIONS.md`     every L1 simplification


## Local Level 1 upgrade (v2, not published)

Run `python3 -m http.server 8137 --bind 127.0.0.1` here, then open
http://127.0.0.1:8137/. Use `?cut=1` for the interior view. Internet access
is needed for the pinned Three.js jsDelivr imports. AI used: interactive model built with an AI coding agent.

The personal teaching toy now has an introduction, four-shell editing with lab
presets, mass/volume shares and errors, PREM profile comparison, gravity and
hydrostatic pressure plots, interior hover readout, and short evidence/motivation
sections. `viz/upgrade.js` owns the educational controls; physics stays in
`modules/`. `init`/`step` modules and the original grid remain intact.

Run `node tests/runChecks.mjs` for conservation, lab values, pressure convergence,
and tight v1 regression checks. Full output: `verification.txt`.

The editable lab Earth has R=6370 km; PREM keeps R=6371 km. The fourth shell
thickness is the remainder after the first three, preventing radius drift.
Dante uses vacuum (zero density), while the completed spreadsheet used thin air
(0.001092 g/cm³); this produces a tiny, intentional difference (~0.000004225 g/cm³).
Preset names describe a historical toy, not a proposed physical Earth.

No live files were modified, and nothing was published or pushed. A pristine
copy of v1 is retained in `.baseline-v1/`. Browser screenshot verification is
still required; the executor did not have a browser/desktop dispatch tool.
