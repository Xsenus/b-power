import { FormEvent, useId, useState } from 'react';
import type { CSSProperties } from 'react';
import type { FormContent } from '../../data/types';
import { brandVariant, formatPhone, isValidPhone } from '../../utils/text';
import { submitLead } from '../../utils/api';
import { SectionLabel } from '../Ui/SectionLabel';

type FormState = {
  name: string;
  phone: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

type SubmitState = 'idle' | 'loading' | 'success' | 'error';

export function FormSection({ form }: { form: FormContent }) {
  const nameId = useId();
  const phoneId = useId();
  const [values, setValues] = useState<FormState>({ name: '', phone: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<SubmitState>('idle');
  const [message, setMessage] = useState('');

  function validate(current: FormState): FormErrors {
    const nextErrors: FormErrors = {};
    if (current.name.trim().length < 2) nextErrors.name = 'Введите имя';
    if (!isValidPhone(current.phone)) nextErrors.phone = 'Введите корректный телефон';
    return nextErrors;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'loading' || status === 'success') return;

    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus('error');
      setMessage('Проверьте заполнение полей.');
      return;
    }

    setStatus('loading');
    setMessage('');
    const result = await submitLead({
      name: values.name.trim(),
      phone: values.phone.trim(),
      source: 'B-POWER landing'
    });

    if (result.ok) {
      setStatus('success');
      setMessage(form.successText);
      return;
    }

    setStatus('error');
    setMessage(result.error ?? 'Не удалось отправить заявку. Попробуйте позже.');
  }

  return (
    <section
      className="section form-section"
      id="contacts"
      style={{ '--form-image': `url(${form.background})` } as CSSProperties}
    >
      <div className="container">
        <div className={`lead-panel${status === 'success' ? ' lead-panel--success' : ''}`} id="lead-form">
          {status === 'success' ? (
            <div className="lead-panel__success" role="status">
              <a className="lead-panel__close" href="#top" aria-label="Вернуться наверх" />
              <div className="lead-panel__success-copy">
                <h2 className="section-title lead-panel__title">
                  <span className="responsive-copy responsive-copy--desktop">{form.successTitle}</span>
                  <span className="responsive-copy responsive-copy--mobile">Спасибо за интерес{'\n'}к B•POWER</span>
                </h2>
                <p className="lead-panel__text">
                  <span className="responsive-copy responsive-copy--desktop">{form.successText}</span>
                  <span className="responsive-copy responsive-copy--mobile">
                    Вы в списке — сообщим, как только продукт станет доступен
                  </span>
                </p>
              </div>
              <a className="button lead-panel__home-button" href="#top">Вернуться на главную</a>
            </div>
          ) : (
            <>
              <a className="lead-panel__close" href="#top" aria-label="Закрыть форму" />
              <div className="lead-panel__content">
                <SectionLabel>{form.sectionLabel}</SectionLabel>
                <h2 className="section-title lead-panel__title">
                  <span className="responsive-copy responsive-copy--desktop">{brandVariant(form.title)}</span>
                  <span className="responsive-copy responsive-copy--mobile">Откройте B•POWER первыми</span>
                </h2>
                <p className="lead-panel__text">
                  <span className="responsive-copy responsive-copy--desktop">{form.text}</span>
                  <span className="responsive-copy responsive-copy--mobile">
                    Получите ранний доступ к линейке B•POWER и узнайте о старте продаж раньше остальных
                  </span>
                </p>
              </div>

              <div className="lead-panel__form-block">
                <form className="lead-form" onSubmit={onSubmit} noValidate>
                  <div className="field">
                    <label className="sr-only" htmlFor={nameId}>Имя</label>
                    <img className="field__icon field__icon--user" src="/assets/icons/form-user.svg" alt="" aria-hidden="true" />
                    <input
                      id={nameId}
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder={form.namePlaceholder}
                      value={values.name}
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? `${nameId}-error` : undefined}
                      onChange={(event) => {
                        setValues((current) => ({ ...current, name: event.target.value }));
                        setErrors((current) => ({ ...current, name: undefined }));
                      }}
                    />
                    {errors.name && <span className="field__error" id={`${nameId}-error`}>{errors.name}</span>}
                  </div>

                  <div className="field">
                    <label className="sr-only" htmlFor={phoneId}>Телефон</label>
                    <img className="field__icon field__icon--phone" src="/assets/icons/form-phone.svg" alt="" aria-hidden="true" />
                    <input
                      id={phoneId}
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder={form.phonePlaceholder}
                      value={values.phone}
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby={errors.phone ? `${phoneId}-error` : undefined}
                      onChange={(event) => {
                        setValues((current) => ({ ...current, phone: formatPhone(event.target.value) }));
                        setErrors((current) => ({ ...current, phone: undefined }));
                      }}
                      onFocus={() => {
                        if (!values.phone) setValues((current) => ({ ...current, phone: '+7 ' }));
                      }}
                    />
                    {errors.phone && <span className="field__error" id={`${phoneId}-error`}>{errors.phone}</span>}
                  </div>

                  <button className="button button--light lead-form__button" type="submit" disabled={status === 'loading'}>
                    {status === 'loading' ? 'Отправляем...' : (
                      <>
                        <span className="form-button-copy form-button-copy--desktop">{form.buttonText}</span>
                        <span className="form-button-copy form-button-copy--mobile">{form.mobileButtonText ?? form.buttonText}</span>
                      </>
                    )}
                  </button>
                </form>

                <p className="lead-panel__consent">{form.consent}</p>
              </div>
            </>
          )}
        </div>
        {message && status !== 'success' && (
          <div className={`lead-message lead-message--${status}`} role="status">
            <span>{message}</span>
          </div>
        )}
      </div>
    </section>
  );
}
