'use client';

import { useState } from 'react';
import { MdInventory2, MdAdd } from 'react-icons/md';
import { FiBell } from 'react-icons/fi';
import { Button, Dialog, EmptyState, FloatingNav } from '@/components/ui';
import { InventoryItemRow } from '@/components/inventory/InventoryItemRow';
import { InventoryItemModal } from '@/components/inventory/InventoryItemModal';
import { ReorderList } from '@/components/inventory/ReorderList';
import { useAuth } from '@/lib/auth';
import { useInventory } from '@/hooks/useInventory';
import { useToastContext } from '@/components/Toast';
import { isE2EMode } from '@/lib/e2eMode';
import { addInventoryItem, updateInventoryItem, setInventoryItemStatus, deleteInventoryItem } from '@/lib/firestore';
import { countReorderItems } from '@/lib/inventory';
import type { InventoryItem, InventoryItemInput, InventoryStatus } from '@/types';

// E2Eモード(スクショ/デザイン検証)専用のサンプル品目。
// 本番Firestoreは認証を要するため通常起動時は空になる。本番では isE2EMode() が false なので使われない。
const E2E_SAMPLE_ITEMS: InventoryItem[] = [
  { id: 'e1', name: '三方袋', status: 'enough', updatedAt: '2026-06-01T07:17:00' },
  { id: 'e2', name: 'ドリップパック', status: 'out', updatedAt: '2026-06-01T07:19:00' },
  { id: 'e3', name: 'ブレンド生豆', status: 'low', updatedAt: '2026-06-01T06:58:00' },
  { id: 'e4', name: 'テイクアウトカップ M', status: 'enough', updatedAt: '2026-05-31T18:40:00' },
  { id: 'e5', name: 'ペーパーフィルター', status: 'low', updatedAt: '2026-05-31T18:42:00' },
];

export default function InventoryPage() {
  const { user, loading } = useAuth();
  const { items: liveItems, isLoading } = useInventory(user?.uid ?? null);
  const { showToast } = useToastContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // E2Eモードかつ実データが空のときだけ、デザイン検証用サンプルを表示する
  const usingSampleData = isE2EMode() && liveItems.length === 0;
  const items = usingSampleData ? E2E_SAMPLE_ITEMS : liveItems;
  // サンプル表示中はローディングを出さない（本番では usingSampleData が false なので従来どおり）
  const showLoading = isLoading && !usingSampleData;
  const reorderCount = countReorderItems(items);

  if (loading) {
    return (
      <div className="min-h-screen bg-page px-4 pt-20 text-ink-sub transition-colors duration-1000">読み込み中...</div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen bg-page px-4 pt-20 text-ink-sub transition-colors duration-1000">
        ログインが必要です
      </div>
    );
  }

  const handleSave = async (input: InventoryItemInput) => {
    try {
      if (editing) {
        await updateInventoryItem(user!.uid, editing.id, input);
        showToast('品目を更新しました', 'success');
      } else {
        await addInventoryItem(user!.uid, input);
        showToast('品目を追加しました', 'success');
      }
      setModalOpen(false);
      setEditing(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存に失敗しました', 'error');
    }
  };

  // 通常の状態トグル。頻繁に押すため成功トーストは出さず、失敗時のみ通知する。
  const handleStatusChange = async (item: InventoryItem, status: InventoryStatus) => {
    try {
      await setInventoryItemStatus(user!.uid, item.id, status);
    } catch {
      showToast('状態の更新に失敗しました', 'error');
    }
  };

  // 要発注リストの「対応済みにする」。完了した安心感を伝えるため成功トーストを出す。
  const handleResolve = async (item: InventoryItem) => {
    try {
      await setInventoryItemStatus(user!.uid, item.id, 'enough');
      showToast('対応済みにしました', 'success');
    } catch {
      showToast('状態の更新に失敗しました', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteInventoryItem(user!.uid, deleteTarget.id);
      showToast('品目を削除しました', 'success');
      setDeleteTarget(null);
    } catch {
      showToast('削除に失敗しました', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-page px-4 pb-16 pt-20 transition-colors duration-1000 sm:px-6 sm:pb-20">
      <FloatingNav backHref="/" />

      <div className="mx-auto w-full max-w-5xl">
        <header>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] text-ink-muted">
            <MdInventory2 className="h-[15px] w-[15px]" />
            INVENTORY
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-bold tracking-[0.01em] text-ink sm:text-[26px]">在庫・不足品</h1>
              <p className="mt-1 text-[13.5px] text-ink-sub">不足品をチームで共有し、発注漏れを防ぎます。</p>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              className="min-h-0! shrink-0 gap-1.5 !rounded-[10px] px-4! py-2! text-sm!"
            >
              <MdAdd className="h-4 w-4" aria-hidden="true" />
              品目を追加
            </Button>
          </div>
        </header>

        {/* 要発注（左）と すべての品目（右）を左右に並べる。縦積みだと要発注が増えたとき
            右の操作リストが押し下げられタップ位置が動くため、md以上では2カラムにする。
            items-start で各列を自然な高さにし、片方の伸縮がもう片方に影響しないようにする。 */}
        <div className="mt-7 grid grid-cols-1 gap-x-6 gap-y-7 md:grid-cols-2 md:items-start">
          {/* 左: 要発注リスト。見出しごとパネルに内包してまとまりを出す。
              右の状態から導出し、🟡🔴が増減してもこの列だけが伸び縮みする。 */}
          <section className="overflow-hidden rounded-2xl border border-edge bg-surface shadow-card">
            <div className="flex items-center gap-2 border-b border-edge-subtle px-4 py-3.5">
              <FiBell className="h-4 w-4 text-ink-sub" aria-hidden="true" />
              <h2 className="text-[15px] font-bold text-ink">要発注リスト</h2>
              <span
                className={`inline-grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs font-bold ${
                  reorderCount > 0 ? 'bg-danger-subtle text-danger' : 'bg-ground text-ink-muted'
                }`}
              >
                {reorderCount}
              </span>
            </div>
            <ReorderList items={items} onResolve={handleResolve} />
          </section>

          {/* 右: すべての品目。見出しごとパネルに内包。並び順は createdAt 固定でタップしても動かない。
              本体も白(パネルのまま)。品目カードは枠線＋薄い影で区切る。 */}
          <section className="overflow-hidden rounded-2xl border border-edge bg-surface shadow-card">
            <div className="flex items-center gap-2 border-b border-edge-subtle px-4 py-3.5">
              <h2 className="text-[15px] font-bold text-ink">すべての品目</h2>
              <span className="inline-grid h-5 min-w-5 place-items-center rounded-full bg-ground px-1.5 text-xs font-bold text-ink-muted">
                {items.length}
              </span>
            </div>
            {showLoading ? (
              <div className="px-4 py-4 text-sm text-ink-sub">読み込み中...</div>
            ) : items.length === 0 ? (
              <div className="p-4">
                <EmptyState title="品目がありません" description="「品目を追加」から在庫を登録しましょう" />
              </div>
            ) : (
              <div className="space-y-2.5 p-3 sm:p-3.5">
                {items.map((item) => (
                  <InventoryItemRow
                    key={item.id}
                    item={item}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {modalOpen && (
        <InventoryItemModal
          key={editing?.id ?? 'new'}
          open
          initial={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}

      <Dialog
        isOpen={deleteTarget !== null}
        title="品目を削除しますか？"
        description="この操作は取り消せません"
        variant="danger"
        confirmText="削除"
        isLoading={isDeleting}
        onClose={() => {
          if (!isDeleting) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
