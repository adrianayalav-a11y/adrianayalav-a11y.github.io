// planet.js - the ONE shared planet state. Modules only talk through this object.
import { buildIcoGrid } from '../grid/icoGrid.js';

export function createPlanet(config) {
  const grid = buildIcoGrid(config.grid.frequency);
  return {
    config,          // earth.json (or a new world's json later)
    grid,            // cells: center, lat/lon, neighbors, area
    timeYears: 0,
    radial: null,    // filled by radialStructure (L1)
    cellFields: {},  // per-cell arrays added by later levels: plateId, velocity, elevation...
  };
}
