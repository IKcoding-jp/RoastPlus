import { render } from '@testing-library/react';
import { TastingSessionCardMobile } from './TastingSessionCardMobile';
import type { TastingSession } from '@/types';

const session: TastingSession = {
  id: 'session-1',
  beanName: 'エチオピア',
  roastLevel: '浅煎り',
  createdAt: '2026-02-11T00:00:00.000Z',
  updatedAt: '2026-02-11T00:00:00.000Z',
  userId: 'user-1',
};

const defaultProps = {
  session,
  recordCount: 1,
  averageScores: {
    bitterness: 3,
    acidity: 4,
    body: 3,
    sweetness: 4,
    aroma: 5,
    overallRating: 4,
  },
  comments: ['明るい酸味で余韻が長い'],
  isAnalyzing: false,
  getRoastBadgeStyle: () => ({ bg: '#C8A882', text: '#3E2723', label: '浅煎り' }),
  formatDate: () => '2026.02.11',
};

describe('TastingSessionCardMobile', () => {
  it('強いフリックでもカード単位で止まりやすくする', () => {
    const { container } = render(<TastingSessionCardMobile {...defaultProps} />);

    const snapItem = container.firstElementChild;

    expect(snapItem).toHaveStyle({ scrollSnapStop: 'always' });
  });
});
