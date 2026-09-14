"use client";

import NextImage from "next/image";
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

// The loading segment is ~540ms; five passes keeps the entrance from overstaying.
const loadingLoopDuration = 540;
const loadingLoopCount = 5;
const cycleDuration = loadingLoopDuration * loadingLoopCount;
const minimumLoadingDuration = cycleDuration;
const completionFlourishDuration = 1_500;
const markFadeDuration = 300;
const markFadeDelay = completionFlourishDuration;
const fieldTransitionDuration = 700;
const fieldTransitionDelay = markFadeDelay + markFadeDuration;
const paperFadeDuration = 650;
const paperFadeDelay = fieldTransitionDelay + fieldTransitionDuration;
const exitDuration = paperFadeDelay + paperFadeDuration;
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
    "--entrance-field-duration": `${fieldTransitionDuration}ms`,
    "--entrance-field-delay": `${fieldTransitionDelay}ms`,
    "--entrance-mark-fade-duration": `${markFadeDuration}ms`,
    "--entrance-mark-fade-delay": `${markFadeDelay}ms`,
    "--entrance-paper-fade-duration": `${paperFadeDuration}ms`,
    "--entrance-paper-fade-delay": `${paperFadeDelay}ms`,
    "--entrance-exit-duration": `${exitDuration}ms`,
  } as CSSProperties;

  return (
    <EntrancePhaseContext.Provider value={phase}>
      <main
        aria-hidden={isCovered || undefined}
        inert={isCovered || undefined}
        style={entranceTiming}
      >
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
            <NextImage
              alt=""
              className="entrance-gate__mark-motion"
              data-loader-motion=""
              height={512}
              loading="eager"
              src="/assets/entrance-mark.gif"
              unoptimized
              width={512}
            />
            <NextImage
              alt=""
              className="entrance-gate__mark-exit"
              data-loader-exit=""
              height={512}
              src="/assets/entrance-mark-exit.gif"
              unoptimized
              width={512}
            />
            <NextImage
              alt=""
              className="entrance-gate__mark-static"
              data-loader-static=""
              height={512}
              src="/assets/entrance-mark-static.png"
              width={512}
            />
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
