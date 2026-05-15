import type { AboutContent } from '../../data/types';
import { SectionLabel } from '../Ui/SectionLabel';

export function About({ about }: { about: AboutContent }) {
  return (
    <section className="section about" id="base">
      <div className="container">
        <div className="section-head section-head--split about__head">
          <div>
            <SectionLabel>{about.sectionLabel}</SectionLabel>
            <h2 className="section-title">{about.title}</h2>
          </div>
          <p className="about__lead">{about.lead}</p>
        </div>

        <div className="about__cards">
          {about.cards.map((card) => (
            <article className="about-card" key={card.title}>
              <div className="about-card__copy">
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </div>
              <img className="about-card__image" src={card.image} alt={card.alt} loading="lazy" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
