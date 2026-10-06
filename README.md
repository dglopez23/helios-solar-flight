# HELIOS · Explorador solar

[Jugar en DGLopez Play Lab](https://juegos-dglopez.dglopez.chatgpt.site/helios/)

## Ejecutar

```sh
npm ci
npm run dev
```

`npm run build` prepara los recursos en `dist/assets/`. La aplicación completa se sirve desde `dist/`, sin servidor de datos ni peticiones externas durante el juego. Los recursos se verifican con SHA-256. Si los paquetes ZIP aún no están en la copia del repositorio, el preparador descarga los mapas, modelos y datos originales de la edición pública de DGLopez. La primera preparación necesita conexión y aproximadamente 171 MB; las siguientes reutilizan los recursos locales verificados. Node.js 18 o posterior. `npm test` comprueba las físicas y los datos.

## Datos y límites


Solar exploration game. Browser-only application with Three.js WebGL rendering and an automatic CPU ray-tracing compatibility path. Launch from Earth, maximum solar-frame cruise speed c (299792.458 km/s), logarithmic throttle, swept-body surface impacts, time compression, and optional heading-only assistance without braking.

The scene uses kilometres in double precision, subtracts the observer before GPU upload, and renders at 1000 km per scene unit. Planet radii are volumetric mean radii: reference spheres plus integrated measured terrain, not detailed ellipsoids. JPL Horizons geometric barycentric positions and velocities are interpolated by cubic Hermite between hourly samples. The epoch window is 2026-10-04 to 2026-11-05 TDB. Displayed UTC is approximated as TDB minus 69.184 seconds. Raw retrievals are retained in data-sources.

Physical limitations: no spacecraft gravitational dynamics, special relativistic optics, photon light-time, eclipsing illumination, exact IAU pole/prime-meridian orientation, or physically realizable propulsion. Rotational periods and approximate obliquities are included. The Sun has a physically scaled photosphere plus a photometric optical glare overlay even below one pixel. A camera filter engages inside 15 solar radii; the surface texture and new magnetic plasma loops are illustrative, not live observations. Illumination includes inverse-square flux and automatic exposure. Stars use HYG 4.1 positions, magnitudes and B−V, geometric observer parallax, and the NASA SVS / Gaia DR2 faint-star Milky Way background. The interface explains these limitations.

Sources:
- NASA/JPL Horizons: https://ssd.jpl.nasa.gov/horizons/ and https://ssd-api.jpl.nasa.gov/doc/horizons.html
- Planetary physical parameters: https://ssd.jpl.nasa.gov/planets/phys_par.html
- Planetary maps: Solar System Scope https://www.solarsystemscope.com/textures/ (CC BY 4.0, saturation reduced in rendering).
- Pluto: NASA/JHUAPL/SwRI, https://science.nasa.gov/resource/pluto-global-color-map/ (2017 New Horizons mosaic).
- Three.js: MIT; full license under dist/assets/THREE-LICENSE.txt.

Production serves dist after preparing assets.

Validation: `node verify.mjs` exercises heading assistance without braking, surface collision at c and 1000×, and Sun visibility at 40/100 AU. Syntax checks, 29 ephemeris series, exact sample reproduction, finite inputs, numerical speed bound, swept sphere collision cases. Browser interaction checked in the compatibility renderer because the test browser's WebGL is disabled. WebGL rendering cannot be visually verified in that browser. WebMCP is feature-detected; unavailable in the test browser.

Solid-body collisions occur at their measured radial terrain surface where integrated, otherwise at their reference radius, freeze at contact, and show a ship destruction / restore flow. Gas giants destroy the ship at the reference cloud radius by extreme pressure; this is a game approximation, not a solid surface. Local atmosphere colors/scales are visual approximations. Artificial rock/cloud grain has been removed. Low 2K maps load at startup; 4K–16K maps stream for the nearest body with GPU texture eviction. Geometric local patches sample measured elevation near contact; the software ray tracer and collision solver sample the same data. Additional maps and credits: dist/assets/sources.json.

October 2026 update: O toggles osculating Kepler ellipses derived from instantaneous JPL position/velocity about the parent. These are navigation curves, not long-term integrated tracks. A Laplace sphere of influence chooses the smallest enclosing body; 4% exit hysteresis avoids boundary flicker. Cruise zero accompanies the body's translation while retaining a fixed inertial relative vector. Motion is still assisted, not free fall. Solar-relative velocity is capped after composing the parent-frame velocity. SOI and orbital parameters use approximate gravitational constants.

Close views: NASA Blue Marble Next Generation Earth imagery is downsampled from 21600×10800 to 16384×8192, without invented detail. Other maps retain their finite photographic/reference resolution. Adaptive CPU resolution (640 in motion, 960 at rest, 1280 high), bilinear sampling and lazy texture mip levels avoid aliasing. The CPU mode is less responsive near detailed terrain than WebGL. Local geometry patches also cover the Sun and giants. No added random rock, cloud or solar grain. Eye adaptation uses viewing direction, the illuminated surface's angular coverage, solar visibility and atmospheric scattering; stars recover gradually in dark views. Glare/diffraction is an optical camera effect informed by NASA ISS photographs and Voyager's Pale Blue Dot.

NASA GLBs for Hubble (A, DigitalSpace), Juno (B), Voyager (A, Christopher R. Meaney) and New Horizons (VTAD) load locally on demand. A rotatable inspection gallery and optional visitable mission scenes are included. Mission scenes are approximate historical recreations around Earth/Jupiter/Pluto, not current spacecraft ephemerides. The software path renders the same meshes with per-face texture color and painter sorting; GPU renders the full model materials. Draco decoder license is retained in dist/assets/DRACO-LICENSE.txt. Sources under dist/assets/missions.

Additional validation: SOI containment, nested lunar frame and exit, zero-speed co-motion, composed solar-frame speed bound, 28 finite elliptic orbit curves, view-dependent star visibility and all NASA binary models. Browser checked all four models, mission visit, orbital switch and frame HUD in the software renderer.

Measured terrain update: Earth NOAA ETOPO 2022 (sea level clamps ocean bathymetry), Moon LRO LOLA, Mars MGS MOLA; spacecraft-derived Stooke radial shape models for Ida, Gaspra and Halley. The map manifest records native data, references and limitations under dist/assets/terrain/sources.json. Heights are unexaggerated. Earth/Mars datum surfaces are approximated on reference spheres. The 4K terrain grids retain regional landforms, not metre-scale detail. Other bodies retain reference spheres. USGS Mercury/Venus/Ceres/Vesta download endpoints were inaccessible in this execution; those datasets are not claimed to be integrated.

New JPL hourly ephemerides cover Ida, Gaspra, Hygiea, Psyche, Eunomia, Iris, Hebe and Halley. Newly added small-body masses and pole orientations are approximate; source Horizons headers are retained. Halley is far from perihelion in the October 2026 window and has no fabricated active tail. Solar prominence geometry reconstructs several observed-scale magnetic arcs; this is illustrative plasma geometry, not a solid elevation map or a live solar state.

Mission illumination now uses a solar directional light and faint ambient fill, with the software path receiving the same solar direction. Star exposure samples the illuminated field of view and nearby sunlit ground. An original Web Audio ambient score has a separate MÚSICA toggle and begins with launch. Tests cover terrain ray intersection, measured-height impacts, daylight-ground star suppression and every new JPL series.

Cabin update: local quaternion yaw/pitch for both mouse and arrows, independent Q/E roll, shortest-arc heading assistance, and an 8-second fictional assisted ascent to 600 km. V opens ship/throttle, N destinations, B systems; Tab hides the HUD when the flight view has focus. Drawers are closed initially and mutually exclusive. Throttle reaches c as a game setting, without relativistic dynamics. Small-body normals use the actual local radius and a derivative scale matched to the native shape sampling; an airless diffuse reflectance approximation and consistent CPU color conversion improve Halley/Ida/Gaspra without inventing craters or textures.
