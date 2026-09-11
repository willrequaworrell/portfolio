import { expect, test, type Page } from "@playwright/test";

async function openSection(page: Page, section: "about" | "contact") {
  await page.goto(`/#${section}`);
  await expect(page.getByRole("button", { name: section === "about" ? "About" : "Contact" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );

  if (section === "about") {
    await expect
      .poll(() =>
        page
          .getByRole("img", { name: "Illustrated portrait of Will Worrell" })
          .evaluate((image: HTMLImageElement) => image.naturalWidth),
      )
      .toBeGreaterThan(0);
  }
}

const viewports = [
  { height: 900, name: "desktop", width: 1440 },
  { height: 844, name: "mobile", width: 390 },
] as const;

for (const viewport of viewports) {
  test(`About presents Will's product-engineering profile and portrait at ${viewport.name} size`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openSection(page, "about");

    const about = page.locator("#about-panel");
    await expect(about.getByRole("heading", { name: "Software engineer with product sense." })).toBeVisible();
    await expect(about.getByText(/empathy for the people using what I build/i)).toBeVisible();
    await expect(about.getByRole("img", { name: "Illustrated portrait of Will Worrell" })).toBeVisible();
    await expect(about.getByRole("list", { name: "What I bring" }).getByRole("listitem")).toHaveCount(3);
  });

  test(`Contact offers equal, accessible external actions at ${viewport.name} size`, async ({
    browserName,
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openSection(page, "contact");

    const contact = page.locator("#contact-panel");
    await expect(contact.getByRole("heading", { name: "Get in touch." })).toBeVisible();
    await expect(contact.getByText(/Always open to interesting work/i)).toBeVisible();

    const email = contact.getByRole("link", { name: /Email/i });
    const linkedIn = contact.getByRole("link", { name: /LinkedIn/i });
    await expect(email).toHaveAttribute("href", /^mailto:.+@.+$/);
    await expect(linkedIn).toHaveAttribute("href", /^https:\/\/linkedin\.com\//);

    const actionGeometry = await Promise.all([
      email.evaluate((link) => ({
        height: link.getBoundingClientRect().height,
        width: link.getBoundingClientRect().width,
      })),
      linkedIn.evaluate((link) => ({
        height: link.getBoundingClientRect().height,
        width: link.getBoundingClientRect().width,
      })),
    ]);
    expect(Math.abs(actionGeometry[0].height - actionGeometry[1].height)).toBeLessThan(1);
    expect(Math.abs(actionGeometry[0].width - actionGeometry[1].width)).toBeLessThan(1);

    if (browserName === "chromium") {
      await page.getByRole("button", { name: "Contact" }).focus();
      await page.keyboard.press("Tab");
      await expect(email).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(linkedIn).toBeFocused();
    }

    await expect(contact.locator("form")).toHaveCount(0);
    await expect(contact.getByRole("link", { name: /GitHub/i })).toHaveCount(0);
    await expect(contact.getByText(/Boston|location|actively looking/i)).toHaveCount(0);
  });
}

for (const viewport of viewports) {
  test(`About and Contact preserve their ${viewport.name} compositions`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    await openSection(page, "about");
    await expect(page.locator("#about")).toHaveScreenshot(`about-${viewport.name}.png`, {
      animations: "disabled",
    });

    await page.getByRole("button", { name: "Contact" }).click();
    await expect(page.locator("#contact")).toHaveScreenshot(`contact-${viewport.name}.png`, {
      animations: "disabled",
    });
  });
}
