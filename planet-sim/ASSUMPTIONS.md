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
