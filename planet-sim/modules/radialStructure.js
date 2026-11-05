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

// Name of the PREM layer at radius rKm (same "deeper layer wins at a boundary" rule).
export function premLayerName(rKm, config) {
  const layers = config.prem.layers;
  const layer = layers.find((l) => rKm >= l.rMinKm && rKm <= l.rMaxKm) || layers[layers.length - 1];
  return layer.name;
}

// Gravity and pressure at every depth.
//   1) going OUT from the center, add up mass:   M(r) = sum of 4*pi*r^2*rho*dr,  g(r) = G*M(r)/r^2
//   2) going IN from the surface (P = 0 there), add up weight of the rock above:  dP = rho*g*dr
// Returns samples every stepKm, from the center (index 0) to the surface.
export function gravityPressureProfile(config, stepKm = 1) {
  const n = Math.round(config.radiusKm / stepKm);
  const dr = (config.radiusKm / n) * 1000; // meters
  const rKm = [], rho = [], g = [], P = new Array(n + 1).fill(0);
  let massKg = 0;
  for (let i = 0; i <= n; i++) {
    const r = i * dr;
    if (i > 0) {
      const rMidKm = (i - 0.5) * dr / 1000; // midpoint of the shell we just crossed
      massKg += 4 * Math.PI * (rMidKm * 1000) ** 2 * premDensity(rMidKm, config) * dr;
    }
    rKm.push(r / 1000);
    rho.push(premDensity(r / 1000, config));
    g.push(i === 0 ? 0 : G * massKg / (r * r));
  }
  for (let i = n - 1; i >= 0; i--) {
    // trapezoid: average rho*g of the two ends of this thin shell
    P[i] = P[i + 1] + 0.5 * (rho[i] * g[i] + rho[i + 1] * g[i + 1]) * dr;
  }
  const at = (km) => P[Math.round(km / stepKm)];
  let iMax = 0;
  g.forEach((v, i) => { if (v > g[iMax]) iMax = i; });
  return {
    rKm, rho, g, P,
    centralPressureGPa: P[0] / 1e9,
    cmbPressureGPa: at(3480) / 1e9,
    icbPressureGPa: at(1221.5) / 1e9,
    gMax: g[iMax],
    gMaxRadiusKm: rKm[iMax],
  };
}

export const radialStructure = {
  name: 'radialStructure',
  init(state) {
    state.radial = integrateProfile(state.config); // writes ONLY its own field
    state.radial.gp = gravityPressureProfile(state.config); // g(r) and P(r) for the plots
  },
  step() { /* static at Level 1 */ },
};
