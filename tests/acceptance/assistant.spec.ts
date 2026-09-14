import { expect, test } from "@playwright/test";

test.skip(process.env.ASSISTANT_EXPECT_ENABLED !== "true", "requires the enabled fake-model build");

async function openAssistant(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    class ImmediatelyReadyImage {
      complete = true;
      naturalWidth = 1;
      decoding = "async";
      decode() { return Promise.resolve(); }
      set src(_source: string) {}
    }
    Object.defineProperty(window, "Image", { value: ImmediatelyReadyImage });
    Object.defineProperty(document, "fonts", { value: { ready: Promise.resolve() } });
  });
  await page.goto("/");
  await expect(page.getByTestId("entrance")).toHaveAttribute("data-phase", "revealed", {
    timeout: 4_000,
  });
  await page.getByRole("button", { name: "Ask the AI guide" }).click();
  return page.getByRole("dialog", { name: "AI portfolio guide" });
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
  await expect(page.getByTestId("entrance")).toHaveAttribute("data-phase", "revealed", { timeout: 4_000 });
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
