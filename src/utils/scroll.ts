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
