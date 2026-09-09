import { expect, test, type Page } from "@playwright/test";

async function openExperience(page: Page) {
  await page.goto("/#experience");
  await expect(page.getByRole("button", { name: "Experience" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
}

test("starts with FinderlyFix selected in one connected career chronology", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openExperience(page);

  const chronology = page.getByRole("list", { name: "Career chronology" });
  await expect(chronology).toBeVisible();
  await expect(chronology.locator(".experience-employer")).toHaveCount(4);
  await expect(chronology.locator(".experience-employer[data-current='true']")).toHaveCount(
    2,
  );

  const finderlyEmployer = chronology.locator("[data-employer='finderlyfix']");
  const finderly = finderlyEmployer.getByRole("button", {
    name: /Founding Engineer.*Sep 2025.*Present/i,
  });
  await expect(finderly).toHaveAttribute("aria-pressed", "true");
  await expect(finderlyEmployer.getByText("Current", { exact: true })).toBeVisible();

  const l3harris = chronology.locator("[data-employer='l3harris']");
  await expect(l3harris.getByText("Current", { exact: true })).toBeVisible();
  await expect(l3harris.getByText("Full time", { exact: true })).toBeVisible();
  await expect(l3harris.locator(".experience-progression__branch")).toBeVisible();
  await expect(l3harris.getByText("Business Analyst", { exact: true })).toBeVisible();
  await expect(
    l3harris.getByText("Technical Project Manager, RPA", { exact: true }),
  ).toBeVisible();

  const progressionPath = await chronology.evaluate((element) => {
    const branch = element.querySelector<HTMLElement>(".experience-progression__branch")!;
    const chronologyPath = getComputedStyle(element, "::before");
    const branchPath = getComputedStyle(branch, "::before");
    return {
      branchPathX:
        branch.getBoundingClientRect().left + Number.parseFloat(branchPath.left),
      chronologyPathX:
        element.getBoundingClientRect().left + Number.parseFloat(chronologyPath.left),
      rejoinsAtBottom: branchPath.borderBottomStyle === "solid",
      splitsAtTop: branchPath.borderTopStyle === "solid",
    };
  });
  expect(Math.abs(progressionPath.branchPathX - progressionPath.chronologyPathX)).toBeLessThan(
    1,
  );
  expect(progressionPath.splitsAtTop).toBe(true);
  expect(progressionPath.rejoinsAtBottom).toBe(true);

  const detail = page.getByRole("article");
  await expect(detail.getByRole("heading", { name: "FinderlyFix" })).toBeVisible();
  await expect(detail.getByText("Founding Engineer", { exact: true })).toBeVisible();
  await expect(detail.getByText("Part time", { exact: true })).toBeVisible();
  await expect(detail.getByRole("list", { name: "Contribution highlights" }).getByRole("listitem"))
    .toHaveCount(3);
});

test("selects roles from the chronology with ordered keyboard controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openExperience(page);

  const roleButtons = page.locator(".experience-role > button");
  await roleButtons.first().focus();
  await page.keyboard.press("ArrowDown");
  await expect(roleButtons.nth(1)).toBeFocused();
  await expect(roleButtons.nth(1)).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("ArrowDown");
  await expect(roleButtons.nth(2)).toBeFocused();
  await expect(roleButtons.nth(2)).toHaveAttribute("aria-pressed", "true");

  const detail = page.getByRole("article");
  await expect(detail.getByRole("heading", { name: "L3Harris" })).toBeVisible();
  await expect(
    detail.getByText("Technical Project Manager, RPA", { exact: true }),
  ).toBeVisible();
  await expect(detail.getByText("Full time", { exact: true })).toBeVisible();
  await expect(
    detail.getByRole("list", { name: "Contribution highlights" }).getByRole("listitem"),
  ).toHaveCount(3);
  await expect(detail.getByRole("definition")).toHaveCount(3);
  await expect(detail.getByRole("link", { name: "View résumé" })).toHaveAttribute(
    "href",
    "/resume.pdf",
  );
});

test("expands one role inline in the connected mobile chronology", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openExperience(page);

  const chronology = page.getByRole("list", { name: "Career chronology" });
  const finderly = chronology.locator("[data-employer='finderlyfix']");
  await expect(finderly.getByRole("article")).toBeVisible();
  await expect(page.locator(".experience-detail--desktop")).toBeHidden();

  const line = await chronology.evaluate((element) => {
    const styles = getComputedStyle(element, "::before");
    return { background: styles.backgroundColor, height: Number.parseFloat(styles.height) };
  });
  expect(line.background).toBe("rgb(245, 211, 79)");
  expect(line.height).toBeGreaterThan(300);

  const l3harris = chronology.locator("[data-employer='l3harris']");
  await l3harris
    .getByRole("button", { name: /Technical Project Manager, RPA/i })
    .click();
  await expect(finderly.getByRole("article")).toHaveCount(0);
  await expect(l3harris.getByRole("article")).toBeVisible();

  const flow = await page.locator("#experience").evaluate((drawer) => {
    const panel = drawer.querySelector<HTMLElement>(".section-drawer__panel")!;
    const selectedButton = drawer.querySelector<HTMLElement>(
      "[data-employer='l3harris'] button[aria-pressed='true']",
    )!;
    const inlineDetail = drawer.querySelector<HTMLElement>(
      "[data-employer='l3harris'] .experience-detail--mobile",
    )!;
    const nextEmployer = drawer.querySelector<HTMLElement>(
      "[data-employer='strategic-retirement-partners']",
    )!;
    return {
      detailFollowsSelectedRole: Boolean(
        selectedButton.compareDocumentPosition(inlineDetail) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
      nextEmployerFollowsDetail: Boolean(
        inlineDetail.compareDocumentPosition(nextEmployer) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
      detailTop: inlineDetail.getBoundingClientRect().top,
      nextEmployerTop: nextEmployer.getBoundingClientRect().top,
      overflow: getComputedStyle(panel).overflowY,
      selectedButtonBottom: selectedButton.getBoundingClientRect().bottom,
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(flow.detailFollowsSelectedRole).toBe(true);
  expect(flow.nextEmployerFollowsDetail).toBe(true);
  expect(flow.detailTop).toBeGreaterThanOrEqual(flow.selectedButtonBottom);
  expect(flow.nextEmployerTop).toBeGreaterThan(flow.detailTop);
  expect(flow.overflow).toBe("visible");
  expect(flow.pageWidth).toBe(flow.viewportWidth);
});

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  test(`matches the default ${viewport.name} Experience composition`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openExperience(page);
    await expect(page.locator("#experience")).toHaveScreenshot(
      `experience-default-${viewport.name}.png`,
      { animations: "disabled" },
    );
  });
}
