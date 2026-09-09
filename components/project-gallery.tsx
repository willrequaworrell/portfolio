import Image from "next/image";
import {
  useRef,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
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
const swipeThreshold = 48;

export function ProjectGallery({ selectedSlug, onSelect }: ProjectGalleryProps) {
  const selectedProject =
    projects.find(({ slug }) => slug === selectedSlug) ?? projects[0];
  const selectedIndex = projects.findIndex(({ slug }) => slug === selectedProject.slug);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const swipeStart = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const isNarrow = useSyncExternalStore(
    subscribeToNarrowSelector,
    getNarrowSelectorSnapshot,
    getServerNarrowSelectorSnapshot,
  );

  function selectByIndex(index: number, focusIndicator = false) {
    const project = projects[(index + projects.length) % projects.length];
    onSelect(project.slug);
    if (focusIndicator) tabRefs.current[index]?.focus();
  }

  function selectByOffset(offset: number) {
    selectByIndex((selectedIndex + offset + projects.length) % projects.length);
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | undefined;

    if (event.key === "ArrowRight") nextIndex = (index + 1) % projects.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + projects.length) % projects.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = projects.length - 1;

    if (nextIndex !== undefined) {
      event.preventDefault();
      selectByIndex(nextIndex, true);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    if (!isNarrow || event.pointerType !== "touch") return;
    swipeStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointer events may not register an active pointer to capture.
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || start.pointerId !== event.pointerId) return;

    const horizontalDistance = event.clientX - start.x;
    const verticalDistance = event.clientY - start.y;
    if (
      Math.abs(horizontalDistance) < swipeThreshold ||
      Math.abs(horizontalDistance) <= Math.abs(verticalDistance)
    ) {
      return;
    }

    selectByOffset(horizontalDistance < 0 ? 1 : -1);
  }

  return (
    <div className="project-gallery">
      <article
        aria-labelledby="projects-title"
        className="project-presentation"
        data-project={selectedProject.slug}
        data-testid="selected-project"
        id="selected-project-panel"
        onPointerCancel={() => {
          swipeStart.current = null;
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
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
        aria-orientation="horizontal"
        className="project-pagination"
        role="tablist"
      >
        {projects.map((project, index) => {
          const isSelected = project.slug === selectedProject.slug;
          return (
            <button
              aria-controls="selected-project-panel"
              aria-label={`Show project: ${project.name}`}
              aria-selected={isSelected}
              className="project-pagination__dot"
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
            />
          );
        })}
      </div>

      {!isNarrow ? (
        <nav aria-label="Browse projects" className="project-arrows">
          <button
            aria-label={`Previous project: ${projects[(selectedIndex - 1 + projects.length) % projects.length].name}`}
            className="project-arrow project-arrow--previous"
            onClick={() => selectByOffset(-1)}
            type="button"
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            aria-label={`Next project: ${projects[(selectedIndex + 1) % projects.length].name}`}
            className="project-arrow project-arrow--next"
            onClick={() => selectByOffset(1)}
            type="button"
          >
            <span aria-hidden="true">→</span>
          </button>
        </nav>
      ) : null}
    </div>
  );
}
