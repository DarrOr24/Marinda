// utils/format.utils.ts
export function getYearFromDateString(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { year: 'numeric' });
};

export function getShortMonthFromDateString(dateStr: string, showToday: boolean = false) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  if (showToday && dateStr === todayStr) {
    return 'Today';
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export function getWeekDayFromDateString(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};
