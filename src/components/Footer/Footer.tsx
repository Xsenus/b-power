import type { MouseEvent } from 'react';
import type { BrandContent, ContactsContent, FooterContent, NavItem } from '../../data/types';
import { scrollPageToAnchor, scrollPageToTop } from '../../utils/scroll';
import { phoneHref } from '../../utils/text';

type FooterProps = {
  brand: BrandContent;
  footer: FooterContent;
  nav: NavItem[];
  contacts: ContactsContent;
};

export function Footer({ brand, footer, nav, contacts }: FooterProps) {
  function scrollToTop(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    scrollPageToTop();
    if (window.location.hash) {
      window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
    }
  }

  function scrollToNavItem(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (!href.startsWith('#')) return;
    event.preventDefault();
    if (!scrollPageToAnchor(href)) {
      window.location.assign(`/${href}`);
    }
  }

  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <a href="#top" aria-label="Наверх" onClick={scrollToTop}>
            <picture>
              <source media="(max-width: 768px)" srcSet={brand.footerMobileLogo} />
              <img src={brand.footerLogo} alt={brand.logoAlt} width="263" height="95" />
            </picture>
          </a>
        </div>

        <p className="footer__tagline">{footer.tagline}</p>

        <nav className="footer__nav" aria-label="Навигация в подвале">
          {nav.map((item) => <a href={item.href} key={item.href} onClick={(event) => scrollToNavItem(event, item.href)}>{item.label}</a>)}
        </nav>

        <div className="footer__contacts">
          <span>Телефон горячей линии</span>
          <a className="footer__phone" href={phoneHref(contacts.phone)}>{contacts.phone}</a>
          <span>Почта</span>
          <a className="footer__email" href={`mailto:${contacts.email}`}>{contacts.email}</a>
        </div>

        <p className="footer__legal">{footer.legal}</p>

        <div className="footer__policy">
          {footer.links.map((link) => (
            !link.href || link.href === '#'
              ? <span key={link.label}>{link.label}</span>
              : <a href={link.href} key={link.label} target="_blank" rel="nofollow noopener noreferrer">{link.label}</a>
          ))}
        </div>
      </div>
      <a className="scroll-top" href="#top" aria-label="Наверх" onClick={scrollToTop}>↑</a>
    </footer>
  );
}
