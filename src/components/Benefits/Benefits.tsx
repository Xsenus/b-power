import type { CSSProperties } from 'react';
import type { AudienceContent, FactsContent } from '../../data/types';
import { cn } from '../../utils/classNames';
import { brandVariant } from '../../utils/text';
import { SectionLabel } from '../Ui/SectionLabel';

type BenefitsProps = {
  audience: AudienceContent;
  facts: FactsContent;
};

export function Benefits({ audience, facts }: BenefitsProps) {
  return (
    <>
      <section className="section audience" id="audience">
        <div className="container">
          <SectionLabel>{audience.sectionLabel}</SectionLabel>
          <h2 className="section-title audience__title">{brandVariant(audience.title)}</h2>
          <div className="audience__grid">
            {audience.items.map((item) => (
              <article
                className={cn('audience-card', `audience-card--${item.tone ?? 'dark'}`)}
                key={item.title}
                style={item.image ? { '--card-image': `url(${item.image})` } as CSSProperties : undefined}
              >
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section facts" id="facts">
        <div className="container">
          <SectionLabel>{facts.sectionLabel}</SectionLabel>
          <h2 className="section-title facts__title">{facts.title}</h2>
          <div className="facts__layout">
            <div className="facts__items facts__items--top">
              {facts.items.slice(0, 3).map((item) => (
                <article className="fact-card" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
            <picture className="facts__media">
              {facts.mobileImage ? <source media="(max-width: 768px)" srcSet={facts.mobileImage} /> : null}
              <img className="facts__image" src={facts.image} alt={facts.imageAlt} />
            </picture>
            <div className="facts__items facts__items--bottom">
              {facts.items.slice(3).map((item) => (
                <article className="fact-card" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
