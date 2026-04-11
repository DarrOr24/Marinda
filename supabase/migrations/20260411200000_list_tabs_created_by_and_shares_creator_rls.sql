-- Track who created each custom list so UI can allow that member (including children) to manage
-- list_tab_shares. Extend RLS so parents OR the list creator can insert/delete share rows.

ALTER TABLE public.list_tabs
  ADD COLUMN IF NOT EXISTS created_by_member_id uuid REFERENCES public.family_members (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS list_tabs_created_by_member_id_idx
  ON public.list_tabs (created_by_member_id);

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
    )
  );

DROP POLICY IF EXISTS "list_tab_shares: insert if parent" ON public.list_tab_shares;
DROP POLICY IF EXISTS "list_tab_shares: delete if parent" ON public.list_tab_shares;

CREATE POLICY "list_tab_shares: insert if parent or list creator"
  ON public.list_tab_shares
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.list_tabs lt
      INNER JOIN public.family_members fm ON fm.family_id = lt.family_id
      WHERE lt.id = list_tab_shares.list_tab_id
        AND fm.profile_id = public.current_profile_id()
        AND fm.is_active = true
        AND fm.role IN ('MOM', 'DAD', 'ADULT')
    )
    OR EXISTS (
      SELECT 1
      FROM public.list_tabs lt
      INNER JOIN public.family_members fm ON fm.family_id = lt.family_id
      WHERE lt.id = list_tab_shares.list_tab_id
        AND fm.profile_id = public.current_profile_id()
        AND fm.is_active = true
        AND lt.created_by_member_id IS NOT NULL
        AND lt.created_by_member_id = fm.id
    )
  );

CREATE POLICY "list_tab_shares: delete if parent or list creator"
  ON public.list_tab_shares
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.list_tabs lt
      INNER JOIN public.family_members fm ON fm.family_id = lt.family_id
      WHERE lt.id = list_tab_shares.list_tab_id
        AND fm.profile_id = public.current_profile_id()
        AND fm.is_active = true
        AND fm.role IN ('MOM', 'DAD', 'ADULT')
    )
    OR EXISTS (
      SELECT 1
      FROM public.list_tabs lt
      INNER JOIN public.family_members fm ON fm.family_id = lt.family_id
      WHERE lt.id = list_tab_shares.list_tab_id
        AND fm.profile_id = public.current_profile_id()
        AND fm.is_active = true
        AND lt.created_by_member_id IS NOT NULL
        AND lt.created_by_member_id = fm.id
    )
  );
