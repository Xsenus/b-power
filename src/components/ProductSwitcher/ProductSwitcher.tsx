import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { ProductContent } from '../../data/types';
import { cn } from '../../utils/classNames';
import { brandVariant } from '../../utils/text';
import { SectionLabel } from '../Ui/SectionLabel';
import { FeatureIcon } from '../Ui/Icon';

export function ProductSwitcher({ product }: { product: ProductContent }) {
  const [activeId, setActiveId] = useState(product.items[0]?.id ?? '');
  const keyboardFocusId = useRef<string | null>(null);
  const active = useMemo(
    () => product.items.find((item) => item.id === activeId) ?? product.items[0],
    [activeId, product.items]
  );
  const thumbnailItems = useMemo(() => {
    const order = new Map([
      ['daily', 0],
      ['extra', 1],
      ['natural', 2],
    ]);

    return [...product.items].sort((first, second) => {
      const firstOrder = order.get(first.id) ?? product.items.indexOf(first);
      const secondOrder = order.get(second.id) ?? product.items.indexOf(second);
      return firstOrder - secondOrder;
    });
  }, [product.items]);

  useEffect(() => {
    if (!keyboardFocusId.current) return;

    const nextButton = document.querySelector<HTMLButtonElement>(`.product-thumb[data-product-id="${keyboardFocusId.current}"]`);
    keyboardFocusId.current = null;
    nextButton?.focus();
  }, [activeId]);

  if (!active) return null;

  function onThumbKeyDown(event: KeyboardEvent<HTMLButtonElement>, itemId: string) {
    const currentIndex = thumbnailItems.findIndex((item) => item.id === itemId);
    if (currentIndex < 0) return;

    const lastIndex = thumbnailItems.length - 1;
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = lastIndex;
    } else {
      return;
    }

    event.preventDefault();
    const nextItem = thumbnailItems[nextIndex];
    keyboardFocusId.current = nextItem.id;
    setActiveId(nextItem.id);
  }

  return (
    <section className="section product" id="product">
      <div className="container">
        <SectionLabel>{product.sectionLabel}</SectionLabel>
        <h2 className="section-title product__title">{brandVariant(product.title)}</h2>

        <div className="product__grid">
          <div className="product__visual" aria-live="polite">
            {active.video ? (
              <video
                key={active.video}
                className="product__motion"
                src={active.video}
                poster={active.image}
                autoPlay
                muted
                loop
                playsInline
                aria-label={active.alt}
              />
            ) : (
              <img key={active.image} src={active.image} alt={active.alt} />
            )}
          </div>

          <article className="product__info" aria-live="polite">
            <div className="product__info-inner" key={active.id}>
              <h3>
                <span className="responsive-copy responsive-copy--desktop">{active.title}</span>
                <span className="responsive-copy responsive-copy--mobile">{active.mobileTitle ?? active.title}</span>
              </h3>
              <p className="product__subtitle">{active.subtitle}</p>
              <ul className="product__bullets">
                {active.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>

              <div className="product__selector-group">
                <span className="product__selector-label">{product.activeLabel}</span>
                <strong>{active.name}</strong>
                <div className="product__thumbs" role="tablist" aria-label="Выберите вкус продукта">
                  {thumbnailItems.map((item) => (
                    <button
                      className={cn('product-thumb', item.id === active.id && 'product-thumb--active')}
                      type="button"
                      role="tab"
                      aria-selected={item.id === active.id}
                      aria-label={item.name}
                      tabIndex={item.id === active.id ? 0 : -1}
                      data-product-id={item.id}
                      key={item.id}
                      onClick={() => setActiveId(item.id)}
                      onKeyDown={(event) => onThumbKeyDown(event, item.id)}
                    >
                      <img src={item.thumbnail} alt={`B-POWER ${item.name}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="product__weights">
                <span className="product__selector-label">{product.weightLabel}</span>
                <div className="product__weight-list">
                  {product.weights.map((weight, index) => (
                    <button
                      className="weight-card"
                      type="button"
                      key={weight.value}
                      aria-pressed={index === 1}
                      aria-label={`${weight.value}, ${weight.label}`}
                    >
                      <strong>{weight.value}</strong>
                      <span>{weight.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <a className="button button--dark product__cta" href={product.buttonHref}>{product.buttonText}</a>
          </article>
        </div>

        <div className="features" aria-label="Преимущества продукта">
          {product.features.map((feature) => (
            <article className="feature-card" key={feature.id}>
              <FeatureIcon name={feature.icon} />
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
