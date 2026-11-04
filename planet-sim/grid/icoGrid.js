// icoGrid.js - our own icosahedral geodesic hex grid (no H3).
// Recipe: 1) start from an icosahedron (20 triangles, 12 corners)
//         2) split every edge into `frequency` pieces -> many small triangles
//         3) push every point out onto the unit sphere (normalize)
//         4) take the DUAL: each grid point becomes a cell whose corners are
//            the centers of the triangles around it. 6 triangles -> hexagon,
//            5 triangles (the 12 original corners) -> pentagon.

// --- tiny vector helpers (arrays [x, y, z]) ---
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (a) => scale(a, 1 / Math.hypot(a[0], a[1], a[2]));

// Area of a triangle drawn ON the unit sphere (in steradians).
// Uses the Van Oosterom & Strackee formula: tan(E/2) = |a.(b x c)| / (1 + a.b + b.c + c.a)
function sphericalTriangleArea(a, b, c) {
  const numerator = Math.abs(dot(a, cross(b, c)));
  const denominator = 1 + dot(a, b) + dot(b, c) + dot(c, a);
  return 2 * Math.atan2(numerator, denominator);
}

// The 12 corners and 20 faces of a regular icosahedron.
function makeIcosahedron() {
  const t = (1 + Math.sqrt(5)) / 2; // golden ratio
  const corners = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map(normalize);
  const faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  return { corners, faces };
}

export function buildIcoGrid(frequency) {
  const { corners, faces } = makeIcosahedron();
  const points = [];          // unit vectors, one per cell
  const pointIndexByKey = new Map(); // so shared edge points are stored once
  const triangles = [];       // small triangles [i, j, k]

  // Return the index of a point, adding it if new. Points on shared edges get
  // computed twice (once per face), so we merge them by rounded coordinates.
  function getPointIndex(p) {
    const key = p.map((v) => v.toFixed(9)).join(',');
    if (!pointIndexByKey.has(key)) {
      pointIndexByKey.set(key, points.length);
      points.push(p);
    }
    return pointIndexByKey.get(key);
  }

  // Steps 2+3: subdivide each big face into frequency^2 small triangles.
  for (const [ia, ib, ic] of faces) {
    const a = corners[ia], b = corners[ib], c = corners[ic];
    // rows[i][j] = point at "i steps from a toward b, j steps toward c"
    const rows = [];
    for (let i = 0; i <= frequency; i++) {
      rows.push([]);
      for (let j = 0; j <= frequency - i; j++) {
        const wa = (frequency - i - j) / frequency, wb = i / frequency, wc = j / frequency;
        const flatPoint = add(add(scale(a, wa), scale(b, wb)), scale(c, wc));
        rows[i].push(getPointIndex(normalize(flatPoint))); // push onto sphere
      }
    }
    for (let i = 0; i < frequency; i++) {
      for (let j = 0; j < frequency - i; j++) {
        triangles.push([rows[i][j], rows[i + 1][j], rows[i][j + 1]]);       // "upward" triangle
        if (j < frequency - i - 1) {
          triangles.push([rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]]); // "downward" triangle
        }
      }
    }
  }

  // Step 4: the dual. Find which triangles touch each point.
  const trianglesOfPoint = points.map(() => []);
  const triangleCenters = triangles.map((tri, t) => {
    tri.forEach((p) => trianglesOfPoint[p].push(t));
    return normalize(add(add(points[tri[0]], points[tri[1]]), points[tri[2]]));
  });

  const cells = points.map((center, id) => {
    // Sort the surrounding triangle centers by angle around the cell center
    // so the polygon corners go in order around the cell.
    const east = normalize(cross([0, 0, 1], center).some((v) => Math.abs(v) > 1e-9) ? cross([0, 0, 1], center) : [1, 0, 0]);
    const north = cross(center, east);
    const cornerList = trianglesOfPoint[id]
      .map((t) => triangleCenters[t])
      .sort((p, q) => Math.atan2(dot(p, north), dot(p, east)) - Math.atan2(dot(q, north), dot(q, east)));

    // Neighbors = every other point that shares a triangle with this one.
    const neighborSet = new Set();
    trianglesOfPoint[id].forEach((t) => triangles[t].forEach((p) => p !== id && neighborSet.add(p)));

    // Cell area on the unit sphere = fan of spherical triangles (center, corner k, corner k+1).
    let areaSr = 0;
    for (let k = 0; k < cornerList.length; k++) {
      areaSr += sphericalTriangleArea(center, cornerList[k], cornerList[(k + 1) % cornerList.length]);
    }

    return {
      id,
      center,                                             // unit vector [x, y, z]
      latDeg: Math.asin(center[2]) * 180 / Math.PI,
      lonDeg: Math.atan2(center[1], center[0]) * 180 / Math.PI,
      corners: cornerList,                                // polygon corners (unit vectors)
      neighbors: [...neighborSet],
      areaSr,                                             // multiply by R^2 for m^2
      isPentagon: cornerList.length === 5,
    };
  });

  return { frequency, cells, triangleCount: triangles.length };
}
