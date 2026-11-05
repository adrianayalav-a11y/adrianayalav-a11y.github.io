// Local teaching controls. The PREM planet stays separate from the editable toy.
import { presets, computeShells, shellNames, realEarth } from '../modules/shellModel.js';
import { premDensity, premLayerName } from '../modules/radialStructure.js';

// Pretty scientific notation for KaTeX: 1.23 \times 10^{20}
function sciTex(n, digits = 3) {
  if (!Number.isFinite(n)) return String(n);
  if (n === 0) return '0';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const exp = Math.floor(Math.log10(abs));
  const mant = abs / 10 ** exp;
  return `${sign}${mant.toFixed(digits)} \\times 10^{${exp}}`;
}

function renderMathSoon(el) {
  // KaTeX may still be loading on first paint; retry a couple of times.
  const go = () => { if (window.renderPageMath) window.renderPageMath(el || document.body); };
  go();
  setTimeout(go, 50);
  setTimeout(go, 250);
}

export function initUpgrade(planet, config, slice, camera, renderer, THREE) {
  const get = id => document.getElementById(id);
  const gp = planet.radial.gp;
  const colors = ['#8ac926', '#f4a261', '#e63946', '#ffe066'];
  // Short pill labels; full names stay on title/aria for clarity.
  const presetShort = {
    step12: 'Step 1/2',
    step3: 'Step 3',
    step4: 'Step 4',
    dante: 'Dante',
  };
  let thickness, density;

  function plot(id, values, max, unit, overlay = []) {
    const c = get(id), ctx = c.getContext('2d'), w = c.width, h = c.height;
    const x = r => 38 + r / config.radiusKm * (w - 48), y = v => h - 32 - v / max * (h - 60);
    ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, w, h); ctx.font = '10px sans-serif'; ctx.fillStyle = '#c9d1d9';
    ctx.fillText(unit, 4, 12); ctx.fillText('radius (km)', w / 2 - 20, h - 3);
    ctx.strokeStyle = '#596273'; ctx.beginPath(); ctx.moveTo(38, 25); ctx.lineTo(38, h - 32); ctx.lineTo(w - 10, h - 32); ctx.stroke();
    [0, 2000, 4000, 6000].forEach(v => ctx.fillText(v, x(v) - 10, h - 18));
    [0, max / 2, max].forEach(v => ctx.fillText(v.toFixed(0), 4, y(v) + 3));
    // Depth labels; exact PREM Moho is 24.4 km, not the lab's 50 km shell.
    [['ICB', 5150], ['CMB', 2891], ['660', 660], ['410', 410], ['Moho', 24.4]].forEach(([name, d], i) => {
      ctx.strokeStyle = '#30363d'; ctx.beginPath(); ctx.moveTo(x(config.radiusKm - d), 25); ctx.lineTo(x(config.radiusKm - d), h - 32); ctx.stroke();
      if (id === 'plotDensity') {
        ctx.save(); ctx.translate(x(config.radiusKm - d) - 2, 30 + (i % 2) * 30); ctx.rotate(-Math.PI / 2); ctx.fillText(name, 0, 0); ctx.restore();
      }
    });
    [values, overlay].forEach((series, i) => {
      ctx.strokeStyle = i ? '#58a6ff' : '#f2a33a'; ctx.lineWidth = 2; ctx.setLineDash(i ? [5, 3] : []);
      ctx.beginPath(); series.forEach(([r, v], j) => j ? ctx.lineTo(x(r), y(v)) : ctx.moveTo(x(r), y(v))); ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  function update() {
    const model = computeShells(thickness, density);
    const error = (v, ref) => (100 * (v / ref - 1)).toFixed(2) + '%';
    get('shellResult').innerHTML =
      `<p>Total mass: <b>\\(${sciTex(model.totalMass, 5)}\\,\\mathrm{kg}\\)</b> (${error(model.totalMass, realEarth.massKg)} error)<br>` +
      `Mean density: <b>\\(${model.meanDensity.toFixed(6)}\\,\\mathrm{g/cm^{3}}\\)</b> (${error(model.meanDensity, realEarth.meanDensity)} error)</p>`;
    const rows = get('shellTable').querySelectorAll('tbody tr');
    model.shells.forEach((sh, i) => {
      // Volume in m³ (km³ × 10^9) so readouts match SI scientific notation.
      const Vm3 = sh.volumeKm3 * 1e9;
      rows[i].querySelector('.values').innerHTML =
        `\\(V = ${sciTex(Vm3)}\\,\\mathrm{m^{3}}\\)<br>\\(M = ${sciTex(sh.massKg)}\\,\\mathrm{kg}\\)`;
    });
    ['volume', 'mass'].forEach(type => {
      get(type + 'Bar').innerHTML = model.shells.map((sh, i) => {
        const share = 100 * (type === 'volume' ? sh.volumeKm3 / model.totalVolume : (model.totalMass ? sh.massKg / model.totalMass : 0));
        return `<div title="${shellNames[i]}: ${share.toFixed(2)}%" style="background:${colors[i]};width:${share}%">${share.toFixed(1)}%</div>`;
      }).join('');
    });
    get('shellExplain').innerHTML =
      `Mean density is \\(\\rho = M / V\\). Shell volume is ` +
      `\\(V = \\tfrac{4}{3}\\pi\\bigl(r_{\\mathrm{top}}^{3} - r_{\\mathrm{bottom}}^{3}\\bigr)\\). ` +
      `Add shell masses, then divide by the whole volume. Thickness-weighting would give ` +
      `\\(${model.thicknessAverage.toFixed(4)}\\,\\mathrm{g/cm^{3}}\\): it ignores how volume grows with radius. ` +
      `Bars follow shell order above. PREM uses \\(R = 6371\\,\\mathrm{km}\\); this lab model uses \\(6370\\,\\mathrm{km}\\).`;
    plot(
      'plotDensity',
      Array.from({ length: 1275 }, (_, i) => [i * 5, premDensity(i * 5, config) / 1000]),
      14,
      'density (g/cm³)',
      model.shells.slice().reverse().flatMap(sh => [[sh.rBottom, sh.density], [sh.rTop, sh.density]])
    );
    renderMathSoon(get('panel') || document.body);
  }

  function table() {
    get('shellTable').innerHTML =
      '<thead><tr><th>Shell</th><th>Thickness / density</th></tr></thead><tbody>' +
      shellNames.map((name, i) =>
        `<tr>` +
        `<td><span class="shell-name" style="color:${colors[i]}">${name}</span><div class="values note"></div></td>` +
        `<td class="shell-controls">` +
        `<div><span class="field-label">Thickness (km)</span>` +
        `<input aria-label="${name} thickness" data-i="${i}" data-kind="thickness" type="number" min="0" max="6370" step="0.5" value="${thickness[i]}" ${i === 3 ? 'disabled' : ''}></div>` +
        `<input aria-label="${name} thickness slider" data-i="${i}" data-kind="thickness" type="range" min="0" max="6370" step="0.5" value="${thickness[i]}" ${i === 3 ? 'disabled' : ''}>` +
        `<div><span class="field-label">Density (g/cm³)</span>` +
        `<input aria-label="${name} density" data-i="${i}" data-kind="density" type="number" min="0" max="20" step="0.1" value="${density[i]}"></div>` +
        `</td></tr>`
      ).join('') +
      '</tbody>';
    get('shellTable').querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
      // Live update while dragging the slider; 'change' alone felt laggy.
      const i = Number(input.dataset.i), v = Number(input.value);
      if (!Number.isFinite(v)) return;
      if (input.dataset.kind === 'density') density[i] = Math.min(20, Math.max(0, v));
      else {
        const available = 6370 - thickness.slice(0, 3).reduce((sum, t, j) => sum + (j === i ? 0 : t), 0);
        thickness[i] = Math.min(available, Math.max(0, v));
        thickness[3] = 6370 - thickness.slice(0, 3).reduce((a, b) => a + b, 0);
      }
      // Sync the paired number/range inputs (and clamp the one just edited).
      const kind = input.dataset.kind;
      const shown = kind === 'density' ? density[i] : thickness[i];
      get('shellTable').querySelectorAll(`input[data-i="${i}"][data-kind="${kind}"]`).forEach(el => { el.value = shown; });
      // Keep the locked inner-core thickness field in sync.
      get('shellTable').querySelectorAll('input[data-i="3"][data-kind="thickness"]').forEach(el => { el.value = thickness[3]; });
      update();
    }));
  }

  // Preset pills (segmented control). Hidden <select> stays for a single source of truth.
  const sel = get('presetSelect');
  const seg = get('presetSeg');
  Object.entries(presets).forEach(([key, p]) => {
    sel.add(new Option(p.label, key));
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = `preset-${key}`;
    btn.textContent = presetShort[key] || p.label;
    btn.title = p.label;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', 'false');
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      sel.value = key;
      preset();
    });
    seg.appendChild(btn);
  });

  function syncPresetPills() {
    const key = sel.value;
    seg.querySelectorAll('button').forEach(btn => {
      const on = btn.id === `preset-${key}`;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }

  function preset() {
    const p = presets[sel.value];
    thickness = [...p.thickness];
    density = [...p.density];
    syncPresetPills();
    table();
    update();
  }
  sel.addEventListener('change', preset);
  // Default to Step 4 (tuned densities) — same as before (first option was step12 via Object.entries order).
  // Keep Object.entries order so physics/demo behavior is unchanged.
  sel.value = Object.keys(presets)[0];
  preset();

  plot('plotGravity', gp.rKm.map((r, i) => [r, gp.g[i]]), 12, 'g (m/s²)');
  plot('plotPressure', gp.rKm.map((r, i) => [r, gp.P[i] / 1e9]), 400, 'P (GPa)');
  get('gravityNote').innerHTML =
    `\\(g = G M(r) / r^{2}\\). Maximum \\(${gp.gMax.toFixed(3)}\\,\\mathrm{m/s^{2}}\\) at radius ` +
    `\\(${gp.gMaxRadiusKm}\\,\\mathrm{km}\\). Center \\(g = 0\\).`;
  get('pressureNote').innerHTML =
    `\\(\\mathrm{d}P/\\mathrm{d}r = -\\rho g\\); surface \\(P = 0\\). Center ` +
    `\\(${gp.centralPressureGPa.toFixed(2)}\\,\\mathrm{GPa}\\); CMB ` +
    `\\(${gp.cmbPressureGPa.toFixed(2)}\\,\\mathrm{GPa}\\).`;
  renderMathSoon(document.body);

  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), hover = get('hover');
  renderer.domElement.addEventListener('pointermove', event => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = slice.visible && raycaster.intersectObject(slice)[0];
    hover.style.display = hit ? 'block' : 'none';
    if (!hit) return;
    const r = Math.min(config.radiusKm, hit.point.length() * config.radiusKm);
    hover.textContent = `${premLayerName(r, config)} · radius ${r.toFixed(0)} km · depth ${(config.radiusKm - r).toFixed(0)} km · ${(premDensity(r, config) / 1000).toFixed(3)} g/cm³`;
    hover.style.left = Math.max(0, Math.min(event.clientX + 12, innerWidth - 280)) + 'px';
    hover.style.top = (event.clientY + 16) + 'px';
  });
  renderer.domElement.addEventListener('pointerleave', () => { hover.style.display = 'none'; });
}
