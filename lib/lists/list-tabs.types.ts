/** Built-in list id for `todo_items.list_kind` (not a row in `list_tabs`). */
export const DEFAULT_LIST_TAB_ID = 'todos' as const;

export type ListTab = {
  id: string;
  label: string;
  sort_order?: number;
  /** Custom lists only. Extra members who can see every item (list-level RLS). Empty ⇒ use per-item shares. */
  shareMemberIds: string[];
};

export const DEFAULT_LIST_TABS: ListTab[] = [
  { id: DEFAULT_LIST_TAB_ID, label: 'To-dos', sort_order: 0, shareMemberIds: [] },
];

/** True when this tab uses `list_tab_shares` (not the built-in To-dos tab). */
export function tabUsesListLevelSharing(tab: ListTab | undefined): boolean {
  if (!tab || tab.id === DEFAULT_LIST_TAB_ID) return false;
  return tab.shareMemberIds.length > 0;
}
