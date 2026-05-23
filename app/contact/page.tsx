'use client';

import { useRef, useState } from 'react';
import { HiMail, HiExclamationCircle } from 'react-icons/hi';
import { ContactSuccessScreen } from '@/components/contact/ContactSuccessScreen';
import { ContactFormFields } from '@/components/contact/ContactFormFields';
import { Button, Card, FloatingNav } from '@/components/ui';
import {
  getStoredContactCooldownWaitSeconds,
  normalizeContactFormData,
  storeContactSuccessTimestamp,
  validateContactForm,
} from '@/lib/contactForm';
import {
  sendContactEmail,
  isEmailJSConfigured,
  ContactFormData,
} from '@/lib/emailjs';

type FormStatus = 'idle' | 'sending' | 'success' | 'error';

export default function ContactPage() {
  const isSubmittingRef = useRef(false);
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    type: 'question',
    message: '',
  });
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<keyof ContactFormData, string>>
  >({});

  const validateForm = (data: ContactFormData): boolean => {
    const result = validateContactForm(data);
    setValidationErrors(result.errors);
    return result.isValid;
  };

  const getCooldownStorage = (): Storage | null => {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      return window.localStorage;
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmittingRef.current) {
      return;
    }

    setErrorMessage('');

    const normalizedFormData = normalizeContactFormData(formData);

    if (!validateForm(normalizedFormData)) {
      return;
    }

    const waitSeconds = getStoredContactCooldownWaitSeconds(getCooldownStorage());
    if (waitSeconds > 0) {
      setStatus('error');
      setErrorMessage(
        `送信が続いています。少し時間をおいて再度お試しください（約${waitSeconds}秒後に送信できます）。`
      );
      return;
    }

    if (!isEmailJSConfigured()) {
      setStatus('error');
      setErrorMessage('お問い合わせ機能の設定が完了していません。直接メールでお問い合わせください。');
      return;
    }

    isSubmittingRef.current = true;
    setStatus('sending');

    try {
      await sendContactEmail(normalizedFormData);
      storeContactSuccessTimestamp(getCooldownStorage());
      setStatus('success');
      setFormData({
        name: '',
        email: '',
        type: 'question',
        message: '',
      });
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '送信に失敗しました');
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const fieldName = name as keyof ContactFormData;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // 入力時にそのフィールドのエラーをクリア
    if (validationErrors[fieldName]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  if (status === 'success') {
    return <ContactSuccessScreen />;
  }

  return (
    <div className="min-h-screen pt-14 pb-4 sm:pb-6 lg:pb-8 px-4 sm:px-6 lg:px-8 bg-page">
      <FloatingNav backHref="/settings" />
      <div className="max-w-2xl mx-auto">
        <main>
          <Card className="p-6">
            {/* エラーメッセージ */}
            {status === 'error' && errorMessage && (
              <div className="mb-6 p-4 bg-danger-subtle border border-danger rounded-lg flex items-start gap-3">
                <HiExclamationCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-danger font-medium">エラーが発生しました</p>
                  <p className="text-danger text-sm mt-1">{errorMessage}</p>
                  <p className="text-danger text-sm mt-2">
                    直接メールでのお問い合わせ:{' '}
                    <a
                      href="mailto:kensaku.ikeda04@gmail.com"
                      className="underline hover:no-underline"
                    >
                      kensaku.ikeda04@gmail.com
                    </a>
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <ContactFormFields
                formData={formData}
                validationErrors={validationErrors}
                onInputChange={handleInputChange}
              />

              {/* 送信ボタン */}
              <div className="pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={status === 'sending'}
                  disabled={status === 'sending'}
                >
                  {status === 'sending' ? (
                    '送信中...'
                  ) : (
                    <>
                      <HiMail className="h-5 w-5" />
                      送信する
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* 運営者情報 */}
            <div className="mt-8 pt-6 border-t border-edge">
              <p className="text-sm text-ink-muted text-center">
                直接メールでのお問い合わせ:{' '}
                <a
                  href="mailto:kensaku.ikeda04@gmail.com"
                  className="text-spot hover:text-spot-hover underline"
                >
                  kensaku.ikeda04@gmail.com
                </a>
              </p>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
