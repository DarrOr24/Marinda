-- Who posted the chore in family terms (supports kid mode: parent session + kid as actor).
-- Keeps created_by (auth.users) for audit; use created_by_member_id for UI creator checks.

ALTER TABLE public.chores
  ADD COLUMN IF NOT EXISTS created_by_member_id uuid REFERENCES public.family_members(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.chores.created_by_member_id IS 'Family member who created this chore; set from the app (effective member).';
