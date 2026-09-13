import { EntranceGate } from "@/components/entrance-gate";
import { Hero } from "@/components/hero";
import { SectionDrawers } from "@/components/section-drawers";

export default function Home() {
  return (
    <EntranceGate>
      <Hero />
      <SectionDrawers />
    </EntranceGate>
  );
}
