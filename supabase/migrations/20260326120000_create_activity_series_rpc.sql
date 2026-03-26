-- Same approval rule as create_activity_with_participants: parent/adult creators → APPROVED, else PENDING.
-- Direct inserts into activity_series were leaving the default PENDING for all recurring events.

CREATE OR REPLACE FUNCTION public.create_activity_series_with_participants(
  p_series jsonb,
  p_participants jsonb DEFAULT '[]'::jsonb
) RETURNS public.activity_series
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_series public.activity_series;
  v_family_id uuid := (p_series->>'family_id')::uuid;
  v_creator_member uuid := (p_series->>'created_by')::uuid;
  v_creator_is_parent boolean;
  v_initial_status public.activity_status;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.id = v_creator_member
      AND fm.family_id = v_family_id
  ) THEN
    RAISE EXCEPTION 'created_by is not a member of family' USING errcode = '42501';
  END IF;

  SELECT fm.role IN ('DAD', 'MOM', 'ADULT')
  INTO v_creator_is_parent
  FROM public.family_members fm
  WHERE fm.id = v_creator_member;

  v_initial_status := CASE
    WHEN v_creator_is_parent THEN 'APPROVED'::public.activity_status
    ELSE 'PENDING'::public.activity_status
  END;

  INSERT INTO public.activity_series (
    family_id,
    title,
    location,
    money,
    ride_needed,
    present_needed,
    babysitter_needed,
    notes,
    status,
    created_by,
    first_start_at,
    first_end_at,
    recurrence
  )
  VALUES (
    v_family_id,
    p_series->>'title',
    NULLIF(p_series->>'location', ''),
    NULLIF(p_series->>'money', '')::integer,
    COALESCE((p_series->>'ride_needed')::boolean, false),
    COALESCE((p_series->>'present_needed')::boolean, false),
    COALESCE((p_series->>'babysitter_needed')::boolean, false),
    NULLIF(p_series->>'notes', ''),
    v_initial_status,
    v_creator_member,
    (p_series->>'first_start_at')::timestamptz,
    (p_series->>'first_end_at')::timestamptz,
    COALESCE(p_series->'recurrence', '{}'::jsonb)
  )
  RETURNING * INTO v_series;

  INSERT INTO public.activity_series_participants (
    series_id,
    family_id,
    member_id,
    response,
    responded_at,
    is_creator
  )
  SELECT
    v_series.id,
    v_family_id,
    (e->>'member_id')::uuid,
    COALESCE(
      (e->>'response')::public.activity_response_status,
      CASE
        WHEN (e->>'member_id')::uuid = v_creator_member
          THEN 'YES'::public.activity_response_status
        ELSE 'MAYBE'::public.activity_response_status
      END
    ),
    (e->>'responded_at')::timestamptz,
    COALESCE(
      (e->>'is_creator')::boolean,
      (e->>'member_id')::uuid = v_creator_member
    )
  FROM jsonb_array_elements(COALESCE(p_participants, '[]'::jsonb)) AS e
  ON CONFLICT (series_id, member_id) DO NOTHING;

  RETURN v_series;
END
$$;

ALTER FUNCTION public.create_activity_series_with_participants(jsonb, jsonb) OWNER TO postgres;

COMMENT ON FUNCTION public.create_activity_series_with_participants(jsonb, jsonb) IS
  'Creates activity_series + participants; APPROVED when creator role is DAD/MOM/ADULT, else PENDING (matches create_activity_with_participants).';

GRANT EXECUTE ON FUNCTION public.create_activity_series_with_participants(jsonb, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.create_activity_series_with_participants(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_activity_series_with_participants(jsonb, jsonb) TO service_role;
