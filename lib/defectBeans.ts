import type { DefectBean, DefectBeanSettings } from '@/types';

export type DefectBeanFilterOption = 'all' | 'shouldRemove' | 'shouldNotRemove';
export type DefectBeanSortOption = 'default' | 'createdAtDesc' | 'createdAtAsc' | 'nameAsc' | 'nameDesc';

export function filterDefectBeans(
  beans: DefectBean[],
  searchQuery: string,
  filterOption: DefectBeanFilterOption,
  settings: DefectBeanSettings
): DefectBean[] {
  let filtered = [...beans];

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (bean) =>
        bean.name.toLowerCase().includes(query) ||
        bean.characteristics.toLowerCase().includes(query) ||
        bean.tasteImpact.toLowerCase().includes(query) ||
        bean.removalReason.toLowerCase().includes(query)
    );
  }

  if (filterOption === 'shouldRemove') {
    filtered = filtered.filter((bean) => settings[bean.id]?.shouldRemove === true);
  } else if (filterOption === 'shouldNotRemove') {
    filtered = filtered.filter((bean) => settings[bean.id]?.shouldRemove === false);
  }

  return filtered;
}

export function sortDefectBeans(beans: DefectBean[], sortOption: DefectBeanSortOption): DefectBean[] {
  const sorted = [...beans];

  if (sortOption === 'default') {
    sorted.sort((a, b) => {
      if (a.isMaster && !b.isMaster) return -1;
      if (!a.isMaster && b.isMaster) return 1;
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      return a.name.localeCompare(b.name, 'ja');
    });
  } else if (sortOption === 'createdAtDesc') {
    sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (sortOption === 'createdAtAsc') {
    sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else if (sortOption === 'nameAsc') {
    sorted.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  } else if (sortOption === 'nameDesc') {
    sorted.sort((a, b) => b.name.localeCompare(a.name, 'ja'));
  }

  return sorted;
}

export function filterAndSortDefectBeans(
  beans: DefectBean[],
  searchQuery: string,
  filterOption: DefectBeanFilterOption,
  settings: DefectBeanSettings,
  sortOption: DefectBeanSortOption
): DefectBean[] {
  return sortDefectBeans(filterDefectBeans(beans, searchQuery, filterOption, settings), sortOption);
}
