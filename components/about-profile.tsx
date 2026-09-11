import Image from "next/image";
import { about } from "@/content/portfolio";

export function AboutProfile() {
  return (
    <article className="about-profile">
      <div className="about-profile__copy">
        <h3 id="about-title">{about.heading}</h3>
        <p className="about-profile__introduction">{about.introduction}</p>
        <p className="about-profile__perspective">{about.perspective}</p>

        <ul aria-label="What I bring" className="about-profile__strengths">
          {about.strengths.map((strength) => (
            <li key={strength}>{strength}</li>
          ))}
        </ul>
      </div>

      <figure className="about-profile__portrait">
        <Image
          alt={about.portrait.alt}
          fill
          sizes="(max-width: 720px) 100vw, 46vw"
          src={about.portrait.src}
        />
      </figure>

      <ol aria-hidden="true" className="about-profile__rail">
        <li><strong>01</strong><span>Build</span></li>
        <li><strong>02</strong><span>Shape</span></li>
        <li><strong>03</strong><span>Care</span></li>
      </ol>
    </article>
  );
}
