export type SeoContent = {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
};

export type NavItem = {
  label: string;
  href: string;
};

export type ContactsContent = {
  phone: string;
  email: string;
  schedule: string;
};

export type CountdownItem = {
  value: string;
  label: string;
};

export type HeroContent = {
  eyebrow: string;
  title: string;
  mobileTitle?: string;
  subtitle: string;
  buttonText: string;
  buttonHref: string;
  image: string;
  mobileImage?: string;
  video?: string;
  countdownLabel: string;
  countdown: CountdownItem[];
};

export type ImageCard = {
  title: string;
  text: string;
  image: string;
  alt: string;
};

export type AboutContent = {
  sectionLabel: string;
  title: string;
  lead: string;
  cards: ImageCard[];
};

export type ProductItem = {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  bullets: string[];
  image: string;
  thumbnail: string;
  alt: string;
};

export type ProductWeight = {
  value: string;
  label: string;
};

export type ProductFeature = {
  id: string;
  title: string;
  text: string;
  icon: 'leaf' | 'wheat' | 'drop' | 'jar' | 'spark' | string;
};

export type ProductContent = {
  sectionLabel: string;
  title: string;
  buttonText: string;
  buttonHref: string;
  activeLabel: string;
  weightLabel: string;
  items: ProductItem[];
  weights: ProductWeight[];
  features: ProductFeature[];
};

export type AudienceItem = {
  title: string;
  text: string;
  tone?: 'light' | 'dark' | 'image' | string;
  image?: string;
};

export type AudienceContent = {
  sectionLabel: string;
  title: string;
  items: AudienceItem[];
};

export type FactItem = {
  title: string;
  text: string;
};

export type FactsContent = {
  sectionLabel: string;
  title: string;
  image: string;
  imageAlt: string;
  items: FactItem[];
};

export type FormContent = {
  sectionLabel: string;
  title: string;
  text: string;
  namePlaceholder: string;
  phonePlaceholder: string;
  buttonText: string;
  successTitle: string;
  successText: string;
  consent: string;
  background: string;
};

export type FooterLink = {
  label: string;
  href: string;
};

export type FooterContent = {
  tagline: string;
  legal: string;
  links: FooterLink[];
};

export type LandingContent = {
  seo: SeoContent;
  nav: NavItem[];
  contacts: ContactsContent;
  hero: HeroContent;
  about: AboutContent;
  product: ProductContent;
  audience: AudienceContent;
  facts: FactsContent;
  form: FormContent;
  footer: FooterContent;
};

export type LeadPayload = {
  name: string;
  phone: string;
  email?: string;
  message?: string;
  source: string;
};

export type Lead = LeadPayload & {
  id: string;
  createdAt: string;
};

export type ApiResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};
