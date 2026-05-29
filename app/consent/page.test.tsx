import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ConsentPage from './page';
import type { AppData } from '@/types';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  getUserData: vi.fn(),
  saveUserData: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mocks.replace,
  }),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { uid: 'user-1', email: 'test@example.com' },
    loading: false,
  }),
}));

vi.mock('@/lib/firestore', () => ({
  getUserData: mocks.getUserData,
  saveUserData: mocks.saveUserData,
}));

function appData(): AppData {
  return {
    todaySchedules: [],
    roastSchedules: [],
    tastingSessions: [],
    tastingRecords: [],
    notifications: [],
    encouragementCount: 0,
    roastTimerRecords: [],
    dripRecipes: [],
  };
}

describe('ConsentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date('2026-05-28T00:00:00.000Z'));
    mocks.getUserData.mockResolvedValue(appData());
    mocks.saveUserData.mockResolvedValue(undefined);
  });

  it('同意保存ではuserConsentだけを保存対象にする', async () => {
    render(<ConsentPage />);

    const submit = await screen.findByRole('button', { name: '同意して続ける' });

    fireEvent.click(screen.getByRole('checkbox', { name: /利用規約/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /プライバシーポリシー/ }));
    fireEvent.click(submit);

    await waitFor(() => {
      expect(mocks.saveUserData).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          userConsent: expect.objectContaining({ hasAgreed: true }),
          tastingSessions: [],
          tastingRecords: [],
        }),
        { updatedFields: ['userConsent'] }
      );
    });
  });
});
