-- Kid mode: JWT + current_profile_id() stay on the parent while the app sets
-- todo_items.created_by_member_id to the kid (same pattern as activities).
-- Extend visibility, INSERT, and share-row policies so parents acting as a child work.

CREATE OR REPLACE FUNCTION public.todo_item_id_visible_to_me(p_todo_item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.todo_items t
    JOIN public.family_members viewer ON viewer.family_id = t.family_id
    WHERE t.id = p_todo_item_id
      AND viewer.profile_id = public.current_profile_id()
      AND viewer.is_active = true
      AND (
        viewer.id = t.created_by_member_id
        OR EXISTS (
          SELECT 1
          FROM public.todo_item_shares s
          WHERE s.todo_item_id = t.id
            AND s.member_id = viewer.id
        )
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.todo_items t
    INNER JOIN public.family_members creator
      ON creator.id = t.created_by_member_id
      AND creator.family_id = t.family_id
      AND creator.role IN ('CHILD', 'TEEN')
      AND creator.is_active = true
    INNER JOIN public.family_members parent
      ON parent.family_id = t.family_id
      AND parent.profile_id = public.current_profile_id()
      AND parent.role IN ('MOM', 'DAD', 'ADULT')
      AND parent.is_active = true
    WHERE t.id = p_todo_item_id
  );
$$;

DROP POLICY IF EXISTS "todo_items: insert if member as self" ON public.todo_items;

CREATE POLICY "todo_items: insert if member as self"
  ON public.todo_items
  FOR INSERT
  WITH CHECK (
    public.is_member(family_id)
    AND (
      created_by_member_id = (
        SELECT fm.id
        FROM public.family_members fm
        WHERE fm.family_id = todo_items.family_id
          AND fm.profile_id = public.current_profile_id()
          AND fm.is_active = true
        LIMIT 1
      )
      OR EXISTS (
        SELECT 1
        FROM public.family_members creator
        INNER JOIN public.family_members parent ON parent.family_id = creator.family_id
          AND parent.profile_id = public.current_profile_id()
          AND parent.role IN ('MOM', 'DAD', 'ADULT')
          AND parent.is_active = true
        WHERE creator.id = todo_items.created_by_member_id
          AND creator.family_id = todo_items.family_id
          AND creator.role IN ('CHILD', 'TEEN')
          AND creator.is_active = true
      )
    )
  );

DROP POLICY IF EXISTS "todo_item_shares: insert if creator" ON public.todo_item_shares;

CREATE POLICY "todo_item_shares: insert if creator or parent of kid creator"
  ON public.todo_item_shares
  FOR INSERT
  WITH CHECK (
    (
      EXISTS (
        SELECT 1
        FROM public.todo_items t
        JOIN public.family_members fm ON fm.id = t.created_by_member_id
        WHERE t.id = todo_item_shares.todo_item_id
          AND fm.profile_id = public.current_profile_id()
          AND fm.is_active = true
      )
      OR EXISTS (
        SELECT 1
        FROM public.todo_items t
        JOIN public.family_members creator ON creator.id = t.created_by_member_id
        JOIN public.family_members parent
          ON parent.family_id = creator.family_id
          AND parent.profile_id = public.current_profile_id()
          AND parent.role IN ('MOM', 'DAD', 'ADULT')
          AND parent.is_active = true
        WHERE t.id = todo_item_shares.todo_item_id
          AND creator.family_id = t.family_id
          AND creator.role IN ('CHILD', 'TEEN')
          AND creator.is_active = true
      )
    )
    AND EXISTS (
      SELECT 1
      FROM public.todo_items t
      JOIN public.family_members fm2 ON fm2.id = todo_item_shares.member_id
      WHERE t.id = todo_item_shares.todo_item_id
        AND fm2.family_id = t.family_id
        AND fm2.is_active = true
    )
  );

DROP POLICY IF EXISTS "todo_item_shares: delete if creator" ON public.todo_item_shares;

CREATE POLICY "todo_item_shares: delete if creator or parent of kid creator"
  ON public.todo_item_shares
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.todo_items t
      JOIN public.family_members fm ON fm.id = t.created_by_member_id
      WHERE t.id = todo_item_shares.todo_item_id
        AND fm.profile_id = public.current_profile_id()
        AND fm.is_active = true
    )
    OR EXISTS (
      SELECT 1
      FROM public.todo_items t
      JOIN public.family_members creator ON creator.id = t.created_by_member_id
      JOIN public.family_members parent
        ON parent.family_id = creator.family_id
        AND parent.profile_id = public.current_profile_id()
        AND parent.role IN ('MOM', 'DAD', 'ADULT')
        AND parent.is_active = true
      WHERE t.id = todo_item_shares.todo_item_id
        AND creator.family_id = t.family_id
        AND creator.role IN ('CHILD', 'TEEN')
        AND creator.is_active = true
    )
  );
