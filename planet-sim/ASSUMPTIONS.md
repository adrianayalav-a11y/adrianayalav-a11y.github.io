# Level 1 assumptions (what we assume vs. what is real)

| # | We assume | What is real | Why we simplify | Replaced in |
|---|-----------|--------------|-----------------|-------------|
| 1 | Earth is a perfect sphere, R = 6371 km | Flattened by rotation (~1/298); geoid bumps of ~100 m | Spherical symmetry makes mass, gravity and I easy to integrate | Future rotation/shape module |
| 2 | Density depends only on radius (PREM) | Density varies sideways: cold slabs, hot plumes, continents vs oceans | PREM is a well-tested 1D global average | L3 (crust columns), later 3D mantle |
| 3 | Every hex cell has the same radial profile | Continental and oceanic columns differ a lot in the top ~100 km | Level 1 has no surface features yet | L3 |
| 4 | PREM's 3 km global ocean and 2-layer crust (15 + 9.4 km) | Oceans cover ~71% (avg ~3.7 km deep); crust 5-70 km thick | Keeps PREM exactly as published | L3 |
| 5 | Static snapshot, no time evolution | Inner core grows, mantle cools, crust is made and destroyed | Level 1 is for validating against real numbers | L2-L4 |
| 6 | Gravity g(r) = G M(r) / r^2 (shell theorem) | Real field has J2 flattening and geoid anomalies | Clean teaching result | Future, if needed |
| 7 | PREM isotropic density polynomials, no temperature/pressure computed | Density comes from composition, temperature and pressure (equation of state) | PREM already fits seismic + mass + inertia data | Future thermodynamics module |
| 8 | Reference period / anisotropy details of PREM ignored | PREM velocities depend on period and are anisotropic in the upper 220 km | We only use density, which doesn't | n/a |
| 9 | Grid cells drawn with flat faces; cell sizes vary (pentagons smallest) | Real surface is smooth | ~220 km cells look round; uneven sizes are a known property of simple geodesic subdivision | Future: grid relaxation (optional) |
| 10 | Mass and inertia integrated numerically with thin shells (midpoint rule) | Exact integral of the polynomials | Thin shells (2000 per layer) are accurate to far better than 0.01% | n/a |


## v2 additions
- Hydrostatic pressure integrates inward from P(surface)=0 with 1 km radial
  samples and trapezoidal rho*g. Density jumps are sampled, not interpolated as
  a physical gradient. Half-km convergence is checked (<0.1 GPa central change).
- Gravity is spherical and nonrotating, g=GM(r)/r², g(0)=0. The high-resolution
  layer-aligned mass/inertia integration is unchanged; plotted g/P use separate
  1 km quadrature, so small discretization differences are expected.
- Lab shells have uniform densities; total radius is fixed at 6370 km. PREM
  uses 6371 km. Matching mean density does not uniquely identify an interior.
- Thickness edits clamp to the available radius; inner core is the remainder.
  Density inputs are clamped to 0–20 g/cm³. Zero-thickness shells are permitted.
- Dante's 1000 km cavity is vacuum, unlike the source sheet's very low-density
  air. The two innermost slots retain pedagogical shell names, not real geology.
- Reference errors use rounded mass 5.972e24 kg and density 5.51 g/cm³;
  these are independent rounded targets, not a self-consistent exact radius fit.
- Plot boundary labels use approximate depths: ICB 5150, CMB 2891, 660, 410;
  Moho is the PREM average at 24.4 km, not the lab's 50 km crust.
- Density supports gravity, pressure and inertia predictions. Buoyancy/isostasy
  additionally require density contrasts and mechanical assumptions; temperature
  and composition matter for mineral stability. L1 does not predict plate speeds.
- Evidence text is a summary of PREM (Dziewonski & Anderson, 1981), not copied
  student answers. No new graded coursework is performed.
