// shellModel.js - "Build your own Earth": 4 uniform shells (based on my ERTH 2001 lab, CU Boulder).
// Each shell has one thickness (km) and one density (g/cm^3). Total radius is fixed at 6370 km.
//   volume of a shell  V = (4/3)*pi*(rTop^3 - rBottom^3)
//   mass of a shell    M = rho * V
//   mean density       = total M / total V   (a volume-weighted average)

export const shellRadiusKm = 6370;
export const shellNames = ['Crust', 'Mantle', 'Outer core', 'Inner core'];
export const realEarth = { massKg: 5.972e24, meanDensity: 5.51 }; // g/cm^3

// Thicknesses listed from the surface down; densities in g/cm^3.
export const presets = {
  step12: { label: 'Step 1/2: equal shells', thickness: [1592.5, 1592.5, 1592.5, 1592.5], density: [2.8, 5, 7, 9] },
  step3:  { label: 'Step 3: seismic boundaries', thickness: [50, 2840, 2260, 1220], density: [2.8, 5, 7, 9] },
  step4:  { label: 'Step 4: tuned densities', thickness: [50, 2840, 2260, 1220], density: [2.8, 4.5, 11.1, 13] },
  // Idealized hollow 1000 km center: zero density. The spreadsheet used thin air (0.001092).
  dante:  { label: "Dante's Inferno (hollow center)", thickness: [420, 4950, 500, 500], density: [2.8, 2.8, 0, 0] },
};

export function computeShells(thickness, density) {
  // Reject invalid states so the volume always represents the whole fixed-radius planet.
  if (thickness.length !== 4 || density.length !== 4 ||
      [...thickness, ...density].some(v => !Number.isFinite(v) || v < 0) ||
      Math.abs(thickness.reduce((a,b) => a+b,0) - shellRadiusKm) > 1e-6) {
    throw new RangeError('Use four nonnegative shells with total thickness 6370 km.');
  }
  const km3ToCm3 = 1e15; // 1 km^3 = 1e15 cm^3
  let rTop = shellRadiusKm;
  const shells = thickness.map((t, i) => {
    const rBottom = Math.max(rTop - t, 0);
    const volumeKm3 = (4 / 3) * Math.PI * (rTop ** 3 - rBottom ** 3);
    const massKg = density[i] * volumeKm3 * km3ToCm3 / 1000; // grams -> kg
    const shell = { name: shellNames[i], rTop, rBottom, volumeKm3, density: density[i], massKg };
    rTop = rBottom;
    return shell;
  });
  const totalVolume = shells.reduce((s, sh) => s + sh.volumeKm3, 0);
  const totalMass = shells.reduce((s, sh) => s + sh.massKg, 0);
  const meanDensity = totalMass / (totalVolume * km3ToCm3) * 1000; // g/cm^3
  // The tempting-but-wrong average: weight each density by thickness instead of volume.
  const thicknessAverage = shells.reduce((s, sh, i) => s + density[i] * thickness[i], 0) / shellRadiusKm;
  return { shells, totalVolume, totalMass, meanDensity, thicknessAverage };
}
