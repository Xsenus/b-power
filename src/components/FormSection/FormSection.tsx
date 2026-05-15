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
        <div className="lead-panel" id="lead-form">
          <div className="lead-panel__content">
            <SectionLabel>{form.sectionLabel}</SectionLabel>
            <h2 className="section-title lead-panel__title">
              <span className="responsive-copy responsive-copy--desktop">{brandVariant(form.title)}</span>
              <span className="responsive-copy responsive-copy--mobile">{form.mobileTitle ?? brandVariant(form.title)}</span>
            </h2>
            <p className="lead-panel__text">{form.text}</p>
          </div>

          <form className="lead-form" onSubmit={onSubmit} noValidate>
            <div className="field">
              <label className="sr-only" htmlFor={nameId}>Имя</label>
              <span className="field__icon field__icon--user" aria-hidden="true" />
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
              <span className="field__icon field__icon--phone" aria-hidden="true" />
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

            <button className="button button--light lead-form__button" type="submit" disabled={status === 'loading' || status === 'success'}>
              {status === 'loading' ? 'Отправляем...' : (
                <>
                  <span className="form-button-copy form-button-copy--desktop">{form.buttonText}</span>
                  <span className="form-button-copy form-button-copy--mobile">{form.mobileButtonText ?? form.buttonText}</span>
                </>
              )}
            </button>
          </form>

          <p className="lead-panel__consent">{form.consent}</p>
          {message && (
            <div className={`lead-message lead-message--${status}`} role="status">
              {status === 'success' && <strong>{form.successTitle}</strong>}
              <span>{message}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
