-- Direct INSERT keeps failing RLS in some environments despite matching policies. Inserts
-- from a SECURITY DEFINER function run as the table owner bypass RLS on todo_items while
-- we enforce the same rules as announcements + valid creator in SQL (no invoker subqueries).

CREATE OR REPLACE FUNCTION public.insert_todo_item(
  p_family_id uuid,
  p_text text,
  p_created_by_member_id uuid
)
RETURNS public.todo_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.todo_items;
  v_pid uuid;
BEGIN
  v_pid := public.current_profile_id();
  IF v_pid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated (no profile for this session).'
      USING errcode = '42501';
  END IF;

  IF length(trim(coalesce(p_text, ''))) = 0 THEN
    RAISE EXCEPTION 'Todo text must not be empty.' USING errcode = '23514';
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

  INSERT INTO public.todo_items (family_id, text, created_by_member_id, completed)
  VALUES (p_family_id, trim(p_text), p_created_by_member_id, false)
  RETURNING * INTO STRICT v_row;

  RETURN v_row;
END;
$$;

ALTER FUNCTION public.insert_todo_item(uuid, text, uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.insert_todo_item(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_todo_item(uuid, text, uuid) TO authenticated;
