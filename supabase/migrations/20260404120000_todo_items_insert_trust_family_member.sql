-- INSERT was too strict: it required created_by_member_id to match the row where
-- profile_id = current_profile_id(). That breaks whenever those disagree (kid mode,
-- odd profile resolution, etc.). Grocery only checks is_member(family_id).
--
-- Keep privacy via SELECT policies: only creator / sharees / parent proxy see rows.
-- Here we only ensure the attributed creator is a real active member of this family.

DROP POLICY IF EXISTS "todo_items: insert if member as self" ON public.todo_items;

CREATE POLICY "todo_items: insert if member and creator in family"
  ON public.todo_items
  FOR INSERT
  WITH CHECK (
    public.is_member(family_id)
    AND EXISTS (
      SELECT 1
      FROM public.family_members creator
      WHERE creator.id = created_by_member_id
        AND creator.family_id = family_id
        AND creator.is_active = true
    )
  );
