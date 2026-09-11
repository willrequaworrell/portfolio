import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  defaultExperienceRoleId,
  experienceEmployers,
  type ExperienceEmployer,
  type ExperienceRole,
  type RoleId,
} from "@/content/experience";

function RoleDetail({ employer, role }: { employer: ExperienceEmployer; role: ExperienceRole }) {
  return (
    <article className="experience-detail">
      <p className="experience-detail__eyebrow">Selected role details</p>
      <h3>{employer.company}</h3>
      <p className="experience-detail__role">{role.title}</p>
      <p className="experience-detail__meta">
        {role.dates} <span aria-hidden="true">·</span>{" "}
        <span>{employer.commitment}</span>
      </p>
      <p className="experience-detail__summary">{role.summary}</p>
      <ul aria-label="Contribution highlights" className="experience-detail__contributions">
        {role.contributions.map((contribution) => (
          <li key={contribution}>{contribution}</li>
        ))}
      </ul>
      {role.impacts.length > 0 ? (
        <dl aria-label="Impact indicators" className="experience-detail__impacts">
          {role.impacts.map((impact) => (
            <div key={impact.label}>
              <dt>{impact.label}</dt>
              <dd>{impact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <a className="experience-detail__link" href={role.link.href}>
        {role.link.label} <span aria-hidden="true">↗</span>
      </a>
    </article>
  );
}

export function ExperienceTimeline() {
  const [selectedRoleId, setSelectedRoleId] = useState<RoleId>(defaultExperienceRoleId);
  const [selectionConnectorPath, setSelectionConnectorPath] = useState("");
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const roleButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const orderedRoles: readonly ExperienceRole[] = experienceEmployers.flatMap<ExperienceRole>(
    (employer) => [...(employer as ExperienceEmployer).roles],
  );
  const selectedEmployer = experienceEmployers.find((employer) =>
    employer.roles.some((role) => role.id === selectedRoleId),
  )!;
  const selectedRole = selectedEmployer.roles.find((role) => role.id === selectedRoleId)!;

  useLayoutEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const timelineElement = timeline;

    function updateSelectionConnector() {
      if (window.matchMedia("(max-width: 700px)").matches) {
        setSelectionConnectorPath("");
        return;
      }

      const selectedButton = timelineElement.querySelector<HTMLElement>(
        ".experience-role button[aria-pressed='true']",
      );
      const detail = timelineElement.querySelector<HTMLElement>(".experience-detail--desktop");
      const eyebrow = timelineElement.querySelector<HTMLElement>(
        ".experience-detail--desktop .experience-detail__eyebrow",
      );
      if (!selectedButton || !detail || !eyebrow) return;

      const timelineRect = timelineElement.getBoundingClientRect();
      const buttonRect = selectedButton.getBoundingClientRect();
      const detailRect = detail.getBoundingClientRect();
      const eyebrowRect = eyebrow.getBoundingClientRect();
      const startX = buttonRect.right - timelineRect.left;
      const startY = buttonRect.top + buttonRect.height / 2 - timelineRect.top;
      const turnX = detailRect.left - timelineRect.left + 28;
      const endX = eyebrowRect.left - timelineRect.left - 14;
      const endY = eyebrowRect.top + eyebrowRect.height / 2 - timelineRect.top;
      const direction = endY < startY ? -1 : 1;
      const radius = 12;

      setSelectionConnectorPath(
        `M ${startX} ${startY} H ${turnX - radius} Q ${turnX} ${startY} ${turnX} ${startY + direction * radius} V ${endY - direction * radius} Q ${turnX} ${endY} ${turnX + radius} ${endY} H ${endX}`,
      );
    }

    updateSelectionConnector();
    const observer = new ResizeObserver(updateSelectionConnector);
    observer.observe(timelineElement);
    return () => observer.disconnect();
  }, [selectedRoleId]);

  function handleRoleKeyDown(event: KeyboardEvent<HTMLButtonElement>, roleId: RoleId) {
    const currentIndex = orderedRoles.findIndex((role) => role.id === roleId);
    let nextIndex: number | undefined;

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % orderedRoles.length;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + orderedRoles.length) % orderedRoles.length;
    }
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = orderedRoles.length - 1;

    if (nextIndex !== undefined) {
      event.preventDefault();
      const nextRole = orderedRoles[nextIndex];
      setSelectedRoleId(nextRole.id);
      roleButtonRefs.current[nextIndex]?.focus();
    }
  }

  return (
    <div className="experience-timeline" ref={timelineRef}>
      <svg aria-hidden="true" className="experience-selection-connector">
        <path d={selectionConnectorPath} />
      </svg>
      <ol aria-label="Career chronology" className="experience-chronology">
        <li className="experience-chronology__prompt">
          Select a role to view details <span aria-hidden="true">⟶</span>
        </li>
        {experienceEmployers.map((employer) => (
          <li
            className="experience-employer"
            data-current={employer.current}
            data-employer={employer.id}
            key={employer.id}
          >
            <div className="experience-employer__heading">
              <strong>{employer.company}</strong>
              {employer.current ? <span>Current</span> : null}
            </div>
            <p className="experience-employer__meta">
              <span>{employer.commitment}</span> <span aria-hidden="true">·</span>{" "}
              {employer.dates}
            </p>
            <p className="experience-employer__scope">{employer.scope}</p>
            <div
              data-role-count={employer.roles.length}
              className={
                "experience-progression experience-progression__branch"
              }
            >
              <svg
                aria-hidden="true"
                className="experience-progression__flow"
                preserveAspectRatio="none"
                viewBox="0 0 72 100"
              >
                <path
                  d={
                    employer.roles.length > 1
                      ? "M 0 0 C 0 20 52 16 52 30 L 52 70 C 52 84 0 80 0 100"
                      : "M 0 0 C 0 28 52 22 52 50 C 52 78 0 72 0 100"
                  }
                />
              </svg>
              {employer.roles.map((role) => {
                const isSelected = role.id === selectedRoleId;
                const roleIndex = orderedRoles.findIndex(({ id }) => id === role.id);
                return (
                  <div className="experience-role" key={role.id}>
                    <button
                      aria-label={`${employer.company}, ${role.title}, ${role.dates}`}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedRoleId(role.id)}
                      onKeyDown={(event) => handleRoleKeyDown(event, role.id)}
                      ref={(element) => {
                        roleButtonRefs.current[roleIndex] = element;
                      }}
                      tabIndex={isSelected ? 0 : -1}
                      type="button"
                    >
                      <span className="experience-role__title">
                        <span aria-hidden="true">—</span> {role.title}
                      </span>
                      <small>{role.dates}</small>
                    </button>
                    {selectedEmployer.id === employer.id && isSelected ? (
                      <div className="experience-detail--mobile">
                        <RoleDetail employer={employer} role={selectedRole} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
      <div className="experience-detail--desktop">
        <RoleDetail employer={selectedEmployer} role={selectedRole} />
      </div>
    </div>
  );
}
