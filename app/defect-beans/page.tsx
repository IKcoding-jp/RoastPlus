'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { HiPlus, HiSearch, HiOutlineCollection } from 'react-icons/hi';
import { MdCompareArrows } from 'react-icons/md';
import LoginPage from '@/app/login/page';
import { useDefectBeans } from '@/hooks/useDefectBeans';
import { useDefectBeanSettings } from '@/hooks/useDefectBeanSettings';
import { useDeveloperMode } from '@/hooks/useDeveloperMode';
import { useToastContext } from '@/components/Toast';
import { Button, EmptyState, FloatingNav } from '@/components/ui';
import { DefectBeanCard } from '@/components/DefectBeanCard';
import { DefectBeanForm } from '@/components/DefectBeanForm';
import { DefectBeanCompare } from '@/components/DefectBeanCompare';
import { Loading } from '@/components/Loading';
import { FilterMenu } from '@/components/defect-beans/FilterMenu';
import type { DefectBean } from '@/types';
import { filterAndSortDefectBeans } from '@/lib/defectBeans';
import type { DefectBeanFilterOption as FilterOption, DefectBeanSortOption as SortOption } from '@/lib/defectBeans';

export default function DefectBeansPage() {
  const { user, loading: authLoading } = useAuth();
  const { allDefectBeans, isLoading, addDefectBean, updateDefectBean, removeDefectBean } = useDefectBeans();
  const { settings, updateSetting } = useDefectBeanSettings();
  const { isEnabled: isDeveloperModeEnabled } = useDeveloperMode();
  const { showToast } = useToastContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDefectBeanId, setEditingDefectBeanId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('default');

  // フィルタリング・ソート（Hooksは早期リターンの前に呼び出す必要がある）
  const filteredDefectBeans = useMemo(
    () => filterAndSortDefectBeans(allDefectBeans, searchQuery, filterOption, settings, sortOption),
    [allDefectBeans, searchQuery, filterOption, settings, sortOption]
  );

  // 2つ選択されたら自動的に比較を表示
  useEffect(() => {
    if (compareMode && selectedIds.size === 2 && !showCompare) {
      setShowCompare(true);
    }
  }, [compareMode, selectedIds.size, showCompare]);

  // 早期リターン（すべてのHooksの後）
  if (authLoading || isLoading) {
    return <Loading />;
  }

  if (!user) {
    return <LoginPage />;
  }

  // 選択モードの切り替え
  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    if (compareMode) {
      setSelectedIds(new Set());
    }
  };

  // カード選択
  const handleSelect = (id: string) => {
    if (!compareMode) return;

    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 比較表示
  const handleShowCompare = () => {
    if (selectedIds.size > 0) {
      setShowCompare(true);
    }
  };

  // 欠点豆追加
  const handleAddDefectBean = async (
    defectBean: Omit<DefectBean, 'id' | 'createdAt' | 'updatedAt' | 'isMaster' | 'imageUrl'>,
    imageFile: File | null
  ) => {
    if (!imageFile) {
      throw new Error('Image file is required');
    }
    try {
      await addDefectBean(defectBean, imageFile);
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add defect bean:', error);
      throw error;
    }
  };

  // 欠点豆編集
  const handleEditDefectBean = (id: string) => {
    const defectBean = allDefectBeans.find((db) => db.id === id);
    if (defectBean?.isMaster) {
      showToast('マスター欠点豆は編集できません。', 'error');
      return;
    }

    setEditingDefectBeanId(id);
  };

  // 欠点豆更新
  const handleUpdateDefectBean = async (
    defectBean: Omit<DefectBean, 'id' | 'createdAt' | 'updatedAt' | 'isMaster' | 'imageUrl'>,
    imageFile: File | null
  ) => {
    if (!editingDefectBeanId) return;

    try {
      const existingBean = allDefectBeans.find((db) => db.id === editingDefectBeanId);
      if (!existingBean) {
        throw new Error('Defect bean not found');
      }

      await updateDefectBean(editingDefectBeanId, defectBean, imageFile, existingBean.imageUrl);
      setEditingDefectBeanId(null);
    } catch (error) {
      console.error('Failed to update defect bean:', error);
      showToast('欠点豆の更新に失敗しました。', 'error');
      throw error;
    }
  };

  // 欠点豆削除（編集ダイアログから）
  const handleDeleteDefectBeanFromEdit = async () => {
    if (!editingDefectBeanId) return;

    try {
      const existingBean = allDefectBeans.find((db) => db.id === editingDefectBeanId);
      if (!existingBean) {
        throw new Error('Defect bean not found');
      }

      await removeDefectBean(editingDefectBeanId, existingBean.imageUrl);
      setEditingDefectBeanId(null);
    } catch (error) {
      console.error('Failed to delete defect bean:', error);
      showToast('欠点豆の削除に失敗しました。', 'error');
      throw error;
    }
  };

  // 設定更新
  const handleToggleSetting = async (id: string, shouldRemove: boolean) => {
    try {
      await updateSetting(id, shouldRemove);
    } catch (error) {
      console.error('Failed to update setting:', error);
      showToast('設定の更新に失敗しました。', 'error');
    }
  };

  const selectedDefectBeans = filteredDefectBeans.filter((bean) => selectedIds.has(bean.id));
  const isFiltering = !!(searchQuery || filterOption !== 'all');

  return (
    <div className="min-h-screen pt-16 pb-2 sm:pb-4 px-4 sm:px-6 lg:px-8 transition-colors duration-1000 bg-page">
      <FloatingNav
        backHref="/"
        right={
          !(filteredDefectBeans.length === 0 && !searchQuery && filterOption === 'all') ? (
            <>
              {!compareMode && (
                <FilterMenu
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  filterOption={filterOption}
                  onFilterChange={setFilterOption}
                  sortOption={sortOption}
                  onSortChange={setSortOption}
                />
              )}
              <Button
                variant={compareMode ? 'primary' : 'surface'}
                size="sm"
                onClick={toggleCompareMode}
                title={compareMode ? '選択モード' : '比較モード'}
                className="px-3! py-2! gap-1.5"
              >
                <MdCompareArrows className="h-5 w-5" />
                <span className="text-xs sm:text-sm">{compareMode ? '選択モード' : '比較'}</span>
              </Button>
              {compareMode && selectedIds.size > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleShowCompare}
                  title="比較を表示"
                  className="px-3! py-2! gap-1.5"
                >
                  比較 ({selectedIds.size})
                </Button>
              )}
              {!compareMode && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowAddForm(true)}
                  title="欠点豆を追加"
                  className="px-3! py-2! gap-1.5"
                >
                  <HiPlus className="h-5 w-5" />
                  <span className="text-xs sm:text-sm">追加</span>
                </Button>
              )}
            </>
          ) : undefined
        }
      />
      <div className="max-w-7xl mx-auto">
        {/* グリッド表示 */}
        {filteredDefectBeans.length === 0 ? (
          <EmptyState
            icon={
              isFiltering ? (
                <HiSearch className="w-10 h-10 sm:w-12 sm:h-12 text-spot" />
              ) : (
                <HiOutlineCollection className="w-10 h-10 sm:w-12 sm:h-12 text-spot" />
              )
            }
            title={isFiltering ? '検索条件に一致する欠点豆がありません' : '欠点豆が登録されていません'}
            description={
              isFiltering
                ? '別のキーワードで検索するか、フィルタを変更してみてください。'
                : '最初の欠点豆を追加して、図鑑を始めましょう。'
            }
            action={
              !isFiltering ? (
                <Button
                  variant="primary"
                  onClick={() => setShowAddForm(true)}
                  className="shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  <HiPlus className="w-5 h-5" />
                  <span className="font-medium">欠点豆を追加</span>
                </Button>
              ) : undefined
            }
            size="lg"
            className="!py-12 sm:!py-16"
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filteredDefectBeans.map((defectBean, index) => {
              return (
                <DefectBeanCard
                  key={defectBean.id}
                  defectBean={defectBean}
                  shouldRemove={settings[defectBean.id]?.shouldRemove}
                  isSelected={selectedIds.has(defectBean.id)}
                  onSelect={compareMode ? handleSelect : undefined}
                  onToggleSetting={handleToggleSetting}
                  onEdit={!compareMode && !defectBean.isMaster ? handleEditDefectBean : undefined}
                  compareMode={compareMode}
                  index={index}
                />
              );
            })}
          </div>
        )}

        {/* 追加フォーム */}
        {showAddForm && (
          <DefectBeanForm mode="add" onSubmit={handleAddDefectBean} onCancel={() => setShowAddForm(false)} />
        )}

        {/* 編集フォーム */}
        {editingDefectBeanId &&
          (() => {
            const editingBean = allDefectBeans.find((db) => db.id === editingDefectBeanId);
            if (!editingBean) return null;

            return (
              <DefectBeanForm
                mode="edit"
                defectBean={editingBean}
                onSubmit={handleAddDefectBean} // 使用されないが型のため必要
                onUpdate={handleUpdateDefectBean}
                onDelete={isDeveloperModeEnabled && !editingBean.isMaster ? handleDeleteDefectBeanFromEdit : undefined}
                onCancel={() => setEditingDefectBeanId(null)}
              />
            );
          })()}

        {/* 比較表示 */}
        {showCompare && selectedDefectBeans.length > 0 && (
          <DefectBeanCompare
            defectBeans={selectedDefectBeans}
            settings={settings}
            onClose={() => {
              setShowCompare(false);
              setSelectedIds(new Set());
              setCompareMode(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
