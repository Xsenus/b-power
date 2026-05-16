import type { ProductFeature } from '../../data/types';

type IconProps = {
  name: ProductFeature['icon'];
};

const FEATURE_ICONS: Record<string, string> = {
  leaf: '/assets/icons/feature-gmo.svg',
  wheat: '/assets/icons/feature-gluten.svg',
  drop: '/assets/icons/feature-dyes.svg',
  jar: '/assets/icons/feature-preservatives.svg',
  spark: '/assets/icons/feature-flavors.svg',
  gmo: '/assets/icons/feature-gmo.svg',
  gluten: '/assets/icons/feature-gluten.svg',
  dyes: '/assets/icons/feature-dyes.svg',
  preservatives: '/assets/icons/feature-preservatives.svg',
  flavors: '/assets/icons/feature-flavors.svg'
};

export function FeatureIcon({ name }: IconProps) {
  const src = name.startsWith('/') || name.startsWith('http') ? name : FEATURE_ICONS[name] ?? FEATURE_ICONS.leaf;

  return (
    <img
      className="feature-card__icon"
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
    />
  );
}
