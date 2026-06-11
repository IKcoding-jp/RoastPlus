import { HiOutlineDocumentText } from 'react-icons/hi';

/**
 * 直近の記録プレビュー欄が空のときの控えめなヒント。
 * すぐ上に入力ボタンがあるため、ボタンより目立たないよう全体を ink-muted（薄色）で統一する。
 */
export function RecentEmptyHint() {
  return (
    <div className="flex flex-col items-center gap-1.5 py-6 text-center text-ink-muted">
      <HiOutlineDocumentText className="h-6 w-6" aria-hidden />
      <p className="max-w-[180px] text-xs leading-relaxed">入力すると、最近の記録がここに表示されます</p>
    </div>
  );
}
