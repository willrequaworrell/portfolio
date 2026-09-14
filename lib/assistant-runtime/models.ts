import { gateway, simulateReadableStream, type LanguageModel } from "ai";
import type { LanguageModelV4 } from "@ai-sdk/provider";

export const deterministicModelId = "fake/portfolio-assistant";

function deterministicAnswer(prompt: unknown) {
  const lastMessage = Array.isArray(prompt) ? prompt.at(-1) : prompt;
  const serialized = JSON.stringify(lastMessage).toLowerCase();
  if (serialized.includes("unsafe formatting")) {
    return "A *grounded* answer.\n\n- One fact\n\n[unsafe link](https://example.com) ![unsafe image](https://example.com/image.png) <script>alert('no')</script>";
  }
  if (serialized.includes("finderly")) {
    return "Will is a part-time founding engineer at FinderlyFix, where he owns major parts of its multimodal AI conversation and project-memory experience.";
  }
  return "Will is a product-minded software engineer who builds thoughtful, reliable products.";
}

export function createDeterministicAssistantModel(): LanguageModel {
  const model: LanguageModelV4 = {
    specificationVersion: "v4",
    provider: "portfolio-test",
    modelId: deterministicModelId,
    supportedUrls: Promise.resolve({}),
    doGenerate: async () => {
      throw new Error("The deterministic assistant model supports streaming only.");
    },
    doStream: async ({ prompt }) => {
      const text = deterministicAnswer(prompt);
      return {
        stream: simulateReadableStream({
          chunkDelayInMs: 300,
          chunks: [
            { type: "text-start" as const, id: "answer" },
            { type: "text-delta" as const, id: "answer", delta: text.slice(0, 45) },
            { type: "text-delta" as const, id: "answer", delta: text.slice(45) },
            { type: "text-end" as const, id: "answer" },
            {
              type: "finish" as const,
              finishReason: { unified: "stop" as const, raw: "stop" },
              usage: {
                inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
                outputTokens: { total: 1, text: 1, reasoning: 0 },
              },
            },
          ],
        }),
      };
    },
  };
  return model;
}

export function assistantModel(modelId: string): LanguageModel {
  return modelId === deterministicModelId
    ? createDeterministicAssistantModel()
    : gateway(modelId);
}
