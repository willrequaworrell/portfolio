"use client";

import { useEffect, useSyncExternalStore } from "react";
import { AboutProfile } from "@/components/about-profile";
import { ContactPanel } from "@/components/contact-panel";
import { ExperienceTimeline } from "@/components/experience-timeline";
import { ProjectGallery } from "@/components/project-gallery";
import { defaultProjectSlug, projects, type ProjectSlug } from "@/content/portfolio";

type SectionId = "about" | "projects" | "experience" | "contact";

type SectionDrawer = {
  id: SectionId;
  title: string;
};

const sectionDrawers: readonly SectionDrawer[] = [
  {
    id: "about",
    title: "About",
  },
  {
    id: "projects",
    title: "Projects",
  },
  {
    id: "experience",
    title: "Experience",
  },
  {
    id: "contact",
    title: "Contact",
  },
];

const sectionIds = new Set<SectionId>(sectionDrawers.map(({ id }) => id));
const locationChangeEventName = "portfolio:section-change";

function sectionFromHash(hash: string): SectionId | null {
  const [candidate] = hash.slice(1).split("/");
  return sectionIds.has(candidate as SectionId) ? (candidate as SectionId) : null;
}

function projectFromHash(hash: string): ProjectSlug {
  const [section, candidate] = hash.slice(1).split("/");
  if (section !== "projects") return defaultProjectSlug;
  return projects.some(({ slug }) => slug === candidate)
    ? (candidate as ProjectSlug)
    : defaultProjectSlug;
}

function pushHash(hash: string | null) {
  const base = `${window.location.pathname}${window.location.search}`;
  window.history.pushState(null, "", hash ? `${base}#${hash}` : base);
  window.dispatchEvent(new Event(locationChangeEventName));
}

function subscribeToLocation(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener(locationChangeEventName, onStoreChange);

  return () => {
    window.removeEventListener("hashchange", onStoreChange);
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener(locationChangeEventName, onStoreChange);
  };
}

const getLocationHash = () => window.location.hash;
const getServerLocationHash = () => "";

export function SectionDrawers() {
  const hash = useSyncExternalStore(
    subscribeToLocation,
    getLocationHash,
    getServerLocationHash,
  );
  const openSection = sectionFromHash(hash);
  const selectedProject = projectFromHash(hash);

  useEffect(() => {
    if (!openSection) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      document.getElementById(openSection)?.scrollIntoView({ block: "start" });
    });

    return () => cancelAnimationFrame(frame);
  }, [openSection]);

  function toggleSection(section: SectionId) {
    const nextSection = openSection === section ? null : section;
    pushHash(nextSection);
  }

  function selectProject(slug: ProjectSlug) {
    pushHash(`projects/${slug}`);
  }

  return (
    <div className="section-drawers" aria-label="Portfolio sections">
      {sectionDrawers.map((section) => {
        const isOpen = openSection === section.id;
        const panelId = `${section.id}-panel`;

        return (
          <section
            className={`section-drawer section-drawer--${section.id}`}
            data-open={isOpen}
            id={section.id}
            key={section.id}
          >
            <h2 className="section-drawer__heading">
              <button
                aria-controls={panelId}
                aria-expanded={isOpen}
                className="section-drawer__trigger"
                onClick={() => toggleSection(section.id)}
                type="button"
              >
                <span>{section.title}</span>
                <span className="section-drawer__symbol" aria-hidden="true">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
            </h2>
            <div
              aria-labelledby={`${section.id}-title`}
              className="section-drawer__panel"
              hidden={!isOpen}
              id={panelId}
            >
              {section.id === "about" ? (
                <AboutProfile />
              ) : section.id === "projects" ? (
                <ProjectGallery onSelect={selectProject} selectedSlug={selectedProject} />
              ) : section.id === "experience" ? (
                <ExperienceTimeline />
              ) : (
                <ContactPanel />
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
