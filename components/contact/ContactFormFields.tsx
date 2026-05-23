'use client';

import { CONTACT_FORM_LIMITS } from '@/lib/contactForm';
import { CONTACT_TYPES, ContactFormData } from '@/lib/emailjs';
import { Input, Select, Textarea } from '@/components/ui';

interface ContactFormFieldsProps {
  formData: ContactFormData;
  validationErrors: Partial<Record<keyof ContactFormData, string>>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

export function ContactFormFields({
  formData,
  validationErrors,
  onInputChange,
}: ContactFormFieldsProps) {
  const isMessageAtLimit = formData.message.length >= CONTACT_FORM_LIMITS.messageMax;

  return (
    <>
      {/* お名前 */}
      <Input
        label="お名前（任意）"
        id="name"
        name="name"
        type="text"
        value={formData.name}
        onChange={onInputChange}
        placeholder="山田 太郎"
        maxLength={CONTACT_FORM_LIMITS.name}
        error={validationErrors.name}
      />

      {/* メールアドレス */}
      <Input
        label="メールアドレス（必須）"
        id="email"
        name="email"
        type="email"
        value={formData.email}
        onChange={onInputChange}
        placeholder="example@email.com"
        maxLength={CONTACT_FORM_LIMITS.email}
        error={validationErrors.email}
      />

      {/* お問い合わせ種別 */}
      <Select
        label="お問い合わせ種別（必須）"
        id="type"
        name="type"
        value={formData.type}
        onChange={onInputChange}
        options={CONTACT_TYPES.map((type) => ({
          value: type.value,
          label: type.label,
        }))}
      />

      {/* お問い合わせ内容 */}
      <div>
        <Textarea
          label="お問い合わせ内容（必須）"
          id="message"
          name="message"
          value={formData.message}
          onChange={onInputChange}
          rows={6}
          placeholder="お問い合わせ内容をご記入ください"
          maxLength={CONTACT_FORM_LIMITS.messageMax}
          error={validationErrors.message}
        />
        <p
          className={`mt-1 text-right text-sm ${
            isMessageAtLimit ? 'text-warning' : 'text-ink-muted'
          }`}
          aria-live="polite"
        >
          {formData.message.length} / {CONTACT_FORM_LIMITS.messageMax}文字
        </p>
      </div>
    </>
  );
}
