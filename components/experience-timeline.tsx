import { useRef, useState, type KeyboardEvent } from "react";
import {
  defaultExperienceRoleId,
  experienceEmployers,
  type ExperienceEmployer,
  type ExperienceRole,
  type RoleId,
} from "@/content/experience";

function RoleDetail({ employer, role }: { employer: ExperienceEmployer; role: ExperienceRole }) {
  return (
    <article className="experience-detail" data-testid="selected-experience">
      <p className="experience-detail__eyebrow">Selected role</p>
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
  const roleButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const orderedRoles: readonly ExperienceRole[] = experienceEmployers.flatMap<ExperienceRole>(
    (employer) => [...(employer as ExperienceEmployer).roles],
  );
  const selectedEmployer = experienceEmployers.find((employer) =>
    employer.roles.some((role) => role.id === selectedRoleId),
  )!;
  const selectedRole = selectedEmployer.roles.find((role) => role.id === selectedRoleId)!;

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
    <div className="experience-timeline">
      <ol aria-label="Career chronology" className="experience-chronology">
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
              className={
                employer.roles.length > 1
                  ? "experience-progression experience-progression__branch"
                  : "experience-progression"
              }
            >
              {employer.roles.map((role) => {
                const isSelected = role.id === selectedRoleId;
                const roleIndex = orderedRoles.findIndex(({ id }) => id === role.id);
                return (
                  <div className="experience-role" key={role.id}>
                    <button
                      aria-pressed={isSelected}
                      onClick={() => setSelectedRoleId(role.id)}
                      onKeyDown={(event) => handleRoleKeyDown(event, role.id)}
                      ref={(element) => {
                        roleButtonRefs.current[roleIndex] = element;
                      }}
                      tabIndex={isSelected ? 0 : -1}
                      type="button"
                    >
                      <span>{role.title}</span>
                      <small>{role.dates}</small>
                    </button>
                    {isSelected ? (
                      <div className="experience-detail--mobile">
                        <RoleDetail employer={employer} role={role} />
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
