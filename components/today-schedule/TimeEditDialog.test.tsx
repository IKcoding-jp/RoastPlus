import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TimeEditDialog } from './TimeEditDialog';

describe('TimeEditDialog', () => {
  it('削除ボタンはdangerの塗りスタイルを白背景で上書きしない', () => {
    render(
      <TimeEditDialog
        initialHour="10"
        initialMinute="00"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        labels={[
          {
            id: 'label-1',
            time: '10:00',
            content: '',
          },
        ]}
        onDeleteLabel={vi.fn()}
      />
    );

    const deleteButton = screen.getByRole('button', { name: '削除' });

    expect(deleteButton.className).toContain('bg-danger');
    expect(deleteButton.className).toContain('text-white');
    expect(deleteButton.className).not.toContain('bg-white');
  });
});
