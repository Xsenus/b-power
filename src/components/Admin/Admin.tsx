import { FormEvent, KeyboardEvent, useEffect, useState } from 'react';
import type { AudienceItem, FactItem, LandingContent, Lead, ProductItem } from '../../data/types';
import { exportLeads, fetchContent, fetchLeads, loginAdmin, saveContent } from '../../utils/api';

type AdminProps = {
  initialContent: LandingContent;
};

type AdminTab = 'main' | 'product' | 'sections' | 'footer' | 'json' | 'leads';

const ADMIN_TABS: Array<{ id: AdminTab; label: string }> = [
  { id: 'main', label: 'Основное' },
  { id: 'product', label: 'Продукт' },
  { id: 'sections', label: 'Разделы' },
  { id: 'footer', label: 'Футер' },
  { id: 'json', label: 'Полный JSON' },
  { id: 'leads', label: 'Заявки' }
];

function normalizeAdminContent(nextContent: LandingContent, fallbackContent: LandingContent): LandingContent {
  return {
    ...nextContent,
    brand: nextContent.brand ?? fallbackContent.brand
  };
}

export function Admin({ initialContent }: AdminProps) {
  const [token, setToken] = useState(() => sessionStorage.getItem('bpower-admin-token') ?? '');
  const [password, setPassword] = useState('');
  const [content, setContent] = useState<LandingContent>(initialContent);
  const [jsonDraft, setJsonDraft] = useState(() => JSON.stringify(initialContent, null, 2));
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tab, setTab] = useState<AdminTab>('main');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;

    fetchContent().then((result) => {
      if (result.ok && result.data) {
        const nextContent = normalizeAdminContent(result.data, initialContent);
        setContent(nextContent);
        setJsonDraft(JSON.stringify(nextContent, null, 2));
      }
    });

    fetchLeads(token).then((result) => {
      if (result.ok && result.data) setLeads(result.data);
    });
  }, [token, initialContent]);

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus('');
    const result = await loginAdmin(password);
    setLoading(false);
    if (!result.ok || !result.data) {
      setStatus(result.error ?? 'Неверный пароль');
      return;
    }
    sessionStorage.setItem('bpower-admin-token', result.data.token);
    setToken(result.data.token);
    setPassword('');
    setStatus('Вход выполнен.');
  }

  async function reloadContent() {
    const result = await fetchContent();
    if (result.ok && result.data) {
      const nextContent = normalizeAdminContent(result.data, initialContent);
      setContent(nextContent);
      setJsonDraft(JSON.stringify(nextContent, null, 2));
      setStatus('Контент загружен с сервера.');
    }
  }

  async function reloadLeads() {
    if (!token) return;
    const result = await fetchLeads(token);
    if (result.ok && result.data) setLeads(result.data);
  }

  function selectTab(nextTab: AdminTab) {
    setTab(nextTab);
    if (nextTab === 'leads') void reloadLeads();
    if (nextTab === 'json') setJsonDraft(JSON.stringify(content, null, 2));
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, tabId: AdminTab) {
    const currentIndex = ADMIN_TABS.findIndex((item) => item.id === tabId);
    if (currentIndex < 0) return;

    const lastIndex = ADMIN_TABS.length - 1;
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = lastIndex;
    else return;

    event.preventDefault();
    const nextTab = ADMIN_TABS[nextIndex];
    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    selectTab(nextTab.id);
    buttons?.[nextIndex]?.focus();
  }

  function updateContent(mutator: (draft: LandingContent) => void) {
    setContent((current) => {
      const draft = structuredClone(current);
      mutator(draft);
      setJsonDraft(JSON.stringify(draft, null, 2));
      return draft;
    });
  }

  function applyJsonToContent() {
    try {
      const parsed = normalizeAdminContent(JSON.parse(jsonDraft) as LandingContent, initialContent);
      setContent(parsed);
      setJsonDraft(JSON.stringify(parsed, null, 2));
      setStatus('JSON применён. Нажмите «Сохранить изменения», чтобы обновить сайт.');
    } catch (error) {
      setStatus(`Ошибка JSON: ${error instanceof Error ? error.message : 'некорректный формат'}`);
    }
  }

  async function onSave() {
    setLoading(true);
    setStatus('');
    const result = await saveContent(content, token);
    setLoading(false);
    if (!result.ok || !result.data) {
      setStatus(result.error ?? 'Не удалось сохранить контент');
      return;
    }
    const nextContent = normalizeAdminContent(result.data, initialContent);
    setContent(nextContent);
    setJsonDraft(JSON.stringify(nextContent, null, 2));
    setStatus('Контент сохранён. Обновите лендинг, чтобы увидеть изменения.');
  }

  async function onExport() {
    const result = await exportLeads(token);
    if (!result.ok || !result.data) {
      setStatus(result.error ?? 'Не удалось выгрузить заявки');
      return;
    }
    const url = URL.createObjectURL(result.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'b-power-leads.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function onLogout() {
    sessionStorage.removeItem('bpower-admin-token');
    setToken('');
    setStatus('Вы вышли из админки.');
  }

  if (!token) {
    return (
      <main className="admin admin--login">
        <form className="admin-login" onSubmit={onLogin}>
          <img src="/assets/images/figma-logo-desktop-exact.png" alt="B-POWER" />
          <h1>Админка B-POWER</h1>
          <input className="admin-login__username" type="text" name="username" autoComplete="username" value="admin" readOnly tabIndex={-1} />
          <label>
            Пароль
            <input type="password" name="password" value={password} autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <button className="button button--light" type="submit" disabled={loading}>{loading ? 'Проверяем...' : 'Войти'}</button>
          {status && <p className="admin-status">{status}</p>}
          <a className="admin-login__back" href="/">← Вернуться на лендинг</a>
        </form>
      </main>
    );
  }

  return (
    <main className="admin">
      <header className="admin__header">
        <a href="/" aria-label="На лендинг"><img src="/assets/images/figma-logo-desktop-exact.png" alt="B-POWER" /></a>
        <div>
          <h1>Панель управления</h1>
          <p>Редактирование всех текстов, медиа, ссылок, таймера, иконок и заявок лендинга.</p>
        </div>
        <button className="admin__logout" type="button" onClick={onLogout}>Выйти</button>
      </header>

      <div className="admin__tabs" role="tablist" aria-label="Разделы админки">
        {ADMIN_TABS.map((item) => (
          <button
            type="button"
            role="tab"
            className={tab === item.id ? 'active' : ''}
            aria-selected={tab === item.id}
            tabIndex={tab === item.id ? 0 : -1}
            key={item.id}
            onClick={() => selectTab(item.id)}
            onKeyDown={(event) => onTabKeyDown(event, item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab !== 'leads' && (
        <div className="admin__actions">
          <button className="button button--light" type="button" onClick={onSave} disabled={loading}>{loading ? 'Сохраняем...' : 'Сохранить изменения'}</button>
          <button className="button button--dark" type="button" onClick={() => void reloadContent()}>Сбросить к сохранённому</button>
        </div>
      )}

      {status && <p className="admin-status">{status}</p>}

      {tab === 'main' && (
        <div className="admin-grid">
          <section className="admin-card">
            <h2>SEO</h2>
            <AdminField label="Title" value={content.seo.title} onChange={(value) => updateContent((draft) => { draft.seo.title = value; })} />
            <AdminArea label="Description" value={content.seo.description} onChange={(value) => updateContent((draft) => { draft.seo.description = value; })} />
            <AdminField label="Canonical" value={content.seo.canonical} onChange={(value) => updateContent((draft) => { draft.seo.canonical = value; })} />
            <AssetField label="OG image" value={content.seo.ogImage} onChange={(value) => updateContent((draft) => { draft.seo.ogImage = value; })} />
          </section>

          <section className="admin-card">
            <h2>Логотипы</h2>
            <AssetField label="Header desktop" value={content.brand.logo} onChange={(value) => updateContent((draft) => { draft.brand.logo = value; })} />
            <AssetField label="Header mobile" value={content.brand.mobileLogo} onChange={(value) => updateContent((draft) => { draft.brand.mobileLogo = value; })} />
            <AssetField label="Footer desktop" value={content.brand.footerLogo} onChange={(value) => updateContent((draft) => { draft.brand.footerLogo = value; })} />
            <AssetField label="Footer mobile" value={content.brand.footerMobileLogo} onChange={(value) => updateContent((draft) => { draft.brand.footerMobileLogo = value; })} />
            <AdminField label="Alt" value={content.brand.logoAlt} onChange={(value) => updateContent((draft) => { draft.brand.logoAlt = value; })} />
          </section>

          <section className="admin-card">
            <h2>Навигация и контакты</h2>
            {content.nav.map((item, index) => (
              <div className="admin-repeat" key={`${item.href}-${index}`}>
                <h3>Пункт меню {index + 1}</h3>
                <AdminField label="Текст" value={item.label} onChange={(value) => updateContent((draft) => { draft.nav[index].label = value; })} />
                <AdminField label="Ссылка" value={item.href} onChange={(value) => updateContent((draft) => { draft.nav[index].href = value; })} />
              </div>
            ))}
            <hr />
            <AdminField label="Телефон" value={content.contacts.phone} onChange={(value) => updateContent((draft) => { draft.contacts.phone = value; })} />
            <AdminField label="Email" value={content.contacts.email} onChange={(value) => updateContent((draft) => { draft.contacts.email = value; })} />
            <AdminField label="Режим работы" value={content.contacts.schedule} onChange={(value) => updateContent((draft) => { draft.contacts.schedule = value; })} />
          </section>

          <section className="admin-card admin-card--wide">
            <h2>Первый экран и таймер</h2>
            <AdminField label="Лейбл" value={content.hero.eyebrow} onChange={(value) => updateContent((draft) => { draft.hero.eyebrow = value; })} />
            <AdminArea label="Заголовок desktop" value={content.hero.title} onChange={(value) => updateContent((draft) => { draft.hero.title = value; })} />
            <AdminArea label="Заголовок mobile" value={content.hero.mobileTitle ?? ''} onChange={(value) => updateContent((draft) => { draft.hero.mobileTitle = value || undefined; })} />
            <AdminArea label="Текст" value={content.hero.subtitle} onChange={(value) => updateContent((draft) => { draft.hero.subtitle = value; })} />
            <AdminField label="Текст кнопки" value={content.hero.buttonText} onChange={(value) => updateContent((draft) => { draft.hero.buttonText = value; })} />
            <AdminField label="Ссылка кнопки" value={content.hero.buttonHref} onChange={(value) => updateContent((draft) => { draft.hero.buttonHref = value; })} />
            <AssetField label="Фон desktop / poster" value={content.hero.image} onChange={(value) => updateContent((draft) => { draft.hero.image = value; })} />
            <AssetField label="Фон mobile" value={content.hero.mobileImage ?? ''} onChange={(value) => updateContent((draft) => { draft.hero.mobileImage = value || undefined; })} />
            <AssetField label="Видео hero" value={content.hero.video ?? ''} onChange={(value) => updateContent((draft) => { draft.hero.video = value || undefined; })} />
            <AdminField label="Подпись таймера" value={content.hero.countdownLabel} onChange={(value) => updateContent((draft) => { draft.hero.countdownLabel = value; })} />
            <AdminField label="Дата старта ISO" value={content.hero.countdownTarget ?? ''} onChange={(value) => updateContent((draft) => { draft.hero.countdownTarget = value || undefined; })} />
            {content.hero.countdown.map((item, index) => (
              <div className="admin-repeat" key={`${item.label}-${index}`}>
                <h3>Таймер {index + 1}</h3>
                <AdminField label="Значение fallback" value={item.value} onChange={(value) => updateContent((draft) => { draft.hero.countdown[index].value = value; })} />
                <AdminField label="Подпись" value={item.label} onChange={(value) => updateContent((draft) => { draft.hero.countdown[index].label = value; })} />
              </div>
            ))}
          </section>

          <section className="admin-card admin-card--wide">
            <h2>Форма</h2>
            <AdminField label="Лейбл" value={content.form.sectionLabel} onChange={(value) => updateContent((draft) => { draft.form.sectionLabel = value; })} />
            <AdminArea label="Заголовок desktop" value={content.form.title} onChange={(value) => updateContent((draft) => { draft.form.title = value; })} />
            <AdminArea label="Заголовок mobile" value={content.form.mobileTitle ?? ''} onChange={(value) => updateContent((draft) => { draft.form.mobileTitle = value || undefined; })} />
            <AdminArea label="Текст" value={content.form.text} onChange={(value) => updateContent((draft) => { draft.form.text = value; })} />
            <AdminField label="Placeholder имени" value={content.form.namePlaceholder} onChange={(value) => updateContent((draft) => { draft.form.namePlaceholder = value; })} />
            <AdminField label="Placeholder телефона" value={content.form.phonePlaceholder} onChange={(value) => updateContent((draft) => { draft.form.phonePlaceholder = value; })} />
            <AdminField label="Кнопка desktop" value={content.form.buttonText} onChange={(value) => updateContent((draft) => { draft.form.buttonText = value; })} />
            <AdminField label="Кнопка mobile" value={content.form.mobileButtonText ?? ''} onChange={(value) => updateContent((draft) => { draft.form.mobileButtonText = value || undefined; })} />
            <AdminField label="Заголовок успеха" value={content.form.successTitle} onChange={(value) => updateContent((draft) => { draft.form.successTitle = value; })} />
            <AdminArea label="Текст успеха" value={content.form.successText} onChange={(value) => updateContent((draft) => { draft.form.successText = value; })} />
            <AdminArea label="Согласие" value={content.form.consent} onChange={(value) => updateContent((draft) => { draft.form.consent = value; })} />
            <AssetField label="Фон формы" value={content.form.background} onChange={(value) => updateContent((draft) => { draft.form.background = value; })} />
          </section>
        </div>
      )}

      {tab === 'product' && (
        <div className="admin-grid">
          <section className="admin-card admin-card--wide">
            <h2>Область продукта</h2>
            <AdminField label="Лейбл" value={content.product.sectionLabel} onChange={(value) => updateContent((draft) => { draft.product.sectionLabel = value; })} />
            <AdminArea label="Заголовок секции" value={content.product.title} onChange={(value) => updateContent((draft) => { draft.product.title = value; })} />
            <AdminField label="Кнопка" value={content.product.buttonText} onChange={(value) => updateContent((draft) => { draft.product.buttonText = value; })} />
            <AdminField label="Ссылка кнопки" value={content.product.buttonHref} onChange={(value) => updateContent((draft) => { draft.product.buttonHref = value; })} />
            <AdminField label="Подпись вкуса" value={content.product.activeLabel} onChange={(value) => updateContent((draft) => { draft.product.activeLabel = value; })} />
            <AdminField label="Подпись веса" value={content.product.weightLabel} onChange={(value) => updateContent((draft) => { draft.product.weightLabel = value; })} />
            {content.product.items.map((item, index) => (
              <ProductEditor key={item.id} item={item} index={index} updateContent={updateContent} />
            ))}
          </section>

          <section className="admin-card">
            <h2>Вес</h2>
            {content.product.weights.map((weight, index) => (
              <div className="admin-repeat" key={`${weight.value}-${index}`}>
                <h3>Вес {index + 1}</h3>
                <AdminField label="Значение" value={weight.value} onChange={(value) => updateContent((draft) => { draft.product.weights[index].value = value; })} />
                <AdminField label="Подпись" value={weight.label} onChange={(value) => updateContent((draft) => { draft.product.weights[index].label = value; })} />
              </div>
            ))}
          </section>

          <section className="admin-card">
            <h2>Фичи и иконки</h2>
            {content.product.features.map((feature, index) => (
              <div className="admin-repeat" key={feature.id}>
                <h3>Фича {index + 1}</h3>
                <AdminField label="ID" value={feature.id} onChange={(value) => updateContent((draft) => { draft.product.features[index].id = value; })} />
                <AdminField label="Название" value={feature.title} onChange={(value) => updateContent((draft) => { draft.product.features[index].title = value; })} />
                <AdminArea label="Текст" value={feature.text} onChange={(value) => updateContent((draft) => { draft.product.features[index].text = value; })} />
                <AssetField label="Иконка: ключ или /assets/icons/file.svg" value={feature.icon} onChange={(value) => updateContent((draft) => { draft.product.features[index].icon = value; })} />
              </div>
            ))}
          </section>
        </div>
      )}

      {tab === 'sections' && (
        <div className="admin-grid">
          <section className="admin-card">
            <h2>Основа продукта</h2>
            <AdminField label="Лейбл" value={content.about.sectionLabel} onChange={(value) => updateContent((draft) => { draft.about.sectionLabel = value; })} />
            <AdminArea label="Заголовок" value={content.about.title} onChange={(value) => updateContent((draft) => { draft.about.title = value; })} />
            <AdminArea label="Лид" value={content.about.lead} onChange={(value) => updateContent((draft) => { draft.about.lead = value; })} />
            {content.about.cards.map((card, index) => (
              <div className="admin-repeat" key={`${card.title}-${index}`}>
                <h3>Карточка {index + 1}</h3>
                <AdminField label="Название" value={card.title} onChange={(value) => updateContent((draft) => { draft.about.cards[index].title = value; })} />
                <AdminArea label="Текст" value={card.text} onChange={(value) => updateContent((draft) => { draft.about.cards[index].text = value; })} />
                <AssetField label="Картинка" value={card.image} onChange={(value) => updateContent((draft) => { draft.about.cards[index].image = value; })} />
                <AdminField label="Alt" value={card.alt} onChange={(value) => updateContent((draft) => { draft.about.cards[index].alt = value; })} />
              </div>
            ))}
          </section>

          <section className="admin-card">
            <h2>Для кого</h2>
            <AdminField label="Лейбл" value={content.audience.sectionLabel} onChange={(value) => updateContent((draft) => { draft.audience.sectionLabel = value; })} />
            <AdminArea label="Заголовок" value={content.audience.title} onChange={(value) => updateContent((draft) => { draft.audience.title = value; })} />
            {content.audience.items.map((item, index) => (
              <AudienceEditor key={`${item.title}-${index}`} item={item} index={index} updateContent={updateContent} />
            ))}
          </section>

          <section className="admin-card admin-card--wide">
            <h2>Факты</h2>
            <AdminField label="Лейбл" value={content.facts.sectionLabel} onChange={(value) => updateContent((draft) => { draft.facts.sectionLabel = value; })} />
            <AdminArea label="Заголовок" value={content.facts.title} onChange={(value) => updateContent((draft) => { draft.facts.title = value; })} />
            <AssetField label="Картинка" value={content.facts.image} onChange={(value) => updateContent((draft) => { draft.facts.image = value; })} />
            <AdminField label="Alt картинки" value={content.facts.imageAlt} onChange={(value) => updateContent((draft) => { draft.facts.imageAlt = value; })} />
            {content.facts.items.map((item, index) => (
              <FactEditor key={`${item.title}-${index}`} item={item} index={index} updateContent={updateContent} />
            ))}
          </section>
        </div>
      )}

      {tab === 'footer' && (
        <div className="admin-grid">
          <section className="admin-card admin-card--wide">
            <h2>Футер</h2>
            <AdminArea label="Слоган" value={content.footer.tagline} onChange={(value) => updateContent((draft) => { draft.footer.tagline = value; })} />
            <AdminArea label="Юридический текст" value={content.footer.legal} onChange={(value) => updateContent((draft) => { draft.footer.legal = value; })} />
            {content.footer.links.map((item, index) => (
              <div className="admin-repeat" key={`${item.label}-${index}`}>
                <h3>Ссылка {index + 1}</h3>
                <AdminField label="Текст" value={item.label} onChange={(value) => updateContent((draft) => { draft.footer.links[index].label = value; })} />
                <AdminField label="Href" value={item.href} onChange={(value) => updateContent((draft) => { draft.footer.links[index].href = value; })} />
              </div>
            ))}
          </section>
        </div>
      )}

      {tab === 'json' && (
        <section className="admin-card admin-card--wide">
          <div className="admin-card__top">
            <div>
              <h2>Полный content.json</h2>
              <p className="admin-help">Здесь доступны все поля сайта: тексты, фото, видео, таймеры, ссылки, иконки, SEO, контакты и подписи. После редактирования нажмите «Применить JSON», затем «Сохранить изменения».</p>
            </div>
            <div className="admin-card__buttons">
              <button className="button button--dark" type="button" onClick={() => setJsonDraft(JSON.stringify(content, null, 2))}>Обновить из формы</button>
              <button className="button button--light" type="button" onClick={applyJsonToContent}>Применить JSON</button>
            </div>
          </div>
          <textarea className="admin-json" value={jsonDraft} spellCheck={false} onChange={(event) => setJsonDraft(event.target.value)} />
        </section>
      )}

      {tab === 'leads' && (
        <section className="admin-card admin-card--wide">
          <div className="admin-card__top">
            <h2>Заявки</h2>
            <div className="admin-card__buttons">
              <button className="button button--dark" type="button" onClick={() => void reloadLeads()}>Обновить</button>
              <button className="button button--light" type="button" onClick={() => void onExport()}>Экспорт CSV</button>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Имя</th>
                  <th>Телефон</th>
                  <th>Email</th>
                  <th>Сообщение</th>
                  <th>Источник</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>{new Date(lead.createdAt).toLocaleString('ru-RU')}</td>
                    <td>{lead.name}</td>
                    <td>{lead.phone}</td>
                    <td>{lead.email ?? '—'}</td>
                    <td>{lead.message ?? '—'}</td>
                    <td>{lead.source}</td>
                  </tr>
                ))}
                {!leads.length && <tr><td colSpan={6}>Заявок пока нет.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function AdminField({ label, value, onChange }: FieldProps) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input type="text" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function AdminArea({ label, value, onChange }: FieldProps) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function AssetField({ label, value, onChange }: FieldProps) {
  return (
    <label className="admin-field admin-field--asset">
      <span>{label}</span>
      <input type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder="/assets/images/file.webp" />
      {value && <small>Файл должен лежать в public/assets или быть внешним URL.</small>}
    </label>
  );
}

type EditorProps<T> = {
  item: T;
  index: number;
  updateContent: (mutator: (draft: LandingContent) => void) => void;
};

function ProductEditor({ item, index, updateContent }: EditorProps<ProductItem>) {
  return (
    <div className="admin-repeat">
      <h3>Продукт {index + 1}</h3>
      <AdminField label="ID" value={item.id} onChange={(value) => updateContent((draft) => { draft.product.items[index].id = value; })} />
      <AdminField label="Вкус / название" value={item.name} onChange={(value) => updateContent((draft) => { draft.product.items[index].name = value; })} />
      <AdminArea label="Заголовок desktop" value={item.title} onChange={(value) => updateContent((draft) => { draft.product.items[index].title = value; })} />
      <AdminArea label="Заголовок mobile" value={item.mobileTitle ?? ''} onChange={(value) => updateContent((draft) => { draft.product.items[index].mobileTitle = value || undefined; })} />
      <AdminField label="Подзаголовок" value={item.subtitle} onChange={(value) => updateContent((draft) => { draft.product.items[index].subtitle = value; })} />
      <AdminArea label="Пункты, каждый с новой строки" value={item.bullets.join('\n')} onChange={(value) => updateContent((draft) => { draft.product.items[index].bullets = value.split('\n').filter(Boolean); })} />
      <AssetField label="Картинка / poster" value={item.image} onChange={(value) => updateContent((draft) => { draft.product.items[index].image = value; })} />
      <AssetField label="Видео продукта" value={item.video ?? ''} onChange={(value) => updateContent((draft) => { draft.product.items[index].video = value || undefined; })} />
      <AssetField label="Миниатюра" value={item.thumbnail} onChange={(value) => updateContent((draft) => { draft.product.items[index].thumbnail = value; })} />
      <AdminField label="Alt" value={item.alt} onChange={(value) => updateContent((draft) => { draft.product.items[index].alt = value; })} />
    </div>
  );
}

function AudienceEditor({ item, index, updateContent }: EditorProps<AudienceItem>) {
  return (
    <div className="admin-repeat">
      <h3>Карточка {index + 1}</h3>
      <AdminArea label="Название" value={item.title} onChange={(value) => updateContent((draft) => { draft.audience.items[index].title = value; })} />
      <AdminArea label="Текст" value={item.text} onChange={(value) => updateContent((draft) => { draft.audience.items[index].text = value; })} />
      <AdminField label="Тон: light / dark / image" value={item.tone ?? ''} onChange={(value) => updateContent((draft) => { draft.audience.items[index].tone = value; })} />
      <AssetField label="Картинка" value={item.image ?? ''} onChange={(value) => updateContent((draft) => { draft.audience.items[index].image = value || undefined; })} />
    </div>
  );
}

function FactEditor({ item, index, updateContent }: EditorProps<FactItem>) {
  return (
    <div className="admin-repeat">
      <h3>Факт {index + 1}</h3>
      <AdminField label="Название" value={item.title} onChange={(value) => updateContent((draft) => { draft.facts.items[index].title = value; })} />
      <AdminArea label="Текст" value={item.text} onChange={(value) => updateContent((draft) => { draft.facts.items[index].text = value; })} />
    </div>
  );
}
