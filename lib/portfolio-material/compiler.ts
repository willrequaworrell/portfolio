import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import matter from "gray-matter";
import { z } from "zod";

const frontmatterSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/),
    title: z.string().trim().min(1).max(100),
    order: z.number().int().nonnegative(),
  })
  .strict();

export type PortfolioMaterialSection = z.infer<typeof frontmatterSchema> & {
  content: string;
};

export type CompiledPortfolioMaterial = {
  version: 1;
  hash: string;
  sections: PortfolioMaterialSection[];
};

type CompilerLimits = {
  maxSectionCharacters?: number;
  maxTotalCharacters?: number;
};

async function listSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? listSourceFiles(path) : [path];
    }),
  );
  return nested.flat().sort();
}

function normalizeContent(content: string) {
  return content.replace(/\r\n?/g, "\n").trim();
}

export async function compilePortfolioMaterial(
  sourceDirectory: string,
  limits: CompilerLimits = {},
): Promise<CompiledPortfolioMaterial> {
  const maxSectionCharacters = limits.maxSectionCharacters ?? 12_000;
  const maxTotalCharacters = limits.maxTotalCharacters ?? 60_000;
  const files = await listSourceFiles(sourceDirectory);
  const unsupported = files.find((file) => !file.endsWith(".md"));
  if (unsupported) {
    throw new Error(
      `Unsupported portfolio material file "${relative(sourceDirectory, unsupported)}"; only Markdown is accepted.`,
    );
  }

  const sections = await Promise.all(
    files.map(async (file) => {
      const sourceName = relative(sourceDirectory, file);
      const parsed = matter(await readFile(file, "utf8"));
      const frontmatter = frontmatterSchema.safeParse(parsed.data);
      const content = normalizeContent(parsed.content);
      if (!frontmatter.success || content.length === 0) {
        const detail = frontmatter.success
          ? "content must not be empty"
          : z.prettifyError(frontmatter.error);
        throw new Error(`Invalid portfolio material in ${sourceName}: ${detail}`);
      }
      if (content.length > maxSectionCharacters) {
        throw new Error(
          `Portfolio material ${sourceName} exceeds the ${maxSectionCharacters} character limit.`,
        );
      }
      return { ...frontmatter.data, content };
    }),
  );

  sections.sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
  const seen = new Set<string>();
  for (const section of sections) {
    if (seen.has(section.id)) {
      throw new Error(`Duplicate portfolio material id "${section.id}".`);
    }
    seen.add(section.id);
  }

  const totalCharacters = sections.reduce((total, section) => total + section.content.length, 0);
  if (totalCharacters > maxTotalCharacters) {
    throw new Error(
      `Compiled portfolio material exceeds the ${maxTotalCharacters} character total limit.`,
    );
  }

  const serialized = JSON.stringify({ version: 1, sections });
  return {
    version: 1,
    hash: createHash("sha256").update(serialized).digest("hex"),
    sections,
  };
}

export function serializePortfolioMaterial(artifact: CompiledPortfolioMaterial) {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}
