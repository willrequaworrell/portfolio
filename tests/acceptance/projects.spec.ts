import { expect, test, type Page } from "@playwright/test";

async function openProjects(page: Page, slug?: string) {
  const hash = slug ? `#projects/${slug}` : "#projects";
  await page.goto(`/${hash}`);
  await expect(page.getByTestId("hero")).toHaveAttribute("data-ready", "true");
  await expect(page.getByRole("button", { name: "Projects" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
}

function projectSelector(page: Page) {
  return page.getByRole("tablist", { name: "Select a project" });
}

test("presents FinderlyFix first and updates one selected project in place", async ({
  page,
}) => {
  await openProjects(page);

  const selector = projectSelector(page);
  const tabs = selector.getByRole("tab");
  await expect(tabs).toHaveText(["FinderlyFix", "HaaS", "ER-404"]);
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");

  const presentation = page.getByTestId("selected-project");
  await expect(presentation.getByRole("heading", { name: "FinderlyFix" })).toBeVisible();
  await expect(presentation.getByText("Founding Engineer · Part time")).toBeVisible();
  await expect(presentation.getByText("Active product")).toBeVisible();
  await expect(presentation.getByRole("img")).toHaveAttribute(
    "alt",
    /FinderlyFix product interface/,
  );
  await expect(presentation.getByRole("link", { name: "Visit project" })).toHaveAttribute(
    "href",
    "https://www.finderlyfix.com/",
  );

  await tabs.nth(1).click();
  await expect(page).toHaveURL(/#projects\/haas$/);
  await expect(presentation.getByRole("heading", { name: "HaaS" })).toBeVisible();
  await expect(presentation.getByText("Product Engineer · Solo build")).toBeVisible();
  await expect(presentation.getByRole("img")).toHaveAttribute(
    "alt",
    /HaaS subscription experience/,
  );
  await expect(presentation.getByRole("link", { name: "Visit project" })).toHaveAttribute(
    "href",
    "https://tryhaas.vercel.app",
  );

  await tabs.nth(2).click();
  await expect(page).toHaveURL(/#projects\/er-404$/);
  await expect(presentation.getByRole("heading", { name: "ER-404" })).toBeVisible();
  await expect(presentation.getByText("Creative Developer · Solo build")).toBeVisible();
  await expect(presentation.getByRole("img")).toHaveAttribute(
    "alt",
    /ER-404 drum machine interface/,
  );
  await expect(presentation.getByRole("link", { name: "Visit project" })).toHaveAttribute(
    "href",
    "https://er-404.com",
  );

  await expect(page.getByText(/View case study|More details/i)).toHaveCount(0);
  await expect(page.locator('a[href^="/projects"]')).toHaveCount(0);
});

test("restores nested project hashes and project history", async ({ page }) => {
  await openProjects(page, "er-404");

  const presentation = page.getByTestId("selected-project");
  await expect(presentation.getByRole("heading", { name: "ER-404" })).toBeVisible();

  await projectSelector(page).getByRole("tab", { name: "FinderlyFix" }).click();
  await expect(page).toHaveURL(/#projects\/finderly$/);
  await expect(presentation.getByRole("heading", { name: "FinderlyFix" })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/#projects\/er-404$/);
  await expect(presentation.getByRole("heading", { name: "ER-404" })).toBeVisible();
});

for (const project of [
  { slug: "finderly", name: "FinderlyFix" },
  { slug: "haas", name: "HaaS" },
  { slug: "er-404", name: "ER-404" },
] as const) {
  test(`restores the ${project.name} project hash directly`, async ({ page }) => {
    await openProjects(page, project.slug);
    await expect(
      page.getByTestId("selected-project").getByRole("heading", { name: project.name }),
    ).toBeVisible();
    await expect(
      projectSelector(page).getByRole("tab", { name: project.name }),
    ).toHaveAttribute("aria-selected", "true");
  });
}

test("uses one keyboard-operable vertical selector on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openProjects(page);

  const selector = projectSelector(page);
  await expect(selector).toHaveAttribute("aria-orientation", "vertical");
  await expect(page.getByRole("tablist", { name: "Select a project" })).toHaveCount(1);

  const finderly = selector.getByRole("tab", { name: "FinderlyFix" });
  const haas = selector.getByRole("tab", { name: "HaaS" });
  await finderly.focus();
  await page.keyboard.press("ArrowDown");
  await expect(haas).toBeFocused();
  await expect(haas).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/#projects\/haas$/);

  const positions = await selector.getByRole("tab").evaluateAll((tabs) =>
    tabs.map((tab) => {
      const rect = tab.getBoundingClientRect();
      return { left: rect.left, top: rect.top };
    }),
  );
  expect(new Set(positions.map(({ left }) => Math.round(left))).size).toBe(1);
  expect(new Set(positions.map(({ top }) => Math.round(top))).size).toBe(3);
  const selectorRatio = await selector.evaluate(
    (element) => element.getBoundingClientRect().width / window.innerWidth,
  );
  expect(selectorRatio).toBeGreaterThanOrEqual(0.12);
  expect(selectorRatio).toBeLessThanOrEqual(0.14);
});

test("uses one compact horizontal selector on narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openProjects(page);

  const selector = projectSelector(page);
  await expect(selector).toHaveAttribute("aria-orientation", "horizontal");
  await expect(selector).toHaveCount(1);

  const tabs = selector.getByRole("tab");
  const positions = await tabs.evaluateAll((items) =>
    items.map((item) => {
      const rect = item.getBoundingClientRect();
      return { left: rect.left, top: rect.top };
    }),
  );
  expect(new Set(positions.map(({ left }) => Math.round(left))).size).toBe(3);
  expect(new Set(positions.map(({ top }) => Math.round(top))).size).toBe(1);

  await tabs.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
});

test("uses the compact horizontal selector at tablet width", async ({ page }) => {
  await page.setViewportSize({ width: 834, height: 1112 });
  await openProjects(page);
  await expect(projectSelector(page)).toHaveAttribute("aria-orientation", "horizontal");
});

for (const project of ["finderly", "haas", "er-404"] as const) {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ] as const) {
    test(`keeps ${project} evidence readable over its ${viewport.name} image`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openProjects(page, project);

      const presentation = page.getByTestId("selected-project");
      const overlay = presentation.locator(".project-presentation__overlay");
      const layout = await presentation.evaluate((element) => {
        const image = element.querySelector("img")!.getBoundingClientRect();
        const copy = element
          .querySelector<HTMLElement>(".project-presentation__overlay")!
          .getBoundingClientRect();
        const styles = getComputedStyle(
          element.querySelector<HTMLElement>(".project-presentation__overlay")!,
        );
        return {
          imageArea: image.width * image.height,
          presentationArea: element.clientWidth * element.clientHeight,
          overlayWidth: copy.width,
          overlayHeight: copy.height,
          presentationWidth: element.clientWidth,
          presentationHeight: element.clientHeight,
          backgroundImage: styles.backgroundImage,
        };
      });

      expect(layout.imageArea / layout.presentationArea).toBeGreaterThan(0.9);
      if (viewport.name === "desktop") {
        expect(layout.overlayWidth / layout.presentationWidth).toBeLessThan(0.72);
      } else {
        expect(layout.overlayHeight / layout.presentationHeight).toBeLessThan(0.8);
      }
      expect(layout.backgroundImage).toContain("linear-gradient");
      await expect(overlay).toHaveCSS("color", "rgb(255, 250, 240)");
    });
  }
}

for (const project of ["finderly", "haas", "er-404"] as const) {
  test(`matches the ${project} desktop project composition`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openProjects(page, project);
    await expect(page.locator("#projects")).toHaveScreenshot(`projects-${project}-desktop.png`, {
      animations: "disabled",
    });
  });
}

for (const project of ["finderly", "haas", "er-404"] as const) {
  test(`matches the ${project} narrow project composition`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openProjects(page, project);
    await expect(page.locator("#projects")).toHaveScreenshot(`projects-${project}-mobile.png`, {
      animations: "disabled",
    });
  });
}

for (const viewport of [
  { name: "short-laptop", width: 1366, height: 600 },
  { name: "tablet", width: 834, height: 1112 },
] as const) {
  test(`matches the FinderlyFix ${viewport.name} composition`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openProjects(page, "finderly");
    await expect(page.locator("#projects")).toHaveScreenshot(
      `projects-finderly-${viewport.name}.png`,
      { animations: "disabled" },
    );
  });
}
