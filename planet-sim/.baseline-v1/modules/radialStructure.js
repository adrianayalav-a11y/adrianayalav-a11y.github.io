// radialStructure.js - Level 1 physics module: PREM density, mass, gravity, I/(MR^2).
// Every module has the same shape: init(state) and step(state, dt).
// This one never changes with time (Level 1 is a static snapshot), so step() does nothing.

const G = 6.674e-11; // gravitational constant, m^3 kg^-1 s^-2

// Density (kg/m^3) at radius rKm, from the PREM polynomial of the layer containing it.
export function premDensity(rKm, config) {
  const x = rKm / config.radiusKm; // PREM uses normalized radius x = r / a
  const layers = config.prem.layers;
  // Pick the layer whose range contains r (at a boundary, use the deeper layer).
  const layer = layers.find((l) => rKm >= l.rMinKm && rKm <= l.rMaxKm) || layers[layers.length - 1];
  const [a, b, c, d] = layer.coeffs;
  const gramsPerCm3 = a + b * x + c * x * x + d * x * x * x;
  return gramsPerCm3 * 1000; // g/cm^3 -> kg/m^3
}

// Integrate shell by shell from the center outward.
//   mass of a thin shell     dM = 4*pi*r^2 * rho * dr
//   inertia of a thin shell  dI = (8/3)*pi*r^4 * rho * dr
// We use the midpoint of each shell, with every layer split into many thin shells
// so no shell ever straddles a density jump.
export function integrateProfile(config, shellsPerLayer = 2000) {
  const profile = []; // samples for plotting: radius, density, enclosed mass, gravity
  let massKg = 0;
  let inertia = 0;
  for (const layer of config.prem.layers) {
    const dr = (layer.rMaxKm - layer.rMinKm) / shellsPerLayer * 1000; // meters
    for (let i = 0; i < shellsPerLayer; i++) {
      const rMidKm = layer.rMinKm + (i + 0.5) * dr / 1000;
      const r = rMidKm * 1000;
      const rho = premDensity(rMidKm, config);
      massKg += 4 * Math.PI * r * r * rho * dr;
      inertia += (8 / 3) * Math.PI * Math.pow(r, 4) * rho * dr;
      if (i % 50 === 0) {
        const rOuter = r + dr / 2;
        profile.push({ rKm: rMidKm, density: rho, enclosedMassKg: massKg, gravity: G * massKg / (rOuter * rOuter) });
      }
    }
  }
  const radiusM = config.radiusKm * 1000;
  return {
    massKg,
    momentOfInertiaFactor: inertia / (massKg * radiusM * radiusM),
    meanDensity: massKg / ((4 / 3) * Math.PI * Math.pow(radiusM, 3)),
    surfaceGravity: G * massKg / (radiusM * radiusM),
    profile,
  };
}

export const radialStructure = {
  name: 'radialStructure',
  init(state) {
    state.radial = integrateProfile(state.config); // writes ONLY its own field
  },
  step() { /* static at Level 1 */ },
};
