import { useMemo, useState } from 'react';
import type { ProductContent } from '../../data/types';
import { cn } from '../../utils/classNames';
import { SectionLabel } from '../Ui/SectionLabel';
import { FeatureIcon } from '../Ui/Icon';

export function ProductSwitcher({ product }: { product: ProductContent }) {
  const [activeId, setActiveId] = useState(product.items[0]?.id ?? '');
  const active = useMemo(
    () => product.items.find((item) => item.id === activeId) ?? product.items[0],
    [activeId, product.items]
  );

  if (!active) return null;

  return (
    <section className="section product" id="product">
      <div className="container">
        <SectionLabel>{product.sectionLabel}</SectionLabel>
        <h2 className="section-title product__title">{product.title}</h2>

        <div className="product__grid">
          <div className="product__visual" aria-live="polite">
            <img key={active.image} src={active.image} alt={active.alt} />
          </div>

          <article className="product__info" aria-live="polite">
            <div className="product__info-inner" key={active.id}>
              <h3>{active.title}</h3>
              <p className="product__subtitle">{active.subtitle}</p>
              <ul className="product__bullets">
                {active.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>

              <div className="product__selector-group">
                <span className="product__selector-label">{product.activeLabel}</span>
                <strong>{active.name}</strong>
                <div className="product__thumbs" role="tablist" aria-label="Выберите вкус продукта">
                  {product.items.map((item) => (
                    <button
                      className={cn('product-thumb', item.id === active.id && 'product-thumb--active')}
                      type="button"
                      role="tab"
                      aria-selected={item.id === active.id}
                      aria-label={item.name}
                      key={item.id}
                      onClick={() => setActiveId(item.id)}
                    >
                      <img src={item.thumbnail} alt="" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="product__weights">
                <span className="product__selector-label">{product.weightLabel}</span>
                <div className="product__weight-list">
                  {product.weights.map((weight) => (
                    <button className="weight-card" type="button" key={weight.value}>
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
