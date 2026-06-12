import { useState, useMemo } from 'react';
import type { TastingSession } from '@/types';
import { filterAndSortTastingSessions, countActiveTastingFilters } from '@/lib/tastingFilters';
import type { TastingSortOption, RoastLevel } from '@/lib/tastingFilters';

export function useTastingFilters(sessions: TastingSession[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<TastingSortOption>('newest');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedRoastLevels, setSelectedRoastLevels] = useState<RoastLevel[]>([]);

  const filteredAndSortedSessions = useMemo(
    () => filterAndSortTastingSessions(sessions, { searchQuery, sortOption, dateFrom, dateTo, selectedRoastLevels }),
    [sessions, searchQuery, sortOption, dateFrom, dateTo, selectedRoastLevels]
  );

  const activeFilterCount = useMemo(
    () => countActiveTastingFilters({ searchQuery, dateFrom, dateTo, selectedRoastLevels }),
    [searchQuery, dateFrom, dateTo, selectedRoastLevels]
  );

  return {
    searchQuery,
    setSearchQuery,
    sortOption,
    setSortOption,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    selectedRoastLevels,
    setSelectedRoastLevels,
    filteredAndSortedSessions,
    activeFilterCount,
  };
}
