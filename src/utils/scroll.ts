export function scrollPageToTop() {
  const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const topAnchor = document.getElementById('top');

  try {
    if (topAnchor) {
      topAnchor.scrollIntoView({ behavior, block: 'start' });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior });
    }
  } catch {
    window.scrollTo(0, 0);
  }

  window.setTimeout(() => {
    const scroller = document.scrollingElement ?? document.documentElement;
    if (scroller.scrollTop > 1) scroller.scrollTop = 0;
  }, behavior === 'smooth' ? 450 : 0);
}

export function scrollPageToAnchor(hash: string, updateHash = true) {
  if (!hash.startsWith('#')) return false;

  const id = decodeURIComponent(hash.slice(1));
  const target = document.getElementById(id);
  if (!target) return false;

  const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const header = document.querySelector<HTMLElement>('.site-header__inner') ?? document.querySelector<HTMLElement>('.site-header');
  const headerRect = header?.getBoundingClientRect();
  const headerBottom = headerRect ? Math.max(0, headerRect.bottom) : 0;
  const gap = window.innerWidth <= 768 ? 10 : 16;
  const targetTop = target.getBoundingClientRect().top + window.scrollY - headerBottom - gap;

  try {
    window.scrollTo({ top: Math.max(0, targetTop), left: 0, behavior });
  } catch {
    window.scrollTo(0, Math.max(0, targetTop));
  }

  if (updateHash) {
    window.history.pushState(null, document.title, `${window.location.pathname}${window.location.search}${hash}`);
  }

  return true;
}
