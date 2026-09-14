import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  compilePortfolioMaterial,
  serializePortfolioMaterial,
} from "../lib/portfolio-material/compiler";

async function main() {
  const projectRoot = process.cwd();
  const outputPath = resolve(projectRoot, ".generated/portfolio-material.json");
  const artifact = await compilePortfolioMaterial(resolve(projectRoot, "portfolio-material"));

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serializePortfolioMaterial(artifact));
  console.log(`Compiled ${artifact.sections.length} portfolio sections (${artifact.hash}).`);
}

void main();
