-- Kid mode: JWT stays the parent's profile, but the app sends the acting kid's member_id.
-- Allow MOM/DAD in the same family to insert replies/reactions attributed to another
-- active member in that family (subject.id <> actor.id).

DROP POLICY IF EXISTS "family members can insert announcement replies" ON public.announcement_replies;

CREATE POLICY "family members can insert announcement replies"
  ON public.announcement_replies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.announcement_items ai
      WHERE ai.id = announcement_replies.announcement_item_id
        AND ai.family_id = announcement_replies.family_id
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.profile_id = public.current_profile_id()
          AND fm.id = announcement_replies.member_id
          AND fm.family_id = announcement_replies.family_id
          AND fm.is_active = true
      )
      OR
      EXISTS (
        SELECT 1 FROM public.family_members actor
        INNER JOIN public.family_members subject ON subject.id = announcement_replies.member_id
        WHERE actor.profile_id = public.current_profile_id()
          AND actor.family_id = announcement_replies.family_id
          AND actor.family_id = subject.family_id
          AND actor.is_active = true
          AND subject.is_active = true
          AND actor.role = ANY (ARRAY['MOM'::"public"."role", 'DAD'::"public"."role"])
          AND subject.id <> actor.id
      )
    )
  );

DROP POLICY IF EXISTS "family members can insert announcement reactions" ON public.announcement_reactions;

CREATE POLICY "family members can insert announcement reactions"
  ON public.announcement_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.announcement_items ai
      WHERE ai.id = announcement_reactions.announcement_item_id
        AND ai.family_id = announcement_reactions.family_id
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.profile_id = public.current_profile_id()
          AND fm.id = announcement_reactions.member_id
          AND fm.family_id = announcement_reactions.family_id
          AND fm.is_active = true
      )
      OR
      EXISTS (
        SELECT 1 FROM public.family_members actor
        INNER JOIN public.family_members subject ON subject.id = announcement_reactions.member_id
        WHERE actor.profile_id = public.current_profile_id()
          AND actor.family_id = announcement_reactions.family_id
          AND actor.family_id = subject.family_id
          AND actor.is_active = true
          AND subject.is_active = true
          AND actor.role = ANY (ARRAY['MOM'::"public"."role", 'DAD'::"public"."role"])
          AND subject.id <> actor.id
      )
    )
  );
