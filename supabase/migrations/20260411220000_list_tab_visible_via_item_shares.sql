-- If a custom list has no list_tab_shares (private list, per-item sharing only), members who have
-- at least one todo shared with them still need to see the list row so they can open that tab.
-- list_tab_accessible_by_member stays strict (used by todo_items trigger); navigator is read/UI only.

CREATE OR REPLACE FUNCTION public.list_tab_visible_in_navigator(p_list_tab_id uuid, p_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.list_tab_accessible_by_member(p_list_tab_id, p_member_id)
  OR (
    p_member_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.list_tabs lt
      INNER JOIN public.family_members fm ON fm.id = p_member_id
      WHERE lt.id = p_list_tab_id
        AND lt.family_id = fm.family_id
        AND fm.is_active = true
        AND NOT EXISTS (
          SELECT 1
          FROM public.list_tab_shares lts
          WHERE lts.list_tab_id = lt.id
        )
        AND EXISTS (
          SELECT 1
          FROM public.todo_items t
          INNER JOIN public.todo_item_shares s ON s.todo_item_id = t.id
          WHERE t.family_id = lt.family_id
            AND t.list_kind = lt.id::text
            AND s.member_id = p_member_id
        )
    )
  );
$$;

DROP POLICY IF EXISTS "list_tabs: select if creator shared or parent legacy" ON public.list_tabs;

CREATE POLICY "list_tabs: select if creator shared or parent legacy"
  ON public.list_tabs
  FOR SELECT
  USING (
    public.is_member(family_id)
    AND EXISTS (
      SELECT 1
      FROM public.family_members fm
      WHERE fm.family_id = list_tabs.family_id
        AND fm.profile_id = public.current_profile_id()
        AND fm.is_active = true
        AND public.list_tab_visible_in_navigator(list_tabs.id, fm.id)
    )
  );

DROP POLICY IF EXISTS "list_tab_shares: select if can see list" ON public.list_tab_shares;

CREATE POLICY "list_tab_shares: select if can see list"
  ON public.list_tab_shares
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.list_tabs lt
      INNER JOIN public.family_members fm ON fm.family_id = lt.family_id
      WHERE lt.id = list_tab_shares.list_tab_id
        AND fm.profile_id = public.current_profile_id()
        AND fm.is_active = true
        AND public.list_tab_visible_in_navigator(lt.id, fm.id)
    )
  );
