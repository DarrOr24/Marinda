-- Family to-dos: private to creator by default; optional shares via todo_item_shares.

CREATE TABLE public.todo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  text text NOT NULL,
  created_by_member_id uuid NOT NULL REFERENCES public.family_members (id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT todo_items_text_not_empty CHECK (length(trim(text)) > 0)
);

CREATE INDEX todo_items_family_id_created_at_idx
  ON public.todo_items (family_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.todo_items_lock_refs_on_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.family_id IS DISTINCT FROM OLD.family_id
     OR NEW.created_by_member_id IS DISTINCT FROM OLD.created_by_member_id THEN
    RAISE EXCEPTION 'Cannot change todo item family or creator';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER todo_items_lock_refs
  BEFORE UPDATE ON public.todo_items
  FOR EACH ROW
  EXECUTE FUNCTION public.todo_items_lock_refs_on_update();

CREATE TRIGGER todo_items_set_updated_at
  BEFORE UPDATE ON public.todo_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.todo_item_shares (
  todo_item_id uuid NOT NULL REFERENCES public.todo_items (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.family_members (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (todo_item_id, member_id)
);

CREATE INDEX todo_item_shares_member_id_idx ON public.todo_item_shares (member_id);

-- SECURITY DEFINER: visibility check reads todo_items + todo_item_shares; without this,
-- RLS on those tables would recurse when evaluated from each other's policies.
CREATE OR REPLACE FUNCTION public.todo_item_id_visible_to_me(p_todo_item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.todo_items t
    JOIN public.family_members fm ON fm.family_id = t.family_id
    WHERE t.id = p_todo_item_id
      AND fm.profile_id = public.current_profile_id()
      AND fm.is_active = true
      AND (
        fm.id = t.created_by_member_id
        OR EXISTS (
          SELECT 1
          FROM public.todo_item_shares s
          WHERE s.todo_item_id = t.id
            AND s.member_id = fm.id
        )
      )
  );
$$;

ALTER FUNCTION public.todo_item_id_visible_to_me(uuid) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.todo_item_id_visible_to_me(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.todo_item_id_visible_to_me(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.todo_item_id_visible_to_me(uuid) TO service_role;

ALTER TABLE public.todo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_item_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todo_items: select if visible"
  ON public.todo_items
  FOR SELECT
  USING (public.todo_item_id_visible_to_me(id));

CREATE POLICY "todo_items: insert if member as self"
  ON public.todo_items
  FOR INSERT
  WITH CHECK (
    public.is_member(family_id)
    AND created_by_member_id = (
      SELECT fm.id
      FROM public.family_members fm
      WHERE fm.family_id = todo_items.family_id
        AND fm.profile_id = public.current_profile_id()
        AND fm.is_active = true
      LIMIT 1
    )
  );

CREATE POLICY "todo_items: update if visible"
  ON public.todo_items
  FOR UPDATE
  USING (public.todo_item_id_visible_to_me(id))
  WITH CHECK (public.todo_item_id_visible_to_me(id));

CREATE POLICY "todo_items: delete if visible"
  ON public.todo_items
  FOR DELETE
  USING (public.todo_item_id_visible_to_me(id));

CREATE POLICY "todo_item_shares: select if visible"
  ON public.todo_item_shares
  FOR SELECT
  USING (public.todo_item_id_visible_to_me(todo_item_id));

CREATE POLICY "todo_item_shares: insert if creator"
  ON public.todo_item_shares
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.todo_items t
      JOIN public.family_members fm ON fm.id = t.created_by_member_id
      WHERE t.id = todo_item_shares.todo_item_id
        AND fm.profile_id = public.current_profile_id()
        AND fm.is_active = true
    )
    AND EXISTS (
      SELECT 1
      FROM public.todo_items t
      JOIN public.family_members fm2 ON fm2.id = todo_item_shares.member_id
      WHERE t.id = todo_item_shares.todo_item_id
        AND fm2.family_id = t.family_id
        AND fm2.is_active = true
    )
  );

CREATE POLICY "todo_item_shares: delete if creator"
  ON public.todo_item_shares
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.todo_items t
      JOIN public.family_members fm ON fm.id = t.created_by_member_id
      WHERE t.id = todo_item_shares.todo_item_id
        AND fm.profile_id = public.current_profile_id()
        AND fm.is_active = true
    )
  );

GRANT ALL ON TABLE public.todo_items TO anon;
GRANT ALL ON TABLE public.todo_items TO authenticated;
GRANT ALL ON TABLE public.todo_items TO service_role;

GRANT ALL ON TABLE public.todo_item_shares TO anon;
GRANT ALL ON TABLE public.todo_item_shares TO authenticated;
GRANT ALL ON TABLE public.todo_item_shares TO service_role;
