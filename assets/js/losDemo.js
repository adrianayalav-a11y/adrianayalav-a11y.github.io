// losDemo.js - satellite-to-ground line of sight and polarization angles, in 3D
// Plain JavaScript, no libraries. The math part has no browser code, so node can test it.
// Written from scratch for this site, using standard textbook geometry (WGS-84, ECEF/ENU).
// All inputs are generic examples (500 km circular orbit, Boulder-like station), not project data.

const deg = Math.PI / 180;

// ---------- Earth constants (WGS-84) ----------
const R_E = 6378.137;           // Earth equatorial radius [km]
const F_INV = 298.257223563;    // inverse flattening
const E2 = 2 / F_INV - (1 / F_INV) ** 2; // first eccentricity squared
const MU = 398600.4418;         // Earth's gravity constant [km^3/s^2] (textbook value, for the orbit)
const OMEGA_EARTH = 7.2921159e-5; // Earth rotation rate [rad/s] (textbook value)

// ---------- Small vector helpers ----------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => Math.sqrt(dot(a, a));
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// ---------- Ground station: lat/lon/alt -> ECEF (WGS-84) ----------
function geodeticToEcef(latDeg, lonDeg, altKm) {
  const lat = latDeg * deg, lon = lonDeg * deg;
  const N = R_E / Math.sqrt(1 - E2 * Math.sin(lat) ** 2); // radius of curvature
  return [
    (N + altKm) * Math.cos(lat) * Math.cos(lon),
    (N + altKm) * Math.cos(lat) * Math.sin(lon),
    (N * (1 - E2) + altKm) * Math.sin(lat),
  ];
}

// ---------- Satellite: circular orbit -> ECEF ----------
// A simple circular orbit, so the demo needs no real satellite data:
//   1) position in the orbit plane at angle u = n*t (n = sqrt(mu / r^3))
//   2) tilt by inclination, turn by the ascending node (raan) -> inertial frame
//   3) rotate by Earth's spin (OMEGA_EARTH * t) -> Earth-fixed (ECEF)
function satelliteEcef(altKm, inclDeg, raanDeg, tSec) {
  const r = R_E + altKm;
  const n = Math.sqrt(MU / r ** 3);
  const u = n * tSec, i = inclDeg * deg, raan = raanDeg * deg;
  const inertial = [
    r * (Math.cos(u) * Math.cos(raan) - Math.sin(u) * Math.cos(i) * Math.sin(raan)),
    r * (Math.cos(u) * Math.sin(raan) + Math.sin(u) * Math.cos(i) * Math.cos(raan)),
    r * Math.sin(u) * Math.sin(i),
  ];
  const spin = OMEGA_EARTH * tSec; // Earth turned this much, so rotate the satellite back by it
  return [
    Math.cos(spin) * inertial[0] + Math.sin(spin) * inertial[1],
    -Math.sin(spin) * inertial[0] + Math.cos(spin) * inertial[1],
    inertial[2],
  ];
}

function orbitPeriod(altKm) {
  return 2 * Math.PI * Math.sqrt((R_E + altKm) ** 3 / MU); // seconds
}

// ---------- Local east/north/up at the station ----------
// "Up" is the geocentric up, ground/|ground|
function localEnu(groundEcef) {
  const upHat = scale(groundEcef, 1 / norm(groundEcef));
  let eastHat = cross([0, 0, 1], upHat);
  eastHat = scale(eastHat, 1 / norm(eastHat));
  const northHat = cross(upHat, eastHat);
  return { eastHat, northHat, upHat };
}

// ---------- All the angles for one moment ----------
function losGeometry(satEcef, groundEcef, groundLatDeg) {
  // LOS vector, range and unit vector
  const losVec = sub(satEcef, groundEcef);
  const range = norm(losVec);
  const losHat = scale(losVec, 1 / range);

  // Elevation theta = 90 - angle between LOS and up
  const { eastHat, northHat, upHat } = localEnu(groundEcef);
  const zenithAngle = Math.acos(Math.max(-1, Math.min(1, dot(losHat, upHat))));
  const elevation = 90 - zenithAngle / deg;
  const visible = elevation > 0; // below the horizon = no line of sight

  // Azimuth from North toward East, 0-360
  const azimuth = ((Math.atan2(dot(losVec, eastHat), dot(losVec, northHat)) / deg) + 360) % 360;

  // Parallactic / polarization-angle geometry, psi: the tilt between the station's "up" and Earth's north axis,
  // both seen in the plane perpendicular to the line of sight (the standard projected-angle definition).
  // Spherical-astronomy formula, written in hour-angle form:
  //   tan(psi) = sin(H) cos(phi) / (sin(phi) cos(dec) - cos(H) sin(dec) cos(phi))
  //   dec = declination of the LOS direction (its angle above Earth's equator plane)
  //   H   = hour angle of the LOS direction (LOS longitude minus station longitude)
  //   phi = station latitude (geocentric, to match the geocentric "up" used above)
  const dec = Math.asin(losHat[2]);
  const H = Math.atan2(losHat[1], losHat[0]) - Math.atan2(groundEcef[1], groundEcef[0]);
  const phi = Math.atan2(groundEcef[2], Math.hypot(groundEcef[0], groundEcef[1]));
  const psi = Math.atan2(Math.sin(H) * Math.cos(phi),
    Math.sin(phi) * Math.cos(dec) - Math.cos(H) * Math.sin(dec) * Math.cos(phi)) / deg;

  return { losVec, range, elevation, azimuth, visible, psi };
}

if (typeof module !== "undefined") {
  module.exports = { geodeticToEcef, satelliteEcef, orbitPeriod, localEnu, losGeometry, R_E };
}

// ---------- Browser part: a rotatable 3D canvas view ----------
if (typeof document !== "undefined") {
  const canvas = document.getElementById("view");
  const ctx = canvas.getContext("2d");
  const $ = (id) => document.getElementById(id);
  let viewYaw = 15 * deg, viewPitch = 40 * deg; // camera angles (start facing the station), changed by dragging

  // Rotate a point by the camera angles and flatten it to the screen (simple orthographic view)
  function project(p) {
    const x1 = Math.cos(viewYaw) * p[0] - Math.sin(viewYaw) * p[1];
    const y1 = Math.sin(viewYaw) * p[0] + Math.cos(viewYaw) * p[1];
    const y2 = Math.cos(viewPitch) * y1 - Math.sin(viewPitch) * p[2];
    const z2 = Math.sin(viewPitch) * y1 + Math.cos(viewPitch) * p[2];
    const s = canvas.width / 2 / (R_E + 2500);
    return { x: canvas.width / 2 + x1 * s, y: canvas.height / 2 - z2 * s, depth: y2 }; // depth < 0 = toward us
  }

  function drawPath(points, color, width) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
    points.forEach((p, k) => { const s = project(p); k ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); });
    ctx.stroke();
  }

  function draw() {
    const inputs = {};
    for (const id of ["alt", "incl", "raan", "time", "lat", "lon"]) inputs[id] = Number($(id).value);
    const period = orbitPeriod(inputs.alt);
    const tSec = inputs.time / 100 * period; // time slider = 0-100% of one orbit
    const ground = geodeticToEcef(inputs.lat, inputs.lon, 1.6);
    const sat = satelliteEcef(inputs.alt, inputs.incl, inputs.raan, tSec);
    const g = losGeometry(sat, ground, inputs.lat);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Earth: outline plus latitude/longitude lines (back half faded)
    const c = project([0, 0, 0]);
    ctx.fillStyle = "#EEF2F7"; ctx.beginPath(); ctx.arc(c.x, c.y, canvas.width / 2 * R_E / (R_E + 2500), 0, 2 * Math.PI); ctx.fill();
    for (let latLine = -60; latLine <= 60; latLine += 30) {
      const ring = []; for (let lo = 0; lo <= 360; lo += 5) ring.push(geodeticToEcef(latLine, lo, 0));
      drawPath(ring, "#C9D3E0", 1);
    }
    for (let lonLine = 0; lonLine < 360; lonLine += 30) {
      const ring = []; for (let la = -90; la <= 90; la += 5) ring.push(geodeticToEcef(la, lonLine, 0));
      drawPath(ring, "#C9D3E0", 1);
    }
    // Orbit path over one period (in ECEF, so it drifts as Earth turns)
    const path = []; for (let k = 0; k <= 120; k++) path.push(satelliteEcef(inputs.alt, inputs.incl, inputs.raan, k / 120 * period));
    drawPath(path, "#C2410C", 1.5);
    // LOS line: green if the satellite is above the horizon, red if not
    drawPath([ground, sat], g.visible ? "#1a9b3c" : "#d33", 3);
    for (const [p, color] of [[ground, "#C2410C"], [sat, "#1A1A1A"]]) {
      const s = project(p); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(s.x, s.y, 6, 0, 2 * Math.PI); ctx.fill();
    }

    $("readout").innerHTML =
      `Line of sight: <b>${g.visible ? "yes" : "no (below horizon)"}</b><br>` +
      `Elevation θ: <b>${g.elevation.toFixed(2)}°</b> · Azimuth: <b>${g.azimuth.toFixed(2)}°</b> · Range: <b>${g.range.toFixed(1)} km</b><br>` +
      `<span title="How far Earth's north axis is tilted from the station's straight-up direction, seen looking along the line of sight">Parallactic / polarization-angle geometry ψ: <b>${g.psi.toFixed(2)}°</b></span> ` +
      `<span class="note">(tilt of Earth's north axis from "up", seen along the line of sight)</span><br>` +
      `Time: ${(tSec / 60).toFixed(1)} of ${(period / 60).toFixed(1)} min`;
    for (const id of ["alt", "incl", "raan", "time", "lat", "lon"]) $(id + "Out").textContent = $(id).value;
  }

  // Drag to rotate the view
  let dragging = null;
  canvas.addEventListener("pointerdown", (e) => { dragging = [e.clientX, e.clientY]; });
  window.addEventListener("pointerup", () => { dragging = null; });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    viewYaw += (e.clientX - dragging[0]) * 0.01;
    viewPitch = Math.max(-1.5, Math.min(1.5, viewPitch + (e.clientY - dragging[1]) * 0.01));
    dragging = [e.clientX, e.clientY];
    draw();
  });
  document.querySelectorAll("input").forEach((el) => el.addEventListener("input", draw));
  draw();
}
