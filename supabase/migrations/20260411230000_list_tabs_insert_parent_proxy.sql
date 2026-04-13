-- Superseded for manual runs by 20260411240000_list_tabs_insert_select_kid_mode_fix.sql (INSERT + SELECT).
-- Kid mode: parent session (current_profile_id) + created_by_member_id = child (same as todo_items).
-- The strict INSERT policy on list_tabs only matched creator.profile_id = current_profile_id(), which
-- blocked creating a list “as” the acting child.

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
          AND fm.profile_id = public.current_profile_id()
          AND fm.is_active = true
      )
      OR EXISTS (
        SELECT 1
        FROM public.family_members creator
        INNER JOIN public.family_members parent
          ON parent.family_id = creator.family_id
          AND parent.profile_id = public.current_profile_id()
          AND parent.role IN ('MOM', 'DAD', 'ADULT')
          AND parent.is_active = true
        WHERE creator.id = list_tabs.created_by_member_id
          AND creator.family_id = list_tabs.family_id
          AND creator.role IN ('CHILD', 'TEEN')
          AND creator.is_active = true
      )
    )
  );
