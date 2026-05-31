'use client';

import { useState } from 'react';
import { MdInventory2 } from 'react-icons/md';
import { Button, Badge, Dialog, EmptyState, FloatingNav } from '@/components/ui';
import { InventoryItemCard } from '@/components/inventory/InventoryItemCard';
import { InventoryItemModal } from '@/components/inventory/InventoryItemModal';
import { ReorderList } from '@/components/inventory/ReorderList';
import { useAuth } from '@/lib/auth';
import { useInventory } from '@/hooks/useInventory';
import { useToastContext } from '@/components/Toast';
import { addInventoryItem, updateInventoryItem, setInventoryItemStatus, deleteInventoryItem } from '@/lib/firestore';
import { countReorderItems } from '@/lib/inventory';
import type { InventoryItem, InventoryItemInput, InventoryStatus } from '@/types';

export default function InventoryPage() {
  const { user, loading } = useAuth();
  const { items, isLoading } = useInventory();
  const { showToast } = useToastContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const updatedBy = user?.displayName || user?.email || 'unknown';
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
        await updateInventoryItem(editing.id, input, updatedBy);
        showToast('品目を更新しました', 'success');
      } else {
        await addInventoryItem(input, updatedBy);
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
      await setInventoryItemStatus(item.id, status, updatedBy);
    } catch {
      showToast('状態の更新に失敗しました', 'error');
    }
  };

  // 要発注リストの「対応済みにする」。完了した安心感を伝えるため成功トーストを出す。
  const handleResolve = async (item: InventoryItem) => {
    try {
      await setInventoryItemStatus(item.id, 'enough', updatedBy);
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

  const handleOpenEdit = (item: InventoryItem) => {
    setEditing(item);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-page pt-20 pb-8 px-4 sm:px-6 lg:px-8 transition-colors duration-1000">
      <FloatingNav backHref="/" />

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-ink-muted">
              <MdInventory2 className="h-5 w-5" />
              <span>INVENTORY</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink">在庫・不足品</h1>
            <p className="mt-1 text-sm text-ink-sub">不足品をチームで共有し、発注漏れを防ぎます。</p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            品目を追加
          </Button>
        </header>

        <section>
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-ink">
            要発注リスト
            {reorderCount > 0 && <Badge variant="danger">{reorderCount}</Badge>}
          </h2>
          <ReorderList items={items} onResolve={handleResolve} />
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">すべての品目</h2>
          {isLoading ? (
            <div className="text-ink-sub">読み込み中...</div>
          ) : items.length === 0 ? (
            <EmptyState title="品目がありません" description="「品目を追加」から在庫を登録しましょう" />
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <InventoryItemCard
                  key={item.id}
                  item={item}
                  onEdit={handleOpenEdit}
                  onDelete={setDeleteTarget}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
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
