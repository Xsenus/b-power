import type { CSSProperties, ReactNode } from 'react';
import type { HeroContent } from '../../data/types';

function renderHeroTitle(title: string): ReactNode {
  const [firstLine, ...rest] = title.split('\n');
  const dashIndex = firstLine.indexOf('—');

  if (dashIndex === -1) {
    return title;
  }

  const beforeDash = firstLine.slice(0, dashIndex).trim();
  const afterDash = firstLine.slice(dashIndex + 1).trim();

  return (
    <>
      <span>{beforeDash} —</span>
      <br className="hero__mobile-break" />
      <span className="hero__desktop-space"> </span>
      <span>{afterDash}</span>
      {rest.map((line) => (
        <span key={line}>
          <br />
          {line}
        </span>
      ))}
    </>
  );
}

export function Hero({ hero }: { hero: HeroContent }) {
  return (
    <section
      className="hero"
      style={{
        '--hero-image': `url(${hero.image})`,
        '--hero-mobile-image': `url(${hero.mobileImage ?? hero.image})`
      } as CSSProperties}
    >
      {hero.video && (
        <video
          className="hero__video"
          src={hero.video}
          poster={hero.image}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
      )}
      <div className="hero__shade" />
      <div className="container hero__content">
        <div className="hero__top">
          <p className="hero__eyebrow">{hero.eyebrow}</p>
          <h1 className="hero__title">
            <span className="hero__title-desktop">{renderHeroTitle(hero.title)}</span>
            {hero.mobileTitle && <span className="hero__title-mobile">{hero.mobileTitle}</span>}
          </h1>
          <p className="hero__subtitle">{hero.subtitle}</p>
        </div>

        <div className="hero__bottom">
          <p className="hero__count-label">{hero.countdownLabel}</p>
          <div className="countdown" aria-label={hero.countdownLabel}>
            {hero.countdown.map((item) => (
              <div className="countdown__item" key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <a className="button button--light hero__button" href={hero.buttonHref}>{hero.buttonText}</a>
        </div>
      </div>
    </section>
  );
}
