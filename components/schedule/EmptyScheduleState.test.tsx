import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyScheduleState } from './EmptyScheduleState';

describe('EmptyScheduleState', () => {
  it('message が表示される', () => {
    render(<EmptyScheduleState icon="clock" message="今日はまだありません" />);
    expect(screen.getByText('今日はまだありません')).toBeInTheDocument();
  });

  it('デフォルトのサブメッセージが表示される', () => {
    render(<EmptyScheduleState icon="clock" message="test" />);
    expect(screen.getByText('カメラで読み取るか、追加してください')).toBeInTheDocument();
  });

  it('カスタム subMessage が表示される', () => {
    render(<EmptyScheduleState icon="clock" message="test" subMessage="カスタムメッセージ" />);
    expect(screen.getByText('カスタムメッセージ')).toBeInTheDocument();
  });

  it('onCamera が渡されたとき「読み取る」ボタンが表示されクリックで呼ばれる', () => {
    const onCamera = vi.fn();
    render(<EmptyScheduleState icon="clock" message="test" onCamera={onCamera} />);
    const btn = screen.getByRole('button', { name: /読み取る/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onCamera).toHaveBeenCalledOnce();
  });

  it('onCamera が渡されないとき「読み取る」ボタンが表示されない', () => {
    render(<EmptyScheduleState icon="clock" message="test" />);
    expect(screen.queryByRole('button', { name: /読み取る/i })).not.toBeInTheDocument();
  });

  it('onAdd が渡されたとき追加ボタンが表示されクリックで呼ばれる', () => {
    const onAdd = vi.fn();
    render(<EmptyScheduleState icon="calendar" message="test" onAdd={onAdd} addLabel="スケジュールを追加" />);
    const btn = screen.getByRole('button', { name: /スケジュールを追加/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it('onAdd が渡されないとき追加ボタンが表示されない', () => {
    render(<EmptyScheduleState icon="clock" message="test" />);
    expect(screen.queryByRole('button', { name: /手動追加/i })).not.toBeInTheDocument();
  });

  it('addLabel のデフォルト値は「手動追加」', () => {
    const onAdd = vi.fn();
    render(<EmptyScheduleState icon="clock" message="test" onAdd={onAdd} />);
    expect(screen.getByRole('button', { name: /手動追加/i })).toBeInTheDocument();
  });
});
