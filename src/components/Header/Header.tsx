import { useEffect, useState } from 'react';
import type { ContactsContent, NavItem } from '../../data/types';

const LOGO = '/assets/images/logo.png';
const MOBILE_LOGO = '/assets/images/logo-mobile.png';

type HeaderProps = {
  nav: NavItem[];
  contacts: ContactsContent;
};

export function Header({ nav, contacts }: HeaderProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('menu-opened', open);
    return () => document.body.classList.remove('menu-opened');
  }, [open]);

  return (
    <header className="site-header" id="top">
      <div className="site-header__inner">
        <a className="site-header__logo" href="#top" aria-label="B-POWER">
          <picture>
            <source media="(max-width: 768px)" srcSet={MOBILE_LOGO} />
            <img src={LOGO} alt="B-POWER" width="263" height="95" />
          </picture>
        </a>

        <nav className="site-header__nav" aria-label="Основная навигация">
          {nav.map((item) => (
            <a className="site-header__link" key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="site-header__contacts">
          <a className="site-header__phone" href={`tel:${contacts.phone.replace(/\D/g, '')}`}>{contacts.phone}</a>
          <span>{contacts.schedule}</span>
        </div>

        <button
          className="site-header__burger"
          type="button"
          aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`mobile-menu${open ? ' mobile-menu--open' : ''}`} aria-hidden={!open}>
        <nav className="mobile-menu__nav" aria-label="Мобильная навигация">
          {nav.map((item) => (
            <a className="mobile-menu__link" key={item.href} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
        </nav>
        <a className="mobile-menu__phone" href={`tel:${contacts.phone.replace(/\D/g, '')}`}>{contacts.phone}</a>
        <a className="mobile-menu__email" href={`mailto:${contacts.email}`}>{contacts.email}</a>
      </div>
    </header>
  );
}
