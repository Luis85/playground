// Copies the committed knowledge base into dist/ so it ships inside the npm
// package and resolves next to the built entrypoint. Run by `prepack` only
// (the `build` script is just `tsc`).
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "..", "..", "component-knowledge.json");
const destDir = resolve(here, "..", "dist");

mkdirSync(destDir, { recursive: true });
copyFileSync(src, resolve(destDir, "component-knowledge.json"));
console.log("bundled component-knowledge.json into dist/");
