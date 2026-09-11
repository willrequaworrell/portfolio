import { contact } from "@/content/portfolio";

export function ContactPanel() {
  return (
    <article className="contact-panel">
      <div className="contact-panel__invitation">
        <span aria-hidden="true">✱</span>
        <p>{contact.invitation}</p>
      </div>

      <h3 id="contact-title">{contact.heading}</h3>

      <nav aria-label="Contact options" className="contact-panel__actions">
        {contact.actions.map((action) => (
          <a
            href={action.href}
            key={action.label}
            rel={action.label === "LinkedIn" ? "noreferrer" : undefined}
            target={action.label === "LinkedIn" ? "_blank" : undefined}
          >
            <span className="contact-panel__action-label">
              {action.label} <span aria-hidden="true">↗</span>
            </span>
            <span className="contact-panel__action-detail">{action.detail}</span>
          </a>
        ))}
      </nav>
    </article>
  );
}
