-- Replies and reactions on bulletin (announcement) items.
-- Replies: one thread per item (no nested reply-to-reply in this schema).
-- Reactions: one row per (item, member, emoji); delete row to remove reaction.

CREATE TABLE public.announcement_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_item_id uuid NOT NULL REFERENCES public.announcement_items (id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.family_members (id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT announcement_replies_text_not_empty CHECK (length(trim(text)) > 0)
);

CREATE INDEX announcement_replies_item_id_idx ON public.announcement_replies (announcement_item_id);
CREATE INDEX announcement_replies_family_id_idx ON public.announcement_replies (family_id);

CREATE OR REPLACE FUNCTION public.announcement_replies_lock_refs_on_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.member_id IS DISTINCT FROM OLD.member_id
     OR NEW.family_id IS DISTINCT FROM OLD.family_id
     OR NEW.announcement_item_id IS DISTINCT FROM OLD.announcement_item_id THEN
    RAISE EXCEPTION 'Cannot change reply member, family, or announcement item';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER announcement_replies_lock_refs
  BEFORE UPDATE ON public.announcement_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.announcement_replies_lock_refs_on_update();

CREATE TRIGGER announcement_replies_set_updated_at
  BEFORE UPDATE ON public.announcement_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.announcement_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family members can read announcement replies"
  ON public.announcement_replies
  FOR SELECT
  TO authenticated
  USING ((
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.profile_id = public.current_profile_id()
        AND fm.family_id = announcement_replies.family_id
        AND fm.is_active = true
    )
  ));

CREATE POLICY "family members can insert announcement replies"
  ON public.announcement_replies
  FOR INSERT
  TO authenticated
  WITH CHECK ((
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.profile_id = public.current_profile_id()
        AND fm.id = announcement_replies.member_id
        AND fm.family_id = announcement_replies.family_id
        AND fm.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM public.announcement_items ai
      WHERE ai.id = announcement_replies.announcement_item_id
        AND ai.family_id = announcement_replies.family_id
    )
  ));

CREATE POLICY "author or parent can update announcement replies"
  ON public.announcement_replies
  FOR UPDATE
  TO authenticated
  USING ((
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.profile_id = public.current_profile_id()
        AND fm.family_id = announcement_replies.family_id
        AND fm.is_active = true
        AND (
          fm.id = announcement_replies.member_id
          OR fm.role = ANY (ARRAY['MOM'::"public"."role", 'DAD'::"public"."role"])
        )
    )
  ))
  WITH CHECK ((
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.profile_id = public.current_profile_id()
        AND fm.family_id = announcement_replies.family_id
        AND fm.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM public.announcement_items ai
      WHERE ai.id = announcement_replies.announcement_item_id
        AND ai.family_id = announcement_replies.family_id
    )
  ));

CREATE POLICY "author or parent can delete announcement replies"
  ON public.announcement_replies
  FOR DELETE
  TO authenticated
  USING ((
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.profile_id = public.current_profile_id()
        AND fm.family_id = announcement_replies.family_id
        AND fm.is_active = true
        AND (
          fm.id = announcement_replies.member_id
          OR fm.role = ANY (ARRAY['MOM'::"public"."role", 'DAD'::"public"."role"])
        )
    )
  ));


CREATE TABLE public.announcement_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_item_id uuid NOT NULL REFERENCES public.announcement_items (id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.family_members (id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT announcement_reactions_emoji_not_empty CHECK (length(trim(emoji)) > 0),
  CONSTRAINT announcement_reactions_emoji_len CHECK (char_length(emoji) <= 32),
  CONSTRAINT announcement_reactions_unique_member_emoji UNIQUE (announcement_item_id, member_id, emoji)
);

CREATE INDEX announcement_reactions_item_id_idx ON public.announcement_reactions (announcement_item_id);
CREATE INDEX announcement_reactions_family_id_idx ON public.announcement_reactions (family_id);

ALTER TABLE public.announcement_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family members can read announcement reactions"
  ON public.announcement_reactions
  FOR SELECT
  TO authenticated
  USING ((
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.profile_id = public.current_profile_id()
        AND fm.family_id = announcement_reactions.family_id
        AND fm.is_active = true
    )
  ));

CREATE POLICY "family members can insert announcement reactions"
  ON public.announcement_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK ((
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.profile_id = public.current_profile_id()
        AND fm.id = announcement_reactions.member_id
        AND fm.family_id = announcement_reactions.family_id
        AND fm.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM public.announcement_items ai
      WHERE ai.id = announcement_reactions.announcement_item_id
        AND ai.family_id = announcement_reactions.family_id
    )
  ));

CREATE POLICY "member can delete own reaction or parent any"
  ON public.announcement_reactions
  FOR DELETE
  TO authenticated
  USING ((
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.profile_id = public.current_profile_id()
        AND fm.family_id = announcement_reactions.family_id
        AND fm.is_active = true
        AND (
          fm.id = announcement_reactions.member_id
          OR fm.role = ANY (ARRAY['MOM'::"public"."role", 'DAD'::"public"."role"])
        )
    )
  ));

GRANT ALL ON TABLE public.announcement_replies TO anon;
GRANT ALL ON TABLE public.announcement_replies TO authenticated;
GRANT ALL ON TABLE public.announcement_replies TO service_role;

GRANT ALL ON TABLE public.announcement_reactions TO anon;
GRANT ALL ON TABLE public.announcement_reactions TO authenticated;
GRANT ALL ON TABLE public.announcement_reactions TO service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.announcement_replies;
ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.announcement_reactions;
