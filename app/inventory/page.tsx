'use client';

import { useState } from 'react';
import { BackLink, Button, Card, Badge, Dialog, EmptyState } from '@/components/ui';
import { StatusToggle } from '@/components/inventory/StatusToggle';
import { InventoryItemModal } from '@/components/inventory/InventoryItemModal';
import { ReorderList } from '@/components/inventory/ReorderList';
import { useAuth } from '@/lib/auth';
import { useInventory } from '@/hooks/useInventory';
import { useToastContext } from '@/components/Toast';
import { addInventoryItem, updateInventoryItem, setInventoryItemStatus, deleteInventoryItem } from '@/lib/firestore';
import { countReorderItems, CATEGORY_LABELS } from '@/lib/inventory';
import { toJSDate } from '@/lib/firestoreUtils';
import type { FirestoreTimestamp } from '@/types';
import type { InventoryItem, InventoryItemInput, InventoryStatus } from '@/types';

/**
 * 最終更新時刻を「M/D HH:mm」形式に整形する。
 * updatedAt が保留書き込み等で未確定（undefined/変換不能）なら null を返す。
 */
function formatUpdatedAt(value: FirestoreTimestamp | undefined): string | null {
  const date = toJSDate(value);
  if (!date) {
    return null;
  }
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

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
    return <div className="p-6 text-ink-sub">読み込み中...</div>;
  }
  if (!user) {
    return <div className="p-6 text-ink-sub">ログインが必要です</div>;
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

  return (
    <div className="mx-auto max-w-3xl p-4">
      <BackLink href="/">ホーム</BackLink>
      <header className="my-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">
          在庫・不足品 <Badge>要発注 {reorderCount}</Badge>
        </h1>
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

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold text-ink">要発注リスト</h2>
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
            {items.map((item) => {
              const updatedAtLabel = formatUpdatedAt(item.updatedAt);
              return (
                <Card key={item.id} variant="table">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-ink">{item.name}</div>
                        <div className="text-sm text-ink-sub">{CATEGORY_LABELS[item.category]}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditing(item);
                            setModalOpen(true);
                          }}
                        >
                          編集
                        </Button>
                        <Button variant="ghost" onClick={() => setDeleteTarget(item)}>
                          削除
                        </Button>
                      </div>
                    </div>
                    <StatusToggle value={item.status} onChange={(status) => handleStatusChange(item, status)} />
                    {item.updatedBy && (
                      <div className="text-xs text-ink-muted">
                        最終更新: {item.updatedBy}
                        {updatedAtLabel && ` (${updatedAtLabel})`}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

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
