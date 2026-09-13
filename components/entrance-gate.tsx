"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type EntrancePhase = "loading" | "exiting" | "revealed";
type ReadinessOutcome = "pending" | "ready" | "failed";

const cycleDuration = 500;
const minimumLoadingDuration = 1_500;
const fieldTransitionDuration = 700;
const fieldTransitionDelay = 150;
const exitDuration = fieldTransitionDuration + fieldTransitionDelay;
const readinessTimeout = 5_000;
const heroImageSource = "/assets/hero-surfers-wide.png";

const EntrancePhaseContext = createContext<EntrancePhase>("loading");

export function useEntrancePhase() {
  return useContext(EntrancePhaseContext);
}

function waitForHeroImage() {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    const decode = () => image.decode().then(() => resolve(), reject);
    image.decoding = "async";
    image.onload = decode;
    image.onerror = () => reject(new Error("The hero image could not be loaded."));
    image.src = heroImageSource;

    if (image.complete) {
      if (image.naturalWidth > 0) void decode();
      else reject(new Error("The hero image could not be loaded."));
    }
  });
}

function waitForInitialHeroLayout() {
  return new Promise<void>((resolve, reject) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const hero = document.querySelector<HTMLElement>("[data-testid='hero']");
        if (hero && hero.getBoundingClientRect().height > 0) resolve();
        else reject(new Error("The initial hero layout could not be measured."));
      });
    });
  });
}

export function EntranceGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<EntrancePhase>("loading");
  const [outcome, setOutcome] = useState<ReadinessOutcome>("pending");
  const phaseRef = useRef<EntrancePhase>("loading");

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const startedAt = performance.now();
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let active = true;
    let hasFailed = false;

    const schedule = (callback: () => void, delay: number) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        callback();
      }, delay);
      timers.add(timer);
    };

    const fail = () => {
      if (!active || hasFailed || phaseRef.current !== "loading") return;
      hasFailed = true;
      setOutcome("failed");
    };

    schedule(fail, readinessTimeout);

    Promise.all([document.fonts.ready, waitForHeroImage(), waitForInitialHeroLayout()])
      .then(() => {
        if (!active || hasFailed || phaseRef.current !== "loading") return;

        setOutcome("ready");
        const elapsed = performance.now() - startedAt;
        const completedCycle = Math.ceil(elapsed / cycleDuration) * cycleDuration;
        const exitAt = Math.max(minimumLoadingDuration, completedCycle);

        schedule(() => {
          if (!active || phaseRef.current !== "loading") return;
          phaseRef.current = "exiting";
          setPhase("exiting");
          schedule(() => {
            if (!active) return;
            phaseRef.current = "revealed";
            setPhase("revealed");
          }, exitDuration);
        }, Math.max(0, exitAt - elapsed));
      })
      .catch(fail);

    return () => {
      active = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  const isCovered = phase !== "revealed";
  const entranceTiming = {
    "--entrance-cycle-duration": `${cycleDuration}ms`,
    "--entrance-field-duration": `${fieldTransitionDuration}ms`,
    "--entrance-field-delay": `${fieldTransitionDelay}ms`,
    "--entrance-exit-duration": `${exitDuration}ms`,
  } as CSSProperties;

  return (
    <EntrancePhaseContext.Provider value={phase}>
      <main aria-hidden={isCovered || undefined} inert={isCovered || undefined}>
        {children}
      </main>

      <div
        aria-hidden={phase === "revealed" || undefined}
        className="entrance-gate"
        data-outcome={outcome}
        data-phase={phase}
        data-testid="entrance"
        style={entranceTiming}
      >
        <div className="entrance-gate__content">
          <div aria-hidden="true" className="entrance-gate__mark">
            {Array.from({ length: 6 }, (_, index) => (
              <span data-loader-disc="" key={index} />
            ))}
          </div>

          {outcome === "failed" ? (
            <div className="entrance-gate__failure" role="alert">
              <p>Having trouble loading this page right now…</p>
              <button onClick={() => window.location.reload()} type="button">
                Try again
              </button>
            </div>
          ) : (
            <p className="entrance-gate__label" role="status">
              Loading…
            </p>
          )}
        </div>
      </div>
    </EntrancePhaseContext.Provider>
  );
}
