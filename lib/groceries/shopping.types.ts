/** Built-in list id stored in `grocery_items.list_kind` (not a row in `shopping_tabs`). */
export const GROCERIES_LIST_KIND = 'groceries' as const;

/** One shopping list tab (default ids from code, or DB row id for custom). */
export type ShoppingTab = {
  id: string;
  label: string;
  placeholder: string;
  emptyText: string;
  sort_order?: number;
};

export const DEFAULT_SHOPPING_TABS: ShoppingTab[] = [
  {
    id: GROCERIES_LIST_KIND,
    label: 'Groceries',
    placeholder: 'e.g., Bananas, milk…',
    emptyText: 'Nothing on your grocery list yet.',
    sort_order: 0,
  },
];
