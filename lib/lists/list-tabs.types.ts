/** Built-in list id for `todo_items.list_kind` (not a row in `list_tabs`). */
export const DEFAULT_LIST_TAB_ID = 'todos' as const;

export type ListTab = {
  id: string;
  label: string;
  sort_order?: number;
  /** Family member who created this custom list; drives who may edit list-level sharing (with parents). */
  created_by_member_id?: string | null;
  /**
   * Custom lists only. Everyone who can see every item on this list — **creator + people you share with**
   * (stored for RLS). Empty ⇒ private list (per-item shares on To-dos only). UI should show “others” by
   * excluding the current member id.
   */
  shareMemberIds: string[];
};

export const DEFAULT_LIST_TABS: ListTab[] = [
  { id: DEFAULT_LIST_TAB_ID, label: 'To-dos', sort_order: 0, shareMemberIds: [], created_by_member_id: null },
];

/** True when this tab uses `list_tab_shares` (not the built-in To-dos tab). */
export function tabUsesListLevelSharing(tab: ListTab | undefined): boolean {
  if (!tab || tab.id === DEFAULT_LIST_TAB_ID) return false;
  return tab.shareMemberIds.length > 0;
}
