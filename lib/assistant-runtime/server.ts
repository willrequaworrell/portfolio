import "server-only";
import artifact from "../../.generated/portfolio-material.json";
import { createAssistantRuntime } from ".";
import { assistantModel } from "./models";
import type { CompiledPortfolioMaterial } from "../portfolio-material/compiler";

const defaultModelId = "openai/gpt-5.6-luna";

export function assistantIsEnabled() {
  const configured = process.env.PORTFOLIO_ASSISTANT_ENABLED;
  if (configured !== undefined) return configured === "true";
  return process.env.VERCEL_ENV === undefined;
}

export function productionAssistantRuntime() {
  const modelId = process.env.PORTFOLIO_ASSISTANT_MODEL_ID ?? defaultModelId;
  return createAssistantRuntime({
    enabled: assistantIsEnabled(),
    model: assistantModel(modelId),
    material: artifact as CompiledPortfolioMaterial,
  });
}
