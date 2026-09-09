import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "short-laptop", width: 1366, height: 700 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "mobile", width: 390, height: 844 },
] as const;

async function revealHero(page: Page) {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId("hero")).toHaveAttribute("data-ready", "true");
}

test("serves essential identity and profile links in the initial HTML", async ({
  request,
}) => {
  const response = await request.get("/");
  const html = await response.text();

  expect(response.ok()).toBe(true);
  expect(html).toContain("<h1");
  expect(html).toContain("Will");
  expect(html).toContain("Worrell");
  expect(html).toContain("Résumé");
  expect(html).toContain("GitHub");
  expect(html).toContain("LinkedIn");
  expect(html).toContain('href="/resume.pdf"');
  expect(html).toContain('href="https://github.com/willrequaworrell"');
  expect(html).toContain('href="https://linkedin.com/in/wrw"');

  const resume = await request.get("/resume.pdf");
  expect(resume.ok()).toBe(true);
  expect(resume.headers()["content-type"]).toContain("application/pdf");
});

for (const viewport of viewports) {
  test(`keeps the locked ocean composition aligned at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await revealHero(page);

    const heading = page.getByRole("heading", {
      level: 1,
      name: "Will Worrell",
    });
    await expect(heading).toBeVisible();

    const geometry = await page
      .locator('[data-ocean-crop="shared"]')
      .evaluateAll((elements) =>
        elements.map((element) => {
          const styles = getComputedStyle(element);
          return {
            attachment: styles.backgroundAttachment,
            image: styles.backgroundImage,
            position: styles.backgroundPosition,
            size: styles.backgroundSize,
          };
        }),
      );

    expect(geometry).toHaveLength(3);
    expect(
      geometry.every(({ attachment }) =>
        attachment.split(",").every((value) => value.trim() === "fixed"),
      ),
    ).toBe(true);
    expect(new Set(geometry.map(({ image }) => image)).size).toBe(1);
    expect(new Set(geometry.map(({ position }) => position)).size).toBe(1);
    expect(new Set(geometry.map(({ size }) => size)).size).toBe(1);

    await expect(page.getByTestId("hero")).toHaveScreenshot(
      `hero-${viewport.name}.png`,
      {
        animations: "disabled",
        maxDiffPixelRatio: 0.015,
      },
    );
  });
}

test("loads the self-hosted display and interface typefaces", async ({ page }) => {
  await revealHero(page);

  await expect
    .poll(() =>
      page.evaluate(() => ({
        display: document.fonts.check('48px "League Gothic"'),
        interface: document.fonts.check('16px "Instrument Sans"'),
      })),
    )
    .toEqual({ display: true, interface: true });

  await expect(page.getByTestId("hero-name")).toHaveCSS(
    "font-family",
    /League Gothic/,
  );
  await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCSS(
    "font-family",
    /Instrument Sans/,
  );
});

test("keeps the cream field opaque", async ({ page }) => {
  await revealHero(page);

  await expect(page.getByTestId("paper-field")).toHaveCSS("opacity", "1");
});

test("renders a solid deep-ocean heading when text clipping is unsupported", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(CSS, "supports", { value: () => false });
  });
  await revealHero(page);

  await expect(page.getByTestId("hero")).toHaveAttribute(
    "data-text-clip",
    "fallback",
  );
  const lines = page.locator(".hero__name-line");
  await expect(lines.first()).toHaveCSS("color", "rgb(6, 62, 73)");
  await expect(lines.first()).toHaveCSS("background-image", "none");
});
