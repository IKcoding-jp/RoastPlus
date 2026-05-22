import { getUsageDocId, getUsageWindowId } from './rate-limit-helpers';

describe('getUsageWindowId', () => {
  it('指定したタイムゾーンの日付キーを返す', () => {
    const date = new Date('2026-05-21T15:30:00.000Z');

    expect(getUsageWindowId(date, 'Asia/Tokyo')).toBe('2026-05-22');
  });
});

describe('getUsageDocId', () => {
  it('uidと関数名をFirestoreのドキュメントID向けに安全化する', () => {
    const date = new Date('2026-05-22T00:00:00.000Z');

    expect(getUsageDocId('user/abc@example.com', 'ocrScheduleFromImage', date)).toBe(
      'user%2Fabc%40example.com_ocrScheduleFromImage_2026-05-22'
    );
  });
});
