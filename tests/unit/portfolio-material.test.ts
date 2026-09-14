import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { compilePortfolioMaterial } from "../../lib/portfolio-material/compiler";

async function corpus(files: Record<string, string>) {
  const directory = await mkdtemp(join(tmpdir(), "portfolio-corpus-"));
  await Promise.all(
    Object.entries(files).map(async ([name, contents]) => {
      const path = join(directory, name);
      await mkdir(join(path, ".."), { recursive: true });
      await writeFile(path, contents);
    }),
  );
  return directory;
}

describe("compilePortfolioMaterial", () => {
  test("produces the same ordered, hashed artifact independent of source filenames", async () => {
    const first = await corpus({
      "z.md": "---\nid: projects/finderly\ntitle: FinderlyFix\norder: 20\n---\nBuilds a multimodal home-repair assistant.\n",
      "a.md": "---\nid: profile/summary\ntitle: Profile\norder: 10\n---\nWill is a product-minded software engineer.\n",
    });
    const second = await corpus({
      "renamed-profile.md": "---\nid: profile/summary\ntitle: Profile\norder: 10\n---\nWill is a product-minded software engineer.\n",
      "renamed-project.md": "---\nid: projects/finderly\ntitle: FinderlyFix\norder: 20\n---\nBuilds a multimodal home-repair assistant.\n",
    });

    const firstArtifact = await compilePortfolioMaterial(first);
    const secondArtifact = await compilePortfolioMaterial(second);

    expect(firstArtifact).toEqual(secondArtifact);
    expect(firstArtifact.sections.map(({ id }) => id)).toEqual([
      "profile/summary",
      "projects/finderly",
    ]);
    expect(firstArtifact.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  test.each([
    [
      "duplicate IDs",
      {
        "one.md": "---\nid: profile/summary\ntitle: One\norder: 1\n---\nOne\n",
        "two.md": "---\nid: profile/summary\ntitle: Two\norder: 2\n---\nTwo\n",
      },
      "Duplicate portfolio material id \"profile/summary\"",
    ],
    [
      "unsupported source files",
      { "notes.txt": "not markdown" },
      "Unsupported portfolio material file \"notes.txt\"",
    ],
    [
      "invalid frontmatter",
      { "bad.md": "---\nid: NO SPACES ALLOWED\ntitle: Bad\norder: 1\n---\nText\n" },
      "Invalid portfolio material in bad.md",
    ],
    [
      "oversized content",
      {
        "huge.md": `---\nid: profile/huge\ntitle: Huge\norder: 1\n---\n${"x".repeat(301)}\n`,
      },
      "exceeds the 300 character limit",
    ],
  ])("rejects %s with an actionable error", async (_name, files, message) => {
    const directory = await corpus(files);
    await expect(
      compilePortfolioMaterial(directory, { maxSectionCharacters: 300 }),
    ).rejects.toThrow(message);
  });
});
