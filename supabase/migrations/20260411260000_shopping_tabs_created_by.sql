-- Track who created each custom shopping tab; kids may rename/delete only their own.
-- Parents (logged-in profile) may update/delete any tab in the family.

ALTER TABLE public.shopping_tabs
  ADD COLUMN IF NOT EXISTS created_by_member_id uuid REFERENCES public.family_members (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS shopping_tabs_created_by_member_id_idx
  ON public.shopping_tabs (created_by_member_id);

DROP POLICY IF EXISTS "shopping_tabs: insert if member" ON public.shopping_tabs;

CREATE POLICY "shopping_tabs: insert if member"
  ON public.shopping_tabs
  FOR INSERT
  WITH CHECK (
    public.is_member(family_id)
    AND (
      created_by_member_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.family_members fm
        WHERE fm.id = shopping_tabs.created_by_member_id
          AND fm.family_id = shopping_tabs.family_id
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

DROP POLICY IF EXISTS "shopping_tabs: update if member" ON public.shopping_tabs;

CREATE POLICY "shopping_tabs: update if parent or creator"
  ON public.shopping_tabs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_members fm
      WHERE fm.family_id = shopping_tabs.family_id
        AND fm.profile_id = public.current_profile_id()
        AND fm.is_active = true
        AND fm.role IN ('MOM', 'DAD', 'ADULT')
    )
    OR (
      shopping_tabs.created_by_member_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.family_members fm
        WHERE fm.id = shopping_tabs.created_by_member_id
          AND fm.profile_id = public.current_profile_id()
          AND fm.is_active = true
      )
    )
  );

DROP POLICY IF EXISTS "shopping_tabs: delete if member" ON public.shopping_tabs;

CREATE POLICY "shopping_tabs: delete if parent or creator"
  ON public.shopping_tabs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_members fm
      WHERE fm.family_id = shopping_tabs.family_id
        AND fm.profile_id = public.current_profile_id()
        AND fm.is_active = true
        AND fm.role IN ('MOM', 'DAD', 'ADULT')
    )
    OR (
      shopping_tabs.created_by_member_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.family_members fm
        WHERE fm.id = shopping_tabs.created_by_member_id
          AND fm.profile_id = public.current_profile_id()
          AND fm.is_active = true
      )
    )
  );
