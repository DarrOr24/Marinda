import { DEFAULT_LIST_TAB_ID, type ListTab, tabUsesListLevelSharing } from './list-tabs.types';

export type ListTabVisibleOpts = {
  /** DB rows with no created_by: only parents can see them in settings/history (legacy). */
  includeLegacyUnownedForParent?: boolean;
};

/**
 * Tab chip should show for this member: creator, list-level share, or (optional) legacy unowned for parents.
 * Does not include item-share-only — use todoItemVisibleToActingMember + merging below.
 */
export function listTabVisibleToMember(
  tab: ListTab,
  memberId: string,
  opts?: ListTabVisibleOpts,
): boolean {
  if (!memberId) return false;
  if (tab.created_by_member_id === memberId) return true;
  if (tab.shareMemberIds.includes(memberId)) return true;
  if (
    opts?.includeLegacyUnownedForParent &&
    (tab.created_by_member_id == null || tab.created_by_member_id === '')
  ) {
    return true;
  }
  return false;
}

/**
 * Same rules as the board’s per-item visibility for the acting member (kid mode).
 * Uses the tab metadata from the API (parent session) for list-level shares.
 */
export function todoItemVisibleToActingMember(
  item: {
    created_by_member_id: string;
    list_kind: string;
    shared_with_member_ids: string[];
  },
  listTabById: Map<string, ListTab>,
  actingMemberId: string,
): boolean {
  if (item.created_by_member_id === actingMemberId) return true;
  const kind = item.list_kind?.trim() || DEFAULT_LIST_TAB_ID;
  if (kind === DEFAULT_LIST_TAB_ID) {
    return item.shared_with_member_ids.includes(actingMemberId);
  }
  const tab = listTabById.get(kind);
  if (tabUsesListLevelSharing(tab)) {
    return tab!.shareMemberIds.includes(actingMemberId);
  }
  return item.shared_with_member_ids.includes(actingMemberId);
}
