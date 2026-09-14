import { expect, test } from "@playwright/test";

test.skip(process.env.ASSISTANT_EXPECT_DISABLED !== "true", "requires the disabled build");

test("omits assistant UI and keeps its route unavailable when disabled", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByTestId("portfolio-assistant")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ask the AI guide" })).toHaveCount(0);

  const response = await request.post("/api/assistant", {
    headers: { origin: new URL(page.url()).origin },
    data: {
      version: 1,
      requestId: "request-disabled",
      conversationId: "conversation-disabled",
      visitorMessageCount: 1,
      messages: [
        { id: "message-disabled", role: "user", parts: [{ type: "text", text: "Hello" }] },
      ],
    },
  });

  expect(response.status()).toBe(404);
  expect(await response.json()).toMatchObject({ error: { code: "temporarily_unavailable" } });
});
