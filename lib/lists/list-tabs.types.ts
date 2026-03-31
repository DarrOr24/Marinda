/** Built-in list id for `todo_items.list_kind` (not a row in `list_tabs`). */
export const DEFAULT_LIST_TAB_ID = 'todos' as const;

export type ListTab = {
  id: string;
  label: string;
  sort_order?: number;
};

export const DEFAULT_LIST_TABS: ListTab[] = [
  { id: DEFAULT_LIST_TAB_ID, label: 'To-dos', sort_order: 0 },
];
