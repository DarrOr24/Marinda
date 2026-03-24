-- Kid mode: parent stays logged in (current_profile_id = parent) but activity.created_by
-- is the kid's family_members row. Allow delete when creator is CHILD/TEEN and caller is a
-- parent in the same family (same as acting as that kid in the app).

CREATE OR REPLACE FUNCTION public.delete_activity(p_activity_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid;
  v_can_delete boolean;
BEGIN
  SELECT a.created_by INTO v_creator
  FROM public.activities a
  WHERE a.id = p_activity_id;

  IF v_creator IS NULL THEN
    RAISE EXCEPTION 'Activity not found' USING errcode = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.id = v_creator
      AND fm.profile_id = public.current_profile_id()
      AND fm.is_active = true
  ) INTO v_can_delete;

  IF NOT v_can_delete THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.family_members creator
      INNER JOIN public.family_members parent ON parent.family_id = creator.family_id
        AND parent.profile_id = public.current_profile_id()
        AND parent.role IN ('DAD', 'MOM', 'ADULT')
        AND parent.is_active = true
      WHERE creator.id = v_creator
        AND creator.role IN ('CHILD', 'TEEN')
        AND creator.is_active = true
    ) INTO v_can_delete;
  END IF;

  IF NOT v_can_delete THEN
    RAISE EXCEPTION 'Only the creator can delete this activity' USING errcode = '42501';
  END IF;

  DELETE FROM public.activities WHERE id = p_activity_id;
END;
$$;
