import { EntranceGate } from "@/components/entrance-gate";
import { Hero } from "@/components/hero";
import { SectionDrawers } from "@/components/section-drawers";
import { assistantIsEnabled } from "@/lib/assistant-runtime/server";

export default async function Home() {
  const assistantEnabled = assistantIsEnabled();
  const Assistant = assistantEnabled
    ? (await import("@/components/portfolio-assistant")).PortfolioAssistant
    : null;

  return (
    <EntranceGate>
      <Hero />
      <SectionDrawers />
      {Assistant ? <Assistant /> : null}
    </EntranceGate>
  );
}
