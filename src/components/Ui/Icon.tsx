import type { ProductFeature } from '../../data/types';

type IconProps = {
  name: ProductFeature['icon'];
};

export function FeatureIcon({ name }: IconProps) {
  const common = {
    width: 42,
    height: 42,
    viewBox: '0 0 42 42',
    fill: 'none',
    'aria-hidden': true
  };

  if (name === 'wheat') {
    return (
      <svg {...common}>
        <path d="M10 32c9-9 15-17 22-28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M18 18c-5-1-8-4-8-8 5 1 8 4 8 8Zm6-5c-4-3-5-7-3-11 4 3 5 7 3 11Zm-1 11c-5 0-9-3-11-7 5 0 9 3 11 7Zm6-8c-4-1-7-5-7-9 5 1 7 5 7 9Zm-3 15c-5 1-10-1-13-5 5-1 10 1 13 5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === 'drop') {
    return (
      <svg {...common}>
        <path d="M21 4s11 12 11 21a11 11 0 1 1-22 0C10 16 21 4 21 4Z" stroke="currentColor" strokeWidth="2" />
        <path d="m13 31 18-18M15 16l11 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === 'jar') {
    return (
      <svg {...common}>
        <path d="M12 11h18M14 11V7h14v4M14 15h14a3 3 0 0 1 3 3v18H11V18a3 3 0 0 1 3-3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M15 23h12M15 28h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === 'spark') {
    return (
      <svg {...common}>
        <path d="m22 4 3 9 9 3-9 3-3 9-3-9-9-3 9-3 3-9Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="m11 24 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M8 27C6 15 14 7 25 6c-1 11-7 20-19 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 29C31 27 36 17 35 8c-10 1-18 8-19 20M7 36c6-9 12-15 21-22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M25 14c-2 0-4-1-6-3M20 22c-3 0-6-1-8-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
