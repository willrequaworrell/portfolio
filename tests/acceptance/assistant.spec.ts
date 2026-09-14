import { expect, test } from "@playwright/test";

test.skip(process.env.ASSISTANT_EXPECT_ENABLED !== "true", "requires the enabled fake-model build");

async function openAssistant(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByTestId("entrance")).toHaveAttribute("data-phase", "revealed", {
    timeout: 9_000,
  });
  await page.getByRole("button", { name: "Ask the AI guide" }).click();
  return page.getByRole("dialog", { name: "AI portfolio guide" });
}

async function sendQuestion(
  assistant: import("@playwright/test").Locator,
  question: string,
) {
  await assistant.getByLabel("Question").fill(question);
  await assistant.getByRole("button", { name: "Send" }).click();
  await expect(assistant.getByRole("button", { name: "Stop" })).toBeVisible();
  await expect(assistant.getByRole("button", { name: "Stop" })).toHaveCount(0, {
    timeout: 10_000,
  });
}

test("streams a grounded answer through the real route and keeps the disclosure visible", async ({ page }) => {
  const assistant = await openAssistant(page);
  await expect(assistant.getByText("Questions are processed by an AI provider", { exact: false })).toBeVisible();

  await assistant.getByRole("button", { name: "Tell me about Will’s work on FinderlyFix." }).click();

  await expect(assistant.getByText("Will is a part-time founding engineer at FinderlyFix", { exact: false })).toBeVisible();
  await expect(assistant.getByRole("button", { name: "What kind of products does Will build?" })).toHaveCount(0);
  await expect(assistant.getByRole("button", { name: "New conversation" })).toBeVisible();
});

test("restores only the current tab conversation and clears it explicitly", async ({ page, context }) => {
  let assistant = await openAssistant(page);
  await assistant.getByLabel("Question").fill("What does Will build?");
  await assistant.getByRole("button", { name: "Send" }).click();
  await expect(assistant.getByText("Will is a product-minded software engineer", { exact: false })).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("entrance")).toHaveAttribute("data-phase", "revealed", { timeout: 9_000 });
  await page.getByRole("button", { name: "Ask the AI guide" }).click();
  assistant = page.getByRole("dialog", { name: "AI portfolio guide" });
  await expect(assistant.getByText("What does Will build?")).toBeVisible();

  const otherTab = await context.newPage();
  const freshAssistant = await openAssistant(otherTab);
  await expect(freshAssistant.getByText("What does Will build?")).toHaveCount(0);

  await assistant.getByRole("button", { name: "New conversation" }).click();
  await expect(assistant.getByText("What does Will build?")).toHaveCount(0);
  await expect(assistant.getByRole("button", { name: "What kind of products does Will build?" })).toBeVisible();
});

test("renders only the reviewed Markdown allowlist", async ({ page }) => {
  const assistant = await openAssistant(page);
  await assistant.getByLabel("Question").fill("Show unsafe formatting");
  await assistant.getByRole("button", { name: "Send" }).click();

  await expect(assistant.locator("em")).toHaveText("grounded");
  await expect(assistant.locator("li")).toHaveText("One fact");
  await expect(assistant.locator("a, img, script")).toHaveCount(0);
});

test("closing during generation aborts and preserves the partial answer", async ({ page }) => {
  let assistant = await openAssistant(page);
  await assistant.getByLabel("Question").fill("What does Will build?");
  await assistant.getByRole("button", { name: "Send" }).click();
  await expect(assistant.getByText("Will is a product-minded", { exact: false })).toBeVisible();

  await assistant.getByRole("button", { name: "Close AI guide" }).click();
  await page.getByRole("button", { name: "Ask the AI guide" }).click();
  assistant = page.getByRole("dialog", { name: "AI portfolio guide" });

  await expect(assistant.getByText("Answer interrupted")).toBeVisible();
  await expect(assistant.getByRole("button", { name: "Retry" })).toBeVisible();
});

test("submits with Enter while Shift+Enter keeps multiline input", async ({ page }) => {
  const assistant = await openAssistant(page);
  const question = assistant.getByLabel("Question");

  await question.fill("First line");
  await question.press("Shift+Enter");
  await question.type("Second line");
  await expect(question).toHaveValue("First line\nSecond line");

  await question.fill("What does Will build?");
  await question.press("Enter");

  await expect(question).toHaveValue("");
  await expect(assistant.getByText("What does Will build?", { exact: true })).toBeVisible();
  await expect(
    assistant.getByText("Will is a product-minded software engineer", { exact: false }),
  ).toBeVisible();
});

test("shows a visible thinking state before the first streamed token", async ({ page }) => {
  await page.route("**/api/assistant", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 750));
    await route.continue();
  });
  const assistant = await openAssistant(page);

  await assistant.getByLabel("Question").fill("What does Will build?");
  await assistant.getByRole("button", { name: "Send" }).click();

  await expect(assistant.locator(".assistant-thinking")).toBeVisible({ timeout: 500 });
  await expect(assistant.locator(".assistant-thinking")).toHaveAccessibleName("AI guide is thinking");
  await expect(assistant.locator(".assistant-thinking")).toHaveCount(0, { timeout: 10_000 });
});

test("keeps long conversations inside a scrollable transcript", async ({ page }) => {
  await page.setViewportSize({ width: 1_280, height: 700 });
  const assistant = await openAssistant(page);

  for (let index = 0; index < 6; index += 1) {
    await sendQuestion(assistant, `What does Will build? ${index}`);
  }

  const transcript = assistant.locator(".assistant-transcript");
  const dimensions = await transcript.evaluate((element) => {
    const transcriptBounds = element.getBoundingClientRect();
    const dialogBounds = element.closest(".assistant-window")!.getBoundingClientRect();
    element.scrollTop = element.scrollHeight;
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
      transcriptTop: transcriptBounds.top,
      transcriptBottom: transcriptBounds.bottom,
      dialogTop: dialogBounds.top,
      dialogBottom: dialogBounds.bottom,
    };
  });

  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);
  expect(dimensions.scrollTop).toBeGreaterThan(0);
  expect(dimensions.transcriptTop).toBeGreaterThanOrEqual(dimensions.dialogTop);
  expect(dimensions.transcriptBottom).toBeLessThanOrEqual(dimensions.dialogBottom);
});

test("does not cover the hero external-profile controls", async ({ page }) => {
  await page.setViewportSize({ width: 1_280, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("entrance")).toHaveAttribute("data-phase", "revealed", {
    timeout: 9_000,
  });

  const launcherBounds = await page.getByRole("button", { name: "Ask the AI guide" }).boundingBox();
  const externalBounds = await page
    .getByRole("navigation", { name: "External profiles" })
    .getByRole("link")
    .evaluateAll((links) =>
      links.map((link) => {
        const bounds = link.getBoundingClientRect();
        return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom };
      }),
    );

  expect(launcherBounds).not.toBeNull();
  for (const bounds of externalBounds) {
    const overlaps =
      launcherBounds!.x < bounds.right &&
      launcherBounds!.x + launcherBounds!.width > bounds.left &&
      launcherBounds!.y < bounds.bottom &&
      launcherBounds!.y + launcherBounds!.height > bounds.top;
    expect(overlaps).toBe(false);
  }
});
