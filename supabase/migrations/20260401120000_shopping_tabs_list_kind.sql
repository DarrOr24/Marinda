-- Shopping lists as tabs (like bulletin): default "groceries" in app + per-family custom tabs.
-- grocery_items.list_kind matches ShoppingTab.id (built-in slug or UUID from shopping_tabs).

CREATE TABLE public.shopping_tabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  label text NOT NULL,
  placeholder text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shopping_tabs_label_not_empty CHECK (length(trim(label)) > 0)
);

CREATE INDEX shopping_tabs_family_id_idx ON public.shopping_tabs (family_id);

ALTER TABLE public.grocery_items
  ADD COLUMN IF NOT EXISTS list_kind text NOT NULL DEFAULT 'groceries';

CREATE INDEX grocery_items_family_list_kind_idx
  ON public.grocery_items (family_id, list_kind);

ALTER TABLE public.shopping_tabs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shopping_tabs: select if member"
  ON public.shopping_tabs FOR SELECT
  USING (public.is_member(family_id));

CREATE POLICY "shopping_tabs: insert if member"
  ON public.shopping_tabs FOR INSERT
  WITH CHECK (public.is_member(family_id));

CREATE POLICY "shopping_tabs: update if member"
  ON public.shopping_tabs FOR UPDATE
  USING (public.is_member(family_id));

CREATE POLICY "shopping_tabs: delete if member"
  ON public.shopping_tabs FOR DELETE
  USING (public.is_member(family_id));

GRANT ALL ON TABLE public.shopping_tabs TO anon;
GRANT ALL ON TABLE public.shopping_tabs TO authenticated;
GRANT ALL ON TABLE public.shopping_tabs TO service_role;
