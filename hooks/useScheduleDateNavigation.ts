import { useState, useCallback, useEffect } from 'react';
import {
  getTodayDateString,
  getTomorrowDateString,
  getPreviousWeekday,
  getNextWeekday,
  formatDateToJapanese,
  formatDateStringToJapanese,
  formatTimeHMS,
} from '@/lib/dateUtils';

export function useScheduleDateNavigation() {
  // 土日判定関数（0=日曜、6=土曜）
  const isWeekend = useCallback((dateString: string): boolean => {
    const date = new Date(dateString + 'T00:00:00');
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }, []);

  // 初期日付を取得（今日が土日の場合は前の平日）
  const getInitialDate = useCallback((): string => {
    const today = getTodayDateString();
    if (isWeekend(today)) {
      return getPreviousWeekday(today);
    }
    return today;
  }, [isWeekend]);

  const [selectedDate, setSelectedDate] = useState<string>(getInitialDate());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // 時刻を1秒ごとに更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 日付移動関数
  const moveToPreviousDay = () => {
    const previousWeekday = getPreviousWeekday(selectedDate);
    setSelectedDate(previousWeekday);
  };

  const moveToNextDay = useCallback(() => {
    const today = getTodayDateString();
    const tomorrow = getTomorrowDateString();
    const nextWeekday = getNextWeekday(selectedDate);

    // 翌日まで移動可能にする
    // 翌日が土日の場合は、次の平日まで移動可能
    const maxDate = isWeekend(tomorrow) ? getNextWeekday(today) : tomorrow;
    if (nextWeekday <= maxDate) {
      setSelectedDate(nextWeekday);
    }
  }, [selectedDate, isWeekend]);

  // 選択日が今日かどうか（実際の今日の日付と比較）
  const today = getTodayDateString();
  const tomorrow = getTomorrowDateString();
  const isToday = selectedDate === today;
  // 翌日（土日なら次の平日）が最大選択可能日
  const maxSelectableDate = isWeekend(tomorrow) ? getNextWeekday(today) : tomorrow;
  const isMaxDate = selectedDate >= maxSelectableDate;

  return {
    selectedDate,
    setSelectedDate,
    currentTime,
    isToday,
    isMaxDate,
    isWeekend,
    getTodayString: getTodayDateString,
    formatDate: formatDateToJapanese,
    formatDateString: formatDateStringToJapanese,
    formatTime: formatTimeHMS,
    moveToPreviousDay,
    moveToNextDay,
  };
}
