'use client';

import { useState } from 'react';
import { MdInventory2, MdAdd } from 'react-icons/md';
import { Button, Card, Dialog, EmptyState, FloatingNav } from '@/components/ui';
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
  const { items: liveItems, isLoading } = useInventory();
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
        await updateInventoryItem(editing.id, input);
        showToast('品目を更新しました', 'success');
      } else {
        await addInventoryItem(input);
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
      await setInventoryItemStatus(item.id, status);
    } catch {
      showToast('状態の更新に失敗しました', 'error');
    }
  };

  // 要発注リストの「対応済みにする」。完了した安心感を伝えるため成功トーストを出す。
  const handleResolve = async (item: InventoryItem) => {
    try {
      await setInventoryItemStatus(item.id, 'enough');
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
      await deleteInventoryItem(deleteTarget.id);
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

      <div className="mx-auto w-full max-w-3xl">
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
              className="!min-h-0 shrink-0 gap-1.5 !rounded-[10px] !px-4 !py-2 !text-sm"
            >
              <MdAdd className="h-4 w-4" aria-hidden="true" />
              品目を追加
            </Button>
          </div>
        </header>

        <section className="mt-7">
          <div className="mb-2.5 flex items-center gap-2 pl-0.5">
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

        <section className="mt-7">
          <div className="mb-2.5 pl-0.5">
            <h2 className="text-[15px] font-bold text-ink">すべての品目</h2>
          </div>
          {showLoading ? (
            <Card variant="table">
              <div className="p-4 text-sm text-ink-sub">読み込み中...</div>
            </Card>
          ) : items.length === 0 ? (
            <EmptyState title="品目がありません" description="「品目を追加」から在庫を登録しましょう" />
          ) : (
            <Card variant="table">
              <div className="divide-y divide-edge-subtle">
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
            </Card>
          )}
        </section>
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
        description="共有在庫なので全員に反映されます"
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
