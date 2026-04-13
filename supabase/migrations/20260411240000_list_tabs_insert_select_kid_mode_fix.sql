-- Fixes list creation failing for everyone:
-- 1) INSERT: single EXISTS — creator is self (profile match) OR a child/teen with a parent in session (kid mode).
-- 2) SELECT / navigator: parent profile can "see" list rows created by a child (same as todo_items parent proxy),
--    so insert().select() succeeds after creating a list as the acting kid.

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
      INNER JOIN public.family_members creator ON creator.id = lt.created_by_member_id
        AND creator.family_id = lt.family_id
        AND creator.role IN ('CHILD', 'TEEN')
        AND creator.is_active = true
      WHERE lt.id = p_list_tab_id
        AND EXISTS (
          SELECT 1
          FROM public.family_members parent
          WHERE parent.id = p_member_id
            AND parent.family_id = lt.family_id
            AND parent.profile_id = public.current_profile_id()
            AND parent.role IN ('MOM', 'DAD', 'ADULT')
            AND parent.is_active = true
        )
    )
  )
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

DROP POLICY IF EXISTS "list_tabs: insert if member" ON public.list_tabs;

CREATE POLICY "list_tabs: insert if member"
  ON public.list_tabs
  FOR INSERT
  WITH CHECK (
    public.is_member(family_id)
    AND (
      created_by_member_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.family_members fm
        WHERE fm.id = list_tabs.created_by_member_id
          AND fm.family_id = list_tabs.family_id
          AND fm.is_active = true
          AND (
            fm.profile_id = public.current_profile_id()
            OR (
              fm.role IN ('CHILD', 'TEEN')
              AND EXISTS (
                SELECT 1
                FROM public.family_members p
                WHERE p.family_id = fm.family_id
                  AND p.profile_id = public.current_profile_id()
                  AND p.role IN ('MOM', 'DAD', 'ADULT')
                  AND p.is_active = true
              )
            )
          )
      )
    )
  );
