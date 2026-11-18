[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/c/best-game-01)
[![rank](https://make.fun/badge/best-game-01/aprtama929-sudo/best-game-01/rank.svg)](https://make.fun/c/best-game-01)
[![reward](https://make.fun/badge/best-game-01/aprtama929-sudo/best-game-01/reward.svg)](https://make.fun/c/best-game-01)

# VOIDBLOOM — a neon arena survival shooter

An entry for [make.fun's best-game-01](https://make.fun/c/best-game-01): a twin-stick
arena survival shooter that runs entirely from static files — no build step, no network.

You are the last bloom in the void. Shards pour in in waves: drifters chase, weavers
strafe in sine arcs, stingers telegraph a dash with a flash, and armored bulwarks
split into drifters when they break. Fallen shards drop spores — collect 12 to bloom
a **nova** that clears the field and raises your weapon (levels 1–5, up to a five-way
spread). Chain kills without taking a hit to raise the combo multiplier (×1–×5).
You have 3 hearts; hearts sometimes drop from shattered shards. Best score persists.

## How to play

- **WASD / arrows** — move
- **Mouse** — aim
- **Hold click / Space** — fire
- **M** — mute
- **R / Enter / click** — restart after game over

Open `game/index.html` in a desktop browser, or serve it with `node serve.ts`
and open http://localhost:8080.

## Layout

- `game/` — the game itself (`index.html` + `src/`: config, seeded RNG, input,
  synthesized WebAudio SFX, particles, entities, world simulation, renderer,
  screenshot staging)
- `main.ts` — the hand-in courier: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json` with the vendored make.fun library
- `screenshots/` — four staged captures of the game's own code (title, wave-2
  fight, wave-4 bulwark fight, game-over results)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `serve.ts` — a tiny static server for local play
