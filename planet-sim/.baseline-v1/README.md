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
