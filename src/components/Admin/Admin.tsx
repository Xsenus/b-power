import { FormEvent, KeyboardEvent, ReactNode, useEffect, useState } from 'react';
import type { AudienceItem, FactItem, LandingContent, Lead, ProductItem } from '../../data/types';
import { deleteLead, exportLeads, fetchContent, fetchLeads, loginAdmin, saveContent, uploadDocument } from '../../utils/api';

type AdminProps = {
  initialContent: LandingContent;
};

type AdminTab = 'main' | 'product' | 'sections' | 'footer' | 'json' | 'leads';
type CountdownMode = 'target' | 'manual';

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

function getCountdownMode(content: LandingContent): CountdownMode {
  return content.hero.countdownMode === 'manual' ? 'manual' : 'target';
}

function getCountdownDate(target?: string) {
  return target?.match(/^(\d{4}-\d{2}-\d{2})T/)?.[1] ?? '';
}

function getCountdownTime(target?: string) {
  return target?.match(/T(\d{2}:\d{2})/)?.[1] ?? '00:00';
}

function getCountdownOffset(target?: string) {
  return target?.match(/([+-]\d{2}:\d{2}|Z)$/)?.[1] ?? '+03:00';
}

function buildCountdownTarget(date: string, time: string, offset: string) {
  if (!date) return undefined;
  const normalizedTime = time || '00:00';
  const normalizedOffset = offset || '+03:00';
  return `${date}T${normalizedTime}:00${normalizedOffset}`;
}

export function Admin({ initialContent }: AdminProps) {
  const [token, setToken] = useState(() => sessionStorage.getItem('bpower-admin-token') ?? '');
  const [password, setPassword] = useState('');
  const [content, setContent] = useState<LandingContent>(initialContent);
  const [jsonDraft, setJsonDraft] = useState(() => JSON.stringify(initialContent, null, 2));
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tab, setTab] = useState<AdminTab>('main');
  const [activeItems, setActiveItems] = useState<Record<string, number>>({});
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

  function activeItem(group: string, length: number) {
    return Math.min(activeItems[group] ?? 0, Math.max(length - 1, 0));
  }

  function selectItem(group: string, index: number) {
    setActiveItems((current) => ({ ...current, [group]: index }));
  }

  function addProduct() {
    const nextIndex = content.product.items.length;
    const baseProduct = content.product.items[0];
    const nextProduct: ProductItem = {
      id: `product-${Date.now().toString(36)}`,
      name: 'Новый продукт',
      title: 'Новый продукт B-POWER',
      mobileTitle: '',
      subtitle: baseProduct?.subtitle ?? '',
      bullets: baseProduct?.bullets?.length ? [...baseProduct.bullets] : ['Описание преимущества продукта'],
      image: baseProduct?.image ?? '/assets/images/figma-product-main.webp',
      thumbnail: baseProduct?.thumbnail ?? baseProduct?.image ?? '/assets/images/figma-product-main.webp',
      alt: 'B-POWER'
    };

    updateContent((draft) => {
      draft.product.items.push(nextProduct);
    });
    selectItem('product-items', nextIndex);
    setStatus('Продукт добавлен. Заполните поля и нажмите «Сохранить изменения».');
  }

  function deleteProduct(index: number) {
    if (content.product.items.length <= 1) {
      setStatus('Нельзя удалить последний продукт.');
      return;
    }

    const productName = content.product.items[index]?.name || `продукт ${index + 1}`;
    const confirmed = window.confirm(`Удалить ${productName}? Действие нельзя отменить.`);
    if (!confirmed) return;

    updateContent((draft) => {
      draft.product.items.splice(index, 1);
    });
    selectItem('product-items', Math.max(0, index - 1));
    setStatus('Продукт удалён. Нажмите «Сохранить изменения», чтобы обновить сайт.');
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

  async function onUploadFooterPdf(index: number, file: File) {
    setLoading(true);
    setStatus('');
    const result = await uploadDocument(file, token);
    setLoading(false);
    if (!result.ok || !result.data) {
      setStatus(result.error ?? 'Не удалось загрузить PDF');
      return;
    }
    const uploaded = result.data;
    updateContent((draft) => {
      draft.footer.links[index].href = uploaded.url;
      draft.footer.links[index].noIndex = true;
    });
    setStatus('PDF загружен. Нажмите «Сохранить изменения», чтобы обновить ссылку на сайте.');
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

  async function onDeleteLead(id: string) {
    if (!token) return;
    const confirmed = window.confirm('Удалить эту заявку? Действие нельзя отменить.');
    if (!confirmed) return;

    setLoading(true);
    setStatus('');
    const result = await deleteLead(id, token);
    setLoading(false);
    if (!result.ok) {
      setStatus(result.error ?? 'Не удалось удалить заявку');
      return;
    }
    setLeads((current) => current.filter((lead) => lead.id !== id));
    setStatus('Заявка удалена.');
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
            <AdminCheckbox
              label="Клик по логотипу поднимает вверх"
              checked={content.brand.logoScrollTop !== false}
              onChange={(checked) => updateContent((draft) => { draft.brand.logoScrollTop = checked; })}
            />
          </section>

          <section className="admin-card">
            <h2>Навигация и контакты</h2>
            <AdminItemTabs
              group="nav"
              items={content.nav}
              activeIndex={activeItem('nav', content.nav.length)}
              onSelect={(index) => selectItem('nav', index)}
              getLabel={(item, index) => item.label || `Пункт ${index + 1}`}
            >
              {(item, index) => (
                <div className="admin-repeat">
                  <h3>Пункт меню {index + 1}</h3>
                  <AdminField label="Текст" value={item.label} onChange={(value) => updateContent((draft) => { draft.nav[index].label = value; })} />
                  <AdminField label="Ссылка" value={item.href} onChange={(value) => updateContent((draft) => { draft.nav[index].href = value; })} />
                </div>
              )}
            </AdminItemTabs>
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
            <AdminSelect
              label="Режим таймера"
              value={getCountdownMode(content)}
              options={[
                { value: 'target', label: 'Авто: считать до даты' },
                { value: 'manual', label: 'Ручной: значения ниже' }
              ]}
              onChange={(value) => updateContent((draft) => { draft.hero.countdownMode = value; })}
            />
            <div className="admin-inline-fields">
              <AdminField
                label="Дата старта"
                type="date"
                value={getCountdownDate(content.hero.countdownTarget)}
                onChange={(value) => updateContent((draft) => {
                  draft.hero.countdownMode = 'target';
                  draft.hero.countdownTarget = buildCountdownTarget(value, getCountdownTime(draft.hero.countdownTarget), getCountdownOffset(draft.hero.countdownTarget));
                })}
              />
              <AdminField
                label="Время старта"
                type="time"
                value={getCountdownTime(content.hero.countdownTarget)}
                onChange={(value) => updateContent((draft) => {
                  draft.hero.countdownMode = 'target';
                  draft.hero.countdownTarget = buildCountdownTarget(getCountdownDate(draft.hero.countdownTarget), value, getCountdownOffset(draft.hero.countdownTarget));
                })}
              />
              <AdminField
                label="Часовой пояс"
                value={getCountdownOffset(content.hero.countdownTarget)}
                onChange={(value) => updateContent((draft) => {
                  draft.hero.countdownMode = 'target';
                  draft.hero.countdownTarget = buildCountdownTarget(getCountdownDate(draft.hero.countdownTarget), getCountdownTime(draft.hero.countdownTarget), value);
                })}
              />
            </div>
            <AdminField label="Дата старта ISO" value={content.hero.countdownTarget ?? ''} onChange={(value) => updateContent((draft) => { draft.hero.countdownTarget = value || undefined; })} />
            <p className="admin-help">В авто-режиме сайт сам считает время до даты старта. В ручном режиме показываются значения из вкладок таймера ниже.</p>
            <AdminItemTabs
              group="countdown"
              items={content.hero.countdown}
              activeIndex={activeItem('countdown', content.hero.countdown.length)}
              onSelect={(index) => selectItem('countdown', index)}
              getLabel={(item, index) => item.label || `Таймер ${index + 1}`}
            >
              {(item, index) => (
                <div className="admin-repeat">
                  <h3>Таймер {index + 1}</h3>
                  <AdminField label="Значение fallback" value={item.value} onChange={(value) => updateContent((draft) => { draft.hero.countdown[index].value = value; })} />
                  <AdminField label="Подпись" value={item.label} onChange={(value) => updateContent((draft) => { draft.hero.countdown[index].label = value; })} />
                </div>
              )}
            </AdminItemTabs>
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
            <div className="admin-card__buttons">
              <button className="button button--light" type="button" onClick={addProduct}>Добавить продукт</button>
            </div>
            <AdminItemTabs
              group="product-items"
              items={content.product.items}
              activeIndex={activeItem('product-items', content.product.items.length)}
              onSelect={(index) => selectItem('product-items', index)}
              getLabel={(item, index) => item.name || item.title || `Продукт ${index + 1}`}
            >
              {(item, index) => (
                <ProductEditor
                  item={item}
                  index={index}
                  updateContent={updateContent}
                  canDelete={content.product.items.length > 1}
                  onDelete={() => deleteProduct(index)}
                />
              )}
            </AdminItemTabs>
          </section>

          <section className="admin-card">
            <h2>Вес</h2>
            <AdminItemTabs
              group="weights"
              items={content.product.weights}
              activeIndex={activeItem('weights', content.product.weights.length)}
              onSelect={(index) => selectItem('weights', index)}
              getLabel={(weight, index) => weight.value || `Вес ${index + 1}`}
            >
              {(weight, index) => (
                <div className="admin-repeat">
                  <h3>Вес {index + 1}</h3>
                  <AdminField label="Значение" value={weight.value} onChange={(value) => updateContent((draft) => { draft.product.weights[index].value = value; })} />
                  <AdminField label="Подпись" value={weight.label} onChange={(value) => updateContent((draft) => { draft.product.weights[index].label = value; })} />
                  <AssetField label="Фото при наведении" value={weight.image ?? ''} onChange={(value) => updateContent((draft) => { draft.product.weights[index].image = value || undefined; })} />
                </div>
              )}
            </AdminItemTabs>
          </section>

          <section className="admin-card">
            <h2>Фичи и иконки</h2>
            <AdminItemTabs
              group="features"
              items={content.product.features}
              activeIndex={activeItem('features', content.product.features.length)}
              onSelect={(index) => selectItem('features', index)}
              getLabel={(feature, index) => feature.title || `Фича ${index + 1}`}
            >
              {(feature, index) => (
                <div className="admin-repeat">
                  <h3>Фича {index + 1}</h3>
                  <AdminField label="ID" value={feature.id} onChange={(value) => updateContent((draft) => { draft.product.features[index].id = value; })} />
                  <AdminField label="Название" value={feature.title} onChange={(value) => updateContent((draft) => { draft.product.features[index].title = value; })} />
                  <AdminArea label="Текст" value={feature.text} onChange={(value) => updateContent((draft) => { draft.product.features[index].text = value; })} />
                  <AssetField label="Иконка: ключ или /assets/icons/file.svg" value={feature.icon} onChange={(value) => updateContent((draft) => { draft.product.features[index].icon = value; })} />
                </div>
              )}
            </AdminItemTabs>
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
            <AdminItemTabs
              group="about-cards"
              items={content.about.cards}
              activeIndex={activeItem('about-cards', content.about.cards.length)}
              onSelect={(index) => selectItem('about-cards', index)}
              getLabel={(card, index) => card.title || `Карточка ${index + 1}`}
            >
              {(card, index) => (
                <div className="admin-repeat">
                  <h3>Карточка {index + 1}</h3>
                  <AdminField label="Название" value={card.title} onChange={(value) => updateContent((draft) => { draft.about.cards[index].title = value; })} />
                  <AdminArea label="Текст" value={card.text} onChange={(value) => updateContent((draft) => { draft.about.cards[index].text = value; })} />
                  <AssetField label="Картинка" value={card.image} onChange={(value) => updateContent((draft) => { draft.about.cards[index].image = value; })} />
                  <AdminField label="Alt" value={card.alt} onChange={(value) => updateContent((draft) => { draft.about.cards[index].alt = value; })} />
                </div>
              )}
            </AdminItemTabs>
          </section>

          <section className="admin-card">
            <h2>Для кого</h2>
            <AdminField label="Лейбл" value={content.audience.sectionLabel} onChange={(value) => updateContent((draft) => { draft.audience.sectionLabel = value; })} />
            <AdminArea label="Заголовок" value={content.audience.title} onChange={(value) => updateContent((draft) => { draft.audience.title = value; })} />
            <AdminItemTabs
              group="audience"
              items={content.audience.items}
              activeIndex={activeItem('audience', content.audience.items.length)}
              onSelect={(index) => selectItem('audience', index)}
              getLabel={(item, index) => item.title || `Карточка ${index + 1}`}
            >
              {(item, index) => <AudienceEditor item={item} index={index} updateContent={updateContent} />}
            </AdminItemTabs>
          </section>

          <section className="admin-card admin-card--wide">
            <h2>Факты</h2>
            <AdminField label="Лейбл" value={content.facts.sectionLabel} onChange={(value) => updateContent((draft) => { draft.facts.sectionLabel = value; })} />
            <AdminArea label="Заголовок" value={content.facts.title} onChange={(value) => updateContent((draft) => { draft.facts.title = value; })} />
            <AssetField label="Картинка" value={content.facts.image} onChange={(value) => updateContent((draft) => { draft.facts.image = value; })} />
            <AssetField label="Картинка mobile" value={content.facts.mobileImage ?? ''} onChange={(value) => updateContent((draft) => { draft.facts.mobileImage = value || undefined; })} />
            <AdminField label="Alt картинки" value={content.facts.imageAlt} onChange={(value) => updateContent((draft) => { draft.facts.imageAlt = value; })} />
            <AdminItemTabs
              group="facts"
              items={content.facts.items}
              activeIndex={activeItem('facts', content.facts.items.length)}
              onSelect={(index) => selectItem('facts', index)}
              getLabel={(item, index) => item.title || `Факт ${index + 1}`}
            >
              {(item, index) => <FactEditor item={item} index={index} updateContent={updateContent} />}
            </AdminItemTabs>
          </section>
        </div>
      )}

      {tab === 'footer' && (
        <div className="admin-grid">
          <section className="admin-card admin-card--wide">
            <h2>Футер</h2>
            <AdminArea label="Слоган" value={content.footer.tagline} onChange={(value) => updateContent((draft) => { draft.footer.tagline = value; })} />
            <AdminArea label="Юридический текст" value={content.footer.legal} onChange={(value) => updateContent((draft) => { draft.footer.legal = value; })} />
            <AdminItemTabs
              group="footer-links"
              items={content.footer.links}
              activeIndex={activeItem('footer-links', content.footer.links.length)}
              onSelect={(index) => selectItem('footer-links', index)}
              getLabel={(item, index) => item.label || `Ссылка ${index + 1}`}
            >
              {(item, index) => (
                <div className="admin-repeat">
                  <h3>Ссылка {index + 1}</h3>
                  <AdminField label="Текст" value={item.label} onChange={(value) => updateContent((draft) => { draft.footer.links[index].label = value; })} />
                  <DocumentField
                    label="PDF / ссылка"
                    value={item.href}
                    disabled={loading}
                    onChange={(value) => updateContent((draft) => { draft.footer.links[index].href = value; })}
                    onUpload={(file) => void onUploadFooterPdf(index, file)}
                  />
                </div>
              )}
            </AdminItemTabs>
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
                  <th></th>
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
                    <td>
                      <button className="admin-table__delete" type="button" onClick={() => void onDeleteLead(lead.id)} disabled={loading}>
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
                {!leads.length && <tr><td colSpan={7}>Заявок пока нет.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

type AdminItemTabsProps<T> = {
  group: string;
  items: T[];
  activeIndex: number;
  onSelect: (index: number) => void;
  getLabel: (item: T, index: number) => string;
  children: (item: T, index: number) => ReactNode;
};

function AdminItemTabs<T>({ group, items, activeIndex, onSelect, getLabel, children }: AdminItemTabsProps<T>) {
  if (!items.length) return <p className="admin-help">Элементов пока нет.</p>;

  const currentIndex = Math.min(activeIndex, items.length - 1);
  return (
    <div className="admin-subtabs" data-group={group}>
      <div className="admin-subtabs__list" role="tablist" aria-label={group}>
        {items.map((item, index) => (
          <button
            type="button"
            role="tab"
            key={`${group}-${index}`}
            className={index === currentIndex ? 'active' : ''}
            aria-selected={index === currentIndex}
            onClick={() => onSelect(index)}
          >
            {getLabel(item, index)}
          </button>
        ))}
      </div>
      <div className="admin-subtabs__panel" role="tabpanel">
        {children(items[currentIndex], currentIndex)}
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
};

function AdminField({ label, value, onChange, type = 'text' }: FieldProps) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

type SelectProps = {
  label: string;
  value: CountdownMode;
  options: Array<{ value: CountdownMode; label: string }>;
  onChange: (value: CountdownMode) => void;
};

function AdminSelect({ label, value, options, onChange }: SelectProps) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as CountdownMode)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function AdminCheckbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <label className="admin-field admin-checkbox">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
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

type DocumentFieldProps = FieldProps & {
  disabled?: boolean;
  onUpload: (file: File) => void;
};

function DocumentField({ label, value, onChange, disabled = false, onUpload }: DocumentFieldProps) {
  return (
    <label className="admin-field admin-field--document">
      <span>{label}</span>
      <input type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder="/assets/docs/file.pdf" />
      <input
        type="file"
        accept="application/pdf,.pdf"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) onUpload(file);
        }}
      />
      <small>PDF открывается в новой вкладке. Файлы из загрузки сервер отдаёт с запретом индексации.</small>
    </label>
  );
}

type EditorProps<T> = {
  item: T;
  index: number;
  updateContent: (mutator: (draft: LandingContent) => void) => void;
};

type ProductEditorProps = EditorProps<ProductItem> & {
  canDelete: boolean;
  onDelete: () => void;
};

function ProductEditor({ item, index, updateContent, canDelete, onDelete }: ProductEditorProps) {
  return (
    <div className="admin-repeat">
      <div className="admin-repeat__top">
        <h3>Продукт {index + 1}</h3>
        <button className="admin-danger-button" type="button" onClick={onDelete} disabled={!canDelete}>Удалить продукт</button>
      </div>
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
