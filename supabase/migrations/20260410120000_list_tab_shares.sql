-- List-level sharing (Option C): custom list_tabs can have list_tab_shares; visibility uses those
-- rows instead of todo_item_shares when the list has at least one share. Built-in list_kind
-- `todos` is unchanged (item-level shares only).

CREATE TABLE public.list_tab_shares (
  list_tab_id uuid NOT NULL REFERENCES public.list_tabs (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.family_members (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (list_tab_id, member_id)
);

CREATE INDEX list_tab_shares_member_id_idx ON public.list_tab_shares (member_id);

-- Share target must belong to the same family as the list tab.
CREATE OR REPLACE FUNCTION public.list_tab_shares_same_family()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.list_tabs lt
    INNER JOIN public.family_members m ON m.id = NEW.member_id
    WHERE lt.id = NEW.list_tab_id
      AND m.family_id = lt.family_id
      AND m.is_active = true
  ) THEN
    RAISE EXCEPTION 'list_tab_shares.member_id must be an active member of the list tab family.'
      USING errcode = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER list_tab_shares_same_family
  BEFORE INSERT OR UPDATE OF list_tab_id, member_id ON public.list_tab_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.list_tab_shares_same_family();

ALTER TABLE public.list_tab_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "list_tab_shares: select if member of tab family"
  ON public.list_tab_shares
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.list_tabs lt
      WHERE lt.id = list_tab_shares.list_tab_id
        AND public.is_member(lt.family_id)
    )
  );

CREATE POLICY "list_tab_shares: insert if parent"
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
  );

CREATE POLICY "list_tab_shares: delete if parent"
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
  );

GRANT ALL ON TABLE public.list_tab_shares TO anon;
GRANT ALL ON TABLE public.list_tab_shares TO authenticated;
GRANT ALL ON TABLE public.list_tab_shares TO service_role;

-- For lists with list_tab_shares: visibility via list shares. Otherwise unchanged (todo_item_shares).
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
          FROM public.list_tabs lt
          INNER JOIN public.list_tab_shares lts ON lts.list_tab_id = lt.id
          WHERE lt.family_id = t.family_id
            AND lt.id::text = t.list_kind
            AND lts.member_id = viewer.id
        )
        OR (
          NOT EXISTS (
            SELECT 1
            FROM public.list_tabs lt
            INNER JOIN public.list_tab_shares lts ON lts.list_tab_id = lt.id
            WHERE lt.family_id = t.family_id
              AND lt.id::text = t.list_kind
          )
          AND EXISTS (
            SELECT 1
            FROM public.todo_item_shares s
            WHERE s.todo_item_id = t.id
              AND s.member_id = viewer.id
          )
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

-- Enforce Option C in the DB: no new per-item shares when the list uses list_tab_shares.
CREATE OR REPLACE FUNCTION public.todo_item_shares_reject_if_list_shared()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.todo_items t
    INNER JOIN public.list_tabs lt
      ON lt.family_id = t.family_id
      AND lt.id::text = t.list_kind
    INNER JOIN public.list_tab_shares lts ON lts.list_tab_id = lt.id
    WHERE t.id = NEW.todo_item_id
  ) THEN
    RAISE EXCEPTION 'This list uses list-level sharing; add or remove people on the list instead of per-item shares.'
      USING errcode = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER todo_item_shares_reject_if_list_shared
  BEFORE INSERT ON public.todo_item_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.todo_item_shares_reject_if_list_shared();

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.list_tab_shares;
