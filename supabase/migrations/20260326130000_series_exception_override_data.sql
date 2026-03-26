-- Optional fields for “edit this occurrence” (title, flags, etc.) merged in the app when exception_type = modified.
ALTER TABLE public.activity_series_exceptions
  ADD COLUMN IF NOT EXISTS override_data jsonb;

COMMENT ON COLUMN public.activity_series_exceptions.override_data IS
  'When exception_type = modified: optional overrides (title, location, money, ride flags, notes) merged over the series row for that instance.';
