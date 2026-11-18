// VOIDBLOOM — boot and main loop. Wires input, audio, world and renderer
// together, runs the frame loop, and handles the title → playing → over
// transitions (click or any key on the title; R / Enter / click on the end
// screen). With ?shot= in the URL it poses a staged scene instead of the
// live loop and raises window.__shotReady once painted, which the screenshot
// driver waits for. A window.__game handle exposes the live state for the
// play-test (mode, score, wave, hearts) — reading it changes nothing.
import { ARENA } from './config.js';
import { makeRng, liveSeed } from './random.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createParticles } from './particles.js';
import { createWorld } from './world.js';
import { createRenderer } from './render.js';
import { poseShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = ARENA.width;
canvas.height = ARENA.height;

const input = createInput(canvas);
const audio = createAudio();
const particles = createParticles();
const rng = makeRng(liveSeed());
const api = createWorld(rng, audio, particles);
const world = api.world;
const renderer = createRenderer(canvas);

const game = { world, api, input, renderer, audio, particles, rng };
window.__game = game;

const params = new URLSearchParams(window.location.search);
const shotKind = params.get('shot');
const shotSeed = Number(params.get('seed') ?? 1) || 1;

let last = performance.now();
let shotReadyRaised = false;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // Mute follows the input toggle.
  audio.setMuted(input.muted);

  if (world.mode === 'title') {
    if (input.mouseDown || input.anyKey) {
      audio.unlock();
      api.startGame();
      input.anyKey = false;
    }
  } else if (world.mode === 'over') {
    if (input.restartPressed || input.mouseDown) {
      audio.unlock();
      api.startGame();
      input.restartPressed = false;
    }
  }

  api.update(dt, input);
  renderer.draw(world);

  if (shotKind && !shotReadyRaised) {
    shotReadyRaised = true;
    window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}

if (shotKind) {
  // Staged capture: pose once, paint once, then keep the loop running so the
  // scene stays alive (twinkle, drift) while the driver screenshots.
  poseShot(game, shotKind, shotSeed);
  window.__shotReady = true;
  requestAnimationFrame(frame);
} else {
  renderer.draw(world);
  requestAnimationFrame(frame);
}
