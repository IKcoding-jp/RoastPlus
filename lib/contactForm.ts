import type { ContactFormData } from './emailjs';

export const CONTACT_FORM_LIMITS = {
  name: 50,
  email: 254,
  messageMin: 10,
  messageMax: 1500,
} as const;

export const CONTACT_FORM_COOLDOWN_MS = 2 * 60 * 1000;
export const CONTACT_FORM_COOLDOWN_STORAGE_KEY = 'roastplus-contact-last-success-at';

interface ContactFormValidationResult {
  isValid: boolean;
  errors: Partial<Record<keyof ContactFormData, string>>;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeContactFormData(formData: ContactFormData): ContactFormData {
  return {
    ...formData,
    name: formData.name.trim(),
    email: formData.email.trim(),
    message: formData.message.trim(),
  };
}

export function validateContactForm(formData: ContactFormData): ContactFormValidationResult {
  const errors: Partial<Record<keyof ContactFormData, string>> = {};
  const normalizedFormData = normalizeContactFormData(formData);

  if (normalizedFormData.name.length > CONTACT_FORM_LIMITS.name) {
    errors.name = `お名前は${CONTACT_FORM_LIMITS.name}文字以内で入力してください`;
  }

  if (!normalizedFormData.email) {
    errors.email = 'メールアドレスを入力してください';
  } else if (normalizedFormData.email.length > CONTACT_FORM_LIMITS.email) {
    errors.email = `メールアドレスは${CONTACT_FORM_LIMITS.email}文字以内で入力してください`;
  } else if (!EMAIL_PATTERN.test(normalizedFormData.email)) {
    errors.email = '有効なメールアドレスを入力してください';
  }

  if (!normalizedFormData.message) {
    errors.message = 'お問い合わせ内容を入力してください';
  } else if (normalizedFormData.message.length < CONTACT_FORM_LIMITS.messageMin) {
    errors.message = `お問い合わせ内容は${CONTACT_FORM_LIMITS.messageMin}文字以上で入力してください`;
  } else if (normalizedFormData.message.length > CONTACT_FORM_LIMITS.messageMax) {
    errors.message = `お問い合わせ内容は${CONTACT_FORM_LIMITS.messageMax}文字以内で入力してください`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function getContactCooldownWaitSeconds(lastSuccessAt: number | null, now = Date.now()): number {
  if (!lastSuccessAt || !Number.isFinite(lastSuccessAt)) {
    return 0;
  }

  const elapsedMs = now - lastSuccessAt;
  const remainingMs = CONTACT_FORM_COOLDOWN_MS - elapsedMs;

  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

export function getStoredContactCooldownWaitSeconds(
  storage: Pick<Storage, 'getItem'> | null | undefined,
  now = Date.now()
): number {
  if (!storage) {
    return 0;
  }

  try {
    const storedValue = storage.getItem(CONTACT_FORM_COOLDOWN_STORAGE_KEY);
    return getContactCooldownWaitSeconds(storedValue ? Number(storedValue) : null, now);
  } catch {
    return 0;
  }
}

export function storeContactSuccessTimestamp(
  storage: Pick<Storage, 'setItem'> | null | undefined,
  now = Date.now()
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(CONTACT_FORM_COOLDOWN_STORAGE_KEY, String(now));
  } catch {
    // localStorageが使えない環境ではcooldown保存だけを諦める。
  }
}
