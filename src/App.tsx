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

const defaultContent = defaultContentJson as LandingContent;

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
  const [content, setContent] = useState<LandingContent>(defaultContent);

  useEffect(() => {
    let cancelled = false;
    fetchContent()
      .then((result) => {
        if (!cancelled && result.ok && result.data) setContent(result.data);
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
    document.title = content.seo.title;
    setMeta('description', content.seo.description);
    setMeta('robots', 'index, follow');
    setCanonical(content.seo.canonical);
    setMeta('og:title', content.seo.title, true);
    setMeta('og:description', content.seo.description, true);
    setMeta('og:image', content.seo.ogImage, true);
    setMeta('twitter:card', 'summary_large_image');
  }, [content, isAdmin]);

  if (isAdmin) {
    return <Admin initialContent={content} />;
  }

  return (
    <>
      <Header nav={content.nav} contacts={content.contacts} />
      <main>
        <Hero hero={content.hero} />
        <About about={content.about} />
        <ProductSwitcher product={content.product} />
        <Benefits audience={content.audience} facts={content.facts} />
        <FormSection form={content.form} />
      </main>
      <Footer footer={content.footer} nav={content.nav} contacts={content.contacts} />
    </>
  );
}
