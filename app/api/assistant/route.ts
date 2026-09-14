import { productionAssistantRuntime } from "@/lib/assistant-runtime/server";

export const runtime = "nodejs";

const assistant = productionAssistantRuntime();

export async function POST(request: Request) {
  return assistant.handle(request);
}
