import { FormEvent, useEffect, useState } from 'react';
import type { AudienceItem, FactItem, LandingContent, Lead, ProductItem } from '../../data/types';
import { exportLeads, fetchContent, fetchLeads, loginAdmin, saveContent } from '../../utils/api';

type AdminProps = {
  initialContent: LandingContent;
};

type AdminTab = 'content' | 'products' | 'leads';

export function Admin({ initialContent }: AdminProps) {
  const [token, setToken] = useState(() => sessionStorage.getItem('bpower-admin-token') ?? '');
  const [password, setPassword] = useState('');
  const [content, setContent] = useState<LandingContent>(initialContent);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tab, setTab] = useState<AdminTab>('content');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;

    fetchContent().then((result) => {
      if (result.ok && result.data) setContent(result.data);
    });

    fetchLeads(token).then((result) => {
      if (result.ok && result.data) setLeads(result.data);
    });
  }, [token]);

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
    if (result.ok && result.data) setContent(result.data);
  }

  async function reloadLeads() {
    if (!token) return;
    const result = await fetchLeads(token);
    if (result.ok && result.data) setLeads(result.data);
  }

  function updateContent(mutator: (draft: LandingContent) => void) {
    setContent((current) => {
      const draft = structuredClone(current);
      mutator(draft);
      return draft;
    });
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
    setContent(result.data);
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
          <img src="/assets/images/logo-transparent.png" alt="B-POWER" />
          <h1>Админка B-POWER</h1>
          <label>
            Пароль
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
            />
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
        <a href="/" aria-label="На лендинг"><img src="/assets/images/logo-transparent.png" alt="B-POWER" /></a>
        <div>
          <h1>Панель управления</h1>
          <p>Редактирование контента лендинга и просмотр заявок.</p>
        </div>
        <button className="admin__logout" type="button" onClick={onLogout}>Выйти</button>
      </header>

      <div className="admin__tabs" role="tablist" aria-label="Разделы админки">
        <button type="button" className={tab === 'content' ? 'active' : ''} onClick={() => setTab('content')}>Тексты</button>
        <button type="button" className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>Продукты</button>
        <button type="button" className={tab === 'leads' ? 'active' : ''} onClick={() => { setTab('leads'); void reloadLeads(); }}>Заявки</button>
      </div>

      {tab !== 'leads' && (
        <div className="admin__actions">
          <button className="button button--light" type="button" onClick={onSave} disabled={loading}>{loading ? 'Сохраняем...' : 'Сохранить изменения'}</button>
          <button className="button button--dark" type="button" onClick={() => void reloadContent()}>Сбросить к сохранённому</button>
        </div>
      )}

      {status && <p className="admin-status">{status}</p>}

      {tab === 'content' && (
        <div className="admin-grid">
          <section className="admin-card">
            <h2>SEO</h2>
            <AdminField label="Title" value={content.seo.title} onChange={(value) => updateContent((draft) => { draft.seo.title = value; })} />
            <AdminArea label="Description" value={content.seo.description} onChange={(value) => updateContent((draft) => { draft.seo.description = value; })} />
            <AdminField label="Canonical" value={content.seo.canonical} onChange={(value) => updateContent((draft) => { draft.seo.canonical = value; })} />
            <AdminField label="OG image" value={content.seo.ogImage} onChange={(value) => updateContent((draft) => { draft.seo.ogImage = value; })} />
          </section>

          <section className="admin-card">
            <h2>Первый экран</h2>
            <AdminField label="Лейбл" value={content.hero.eyebrow} onChange={(value) => updateContent((draft) => { draft.hero.eyebrow = value; })} />
            <AdminArea label="Заголовок" value={content.hero.title} onChange={(value) => updateContent((draft) => { draft.hero.title = value; })} />
            <AdminArea label="Текст" value={content.hero.subtitle} onChange={(value) => updateContent((draft) => { draft.hero.subtitle = value; })} />
            <AdminField label="Кнопка" value={content.hero.buttonText} onChange={(value) => updateContent((draft) => { draft.hero.buttonText = value; })} />
            <AdminField label="Фон" value={content.hero.image} onChange={(value) => updateContent((draft) => { draft.hero.image = value; })} />
            <AdminField label="Подпись счётчика" value={content.hero.countdownLabel} onChange={(value) => updateContent((draft) => { draft.hero.countdownLabel = value; })} />
            <AdminField label="Дата старта ISO" value={content.hero.countdownTarget ?? ''} onChange={(value) => updateContent((draft) => { draft.hero.countdownTarget = value || undefined; })} />
          </section>

          <section className="admin-card">
            <h2>Основа продукта</h2>
            <AdminArea label="Заголовок" value={content.about.title} onChange={(value) => updateContent((draft) => { draft.about.title = value; })} />
            <AdminArea label="Лид" value={content.about.lead} onChange={(value) => updateContent((draft) => { draft.about.lead = value; })} />
            {content.about.cards.map((card, index) => (
              <div className="admin-repeat" key={card.title}>
                <h3>Карточка {index + 1}</h3>
                <AdminField label="Название" value={card.title} onChange={(value) => updateContent((draft) => { draft.about.cards[index].title = value; })} />
                <AdminArea label="Текст" value={card.text} onChange={(value) => updateContent((draft) => { draft.about.cards[index].text = value; })} />
                <AdminField label="Картинка" value={card.image} onChange={(value) => updateContent((draft) => { draft.about.cards[index].image = value; })} />
                <AdminField label="Alt" value={card.alt} onChange={(value) => updateContent((draft) => { draft.about.cards[index].alt = value; })} />
              </div>
            ))}
          </section>

          <section className="admin-card">
            <h2>Для кого</h2>
            <AdminArea label="Заголовок" value={content.audience.title} onChange={(value) => updateContent((draft) => { draft.audience.title = value; })} />
            {content.audience.items.map((item, index) => (
              <AudienceEditor key={`${item.title}-${index}`} item={item} index={index} updateContent={updateContent} />
            ))}
          </section>

          <section className="admin-card admin-card--wide">
            <h2>Факты и форма</h2>
            <AdminArea label="Заголовок фактов" value={content.facts.title} onChange={(value) => updateContent((draft) => { draft.facts.title = value; })} />
            <AdminField label="Картинка фактов" value={content.facts.image} onChange={(value) => updateContent((draft) => { draft.facts.image = value; })} />
            {content.facts.items.map((item, index) => (
              <FactEditor key={`${item.title}-${index}`} item={item} index={index} updateContent={updateContent} />
            ))}
            <hr />
            <AdminArea label="Заголовок формы" value={content.form.title} onChange={(value) => updateContent((draft) => { draft.form.title = value; })} />
            <AdminArea label="Текст формы" value={content.form.text} onChange={(value) => updateContent((draft) => { draft.form.text = value; })} />
            <AdminField label="Кнопка формы" value={content.form.buttonText} onChange={(value) => updateContent((draft) => { draft.form.buttonText = value; })} />
            <AdminField label="Фон формы" value={content.form.background} onChange={(value) => updateContent((draft) => { draft.form.background = value; })} />
          </section>
        </div>
      )}

      {tab === 'products' && (
        <div className="admin-grid">
          <section className="admin-card admin-card--wide">
            <h2>Область продукта</h2>
            <AdminArea label="Заголовок секции" value={content.product.title} onChange={(value) => updateContent((draft) => { draft.product.title = value; })} />
            <AdminField label="Кнопка" value={content.product.buttonText} onChange={(value) => updateContent((draft) => { draft.product.buttonText = value; })} />
            {content.product.items.map((item, index) => (
              <ProductEditor key={item.id} item={item} index={index} updateContent={updateContent} />
            ))}
          </section>

          <section className="admin-card">
            <h2>Фичи продукта</h2>
            {content.product.features.map((feature, index) => (
              <div className="admin-repeat" key={feature.id}>
                <h3>Фича {index + 1}</h3>
                <AdminField label="Название" value={feature.title} onChange={(value) => updateContent((draft) => { draft.product.features[index].title = value; })} />
                <AdminArea label="Текст" value={feature.text} onChange={(value) => updateContent((draft) => { draft.product.features[index].text = value; })} />
                <AdminField label="Иконка" value={feature.icon} onChange={(value) => updateContent((draft) => { draft.product.features[index].icon = value; })} />
              </div>
            ))}
          </section>
        </div>
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
      <AdminField label="Вкус/название" value={item.name} onChange={(value) => updateContent((draft) => { draft.product.items[index].name = value; })} />
      <AdminArea label="Заголовок" value={item.title} onChange={(value) => updateContent((draft) => { draft.product.items[index].title = value; })} />
      <AdminField label="Подзаголовок" value={item.subtitle} onChange={(value) => updateContent((draft) => { draft.product.items[index].subtitle = value; })} />
      <AdminArea label="Пункты, каждый с новой строки" value={item.bullets.join('\n')} onChange={(value) => updateContent((draft) => { draft.product.items[index].bullets = value.split('\n').filter(Boolean); })} />
      <AdminField label="Картинка" value={item.image} onChange={(value) => updateContent((draft) => { draft.product.items[index].image = value; })} />
      <AdminField label="Миниатюра" value={item.thumbnail} onChange={(value) => updateContent((draft) => { draft.product.items[index].thumbnail = value; })} />
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
      <AdminField label="Тон: light/dark/image" value={item.tone ?? ''} onChange={(value) => updateContent((draft) => { draft.audience.items[index].tone = value; })} />
      <AdminField label="Картинка" value={item.image ?? ''} onChange={(value) => updateContent((draft) => { draft.audience.items[index].image = value || undefined; })} />
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
