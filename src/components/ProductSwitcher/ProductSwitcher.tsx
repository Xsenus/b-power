import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import type { ProductContent } from '../../data/types';
import { cn } from '../../utils/classNames';
import { scrollPageToAnchor } from '../../utils/scroll';
import { brandVariant } from '../../utils/text';
import { SectionLabel } from '../Ui/SectionLabel';
import { FeatureIcon } from '../Ui/Icon';

const priceFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

function formatPrice(value?: string) {
  if (!value) return null;

  const numericValue = Number(value.replace(/\D/g, ''));
  if (!Number.isFinite(numericValue) || numericValue <= 0) return null;

  return `${priceFormatter.format(numericValue)} ₽`;
}

export function ProductSwitcher({ product }: { product: ProductContent }) {
  const [activeId, setActiveId] = useState(product.items[0]?.id ?? '');
  const [activeWeightIndex, setActiveWeightIndex] = useState(() => Math.min(1, Math.max(product.weights.length - 1, 0)));
  const keyboardFocusId = useRef<string | null>(null);
  const keyboardFocusWeightIndex = useRef<number | null>(null);
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
  const activePrice = formatPrice(active?.prices?.[activeWeightIndex]);

  function scrollToButtonTarget(event: MouseEvent<HTMLAnchorElement>) {
    if (!product.buttonHref.startsWith('#')) return;
    event.preventDefault();
    scrollPageToAnchor(product.buttonHref);
  }

  useEffect(() => {
    if (!keyboardFocusId.current) return;

    const nextButton = document.querySelector<HTMLButtonElement>(`.product-thumb[data-product-id="${keyboardFocusId.current}"]`);
    keyboardFocusId.current = null;
    nextButton?.focus();
  }, [activeId]);

  useEffect(() => {
    if (activeWeightIndex < product.weights.length) return;
    setActiveWeightIndex(Math.max(product.weights.length - 1, 0));
  }, [activeWeightIndex, product.weights.length]);

  useEffect(() => {
    if (keyboardFocusWeightIndex.current === null) return;

    const nextButton = document.querySelector<HTMLButtonElement>(`.weight-card[data-weight-index="${keyboardFocusWeightIndex.current}"]`);
    keyboardFocusWeightIndex.current = null;
    nextButton?.focus();
  }, [activeWeightIndex]);

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

  function onWeightKeyDown(event: KeyboardEvent<HTMLButtonElement>, weightIndex: number) {
    const lastIndex = product.weights.length - 1;
    if (lastIndex < 0) return;

    let nextIndex = weightIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = weightIndex === lastIndex ? 0 : weightIndex + 1;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = weightIndex === 0 ? lastIndex : weightIndex - 1;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = lastIndex;
    } else {
      return;
    }

    event.preventDefault();
    keyboardFocusWeightIndex.current = nextIndex;
    setActiveWeightIndex(nextIndex);
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
                <div className="product__weight-list" role="radiogroup" aria-label="Выберите вес продукта">
                  {product.weights.map((weight, weightIndex) => (
                    <button
                      className={cn('weight-card', weightIndex === activeWeightIndex && 'weight-card--active')}
                      type="button"
                      role="radio"
                      aria-checked={weightIndex === activeWeightIndex}
                      tabIndex={weightIndex === activeWeightIndex ? 0 : -1}
                      data-weight-index={weightIndex}
                      key={`${weight.value}-${weightIndex}`}
                      onClick={() => setActiveWeightIndex(weightIndex)}
                      onKeyDown={(event) => onWeightKeyDown(event, weightIndex)}
                    >
                      <strong>{weight.value}</strong>
                      <span>{weight.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="product__purchase">
              {activePrice && <p className="product__price" aria-live="polite">{activePrice}</p>}
              <a className="button button--dark product__cta" href={product.buttonHref} onClick={scrollToButtonTarget}>{product.buttonText}</a>
            </div>
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
