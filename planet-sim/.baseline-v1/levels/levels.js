// levels.js - a level is just a list of modules to switch on.
// Adding Level 2 later = write modules/plateKinematics.js and add it here. Nothing else changes.
import { radialStructure } from '../modules/radialStructure.js';

export const levels = [
  { id: 1, title: "Level 1 - What's inside?", enabled: true, modules: [radialStructure] },
  { id: 2, title: 'Level 2 - How do plates move? (coming)', enabled: false, modules: [] },
  { id: 3, title: 'Level 3 - Why is the ocean floor deep? (coming)', enabled: false, modules: [] },
  { id: 4, title: 'Level 4 - Why do plates move at all? (coming)', enabled: false, modules: [] },
];

// Switch on a level's modules on top of the existing state (no restart).
export function applyLevel(state, level) {
  level.modules.forEach((m) => m.init(state));
}
