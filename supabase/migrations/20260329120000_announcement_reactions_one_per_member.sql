-- One reaction per family member per bulletin item (new emoji replaces the previous).

-- Keep the most recent row per (announcement_item_id, member_id).
DELETE FROM public.announcement_reactions
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY announcement_item_id, member_id
        ORDER BY created_at DESC, id DESC
      ) AS rn
    FROM public.announcement_reactions
  ) sub
  WHERE sub.rn > 1
);

ALTER TABLE public.announcement_reactions
  DROP CONSTRAINT IF EXISTS announcement_reactions_unique_member_emoji;

ALTER TABLE public.announcement_reactions
  ADD CONSTRAINT announcement_reactions_one_per_member_note
  UNIQUE (announcement_item_id, member_id);
