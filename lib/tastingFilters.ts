import type { TastingSession } from '@/types';

export type TastingSortOption = 'newest' | 'oldest' | 'beanName';
export type RoastLevel = '浅煎り' | '中煎り' | '中深煎り' | '深煎り';

export interface TastingFilterParams {
  searchQuery: string;
  sortOption: TastingSortOption;
  dateFrom: string;
  dateTo: string;
  selectedRoastLevels: RoastLevel[];
}

export function filterTastingSessions(
  sessions: TastingSession[],
  searchQuery: string,
  dateFrom: string,
  dateTo: string,
  selectedRoastLevels: RoastLevel[]
): TastingSession[] {
  let filtered = [...sessions];

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter((session) => session.beanName.toLowerCase().includes(query));
  }

  if (dateFrom) {
    filtered = filtered.filter((session) => session.createdAt >= dateFrom);
  }
  if (dateTo) {
    filtered = filtered.filter((session) => session.createdAt <= `${dateTo}T23:59:59.999Z`);
  }

  if (selectedRoastLevels.length > 0) {
    filtered = filtered.filter((session) => selectedRoastLevels.includes(session.roastLevel as RoastLevel));
  }

  return filtered;
}

export function sortTastingSessions(sessions: TastingSession[], sortOption: TastingSortOption): TastingSession[] {
  const sorted = [...sessions];
  sorted.sort((a, b) => {
    switch (sortOption) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'beanName':
        return a.beanName.localeCompare(b.beanName, 'ja');
      default:
        return 0;
    }
  });
  return sorted;
}

export function filterAndSortTastingSessions(
  sessions: TastingSession[],
  params: TastingFilterParams
): TastingSession[] {
  return sortTastingSessions(
    filterTastingSessions(sessions, params.searchQuery, params.dateFrom, params.dateTo, params.selectedRoastLevels),
    params.sortOption
  );
}

export function countActiveTastingFilters(params: Pick<TastingFilterParams, 'searchQuery' | 'dateFrom' | 'dateTo' | 'selectedRoastLevels'>): number {
  let count = 0;
  if (params.searchQuery.trim()) count++;
  if (params.dateFrom) count++;
  if (params.dateTo) count++;
  if (params.selectedRoastLevels.length > 0) count++;
  return count;
}
