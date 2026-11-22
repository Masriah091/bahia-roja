// Entry point for the BAHÍA ROJA hand-in (gta6-01, account Masriah091).
//
// The grader executes this file with nothing but the Node standard library
// available. The program is a staging step, not part of the game itself:
// it copies the playable build and its screenshots into the output folder
// the grader points it at, then has the vendored make.fun helper summarise
// that folder as dossier.json under the kit's size caps.

import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

// Every source path is anchored to the folder this file sits in, so the
// hand-in behaves the same whatever working directory it is launched from.
const entryDir = dirname(fileURLToPath(import.meta.url));

// The grader names the destination through the environment. The plain
// "/output" path is only a fallback for running the hand-in by hand.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outputDir, { recursive: true });

// Ship the game exactly as authored: the whole game/ tree, untouched.
cpSync(join(entryDir, "game"), join(outputDir, "game"), { recursive: true });

// Screenshots travel the same way, but the source folder is allowed to be
// absent, so the destination is created unconditionally and the copy only
// happens when there is a screenshot set to copy.
const shotsDestination = join(outputDir, "screenshots");
mkdirSync(shotsDestination, { recursive: true });
const shotsSource = join(entryDir, "screenshots");
if (existsSync(shotsSource)) {
  cpSync(shotsSource, shotsDestination, { recursive: true });
}

// The kit's caps for the dossier, gathered into one named constant so the
// staging code above stays free of unexplained numbers:
//   text_max_bytes      ceiling for the dossier's text payload (160 KiB)
//   screenshots.max     at most 4 screenshots are summarised
//   screenshots.max_bytes  each at most 256 KiB
//   game_max_files      the game tree holds at most 993 files
//   game_max_bytes      and at most 48 MiB across the whole tree
//   game_path_max_bytes any single in-game path stays under 1000 bytes
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// Close by writing the dossier summary for the staged output.
const dossier = buildDossier(outputDir, DOSSIER_CAPS);
writeFileSync(join(outputDir, "dossier.json"), dossier);
