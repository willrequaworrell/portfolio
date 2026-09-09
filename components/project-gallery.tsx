import Image from "next/image";
import { useRef, useSyncExternalStore, type KeyboardEvent } from "react";
import {
  defaultProjectSlug,
  projects,
  type ProjectSlug,
} from "@/content/portfolio";

type ProjectGalleryProps = {
  selectedSlug?: ProjectSlug;
  onSelect: (slug: ProjectSlug) => void;
};

const narrowSelectorQuery = "(max-width: 900px)";

function subscribeToNarrowSelector(onStoreChange: () => void) {
  const query = window.matchMedia(narrowSelectorQuery);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

const getNarrowSelectorSnapshot = () => window.matchMedia(narrowSelectorQuery).matches;
const getServerNarrowSelectorSnapshot = () => false;

export function ProjectGallery({ selectedSlug, onSelect }: ProjectGalleryProps) {
  const selectedProject =
    projects.find(({ slug }) => slug === selectedSlug) ?? projects[0];
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const isNarrow = useSyncExternalStore(
    subscribeToNarrowSelector,
    getNarrowSelectorSnapshot,
    getServerNarrowSelectorSnapshot,
  );

  function selectByIndex(index: number) {
    const project = projects[(index + projects.length) % projects.length];
    onSelect(project.slug);
    tabRefs.current[index]?.focus();
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const nextKey = isNarrow ? "ArrowRight" : "ArrowDown";
    const previousKey = isNarrow ? "ArrowLeft" : "ArrowUp";
    let nextIndex: number | undefined;

    if (event.key === nextKey) nextIndex = (index + 1) % projects.length;
    if (event.key === previousKey) nextIndex = (index - 1 + projects.length) % projects.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = projects.length - 1;

    if (nextIndex !== undefined) {
      event.preventDefault();
      selectByIndex(nextIndex);
    }
  }

  return (
    <div className="project-gallery">
      <article
        aria-labelledby={`project-tab-${selectedProject.slug}`}
        className="project-presentation"
        data-project={selectedProject.slug}
        data-testid="selected-project"
        id="selected-project-panel"
        role="tabpanel"
      >
        <Image
          alt={selectedProject.image.alt}
          className="project-presentation__image"
          fill
          preload={selectedProject.slug === defaultProjectSlug}
          sizes="(max-width: 720px) 100vw, 88vw"
          src={selectedProject.image.src}
        />

        <div className="project-presentation__overlay">
          <div className="project-presentation__heading">
            <p>{selectedProject.role}</p>
            <h3 id="projects-title">{selectedProject.name}</h3>
            <span>{selectedProject.status}</span>
          </div>

          <p className="project-presentation__summary">{selectedProject.summary}</p>

          <ul className="project-presentation__contributions" aria-label="Contribution highlights">
            {selectedProject.contributions.map((contribution) => (
              <li key={contribution}>{contribution}</li>
            ))}
          </ul>

          <ul className="project-presentation__technologies" aria-label="Technologies">
            {selectedProject.technologies.map((technology) => (
              <li key={technology}>{technology}</li>
            ))}
          </ul>

          {selectedProject.publicDestination ? (
            <a href={selectedProject.publicDestination.href}>
              {selectedProject.publicDestination.label} <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>
      </article>

      <div
        aria-label="Select a project"
        aria-orientation={isNarrow ? "horizontal" : "vertical"}
        className="project-selector"
        role="tablist"
      >
        {projects.map((project, index) => {
          const isSelected = project.slug === selectedProject.slug;
          return (
            <button
              aria-controls="selected-project-panel"
              aria-selected={isSelected}
              className="project-selector__tab"
              id={`project-tab-${project.slug}`}
              key={project.slug}
              onClick={() => onSelect(project.slug)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              role="tab"
              tabIndex={isSelected ? 0 : -1}
              type="button"
            >
              {project.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
