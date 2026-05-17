import { createElement, Fragment, type ReactNode } from 'react';

export function lines(value: string): ReactNode[] {
  return value.split('\n').map((line, index, array) => (
    index === array.length - 1 ? line : `${line}\n`
  ));
}

export function brandVariant(value: string): ReactNode {
  if (!value.includes('B-POWER')) return value;

  return createElement(
    Fragment,
    null,
    createElement('span', { className: 'brand-copy brand-copy--desktop' }, value),
    createElement('span', { className: 'brand-copy brand-copy--mobile' }, value.split('B-POWER').join('B•POWER'))
  );
}

export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function phoneHref(value: string): string {
  const digits = normalizePhoneDigits(value).replace(/^8/, '7');
  return digits ? `tel:+${digits}` : 'tel:';
}

export function formatPhone(value: string): string {
  const digits = normalizePhoneDigits(value).replace(/^8/, '7').slice(0, 11);
  const normalized = digits.startsWith('7') ? digits : `7${digits}`.slice(0, 11);
  const p = normalized.slice(1);
  const chunks = [p.slice(0, 3), p.slice(3, 6), p.slice(6, 8), p.slice(8, 10)].filter(Boolean);

  if (!p.length) return '+7 ';
  let result = '+7';
  if (chunks[0]) result += ` (${chunks[0]}`;
  if (chunks[0]?.length === 3) result += ')';
  if (chunks[1]) result += ` ${chunks[1]}`;
  if (chunks[2]) result += `-${chunks[2]}`;
  if (chunks[3]) result += `-${chunks[3]}`;
  return result;
}

export function isValidPhone(value: string): boolean {
  const digits = normalizePhoneDigits(value);
  return digits.length >= 10 && digits.length <= 11;
}
