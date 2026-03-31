-- Custom list categories on the Lists board (default tab id `todos` is app-only, like `groceries` for shopping).

CREATE TABLE public.list_tabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT list_tabs_label_not_empty CHECK (length(trim(label)) > 0)
);

CREATE INDEX list_tabs_family_id_idx ON public.list_tabs (family_id);

ALTER TABLE public.todo_items
  ADD COLUMN IF NOT EXISTS list_kind text NOT NULL DEFAULT 'todos';

CREATE INDEX todo_items_family_list_kind_idx
  ON public.todo_items (family_id, list_kind);

CREATE TRIGGER list_tabs_set_updated_at
  BEFORE UPDATE ON public.list_tabs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.list_tabs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "list_tabs: select if member"
  ON public.list_tabs FOR SELECT
  USING (public.is_member(family_id));

CREATE POLICY "list_tabs: insert if member"
  ON public.list_tabs FOR INSERT
  WITH CHECK (public.is_member(family_id));

CREATE POLICY "list_tabs: update if parent"
  ON public.list_tabs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_members fm
      WHERE fm.family_id = list_tabs.family_id
        AND fm.profile_id = public.current_profile_id()
        AND fm.is_active = true
        AND fm.role IN ('MOM', 'DAD', 'ADULT')
    )
  );

CREATE POLICY "list_tabs: delete if parent"
  ON public.list_tabs FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_members fm
      WHERE fm.family_id = list_tabs.family_id
        AND fm.profile_id = public.current_profile_id()
        AND fm.is_active = true
        AND fm.role IN ('MOM', 'DAD', 'ADULT')
    )
  );

GRANT ALL ON TABLE public.list_tabs TO anon;
GRANT ALL ON TABLE public.list_tabs TO authenticated;
GRANT ALL ON TABLE public.list_tabs TO service_role;

-- Remove a custom list and all its items (RLS would block per-row deletes for other creators).

CREATE OR REPLACE FUNCTION public.delete_list_tab(
  p_tab_id uuid,
  p_family_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.family_id = p_family_id
      AND fm.profile_id = public.current_profile_id()
      AND fm.is_active = true
      AND fm.role IN ('MOM', 'DAD', 'ADULT')
  ) THEN
    RAISE EXCEPTION 'Only parents can remove a list and its items.'
      USING errcode = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.list_tabs lt
    WHERE lt.id = p_tab_id
      AND lt.family_id = p_family_id
  ) THEN
    RAISE EXCEPTION 'List not found.'
      USING errcode = '23514';
  END IF;

  DELETE FROM public.todo_items
  WHERE family_id = p_family_id
    AND list_kind = p_tab_id::text;

  DELETE FROM public.list_tabs
  WHERE id = p_tab_id
    AND family_id = p_family_id;
END;
$$;

ALTER FUNCTION public.delete_list_tab(uuid, uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.delete_list_tab(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_list_tab(uuid, uuid) TO authenticated;

-- Extend insert RPC with list_kind; validate built-in slug or family custom tab.

DROP FUNCTION IF EXISTS public.insert_todo_item(uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.insert_todo_item(
  p_family_id uuid,
  p_text text,
  p_created_by_member_id uuid,
  p_list_kind text DEFAULT 'todos'
)
RETURNS public.todo_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.todo_items;
  v_pid uuid;
  v_kind text;
BEGIN
  v_pid := public.current_profile_id();
  IF v_pid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated (no profile for this session).'
      USING errcode = '42501';
  END IF;

  IF length(trim(coalesce(p_text, ''))) = 0 THEN
    RAISE EXCEPTION 'Todo text must not be empty.' USING errcode = '23514';
  END IF;

  v_kind := trim(coalesce(p_list_kind, 'todos'));
  IF v_kind = '' THEN
    v_kind := 'todos';
  END IF;

  IF v_kind <> 'todos' AND NOT EXISTS (
    SELECT 1
    FROM public.list_tabs lt
    WHERE lt.family_id = p_family_id
      AND lt.id::text = v_kind
  ) THEN
    RAISE EXCEPTION 'Invalid list category for this family.'
      USING errcode = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.profile_id = v_pid
      AND fm.family_id = p_family_id
      AND fm.is_active = true
  ) THEN
    RAISE EXCEPTION 'You are not an active member of this family.'
      USING errcode = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.family_members c
    WHERE c.id = p_created_by_member_id
      AND c.family_id = p_family_id
      AND c.is_active = true
  ) THEN
    RAISE EXCEPTION 'Creator must be an active member of this family.'
      USING errcode = '42501';
  END IF;

  INSERT INTO public.todo_items (family_id, text, created_by_member_id, completed, list_kind)
  VALUES (p_family_id, trim(p_text), p_created_by_member_id, false, v_kind)
  RETURNING * INTO STRICT v_row;

  RETURN v_row;
END;
$$;

ALTER FUNCTION public.insert_todo_item(uuid, text, uuid, text) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.insert_todo_item(uuid, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_todo_item(uuid, text, uuid, text) TO authenticated;
