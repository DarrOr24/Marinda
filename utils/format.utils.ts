// utils/format.utils.ts
import { Family } from '@/lib/families/families.types';
import { FamilyMember } from '@/lib/members/members.types';


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

export function padNumber2(n: number) {
  return n.toString().padStart(2, '0');
}

export function trimOrNull(s: string) {
  return s.trim() ?? null
}

export function memberDisplayName(m: FamilyMember, options: { official?: boolean } = {}) {
  const { official } = options
  if (official) {
    return `${m.profile?.first_name}${m.nickname ? ' (' + m.nickname + ')' : ''}`
  }
  return m.nickname ?? m.profile?.first_name ?? 'Unknown'
}

export function familyName(f: Family | undefined) {
  return f?.name ?? ''
}
