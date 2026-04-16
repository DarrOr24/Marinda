-- Non-parents (e.g. kids) may set status to PENDING when editing as creator or attendee;
-- parents retain full control over any status value.

CREATE OR REPLACE FUNCTION public.update_activity_with_participants(
  p_activity_id uuid,
  p_patch jsonb,
  p_participants jsonb DEFAULT NULL::jsonb,
  p_replace_participants boolean DEFAULT false
) RETURNS public.activities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity     public.activities;
  v_me_is_parent boolean := false;
  v_new_status   public.activity_status := (p_patch->>'status')::public.activity_status;
BEGIN
  IF v_new_status IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.family_members me
      JOIN public.activities a ON a.family_id = me.family_id
      WHERE a.id = p_activity_id
        AND me.profile_id = public.current_profile_id()
        AND me.role IN ('DAD','MOM','ADULT')
        AND me.is_active = true
    ) INTO v_me_is_parent;

    IF NOT v_me_is_parent THEN
      IF v_new_status IS DISTINCT FROM 'PENDING'::public.activity_status THEN
        RAISE EXCEPTION 'Only a parent can change activity status' USING errcode = '42501';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM public.activities a
        JOIN public.family_members me ON me.family_id = a.family_id
          AND me.profile_id = public.current_profile_id()
          AND me.is_active = true
        WHERE a.id = p_activity_id
          AND (
            a.created_by = me.id
            OR EXISTS (
              SELECT 1
              FROM public.activity_participants ap
              WHERE ap.activity_id = a.id
                AND ap.member_id = me.id
            )
          )
      ) THEN
        RAISE EXCEPTION 'Only a parent can change activity status' USING errcode = '42501';
      END IF;
    END IF;
  END IF;

  IF p_patch ? 'rejection_reason' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.family_members me
      JOIN public.activities a ON a.family_id = me.family_id
      WHERE a.id = p_activity_id
        AND me.profile_id = public.current_profile_id()
        AND me.role IN ('DAD','MOM','ADULT')
        AND me.is_active = true
    ) INTO v_me_is_parent;

    IF NOT v_me_is_parent THEN
      RAISE EXCEPTION 'Only a parent can set rejection reason' USING errcode = '42501';
    END IF;
  END IF;

  UPDATE public.activities a
  SET
    title             = COALESCE(p_patch->>'title', a.title),
    start_at          = COALESCE((p_patch->>'start_at')::timestamptz, a.start_at),
    end_at            = COALESCE((p_patch->>'end_at')::timestamptz, a.end_at),
    location          = COALESCE(NULLIF(p_patch->>'location',''), a.location),
    money             = COALESCE(NULLIF(p_patch->>'money','')::int, a.money),
    ride_needed       = COALESCE((p_patch->>'ride_needed')::boolean, a.ride_needed),
    present_needed    = COALESCE((p_patch->>'present_needed')::boolean, a.present_needed),
    babysitter_needed = COALESCE((p_patch->>'babysitter_needed')::boolean, a.babysitter_needed),
    notes             = COALESCE(NULLIF(p_patch->>'notes',''), a.notes),
    status            = COALESCE(v_new_status, a.status),
    rejection_reason  = CASE
      WHEN COALESCE(v_new_status, a.status) IN ('APPROVED'::public.activity_status, 'PENDING'::public.activity_status) THEN NULL
      WHEN p_patch ? 'rejection_reason' THEN NULLIF(p_patch->>'rejection_reason','')
      ELSE a.rejection_reason
    END
  WHERE a.id = p_activity_id
  RETURNING * INTO v_activity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Activity not found' USING errcode = 'P0002';
  END IF;

  IF p_participants IS NOT NULL THEN
    IF p_replace_participants THEN
      DELETE FROM public.activity_participants ap
      WHERE ap.activity_id = p_activity_id
        AND NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(p_participants) e
          WHERE (e->>'member_id')::uuid = ap.member_id
        );
    END IF;

    INSERT INTO public.activity_participants (
      activity_id,
      family_id,
      member_id,
      response,
      responded_at,
      is_creator
    )
    SELECT
      v_activity.id,
      v_activity.family_id,
      (e->>'member_id')::uuid,
      COALESCE(
        (e->>'response')::public.activity_response_status,
        ap.response,
        'MAYBE'::public.activity_response_status
      ),
      COALESCE(
        (e->>'responded_at')::timestamptz,
        ap.responded_at
      ),
      COALESCE(
        (e->>'is_creator')::boolean,
        ap.is_creator,
        false
      )
    FROM jsonb_array_elements(p_participants) e
    LEFT JOIN public.activity_participants ap
      ON ap.activity_id = v_activity.id
     AND ap.member_id = (e->>'member_id')::uuid
    ON CONFLICT (activity_id, member_id)
    DO UPDATE SET
      response     = excluded.response,
      responded_at = excluded.responded_at,
      is_creator   = excluded.is_creator;
  END IF;

  RETURN v_activity;
END;
$$;
