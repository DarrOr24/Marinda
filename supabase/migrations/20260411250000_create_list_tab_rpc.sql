-- Direct INSERT into list_tabs can still fail RLS in edge cases (session/profile quirks). Match
-- insert_todo_item: SECURITY DEFINER RPC validates membership + creator rules, then inserts.

CREATE OR REPLACE FUNCTION public.create_list_tab(
  p_family_id uuid,
  p_label text,
  p_created_by_member_id uuid
)
RETURNS public.list_tabs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.list_tabs;
  v_pid uuid;
  v_label text;
BEGIN
  v_pid := public.current_profile_id();
  IF v_pid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated (no profile for this session).'
      USING errcode = '42501';
  END IF;

  v_label := trim(coalesce(p_label, ''));
  IF length(v_label) = 0 THEN
    RAISE EXCEPTION 'List name is required.' USING errcode = '23514';
  END IF;

  IF NOT public.is_member(p_family_id) THEN
    RAISE EXCEPTION 'You are not a member of this family.'
      USING errcode = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.id = p_created_by_member_id
      AND fm.family_id = p_family_id
      AND fm.is_active = true
  ) THEN
    RAISE EXCEPTION 'Creator must be an active member of this family.'
      USING errcode = '23514';
  END IF;

  IF NOT (
    EXISTS (
      SELECT 1
      FROM public.family_members fm
      WHERE fm.id = p_created_by_member_id
        AND fm.family_id = p_family_id
        AND fm.profile_id = v_pid
        AND fm.is_active = true
    )
    OR EXISTS (
      SELECT 1
      FROM public.family_members creator
      INNER JOIN public.family_members parent
        ON parent.family_id = creator.family_id
        AND parent.profile_id = v_pid
        AND parent.role IN ('MOM', 'DAD', 'ADULT')
        AND parent.is_active = true
      WHERE creator.id = p_created_by_member_id
        AND creator.family_id = p_family_id
        AND creator.role IN ('CHILD', 'TEEN')
        AND creator.is_active = true
    )
  ) THEN
    RAISE EXCEPTION 'Cannot create a list for this member with the current session.'
      USING errcode = '42501';
  END IF;

  INSERT INTO public.list_tabs (family_id, label, created_by_member_id)
  VALUES (p_family_id, v_label, p_created_by_member_id)
  RETURNING * INTO STRICT v_row;

  RETURN v_row;
END;
$$;

ALTER FUNCTION public.create_list_tab(uuid, text, uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.create_list_tab(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_list_tab(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_list_tab(uuid, text, uuid) TO service_role;
