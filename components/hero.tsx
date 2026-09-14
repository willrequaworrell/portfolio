"use client";

import { motion } from "motion/react";
import { useRef, useSyncExternalStore } from "react";
import { useEntrancePhase } from "@/components/entrance-gate";
import { identity, navigation, profileLinks } from "@/content/portfolio";

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  return navigation.map((item) => (
    <a key={item.href} href={item.href} onClick={onNavigate}>
      {item.label}
    </a>
  ));
}

const subscribeToStaticCapability = () => () => undefined;
const getHydratedSnapshot = () => true;
const getServerHydratedSnapshot = () => false;
const getTextClipSnapshot = () =>
  CSS.supports("background-clip", "text") ||
  CSS.supports("-webkit-background-clip", "text");
const getServerTextClipSnapshot = () => false;

export function Hero() {
  const entrancePhase = useEntrancePhase();
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  const hydrated = useSyncExternalStore(
    subscribeToStaticCapability,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );
  const clipSupported = useSyncExternalStore(
    subscribeToStaticCapability,
    getTextClipSnapshot,
    getServerTextClipSnapshot,
  );

  return (
    <section
      className="hero"
      data-entrance-phase={entrancePhase}
      data-ready={hydrated && entrancePhase === "revealed" ? "true" : "false"}
      data-text-clip={clipSupported ? "supported" : "fallback"}
      data-testid="hero"
      aria-labelledby="page-title"
    >
      <div className="hero__ocean" data-ocean-crop="shared" aria-hidden="true" />
      <div className="hero__paper" data-testid="paper-field" aria-hidden="true" />

      <header className="site-header">
        <nav className="site-nav" aria-label="Primary navigation">
          <NavigationLinks />
        </nav>

        <details className="mobile-menu" ref={mobileMenu}>
          <summary>Menu</summary>
          <nav aria-label="Mobile navigation">
            <NavigationLinks
              onNavigate={() => {
                if (mobileMenu.current) {
                  mobileMenu.current.open = false;
                }
              }}
            />
          </nav>
        </details>
      </header>

      <h1 className="hero__name" id="page-title" data-testid="hero-name">
        <span className="hero__name-line hero__name-line--first" data-ocean-crop="shared">
          {identity.firstName}
        </span>{" "}
        <span className="hero__name-line hero__name-line--last" data-ocean-crop="shared">
          {identity.lastName}
        </span>
      </h1>

      <div className="hero__introduction">
        <p className="hero__role">
          <span aria-hidden="true">✱</span>
          {identity.role}
        </p>
        <p className="hero__statement">
          {identity.statement[0]}
          <br />
          {identity.statement[1]}
        </p>
      </div>

      <nav className="profile-links" aria-label="External profiles">
        {profileLinks.map((link) => (
          <motion.a
            key={link.label}
            href={link.href}
            whileHover={{ x: -4 }}
            whileFocus={{ x: -4 }}
            transition={{ duration: 0.16 }}
          >
            {link.label} <Arrow />
          </motion.a>
        ))}
      </nav>
    </section>
  );
}
