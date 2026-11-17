# Astral Garden — dense universe edition

A cinematic, procedural space playground inspired by Noniv's Abyssal Garden. This is an original Three.js/WebGL implementation, not a modification of the underwater renderer.

## Run

Run `python3 -m http.server 4173 --directory dist` from this folder and open http://localhost:4173. No package installation or build is required. Three.js 0.170.0 is vendored with its MIT license. Optional Google Fonts fall back to system fonts. JavaScript modules require an HTTP server.

## Explore

Drag to look; WASD or arrows to fly; Q/E to descend/ascend; Shift to boost. Keys 1–6 jump to the six featured destinations. H hides the interface, M toggles synthesized sound, Escape stops the tour. The question-mark menu includes graphics quality and a live frame-rate readout. Touch devices show hold-to-fly controls.

- **New universe** generates a fresh seed and reloads the scene.
- **Rare encounter** cycles through binary stars, a pulsar, the Broken Moon and a comet undergoing tidal disruption.
- **Surprise me** visits a randomly selected generated planet.
- **Share universe** provides a link containing the seed, with clipboard copy and a manual-copy fallback.
- **Take the slow tour** visits the six featured destinations.

## The universe

Each seed builds 84 additional planets, plus four featured planets and their moons. Usually around 230–255 worlds and moons in total; failed placements are skipped to prevent overlap. Gas giants use six contrasting palettes, different band widths and storm shapes, with nearby giants assigned different styles. Ring widths vary independently. Six planet types: gas, ocean, cratered, ice, volcanic, and desert. There are 4,200 instanced asteroids in six debris lanes, with smooth rough-textured geometry and a higher-detail pool for nearby rocks, 6,500 dust particles, 23,000 background stars, nine ordinary stellar bodies, a pulsar and a binary pair, and 18 multicoloured nebula regions built from 396 layered clouds. Existing satellites and occasional UFOs remain. Comets spawn every 4.8–9 seconds after an opening pair, with blue ion tails and broader golden dust tails. Up to four can be active at once, each easing in and out. Planets retain full clarity within 200 units of their surface and smoothly fade into the sky by 1,300 units; rings, clouds, and atmospheres use the same fade.

Graphics include domain-warped gas belts and storms, derivative terrain relief, randomized spherical impact craters, ocean reflections, separate moving clouds, atmosphere shells, finely varied ring particles with planetary shadows, HDR bloom and filmic tone mapping. Sphere detail adjusts to projected size. Rocky silhouettes have subtle displacement; the Shallows core has a deep fracture. Animated gas shear, nightside electrical flashes and polar aurora curtains add motion. Black-hole rays curve through an emitting accretion volume with asymmetrical brightness and lensing arcs.

This remains an artistic, densely packed universe, not an astrophysics simulation. The lensing model is approximate. Curved rays sample the rendered scene so the actual stars and nebulae bend around the horizon; foreground opaque objects are depth-protected. A protected central region keeps ordinary planets and debris away from the black hole; only its accretion flow and dedicated tidal encounter enter this space. Planets, clouds, atmospheres and rings use their two strongest nearby stellar sources with up to four moving spherical eclipse blockers. Light exposure is compressed for cinematic readability. Nearby stellar point lights illuminate rocks and spacecraft. Three nebula cores use depth-clipped volumetric ray marching, rendered at half resolution with depth-aware upsampling. Background nebula layers remain sprites. Solid planets and the event-horizon core stop the camera; debris and rings are traversable. Stars orbit the black hole, planets orbit stars, and moons orbit their parent planets. Rings, asteroid lanes, dust and the satellite follow massive hosts. Destination jumps track moving worlds. Asteroid and dust transforms update every frame. Rendered orbital phases interpolate between fixed simulation ticks to remove stepping. Circular orbital paths use deterministic phase yielding to avoid solid-body crossings in the dense layout; this is cinematic choreography, not an N-body gravity solver. Reduced-motion preference disables introductory drift and tour orbits, not all environmental animation.

## Source

- `dist/app.js`: navigation, controls, audio, visitors, sharing
- `dist/celestials.js`: procedural materials, populated scene, black-hole renderer
- `dist/cinema.js`: HDR and bloom pipeline (with unsigned-byte fallback)
- `dist/generation.mjs`: deterministic placement and collision clearance
- `dist/orbits.mjs`: hierarchical orbits and swept-sphere separation
- `dist/nebulae.js`: seeded multicolour cloud layers
- `dist/volumes.js`: depth-clipped volumetric nebulae
- `dist/lighting.js`: nearby stellar illumination and eclipses
- `dist/phenomena.js`: binary stars, pulsar, fragmented moon and tidal encounter
- `dist/index.html`, `dist/style.css`: responsive interface
- `tests/generation.test.mjs`: generation regression checks

## Validation

Run `node --test tests/*.test.mjs`. Tests cover deterministic reproduction, seed variation and diversity across many seeds, non-overlapping finite bodies, safe arrival positions, heavier orbital hosts, constant orbital radii, frame-rate-independent motion and orbital speed scaling.

Browser checks covered desktop and 390×844 layouts, all six featured destinations, regenerated seed/changed body counts, random discovery, share-link display and successful clipboard copy, graphics selection, keyboard flight, tour, and shader/error logs. The cinematic update was checked at desktop and phone-sized viewports. Performance varies with scene and graphics quality; the High setting increases cloud samples and resolution. Physical touchscreen operation has not been tested.

Inspiration: https://github.com/Noniv/abyssal-garden
