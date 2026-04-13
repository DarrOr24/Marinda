-- Each member only sees custom list_tabs they created, are shared with, or (legacy) parents see
-- uncleared tabs. Tighten list_tab_shares SELECT. Enforce list access on todo insert/update.

CREATE OR REPLACE FUNCTION public.list_tab_accessible_by_member(p_list_tab_id uuid, p_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_member_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.list_tabs lt
    INNER JOIN public.family_members fm ON fm.id = p_member_id
    WHERE lt.id = p_list_tab_id
      AND lt.family_id = fm.family_id
      AND fm.is_active = true
      AND (
        lt.created_by_member_id = p_member_id
        OR EXISTS (
          SELECT 1
          FROM public.list_tab_shares lts
          WHERE lts.list_tab_id = lt.id
            AND lts.member_id = p_member_id
        )
        OR (
          lt.created_by_member_id IS NULL
          AND fm.role IN ('MOM', 'DAD', 'ADULT')
        )
      )
  );
$$;

DROP POLICY IF EXISTS "list_tabs: select if member" ON public.list_tabs;

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
        AND public.list_tab_accessible_by_member(list_tabs.id, fm.id)
    )
  );

DROP POLICY IF EXISTS "list_tab_shares: select if member of tab family" ON public.list_tab_shares;

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
        AND public.list_tab_accessible_by_member(lt.id, fm.id)
    )
  );

DROP POLICY IF EXISTS "list_tabs: update if parent" ON public.list_tabs;

CREATE POLICY "list_tabs: update if parent or creator"
  ON public.list_tabs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_members fm
      WHERE fm.family_id = list_tabs.family_id
        AND fm.profile_id = public.current_profile_id()
        AND fm.is_active = true
        AND fm.role IN ('MOM', 'DAD', 'ADULT')
    )
    OR (
      list_tabs.created_by_member_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.family_members fm
        WHERE fm.id = list_tabs.created_by_member_id
          AND fm.profile_id = public.current_profile_id()
          AND fm.is_active = true
      )
    )
  );

CREATE OR REPLACE FUNCTION public.todo_items_enforce_list_kind_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tab_id uuid;
BEGIN
  IF NEW.list_kind IS NULL OR trim(NEW.list_kind) = '' OR trim(NEW.list_kind) = 'todos' THEN
    RETURN NEW;
  END IF;
  BEGIN
    v_tab_id := trim(NEW.list_kind)::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid list category for this family.' USING errcode = '23514';
  END;
  IF NOT EXISTS (
    SELECT 1
    FROM public.list_tabs lt
    WHERE lt.id = v_tab_id
      AND lt.family_id = NEW.family_id
  ) THEN
    RAISE EXCEPTION 'Invalid list category for this family.' USING errcode = '23514';
  END IF;
  IF NOT public.list_tab_accessible_by_member(v_tab_id, NEW.created_by_member_id) THEN
    RAISE EXCEPTION 'You don’t have access to this list.' USING errcode = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS todo_items_enforce_list_kind_access ON public.todo_items;

CREATE TRIGGER todo_items_enforce_list_kind_access
  BEFORE INSERT OR UPDATE OF list_kind, created_by_member_id ON public.todo_items
  FOR EACH ROW
  EXECUTE FUNCTION public.todo_items_enforce_list_kind_access();

CREATE OR REPLACE FUNCTION public.delete_list_tab(
  p_tab_id uuid,
  p_family_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid;
BEGIN
  SELECT lt.created_by_member_id INTO v_creator
  FROM public.list_tabs lt
  WHERE lt.id = p_tab_id
    AND lt.family_id = p_family_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'List not found.'
      USING errcode = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.family_id = p_family_id
      AND fm.profile_id = public.current_profile_id()
      AND fm.is_active = true
      AND fm.role IN ('MOM', 'DAD', 'ADULT')
  )
  AND NOT (
    v_creator IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.family_members fm
      WHERE fm.id = v_creator
        AND fm.family_id = p_family_id
        AND fm.profile_id = public.current_profile_id()
        AND fm.is_active = true
    )
  ) THEN
    RAISE EXCEPTION 'Only a parent or the person who created this list can remove it.'
      USING errcode = '42501';
  END IF;

  DELETE FROM public.todo_items
  WHERE family_id = p_family_id
    AND list_kind = p_tab_id::text;

  DELETE FROM public.list_tabs
  WHERE id = p_tab_id
    AND family_id = p_family_id;
END;
$$;
