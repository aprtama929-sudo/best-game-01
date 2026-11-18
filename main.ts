// VOIDBLOOM — hand-in program for the make.fun best-game-01 bounty (Node 22, stdlib only).
//
// The game itself is the static site in game/ (open game/index.html in a desktop browser,
// no build step, no network). This program is only the courier: it copies game/ and
// screenshots/ into the output directory and writes dossier.json there with the vendored
// make.fun library, byte for byte the way the grader rebuilds it.
//
// Run it the way the grader does, twice, and both runs write identical bytes:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps below are the gate's own (game/ at most 993 files and 48 MiB, screenshots at
// most 4 files of 256 KiB, dossier text at most 160 KiB); buildDossier refuses anything
// the scorer would refuse, so a clean run here means the files are inside every limit.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
