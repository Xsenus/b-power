import { useEffect, useMemo, useState } from 'react';
import defaultContentJson from './data/content.json';
import type { LandingContent } from './data/types';
import { fetchContent } from './utils/api';
import { Header } from './components/Header/Header';
import { Hero } from './components/Hero/Hero';
import { About } from './components/About/About';
import { ProductSwitcher } from './components/ProductSwitcher/ProductSwitcher';
import { Benefits } from './components/Benefits/Benefits';
import { FormSection } from './components/FormSection/FormSection';
import { Footer } from './components/Footer/Footer';
import { Admin } from './components/Admin/Admin';
import { scrollPageToAnchor } from './utils/scroll';

const defaultContent = defaultContentJson as LandingContent;
const defaultBrand = defaultContent.brand;

function hasUtmQuery() {
  return Array.from(new URLSearchParams(window.location.search).keys()).some((key) => key.toLowerCase().startsWith('utm_'));
}

function shouldShowNotFound() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  if (pathname === '/' || pathname === '/index.html') return false;
  if (pathname.startsWith('/admin')) return false;
  return !hasUtmQuery();
}

function normalizeContent(content: LandingContent): LandingContent {
  return {
    ...content,
    brand: content.brand ?? defaultBrand,
  };
}

function setMeta(name: string, content: string, property = false) {
  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let node = document.querySelector<HTMLMetaElement>(selector);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute(property ? 'property' : 'name', name);
    document.head.appendChild(node);
  }
  node.content = content;
}

function setCanonical(href: string) {
  let node = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!node) {
    node = document.createElement('link');
    node.rel = 'canonical';
    document.head.appendChild(node);
  }
  node.href = href;
}

export default function App() {
  const isAdmin = useMemo(() => window.location.pathname.startsWith('/admin'), []);
  const isNotFound = useMemo(() => shouldShowNotFound(), []);
  const [content, setContent] = useState<LandingContent>(defaultContent);

  useEffect(() => {
    let cancelled = false;
    fetchContent()
      .then((result) => {
        if (!cancelled && result.ok && result.data) setContent(normalizeContent(result.data));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isAdmin) {
      document.title = 'Админка B-POWER';
      setMeta('robots', 'noindex, nofollow');
      return;
    }
    if (isNotFound) {
      document.title = '404 - страница не найдена | B-POWER';
      setMeta('description', 'Такой страницы не существует.');
      setMeta('robots', 'noindex, nofollow');
      setCanonical(`${window.location.origin}${window.location.pathname}`);
      return;
    }
    document.title = content.seo.title;
    setMeta('description', content.seo.description);
    setMeta('robots', 'index, follow');
    setCanonical(content.seo.canonical);
    setMeta('og:title', content.seo.title, true);
    setMeta('og:description', content.seo.description, true);
    setMeta('og:image', content.seo.ogImage, true);
    setMeta('twitter:card', 'summary_large_image');
  }, [content, isAdmin, isNotFound]);

  useEffect(() => {
    if (isAdmin || isNotFound || !window.location.hash) return undefined;

    const timer = window.setTimeout(() => {
      scrollPageToAnchor(window.location.hash, false);
    }, 80);

    return () => window.clearTimeout(timer);
  }, [content, isAdmin, isNotFound]);

  if (isAdmin) {
    return <Admin initialContent={content} />;
  }

  if (isNotFound) {
    return (
      <>
        <div className="page-top-anchor" id="top" aria-hidden="true" />
        <Header brand={content.brand} nav={content.nav} contacts={content.contacts} />
        <main className="not-found" aria-labelledby="not-found-title">
          <img
            className="not-found__man"
            src="/assets/images/figma-about-man.webp"
            alt=""
            aria-hidden="true"
          />
          <section className="not-found__panel">
            <div className="not-found__content">
              <p className="not-found__code" aria-hidden="true">404</p>
              <h1 className="not-found__title" id="not-found-title">
                <span>Упс...</span>
                Такой страницы не существует!
              </h1>
            </div>
          </section>
        </main>
        <Footer brand={content.brand} footer={content.footer} nav={content.nav} contacts={content.contacts} />
      </>
    );
  }

  return (
    <>
      <div className="page-top-anchor" id="top" aria-hidden="true" />
      <Header brand={content.brand} nav={content.nav} contacts={content.contacts} />
      <main>
        <Hero hero={content.hero} />
        <About about={content.about} />
        <ProductSwitcher product={content.product} />
        <Benefits audience={content.audience} facts={content.facts} />
        <FormSection form={content.form} />
      </main>
      <Footer brand={content.brand} footer={content.footer} nav={content.nav} contacts={content.contacts} />
    </>
  );
}
