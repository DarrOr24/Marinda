-- list_tab_shares previously stored only “other” members. RLS (todo_item_id_visible_to_me) requires
-- viewer.id to appear in list_tab_shares to see items created by someone else. Backfill: add every
-- distinct todo creator on that list who is missing from list_tab_shares.

INSERT INTO public.list_tab_shares (list_tab_id, member_id)
SELECT DISTINCT lt.id, t.created_by_member_id
FROM public.list_tabs lt
INNER JOIN public.todo_items t
  ON t.family_id = lt.family_id
  AND t.list_kind = lt.id::text
WHERE EXISTS (
  SELECT 1
  FROM public.list_tab_shares lts
  WHERE lts.list_tab_id = lt.id
)
AND NOT EXISTS (
  SELECT 1
  FROM public.list_tab_shares x
  WHERE x.list_tab_id = lt.id
    AND x.member_id = t.created_by_member_id
)
ON CONFLICT (list_tab_id, member_id) DO NOTHING;
