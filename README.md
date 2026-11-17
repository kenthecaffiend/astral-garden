# Astral Garden

A crowded, cinematic space playground with procedural planets, orbiting moons, asteroids, multicoloured nebulae, comets, black holes, satellites and occasional UFOs.

**[Play Astral Garden on GitHub Pages](https://kenthecaffiend.github.io/astral-garden/)** — public, no login required.

[Alternate playable mirror](https://astral-garden-drift.strato-creat-6867.chatgpt.site)

## About this fork

This is a public GitHub fork of [Noniv/abyssal-garden](https://github.com/Noniv/abyssal-garden), created by Maksymilian Dendura. Abyssal Garden inspired the exploration experience. Astral Garden is a separate Three.js/WebGL implementation; it does not modify the original underwater WebGPU renderer.

The original underwater project and its history are retained. Its documentation is in [ABYSSAL-GARDEN.md](ABYSSAL-GARDEN.md). The space edition lives in [astral-garden/](astral-garden/).

## Run the space edition

From the repository root:

```sh
python3 -m http.server 4173 --directory astral-garden/dist
```

Open http://localhost:4173. No installation or build step is required. Serve over HTTP rather than opening the HTML file directly.

Drag to look, use WASD to fly, or select a destination. Use Graphics → Low on slower devices. Phone-sized layouts have been checked; physical-phone performance varies and has not been benchmarked.

See the [space edition documentation](astral-garden/README.md) for features, controls and source details.

## Tests

```sh
cd astral-garden
node --test tests/*.test.mjs
```

## Credits and licences

- Original Abyssal Garden: Maksymilian Dendura / [Noniv](https://github.com/Noniv), [MIT licence](LICENSE). Original copyright and licence are preserved.
- Astral Garden additions: [kenthecaffiend](https://github.com/kenthecaffiend), [MIT licence](astral-garden/LICENSE), developed with OpenAI Codex.
- Three.js: vendored with its [MIT licence](astral-garden/dist/vendor/THREE-LICENSE.txt).

The scene is artistic and procedural; orbital motion and black-hole lensing are cinematic approximations.

## Publishing updates to GitHub Pages

GitHub Pages serves the `gh-pages` branch, which contains only the space edition's static files. After committing changes on `main`, publish them with:

```sh
git push origin main
git subtree split --prefix=astral-garden/dist -b pages-release
git push origin pages-release:gh-pages
git branch -d pages-release
```

GitHub automatically deploys updates pushed to `gh-pages`. The upstream underwater edition remains in the main branch.
