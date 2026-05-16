import { useEffect, useState } from 'react';
import type { ContactsContent, NavItem } from '../../data/types';
import { phoneHref } from '../../utils/text';

const LOGO = '/assets/images/figma-logo-desktop-exact.png';
const MOBILE_LOGO = '/assets/images/figma-logo-mobile-exact.png';

type HeaderProps = {
  nav: NavItem[];
  contacts: ContactsContent;
};

function splitSchedule(schedule: string) {
  const match = schedule.match(/^(.+?:)\s*(.+)$/);
  return match ? { label: match[1], time: match[2] } : { label: schedule, time: '' };
}

export function Header({ nav, contacts }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const schedule = splitSchedule(contacts.schedule);

  useEffect(() => {
    document.body.classList.toggle('menu-opened', open);
    return () => document.body.classList.remove('menu-opened');
  }, [open]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    if (open) {
      document.addEventListener('keydown', onKeyDown);
    }

    return () => document.removeEventListener('keydown', onKeyDown);
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
          <a className="site-header__phone" href={phoneHref(contacts.phone)}>{contacts.phone}</a>
          <span className="site-header__schedule">
            <span>{schedule.label}</span>
            {schedule.time ? <span>{schedule.time}</span> : null}
          </span>
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
            <a className="mobile-menu__link" key={item.href} href={item.href} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
        </nav>
        <a className="mobile-menu__phone" href={phoneHref(contacts.phone)} tabIndex={open ? 0 : -1}>{contacts.phone}</a>
        <a className="mobile-menu__email" href={`mailto:${contacts.email}`} tabIndex={open ? 0 : -1}>{contacts.email}</a>
      </div>
    </header>
  );
}
