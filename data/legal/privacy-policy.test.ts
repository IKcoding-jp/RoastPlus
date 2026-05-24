import { describe, expect, it } from 'vitest';

import { PRIVACY_POLICY_SECTIONS } from './privacy-policy';

describe('PRIVACY_POLICY_SECTIONS', () => {
  const policyText = PRIVACY_POLICY_SECTIONS.flatMap((section) => [section.title, ...section.content]).join('\n');

  it('OpenAIとEmailJSへの外部送信内容と注意点を説明している', () => {
    expect(policyText).toContain('OpenAI');
    expect(policyText).toContain('EmailJS');
    expect(policyText).toContain('OCR対象画像');
    expect(policyText).toContain('試飲コメント');
    expect(policyText).toContain('問い合わせフォーム');
    expect(policyText).toContain('不要な個人情報や機密情報');
    expect(policyText).toContain('APIキーやシークレット');
  });

  it('欠点豆図鑑の名称で説明している', () => {
    expect(policyText).toContain('欠点豆図鑑');
    expect(policyText).not.toContain('コーヒー豆図鑑');
  });
});
