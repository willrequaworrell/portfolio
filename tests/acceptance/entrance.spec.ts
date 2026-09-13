import { expect, test, type Page } from "@playwright/test";

async function openEntrance(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  return page.getByTestId("entrance");
}

test("completes a full authored entrance before revealing the composed hero", async ({
  page,
}) => {
  const startedAt = Date.now();
  const entrance = await openEntrance(page);

  await expect(entrance).toHaveAttribute("data-phase", "loading");
  await expect(entrance.getByText("Loading…", { exact: true })).toBeVisible();
  await expect(entrance.locator("[data-loader-disc]")).toHaveCount(6);
  await expect(page.locator("main")).toHaveAttribute("inert", "");

  await expect(entrance).toHaveAttribute("data-phase", "exiting", {
    timeout: 2_000,
  });
  await expect(entrance).toHaveAttribute("data-outcome", "ready");
  await expect(entrance.locator("[data-loader-disc]").first()).toHaveCSS(
    "animation-name",
    "loader-lock",
  );
  await expect(entrance).toHaveAttribute("data-phase", "revealed", {
    timeout: 2_000,
  });

  const elapsed = Date.now() - startedAt;
  expect(elapsed).toBeGreaterThanOrEqual(2_050);
  // Parallel browser workers can delay the assertion itself under load; the
  // implementation's normal path is 2.35s (1.5s gate + 0.85s exit).
  expect(elapsed).toBeLessThan(4_200);
  await expect(page.locator("main")).not.toHaveAttribute("inert", "");
  await expect(page.getByRole("heading", { level: 1, name: "Will Worrell" })).toBeVisible();
  await expect(page.getByTestId("hero")).toHaveAttribute("data-ready", "true");
  await expect(page.locator(".hero__ocean")).toHaveCSS(
    "background-image",
    /hero-surfers-wide\.png/,
  );
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await expect(page.locator(".hero__role")).toContainText("Software Engineer");
  await expect(page.getByRole("navigation", { name: "External profiles" })).toBeVisible();
});

test("immediate readiness still waits for the minimum complete cycles", async ({ page }) => {
  await page.addInitScript(() => {
    class ImmediatelyReadyImage {
      complete = true;
      decoding = "async";
      naturalWidth = 1;
      onerror: ((event: Event) => void) | null = null;
      onload: ((event: Event) => void) | null = null;

      decode() {
        return Promise.resolve();
      }

      set src(_source: string) {}
    }

    Object.defineProperty(window, "Image", { value: ImmediatelyReadyImage });
    Object.defineProperty(document, "fonts", {
      value: { ready: Promise.resolve() },
    });
  });

  const entrance = await openEntrance(page);
  const phaseDurations = await entrance.evaluate(
    (element) =>
      new Promise<{ exiting: number; revealed: number }>((resolve) => {
        const startedAt = performance.now();
        let exiting = 0;
        const observer = new MutationObserver(() => {
          const phase = element.getAttribute("data-phase");
          if (phase === "exiting" && exiting === 0) exiting = performance.now() - startedAt;
          if (phase === "revealed") {
            observer.disconnect();
            resolve({ exiting, revealed: performance.now() - startedAt });
          }
        });
        observer.observe(element, { attributes: true, attributeFilter: ["data-phase"] });
      }),
  );

  expect(phaseDurations.exiting).toBeGreaterThanOrEqual(1_200);
  expect(phaseDurations.revealed).toBeGreaterThanOrEqual(2_050);
});

test("matches the approved half-second six-disc motion treatment", async ({ page }) => {
  const entrance = await openEntrance(page);
  const discs = entrance.locator("[data-loader-disc]");

  const treatment = await discs.evaluateAll((elements) =>
    elements.map((element) => {
      const styles = getComputedStyle(element);
      return {
        animationDuration: styles.animationDuration,
        animationIterationCount: styles.animationIterationCount,
        backgroundColor: styles.backgroundColor,
      };
    }),
  );

  expect(treatment).toHaveLength(6);
  expect(treatment.every(({ animationDuration }) => animationDuration === "0.5s")).toBe(true);
  expect(
    treatment.every(({ animationIterationCount }) => animationIterationCount === "infinite"),
  ).toBe(true);
  expect(treatment.every(({ backgroundColor }) => backgroundColor === "rgb(6, 62, 73)")).toBe(
    true,
  );
  await expect(entrance).toHaveCSS(
    "background-image",
    /cream-risograph-uniform\.png/,
  );
});

test("keeps looping until delayed critical media is ready", async ({ page }) => {
  let releaseHeroImage: () => void = () => {};
  const heldHeroImage = new Promise<void>((resolve) => {
    releaseHeroImage = resolve;
  });
  await page.route("**/assets/hero-surfers-wide.png", async (route) => {
    await heldHeroImage;
    await route.continue();
  });

  const entrance = await openEntrance(page);
  await page.waitForTimeout(1_750);

  await expect(entrance).toHaveAttribute("data-phase", "loading");
  const firstDisc = entrance.locator("[data-loader-disc]").first();
  await expect(firstDisc).toHaveCSS("animation-duration", "0.5s");
  await expect(firstDisc).toHaveCSS("animation-iteration-count", "infinite");

  releaseHeroImage();
  await page.waitForTimeout(100);
  await expect(entrance).toHaveAttribute("data-phase", "loading");
  await expect(entrance).toHaveAttribute("data-phase", "exiting", {
    timeout: 1_000,
  });
  await expect(entrance).toHaveAttribute("data-phase", "revealed", {
    timeout: 2_000,
  });
});

test("input cannot skip the entrance or reach the covered portfolio", async ({ page }) => {
  await page.route("**/assets/hero-surfers-wide.png", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 7_000));
    await route.continue();
  });

  const entrance = await openEntrance(page);
  const aboutButton = page.locator("#about .section-drawer__trigger");
  const coveredProjectLink = page.locator('.site-nav a[href="#projects"]');
  const coveredProjectBounds = await coveredProjectLink.boundingBox();
  expect(coveredProjectBounds).not.toBeNull();

  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await page.mouse.click(
    coveredProjectBounds!.x + coveredProjectBounds!.width / 2,
    coveredProjectBounds!.y + coveredProjectBounds!.height / 2,
  );
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(650);

  await expect(entrance).toHaveAttribute("data-phase", "loading");
  await expect(page).not.toHaveURL(/#projects$/);
  expect(await page.evaluate(() => window.location.hash)).toBe("");
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(aboutButton).not.toBeFocused();
  await expect(page.locator("main")).toHaveAttribute("aria-hidden", "true");
});

test.describe("touch input isolation", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("touch cannot open a covered mobile control", async ({ page }) => {
    await page.route("**/assets/hero-surfers-wide.png", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 7_000));
      await route.continue();
    });

    const entrance = await openEntrance(page);
    const coveredMenu = page.locator(".mobile-menu summary");
    const coveredMenuBounds = await coveredMenu.boundingBox();
    expect(coveredMenuBounds).not.toBeNull();

    await page.touchscreen.tap(
      coveredMenuBounds!.x + coveredMenuBounds!.width / 2,
      coveredMenuBounds!.y + coveredMenuBounds!.height / 2,
    );

    await expect(entrance).toHaveAttribute("data-phase", "loading");
    await expect(page.locator(".mobile-menu")).not.toHaveAttribute("open", "");
    await expect(page.locator("main")).toHaveAttribute("inert", "");
  });
});

test("contains a critical readiness failure and retries with a fresh page load", async ({
  page,
}) => {
  let shouldFail = true;
  await page.route("**/assets/hero-surfers-wide.png", async (route) => {
    if (shouldFail) await route.abort("failed");
    else await route.continue();
  });

  const entrance = await openEntrance(page);
  await expect(entrance).toHaveAttribute("data-outcome", "failed");
  await expect(
    entrance.getByText("Having trouble loading this page right now…", { exact: true }),
  ).toBeVisible();
  await expect(entrance.getByRole("button")).toHaveText("Try again");
  await expect(entrance.getByRole("button")).toHaveCount(1);
  await expect(page.locator("main")).toHaveAttribute("inert", "");

  shouldFail = false;
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    entrance.getByRole("button", { name: "Try again" }).click(),
  ]);

  await expect(page.getByTestId("entrance")).toHaveAttribute("data-phase", "loading");
  await expect(page.getByTestId("entrance")).toHaveAttribute("data-phase", "revealed", {
    timeout: 4_000,
  });
});

test("keeps the failure field after the five-second readiness ceiling", async ({ page }) => {
  await page.route("**/assets/hero-surfers-wide.png", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 7_000));
    await route.continue();
  });

  const entrance = await openEntrance(page);
  await expect(entrance).toHaveAttribute("data-outcome", "failed", {
    timeout: 7_500,
  });
  await page.waitForTimeout(500);

  await expect(entrance).toHaveAttribute("data-phase", "loading");
  await expect(entrance).toHaveAttribute("data-outcome", "failed");
  await expect(page.getByTestId("hero")).toHaveAttribute("data-ready", "false");
});

test("replays the entrance after a hard refresh", async ({ page }) => {
  let entrance = await openEntrance(page);
  await expect(entrance).toHaveAttribute("data-phase", "revealed", { timeout: 4_000 });

  await page.reload({ waitUntil: "domcontentloaded" });
  entrance = page.getByTestId("entrance");
  await expect(entrance).toHaveAttribute("data-phase", "loading");
  await expect(page.locator("main")).toHaveAttribute("inert", "");
  await expect(entrance).toHaveAttribute("data-phase", "revealed", { timeout: 4_000 });
});

test("uses a static mark and restrained crossfade for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const entrance = await openEntrance(page);
  const firstDisc = entrance.locator("[data-loader-disc]").first();

  await expect(firstDisc).toHaveCSS("animation-name", "none");
  await expect(entrance).toHaveAttribute("data-phase", "exiting", { timeout: 2_000 });
  await expect(entrance).toHaveCSS("clip-path", "none");
  await expect(entrance).toHaveCSS("opacity", "0");
  await expect(entrance).toHaveAttribute("data-phase", "revealed", { timeout: 2_000 });
});
