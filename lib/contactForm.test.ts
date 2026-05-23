import { describe, expect, it } from 'vitest';

import type { ContactFormData } from './emailjs';
import {
  CONTACT_FORM_COOLDOWN_MS,
  CONTACT_FORM_LIMITS,
  getContactCooldownWaitSeconds,
  getStoredContactCooldownWaitSeconds,
  storeContactSuccessTimestamp,
  validateContactForm,
} from './contactForm';

const createValidFormData = (
  overrides: Partial<ContactFormData> = {}
): ContactFormData => ({
  name: '山田 太郎',
  email: 'test@example.com',
  type: 'question',
  message: 'お問い合わせ内容の詳細です。',
  ...overrides,
});

describe('validateContactForm', () => {
  it('長すぎる名前を拒否する', () => {
    const result = validateContactForm(
      createValidFormData({ name: 'あ'.repeat(CONTACT_FORM_LIMITS.name + 1) })
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBe(
      `お名前は${CONTACT_FORM_LIMITS.name}文字以内で入力してください`
    );
  });

  it('不正なメールアドレスを拒否する', () => {
    const result = validateContactForm(
      createValidFormData({ email: 'invalid-email' })
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBe('有効なメールアドレスを入力してください');
  });

  it('長すぎるメールアドレスを拒否する', () => {
    const result = validateContactForm(
      createValidFormData({
        email: `${'a'.repeat(CONTACT_FORM_LIMITS.email - '@example.com'.length + 1)}@example.com`,
      })
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBe(
      `メールアドレスは${CONTACT_FORM_LIMITS.email}文字以内で入力してください`
    );
  });

  it('短すぎる本文を拒否する', () => {
    const result = validateContactForm(createValidFormData({ message: '短い' }));

    expect(result.isValid).toBe(false);
    expect(result.errors.message).toBe(
      `お問い合わせ内容は${CONTACT_FORM_LIMITS.messageMin}文字以上で入力してください`
    );
  });

  it('長すぎる本文を拒否する', () => {
    const result = validateContactForm(
      createValidFormData({
        message: 'あ'.repeat(CONTACT_FORM_LIMITS.messageMax + 1),
      })
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.message).toBe(
      `お問い合わせ内容は${CONTACT_FORM_LIMITS.messageMax}文字以内で入力してください`
    );
  });

  it('有効な内容を受け付ける', () => {
    const result = validateContactForm(createValidFormData());

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });
});

describe('getContactCooldownWaitSeconds', () => {
  it('cooldown中は残り秒数を返す', () => {
    const now = 1_000_000;
    const lastSuccessAt = now - 30_000;

    expect(getContactCooldownWaitSeconds(lastSuccessAt, now)).toBe(
      Math.ceil((CONTACT_FORM_COOLDOWN_MS - 30_000) / 1000)
    );
  });

  it('cooldown経過後は0秒を返す', () => {
    const now = 1_000_000;
    const lastSuccessAt = now - CONTACT_FORM_COOLDOWN_MS - 1;

    expect(getContactCooldownWaitSeconds(lastSuccessAt, now)).toBe(0);
  });
});

describe('contact cooldown storage helpers', () => {
  it('保存済みの送信成功時刻からcooldown残り秒数を返す', () => {
    const now = 1_000_000;
    const storage = {
      getItem: () => String(now - 10_000),
    };

    expect(getStoredContactCooldownWaitSeconds(storage, now)).toBe(
      Math.ceil((CONTACT_FORM_COOLDOWN_MS - 10_000) / 1000)
    );
  });

  it('localStorageが読めない環境では送信を妨げない', () => {
    const storage = {
      getItem: () => {
        throw new Error('storage unavailable');
      },
    };

    expect(getStoredContactCooldownWaitSeconds(storage)).toBe(0);
  });

  it('localStorageが書けない環境でも例外を投げない', () => {
    const storage = {
      setItem: () => {
        throw new Error('storage unavailable');
      },
    };

    expect(() => storeContactSuccessTimestamp(storage)).not.toThrow();
  });
});
