-- Only the creator (or a parent managing a kid-created item) may DELETE a to-do.
-- Sharees can still SELECT / toggle completed via existing policies; delete no longer
-- follows "visible to me".

DROP POLICY IF EXISTS "todo_items: delete if visible" ON public.todo_items;

CREATE POLICY "todo_items: delete if creator or parent of kid creator"
  ON public.todo_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_members fm
      WHERE fm.id = todo_items.created_by_member_id
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
      WHERE creator.id = todo_items.created_by_member_id
        AND creator.family_id = todo_items.family_id
        AND creator.role IN ('CHILD', 'TEEN')
        AND creator.is_active = true
    )
  );
