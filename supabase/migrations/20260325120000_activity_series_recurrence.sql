-- Recurring events (Google Calendar–style): series definition + per-occurrence exceptions.
-- App expands `recurrence` for visible ranges; DB stores the rule and edits to single instances.

-- ---------------------------------------------------------------------------
-- 1) activity_series — one row per repeating event (no per-day rows)
-- ---------------------------------------------------------------------------
CREATE TABLE public.activity_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  title text NOT NULL,
  location text,
  money integer,
  ride_needed boolean NOT NULL DEFAULT false,
  present_needed boolean NOT NULL DEFAULT false,
  babysitter_needed boolean NOT NULL DEFAULT false,
  notes text,
  status public.activity_status NOT NULL DEFAULT 'PENDING'::public.activity_status,
  rejection_reason text,
  created_by uuid NOT NULL REFERENCES public.family_members (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- First occurrence (anchor). Later instances are derived in the app from `recurrence`.
  first_start_at timestamptz NOT NULL,
  first_end_at timestamptz NOT NULL,
  -- Recurrence rule (validated in app). Shape:
  -- {
  --   "freq": "DAILY" | "WEEKLY" | "MONTHLY",
  --   "interval": 1,
  --   "byWeekday": [0-6] | null,  -- optional; 0 = Sunday; used when freq is WEEKLY
  --   "until": "<ISO timestamptz>" | null,  -- end on this date (exclusive of rule semantics TBD in app)
  --   "count": <positive int> | null         -- end after N occurrences (mutually exclusive with until in app)
  -- }
  -- End options (like Google): never end => until null AND count null; after N => count; on date => until.
  recurrence jsonb NOT NULL,
  CONSTRAINT activity_series_first_window_chk CHECK (first_end_at > first_start_at)
);

CREATE INDEX activity_series_family_idx ON public.activity_series (family_id);
CREATE INDEX activity_series_family_start_idx ON public.activity_series (family_id, first_start_at);

COMMENT ON TABLE public.activity_series IS 'Repeating event definition; occurrences expanded client-side except where activity_series_exceptions apply.';
COMMENT ON COLUMN public.activity_series.recurrence IS 'JSON: freq, interval, optional byWeekday, until and/or count (same semantics as Google Calendar end options).';

-- ---------------------------------------------------------------------------
-- 2) activity_series_participants — same idea as activity_participants
-- ---------------------------------------------------------------------------
CREATE TABLE public.activity_series_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES public.activity_series (id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.family_members (id) ON DELETE CASCADE,
  response public.activity_response_status NOT NULL DEFAULT 'MAYBE'::public.activity_response_status,
  responded_at timestamptz,
  is_creator boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_series_participants_uniq UNIQUE (series_id, member_id)
);

CREATE INDEX activity_series_participants_series_idx ON public.activity_series_participants (series_id);
CREATE INDEX activity_series_participants_family_idx ON public.activity_series_participants (family_id);

-- ---------------------------------------------------------------------------
-- 3) activity_series_exceptions — “this occurrence only” delete or reschedule
-- ---------------------------------------------------------------------------
CREATE TABLE public.activity_series_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES public.activity_series (id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  -- Which occurrence in the series (the canonical start instant of that instance).
  occurrence_start timestamptz NOT NULL,
  exception_type text NOT NULL CHECK (exception_type IN ('cancelled', 'modified')),
  override_start_at timestamptz,
  override_end_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_series_exceptions_uniq UNIQUE (series_id, occurrence_start),
  CONSTRAINT activity_series_exceptions_modified_chk CHECK (
    exception_type <> 'modified'
    OR (override_start_at IS NOT NULL AND override_end_at IS NOT NULL AND override_end_at > override_start_at)
  ),
  CONSTRAINT activity_series_exceptions_cancelled_chk CHECK (
    exception_type <> 'cancelled'
    OR (override_start_at IS NULL AND override_end_at IS NULL)
  )
);

CREATE INDEX activity_series_exceptions_series_idx ON public.activity_series_exceptions (series_id);
CREATE INDEX activity_series_exceptions_family_idx ON public.activity_series_exceptions (family_id);

COMMENT ON TABLE public.activity_series_exceptions IS 'Per-occurrence overrides: skip one instance (cancelled) or move it (modified). “Edit all / this and following” = update series row or split series in app.';

-- ---------------------------------------------------------------------------
-- 4) RLS (mirror activities: family members only)
-- ---------------------------------------------------------------------------
ALTER TABLE public.activity_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_series_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_series_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_series select family"
  ON public.activity_series FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.family_members fm_me
    WHERE fm_me.profile_id = public.current_profile_id()
      AND fm_me.family_id = activity_series.family_id
      AND fm_me.is_active = true
  ));

CREATE POLICY "activity_series insert family"
  ON public.activity_series FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.family_members fm_me
    WHERE fm_me.profile_id = public.current_profile_id()
      AND fm_me.family_id = activity_series.family_id
      AND fm_me.is_active = true
  ));

CREATE POLICY "activity_series update family"
  ON public.activity_series FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.family_members fm_me
    WHERE fm_me.profile_id = public.current_profile_id()
      AND fm_me.family_id = activity_series.family_id
      AND fm_me.is_active = true
  ));

CREATE POLICY "activity_series delete family"
  ON public.activity_series FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.family_members fm_me
    WHERE fm_me.profile_id = public.current_profile_id()
      AND fm_me.family_id = activity_series.family_id
      AND fm_me.is_active = true
  ));

CREATE POLICY "activity_series_participants select family"
  ON public.activity_series_participants FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.family_members fm_me
    WHERE fm_me.profile_id = public.current_profile_id()
      AND fm_me.family_id = activity_series_participants.family_id
      AND fm_me.is_active = true
  ));

CREATE POLICY "activity_series_participants insert family"
  ON public.activity_series_participants FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.family_members fm_me
    WHERE fm_me.profile_id = public.current_profile_id()
      AND fm_me.family_id = activity_series_participants.family_id
      AND fm_me.is_active = true
  ));

CREATE POLICY "activity_series_participants update family"
  ON public.activity_series_participants FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.family_members fm_me
    WHERE fm_me.profile_id = public.current_profile_id()
      AND fm_me.family_id = activity_series_participants.family_id
      AND fm_me.is_active = true
  ));

CREATE POLICY "activity_series_participants delete family"
  ON public.activity_series_participants FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.family_members fm_me
    WHERE fm_me.profile_id = public.current_profile_id()
      AND fm_me.family_id = activity_series_participants.family_id
      AND fm_me.is_active = true
  ));

CREATE POLICY "activity_series_exceptions select family"
  ON public.activity_series_exceptions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.family_members fm_me
    WHERE fm_me.profile_id = public.current_profile_id()
      AND fm_me.family_id = activity_series_exceptions.family_id
      AND fm_me.is_active = true
  ));

CREATE POLICY "activity_series_exceptions insert family"
  ON public.activity_series_exceptions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.family_members fm_me
    WHERE fm_me.profile_id = public.current_profile_id()
      AND fm_me.family_id = activity_series_exceptions.family_id
      AND fm_me.is_active = true
  ));

CREATE POLICY "activity_series_exceptions update family"
  ON public.activity_series_exceptions FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.family_members fm_me
    WHERE fm_me.profile_id = public.current_profile_id()
      AND fm_me.family_id = activity_series_exceptions.family_id
      AND fm_me.is_active = true
  ));

CREATE POLICY "activity_series_exceptions delete family"
  ON public.activity_series_exceptions FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.family_members fm_me
    WHERE fm_me.profile_id = public.current_profile_id()
      AND fm_me.family_id = activity_series_exceptions.family_id
      AND fm_me.is_active = true
  ));

-- ---------------------------------------------------------------------------
-- 5) Grants
-- ---------------------------------------------------------------------------
GRANT ALL ON TABLE public.activity_series TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.activity_series_participants TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.activity_series_exceptions TO anon, authenticated, service_role;
