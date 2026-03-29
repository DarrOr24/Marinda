-- Match bulletin pattern: announcement_items INSERT uses TO authenticated + EXISTS on
-- family_members (schema-reference). Put the whole check in ONE SECURITY DEFINER
-- function so reads of family_members are not subject to invoker RLS during policy eval.

CREATE OR REPLACE FUNCTION public.todo_insert_allowed_for_request(
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
    FROM public.family_members caller
    INNER JOIN public.family_members creator
      ON creator.family_id = caller.family_id
      AND creator.id = p_created_by_member_id
      AND creator.family_id = p_family_id
      AND creator.is_active = true
    WHERE caller.profile_id = public.current_profile_id()
      AND caller.family_id = p_family_id
      AND caller.is_active = true
  );
$$;

ALTER FUNCTION public.todo_insert_allowed_for_request(uuid, uuid) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.todo_insert_allowed_for_request(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.todo_insert_allowed_for_request(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.todo_insert_allowed_for_request(uuid, uuid) TO service_role;

DROP POLICY IF EXISTS "todo_items: insert if member as self" ON public.todo_items;
DROP POLICY IF EXISTS "todo_items: insert if member and creator in family" ON public.todo_items;
DROP POLICY IF EXISTS "todo_items: insert if member and valid creator" ON public.todo_items;

-- Same role targeting as announcement_items INSERT ("family members can create announcements").
CREATE POLICY "todo_items: insert like announcements"
  ON public.todo_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.todo_insert_allowed_for_request(family_id, created_by_member_id)
  );
