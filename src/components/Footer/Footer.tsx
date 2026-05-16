import type { ContactsContent, FooterContent, NavItem } from '../../data/types';
import { phoneHref } from '../../utils/text';

const LOGO = '/assets/images/figma-logo-desktop-exact.png';
const MOBILE_LOGO = '/assets/images/figma-logo-footer-mobile-exact.png';

type FooterProps = {
  footer: FooterContent;
  nav: NavItem[];
  contacts: ContactsContent;
};

export function Footer({ footer, nav, contacts }: FooterProps) {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <a href="#top" aria-label="B-POWER">
            <picture>
              <source media="(max-width: 768px)" srcSet={MOBILE_LOGO} />
              <img src={LOGO} alt="B-POWER" width="263" height="95" />
            </picture>
          </a>
        </div>

        <p className="footer__tagline">{footer.tagline}</p>

        <nav className="footer__nav" aria-label="Навигация в подвале">
          {nav.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}
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
            link.href === '#'
              ? <span key={link.label}>{link.label}</span>
              : <a href={link.href} key={link.label}>{link.label}</a>
          ))}
        </div>
      </div>
      <a className="scroll-top" href="#top" aria-label="Наверх">↑</a>
    </footer>
  );
}
