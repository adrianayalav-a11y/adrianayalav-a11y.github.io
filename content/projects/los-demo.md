# Line-of-Sight & Polarization-Angle Demo

A from-scratch, interactive version of the geometry from my [satellite-to-ground line-of-sight project](satellite-line-of-sight.html). It places a satellite and a ground station in the Earth-fixed (ECEF) frame, draws the line of sight, and computes elevation, azimuth, range and ψ for the parallactic / polarization-angle geometry. ψ equals the polarization angle when the satellite's polarization is referenced to Earth's axis.

**Try it:** drag the globe to rotate it, and move the sliders. All inputs are generic examples, not project data.

<div class="demo losDemo">
<canvas id="view" width="520" height="520"></canvas>
<p id="readout"></p>
<p><b>Satellite (example circular orbit)</b>
<label>Altitude <input id="alt" type="range" min="300" max="2000" value="500"> <span id="altOut"></span> km</label>
<label>Inclination <input id="incl" type="range" min="0" max="98" value="52"> <span id="inclOut"></span>°</label>
<label>Ascending node <input id="raan" type="range" min="0" max="360" value="220"> <span id="raanOut"></span>°</label>
<label>Time in orbit <input id="time" type="range" min="0" max="100" step="0.2" value="15"> <span id="timeOut"></span>%</label></p>
<p><b>Ground station (example, Boulder-like)</b>
<label>Latitude <input id="lat" type="range" min="-80" max="80" step="0.1" value="40"> <span id="latOut"></span>°</label>
<label>Longitude <input id="lon" type="range" min="-180" max="180" step="0.1" value="-105.3"> <span id="lonOut"></span>°</label></p>
</div>

<script src="../assets/js/losDemo.js"></script>
