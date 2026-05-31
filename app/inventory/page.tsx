'use client';

import { useState } from 'react';
import { BackLink, Button, Card, Badge } from '@/components/ui';
import { StatusToggle } from '@/components/inventory/StatusToggle';
import { InventoryItemModal } from '@/components/inventory/InventoryItemModal';
import { ReorderList } from '@/components/inventory/ReorderList';
import { useAuth } from '@/lib/auth';
import { useInventory } from '@/hooks/useInventory';
import { useToastContext } from '@/components/Toast';
import { addInventoryItem, updateInventoryItem, setInventoryItemStatus, deleteInventoryItem } from '@/lib/firestore';
import { countReorderItems, CATEGORY_LABELS } from '@/lib/inventory';
import type { InventoryItem, InventoryItemInput, InventoryStatus } from '@/types';

export default function InventoryPage() {
  const { user, loading } = useAuth();
  const { items, isLoading } = useInventory();
  const { showToast } = useToastContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);

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

  const handleStatusChange = async (item: InventoryItem, status: InventoryStatus) => {
    try {
      await setInventoryItemStatus(item.id, status, updatedBy);
    } catch {
      showToast('状態の更新に失敗しました', 'error');
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    try {
      await deleteInventoryItem(item.id);
      showToast('品目を削除しました', 'success');
    } catch {
      showToast('削除に失敗しました', 'error');
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
        <ReorderList items={items} onResolve={(item) => handleStatusChange(item, 'enough')} />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-ink">すべての品目</h2>
        {isLoading ? (
          <div className="text-ink-sub">読み込み中...</div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => (
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
                      <Button variant="ghost" onClick={() => handleDelete(item)}>
                        削除
                      </Button>
                    </div>
                  </div>
                  <StatusToggle value={item.status} onChange={(status) => handleStatusChange(item, status)} />
                  {item.updatedBy && <div className="text-xs text-ink-muted">最終更新: {item.updatedBy}</div>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <InventoryItemModal
        open={modalOpen}
        initial={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
