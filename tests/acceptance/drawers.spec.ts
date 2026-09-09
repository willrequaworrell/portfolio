import { expect, test, type Page } from "@playwright/test";

async function openPrimaryPage(page: Page, path = "/") {
  await page.goto(path);
  await expect(page.getByTestId("hero")).toHaveAttribute("data-ready", "true");
}

test("starts with the ordered section drawer stack collapsed below the hero", async ({
  page,
}) => {
  await openPrimaryPage(page);

  const drawers = page.locator(".section-drawer");
  await expect(drawers).toHaveCount(4);
  await expect(drawers.getByRole("button")).toHaveText([
    "About+",
    "Projects+",
    "Experience+",
    "Contact+",
  ]);
  expect(
    await drawers
      .getByRole("button")
      .evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-expanded"))),
  ).toEqual(["false", "false", "false", "false"]);

  const geometry = await page.evaluate(() => {
    const hero = document.querySelector(".hero")!.getBoundingClientRect();
    const firstDrawer = document
      .querySelector(".section-drawer")!
      .getBoundingClientRect();
    return {
      heroBottom: hero.bottom,
      firstDrawerTop: firstDrawer.top,
      viewportHeight: window.innerHeight,
    };
  });

  expect(geometry.heroBottom).toBeGreaterThanOrEqual(geometry.viewportHeight);
  expect(Math.abs(geometry.firstDrawerTop - geometry.heroBottom)).toBeLessThan(1);
});

test("opens one section drawer at a time and can return to a collapsed stack", async ({
  page,
}) => {
  await openPrimaryPage(page);

  const about = page.getByRole("button", { name: "About" });
  const projects = page.getByRole("button", { name: "Projects" });

  await about.click();
  await expect(about).toHaveAttribute("aria-expanded", "true");
  await expect(about).toContainText("−");
  await expect(page).toHaveURL(/#about$/);

  await projects.click();
  await expect(about).toHaveAttribute("aria-expanded", "false");
  await expect(projects).toHaveAttribute("aria-expanded", "true");
  await expect(page).toHaveURL(/#projects$/);

  await projects.click();
  await expect(projects).toHaveAttribute("aria-expanded", "false");
  await expect(page).not.toHaveURL(/#/);
});

test("supports keyboard disclosure controls with visible focus and state", async ({
  page,
}) => {
  await openPrimaryPage(page);

  const about = page.getByRole("button", { name: "About" });
  await about.focus();
  await expect(about).toBeFocused();
  expect(await about.evaluate((button) => button.matches(":focus-visible"))).toBe(
    true,
  );
  await expect(about).not.toHaveCSS("outline-style", "none");

  await page.keyboard.press("Enter");
  await expect(about).toHaveAttribute("aria-expanded", "true");

  await page.keyboard.press("Space");
  await expect(about).toHaveAttribute("aria-expanded", "false");
});

test("restores direct hashes and drawer state through browser history", async ({
  page,
}) => {
  await openPrimaryPage(page, "/#experience");

  const about = page.getByRole("button", { name: "About" });
  const projects = page.getByRole("button", { name: "Projects" });
  const experience = page.getByRole("button", { name: "Experience" });
  await expect(experience).toHaveAttribute("aria-expanded", "true");

  await about.click();
  await projects.click();
  await page.goBack();
  await expect(about).toHaveAttribute("aria-expanded", "true");
  await expect(projects).toHaveAttribute("aria-expanded", "false");

  await page.goBack();
  await expect(experience).toHaveAttribute("aria-expanded", "true");
  await page.goForward();
  await expect(about).toHaveAttribute("aria-expanded", "true");
});

test("hero navigation opens and scrolls to its requested drawer", async ({ page }) => {
  await openPrimaryPage(page);

  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Projects" })
    .click();

  await expect(page.getByRole("button", { name: "Projects" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(page).toHaveURL(/#projects$/);
  await expect
    .poll(() =>
      page.locator("#projects").evaluate((section) => section.getBoundingClientRect().top),
    )
    .toBeCloseTo(0, 0);
});

test("desktop drawers fill a viewport without clipping on short screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 320 });
  await openPrimaryPage(page, "/#about");

  const layout = await page.locator("#about").evaluate((drawer) => {
    const panel = drawer.querySelector<HTMLElement>(".section-drawer__panel")!;
    const drawerStyles = getComputedStyle(drawer);
    const panelStyles = getComputedStyle(panel);
    return {
      drawerHeight: drawer.getBoundingClientRect().height,
      drawerMinHeight: drawerStyles.minHeight,
      panelOverflow: panelStyles.overflowY,
    };
  });

  expect(layout.drawerHeight).toBeGreaterThan(320);
  expect(layout.drawerMinHeight).toBe("320px");
  expect(layout.panelOverflow).toBe("visible");
});

test("mobile menu reaches the same drawers in natural page flow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPrimaryPage(page);

  const menu = page.locator(".mobile-menu");
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeHidden();
  await expect(page.getByText("Menu", { exact: true })).toBeVisible();
  await page.getByText("Menu", { exact: true }).click();
  await expect(menu).toHaveAttribute("open", "");

  const mobileNav = page.getByRole("navigation", { name: "Mobile navigation" });
  const widths = await Promise.all([
    menu.evaluate((element) => element.getBoundingClientRect().width),
    mobileNav.evaluate((element) => element.getBoundingClientRect().width),
  ]);
  expect(Math.abs(widths[0] - widths[1])).toBeLessThan(1);

  await mobileNav.getByRole("link", { name: "Contact" }).click();
  await expect(menu).not.toHaveAttribute("open", "");
  await expect(page.getByRole("button", { name: "Contact" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(page.locator("#contact")).toHaveCSS("min-height", "0px");
  await expect(page).toHaveURL(/#contact$/);
});
