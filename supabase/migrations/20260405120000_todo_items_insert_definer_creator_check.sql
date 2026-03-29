-- INSERT WITH CHECK had: EXISTS (SELECT 1 FROM family_members ...).
-- That subquery runs as the invoker and is subject to RLS on family_members, which can
-- make EXISTS false even when the creator row is valid (policy interaction / evaluation).
-- Same fix pattern as public.is_member (SECURITY DEFINER).

CREATE OR REPLACE FUNCTION public.todo_creator_belongs_to_family(
  p_family_id uuid,
  p_created_by_member_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members m
    WHERE m.id = p_created_by_member_id
      AND m.family_id = p_family_id
      AND m.is_active = true
  );
$$;

ALTER FUNCTION public.todo_creator_belongs_to_family(uuid, uuid) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.todo_creator_belongs_to_family(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.todo_creator_belongs_to_family(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.todo_creator_belongs_to_family(uuid, uuid) TO service_role;

DROP POLICY IF EXISTS "todo_items: insert if member as self" ON public.todo_items;
DROP POLICY IF EXISTS "todo_items: insert if member and creator in family" ON public.todo_items;
DROP POLICY IF EXISTS "todo_items: insert if member and valid creator" ON public.todo_items;

CREATE POLICY "todo_items: insert if member and valid creator"
  ON public.todo_items
  FOR INSERT
  WITH CHECK (
    public.is_member(family_id)
    AND public.todo_creator_belongs_to_family(family_id, created_by_member_id)
  );
