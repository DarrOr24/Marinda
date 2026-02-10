


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."activity_response_status" AS ENUM (
    'YES',
    'NO',
    'MAYBE'
);


ALTER TYPE "public"."activity_response_status" OWNER TO "postgres";


CREATE TYPE "public"."activity_status" AS ENUM (
    'APPROVED',
    'NOT_APPROVED',
    'PENDING'
);


ALTER TYPE "public"."activity_status" OWNER TO "postgres";


CREATE TYPE "public"."chore_status" AS ENUM (
    'OPEN',
    'SUBMITTED',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE "public"."chore_status" OWNER TO "postgres";


CREATE TYPE "public"."color_scheme" AS ENUM (
    'SKY',
    'OCEAN',
    'LAGOON',
    'FOREST',
    'MINT',
    'SUNSET',
    'CORAL',
    'ROSE',
    'LAVENDER',
    'VIOLET',
    'GOLD',
    'SAND',
    'PLUM',
    'CHERRY',
    'MOSS',
    'ICE'
);


ALTER TYPE "public"."color_scheme" OWNER TO "postgres";


CREATE TYPE "public"."gender" AS ENUM (
    'MALE',
    'FEMALE'
);


ALTER TYPE "public"."gender" OWNER TO "postgres";


CREATE TYPE "public"."role" AS ENUM (
    'MOM',
    'DAD',
    'ADULT',
    'TEEN',
    'CHILD'
);


ALTER TYPE "public"."role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_family_invite"("invite_token" "text") RETURNS TABLE("family_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_invite record;
  v_profile_id uuid;
begin
  select * into v_invite
  from family_invites
  where token = invite_token
  and status = 'pending'
  and expires_at > now()
  for update;

  if not found then
    raise exception 'Invalid or expired invite';
  end if;

  select id into v_profile_id
  from profiles
  where auth_user_id = auth.uid();

  insert into family_members (family_id, profile_id, role)
  values (v_invite.family_id, v_profile_id, v_invite.role);

  update family_invites
  set status='accepted',
      accepted_at=now(),
      accepted_by_profile_id=v_profile_id
  where id=v_invite.id;

  return query select v_invite.family_id;
end;
$$;


ALTER FUNCTION "public"."accept_family_invite"("invite_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."award_member_points"("p_member_id" "uuid", "p_delta" integer) RETURNS TABLE("id" "uuid", "points" integer)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  update public.family_members
  set points = coalesce(points, 0) + p_delta
  where id = p_member_id
  returning id, points;
$$;


ALTER FUNCTION "public"."award_member_points"("p_member_id" "uuid", "p_delta" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "location" "text",
    "money" integer,
    "ride_needed" boolean DEFAULT false,
    "present_needed" boolean DEFAULT false,
    "babysitter_needed" boolean DEFAULT false,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "status" "public"."activity_status" DEFAULT 'PENDING'::"public"."activity_status" NOT NULL,
    "start_at" timestamp with time zone NOT NULL,
    "end_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."activities" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_activity_with_participants"("p_activity" "jsonb", "p_participants" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "public"."activities"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_activity        public.activities;
  v_family_id       uuid := (p_activity->>'family_id')::uuid;
  v_creator_member  uuid := (p_activity->>'created_by')::uuid;
  v_creator_is_parent boolean;
  v_initial_status  public.activity_status;
begin
  -- ensure created_by is a member of this family
  if not exists (
    select 1
    from public.family_members fm
    where fm.id = v_creator_member
      and fm.family_id = v_family_id
  ) then
    raise exception 'created_by is not a member of family' using errcode = '42501';
  end if;

  -- detect if creator is a parent/adult
  select fm.role in ('DAD','MOM','ADULT')
  into v_creator_is_parent
  from public.family_members fm
  where fm.id = v_creator_member;

  v_initial_status := case
    when v_creator_is_parent then 'APPROVED'
    else 'PENDING'
  end;

  insert into public.activities (
    family_id,
    title,
    start_at,
    end_at,
    location,
    money,
    ride_needed,
    present_needed,
    babysitter_needed,
    notes,
    status,
    created_by
  )
  values (
    v_family_id,
    p_activity->>'title',
    (p_activity->>'start_at')::timestamptz,
    (p_activity->>'end_at')::timestamptz,
    nullif(p_activity->>'location',''),
    nullif(p_activity->>'money','')::int,
    coalesce((p_activity->>'ride_needed')::boolean, false),
    coalesce((p_activity->>'present_needed')::boolean, false),
    coalesce((p_activity->>'babysitter_needed')::boolean, false),
    nullif(p_activity->>'notes',''),
    v_initial_status,
    v_creator_member
  )
  returning * into v_activity;

  insert into public.activity_participants (
    activity_id,
    family_id,
    member_id,
    response,
    responded_at,
    is_creator
  )
  select
    v_activity.id,
    v_family_id,
    (e->>'member_id')::uuid,
    coalesce(
      (e->>'response')::public.activity_response_status,
      case
        when (e->>'member_id')::uuid = v_creator_member
          then 'YES'::public.activity_response_status
        else 'MAYBE'::public.activity_response_status
      end
    ),
    (e->>'responded_at')::timestamptz,
    coalesce(
      (e->>'is_creator')::boolean,
      (e->>'member_id')::uuid = v_creator_member
    )
  from jsonb_array_elements(coalesce(p_participants, '[]'::jsonb)) e
  on conflict (activity_id, member_id) do nothing;

  return v_activity;
end
$$;


ALTER FUNCTION "public"."create_activity_with_participants"("p_activity" "jsonb", "p_participants" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_family"("p_name" "text", "p_nickname" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_family_id uuid;
  v_auth_user uuid := auth.uid();
  v_profile_id uuid;
  v_color color_scheme;
  v_gender gender;
  v_role role;
begin
  if v_auth_user is null then
    raise exception 'Not authenticated';
  end if;

  v_profile_id := public.current_profile_id();
  if v_profile_id is null then
    -- should not happen for real users (handle_new_user creates it),
    -- but keep it safe.
    insert into public.profiles (auth_user_id)
    values (v_auth_user)
    returning id into v_profile_id;
  end if;

  insert into public.families (name, created_by)
  values (nullif(trim(p_name), ''), v_profile_id)
  returning id into v_family_id;

  -- best-effort gender/role
  select gender into v_gender
  from public.profiles
  where id = v_profile_id;

  if v_gender = 'FEMALE' then v_role := 'MOM';
  elsif v_gender = 'MALE' then v_role := 'DAD';
  else v_role := 'ADULT';
  end if;

  -- pick random color safely
  select (enum_range(null::color_scheme))[1 + floor(random() * array_length(enum_range(null::color_scheme), 1))::int]
  into v_color;

  insert into public.family_members (family_id, profile_id, role, nickname, color_scheme, is_active)
  values (
    v_family_id,
    v_profile_id,
    v_role,
    nullif(trim(p_nickname), ''),
    v_color,
    true
  )
  on conflict (family_id, profile_id) do update
    set nickname  = excluded.nickname,
        is_active = true;

  return v_family_id;
end;
$$;


ALTER FUNCTION "public"."create_family"("p_name" "text", "p_nickname" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_kid_member"("p_family_id" "uuid", "p_first_name" "text", "p_last_name" "text" DEFAULT NULL::"text", "p_gender" "public"."gender" DEFAULT 'MALE'::"public"."gender", "p_birth_date" "date" DEFAULT NULL::"date", "p_nickname" "text" DEFAULT NULL::"text", "p_role" "public"."role" DEFAULT 'CHILD'::"public"."role") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_caller_profile_id uuid;
  v_caller_role public.role;
  v_new_profile_id uuid;
  v_new_member_id uuid;
begin
  -- must be authenticated
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_family_id is null then
    raise exception 'family_id is required';
  end if;

  if nullif(trim(p_first_name), '') is null then
    raise exception 'first_name is required';
  end if;

  -- Resolve caller profile
  select id into v_caller_profile_id
  from public.profiles
  where auth_user_id = auth.uid()
  limit 1;

  if v_caller_profile_id is null then
    raise exception 'Caller profile not found';
  end if;

  -- Caller must be active member of this family, and must be a parent
  select role into v_caller_role
  from public.family_members
  where family_id = p_family_id
    and profile_id = v_caller_profile_id
    and is_active = true
  limit 1;

  if v_caller_role is null then
    raise exception 'Not a member of this family';
  end if;

  if v_caller_role not in ('MOM','DAD') then
    raise exception 'Only parents can add kids';
  end if;

  -- This function is only for creating kids/teens
  if p_role not in ('TEEN','CHILD') then
    raise exception 'Invalid role for kid creation';
  end if;

  -- Insert profile (no auth user)
  insert into public.profiles (
    auth_user_id,
    first_name,
    last_name,
    gender,
    birth_date,
    avatar_url
  )
  values (
    null,
    trim(p_first_name),
    nullif(trim(p_last_name), ''),
    coalesce(p_gender, 'MALE'::public.gender),
    p_birth_date,
    null
  )
  returning id into v_new_profile_id;

  -- Insert family_member
  insert into public.family_members (
    family_id,
    profile_id,
    role,
    nickname,
    is_active,
    points
  )
  values (
    p_family_id,
    v_new_profile_id,
    p_role,
    nullif(trim(p_nickname), ''),
    true,
    0
  )
  returning id into v_new_member_id;

  return v_new_member_id;
end;
$$;


ALTER FUNCTION "public"."create_kid_member"("p_family_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_gender" "public"."gender", "p_birth_date" "date", "p_nickname" "text", "p_role" "public"."role") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_kid_member"("p_family_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_gender" "public"."gender", "p_birth_date" "date", "p_nickname" "text", "p_role" "public"."role") IS 'Creates a kid/teen: profile with auth_user_id NULL + family_member. Only MOM/DAD can call.';



CREATE OR REPLACE FUNCTION "public"."current_profile_id"() RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p.id
  from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1
$$;


ALTER FUNCTION "public"."current_profile_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."family_id_from_avatar_key"("object_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  first_part text;
  fam_id uuid;
begin
  first_part := split_part(object_name, '/', 1);

  begin
    fam_id := first_part::uuid;
  exception
    when others then
      return null;
  end;

  return fam_id;
end;
$$;


ALTER FUNCTION "public"."family_id_from_avatar_key"("object_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_invite_status"("invite_token" "text") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select status::text from family_invites where token = invite_token limit 1;
$$;


ALTER FUNCTION "public"."get_invite_status"("invite_token" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_invite_status"("invite_token" "text") IS 'Returns family_invites.status for the given token, or null if not found. Used by client to avoid treating rejected/used invites as pending.';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_first text := nullif(trim(new.raw_user_meta_data->>'first_name'), '');
  v_last  text := nullif(trim(new.raw_user_meta_data->>'last_name'), '');
  v_avatar text := nullif(trim(new.raw_user_meta_data->>'avatar_url'), '');
  v_gender_txt text := upper(trim(new.raw_user_meta_data->>'gender'));
  v_gender public.gender := null;
  v_birth_txt text := nullif(trim(new.raw_user_meta_data->>'birth_date'), '');
  v_birth date := null;
begin
  -- safe enum parse
  if v_gender_txt in ('MALE','FEMALE') then
    v_gender := v_gender_txt::public.gender;
  end if;

  -- safe date parse (expects YYYY-MM-DD)
  if v_birth_txt ~ '^\d{4}-\d{2}-\d{2}$' then
    v_birth := v_birth_txt::date;
  end if;

  -- create a profile row linked to this auth user
  insert into public.profiles
    (auth_user_id, first_name, last_name, avatar_url, gender, birth_date)
  values
    (new.id, v_first, v_last, v_avatar,
     coalesce(v_gender, 'MALE'::public.gender),
     v_birth)
  on conflict (auth_user_id) do nothing;

  return new;
end;
$_$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_family_parent"("family" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  pid uuid;
  result boolean;
begin
  pid := public.current_profile_id();
  if pid is null then
    return false;
  end if;

  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = family
      and fm.profile_id = pid
      and fm.is_active = true
      and fm.role in ('MOM','DAD')
  )
  into result;

  return coalesce(result, false);
end;
$$;


ALTER FUNCTION "public"."is_family_parent"("family" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_member"("family" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  pid uuid;
  result boolean;
begin
  pid := public.current_profile_id();
  if pid is null then
    return false;
  end if;

  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = family
      and fm.profile_id = pid
      and fm.is_active = true
  )
  into result;

  return coalesce(result, false);
end;
$$;


ALTER FUNCTION "public"."is_member"("family" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."join_family_by_code"("p_code" "text", "p_role" "public"."role", "p_nickname" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_auth_user uuid := auth.uid();
  v_profile_id uuid;
  v_fam  uuid;
begin
  if v_auth_user is null then
    raise exception 'Not authenticated';
  end if;

  v_profile_id := public.current_profile_id();
  if v_profile_id is null then
    insert into public.profiles (auth_user_id)
    values (v_auth_user)
    returning id into v_profile_id;
  end if;

  select id
  into v_fam
  from public.families
  where upper(code) = upper(p_code);

  if v_fam is null then
    raise exception 'No family found for code %', p_code;
  end if;

  insert into public.family_members (family_id, profile_id, role, nickname, is_active)
  values (
    v_fam,
    v_profile_id,
    p_role,
    nullif(trim(p_nickname), ''),
    true
  )
  on conflict (family_id, profile_id)
  do update
    set role      = excluded.role,
        nickname  = excluded.nickname,
        is_active = true;

  return v_fam;
end;
$$;


ALTER FUNCTION "public"."join_family_by_code"("p_code" "text", "p_role" "public"."role", "p_nickname" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_family_invite"("invite_token" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update family_invites
  set status = 'rejected'
  where token = invite_token
    and status = 'pending';
end;
$$;


ALTER FUNCTION "public"."reject_family_invite"("invite_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_family_member"("p_family_id" "uuid", "p_member_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_auth_user uuid := auth.uid();
  v_profile_id uuid;
  v_caller_role public.role;
  v_self_member_id uuid;
begin
  if v_auth_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  v_profile_id := public.current_profile_id();
  if v_profile_id is null then
    raise exception 'No profile for current user' using errcode = '42501';
  end if;

  -- ensure caller is an active parent in this family
  select role
  into v_caller_role
  from public.family_members
  where family_id = p_family_id
    and profile_id = v_profile_id
    and is_active = true
  limit 1;

  if v_caller_role is null or v_caller_role not in ('MOM','DAD') then
    raise exception 'Only parents can remove family members' using errcode = '42501';
  end if;

  -- prevent removing yourself
  select id
  into v_self_member_id
  from public.family_members
  where family_id = p_family_id
    and profile_id = v_profile_id
    and is_active = true
  limit 1;

  if v_self_member_id = p_member_id then
    raise exception 'You cannot remove yourself from this family' using errcode = 'P0001';
  end if;

  update public.family_members
  set is_active = false
  where id = p_member_id
    and family_id = p_family_id;

  return;
end;
$$;


ALTER FUNCTION "public"."remove_family_member"("p_family_id" "uuid", "p_member_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rotate_family_code"("p_family_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_auth_user uuid := auth.uid();
  v_profile_id uuid;
  v_caller_role public.role;
  v_new_code    text;
begin
  if v_auth_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  v_profile_id := public.current_profile_id();
  if v_profile_id is null then
    raise exception 'No profile for current user' using errcode = '42501';
  end if;

  -- ensure caller is an active parent in this family
  select role
  into v_caller_role
  from public.family_members
  where family_id = p_family_id
    and profile_id = v_profile_id
    and is_active = true
  limit 1;

  if v_caller_role is null or v_caller_role not in ('MOM','DAD') then
    raise exception 'Only parents can rotate family code' using errcode = '42501';
  end if;

  loop
    v_new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (
      select 1 from public.families where upper(code) = v_new_code
    );
  end loop;

  update public.families
  set code = v_new_code
  where id = p_family_id
  returning code into v_new_code;

  return v_new_code;
end;
$$;


ALTER FUNCTION "public"."rotate_family_code"("p_family_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  return new;
end; $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_activity_with_participants"("p_activity_id" "uuid", "p_patch" "jsonb", "p_participants" "jsonb" DEFAULT NULL::"jsonb", "p_replace_participants" boolean DEFAULT false) RETURNS "public"."activities"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_activity     public.activities;
  v_me_is_parent boolean;
  v_new_status   public.activity_status := (p_patch->>'status')::public.activity_status;
begin
  -- only a parent can change status
  if v_new_status is not null then
    select exists (
      select 1
      from public.family_members me
      join public.activities a on a.family_id = me.family_id
      where a.id = p_activity_id
        and me.profile_id = auth.uid()
        and me.role in ('DAD','MOM','ADULT')
    ) into v_me_is_parent;

    if not v_me_is_parent then
      raise exception 'Only a parent can change activity status' using errcode = '42501';
    end if;
  end if;

  update public.activities a
  set
    title             = coalesce(p_patch->>'title', a.title),
    start_at          = coalesce((p_patch->>'start_at')::timestamptz, a.start_at),
    end_at            = coalesce((p_patch->>'end_at')::timestamptz, a.end_at),
    location          = coalesce(nullif(p_patch->>'location',''), a.location),
    money             = coalesce(nullif(p_patch->>'money','')::int, a.money),
    ride_needed       = coalesce((p_patch->>'ride_needed')::boolean, a.ride_needed),
    present_needed    = coalesce((p_patch->>'present_needed')::boolean, a.present_needed),
    babysitter_needed = coalesce((p_patch->>'babysitter_needed')::boolean, a.babysitter_needed),
    notes             = coalesce(nullif(p_patch->>'notes',''), a.notes),
    status            = coalesce(v_new_status, a.status)
  where a.id = p_activity_id
  returning * into v_activity;

  if not found then
    raise exception 'Activity not found' using errcode = 'P0002';
  end if;

  if p_participants is not null then
    -- Remove participants that are no longer in the provided list (if requested)
    if p_replace_participants then
      delete from public.activity_participants ap
      where ap.activity_id = p_activity_id
        and not exists (
          select 1
          from jsonb_array_elements(p_participants) e
          where (e->>'member_id')::uuid = ap.member_id
        );
    end if;

    -- Upsert provided participants
    insert into public.activity_participants (
      activity_id,
      family_id,
      member_id,
      response,
      responded_at,
      is_creator
    )
    select
      v_activity.id,
      v_activity.family_id,
      (e->>'member_id')::uuid,
      coalesce(
        (e->>'response')::public.activity_response_status,
        ap.response,
        'MAYBE'::public.activity_response_status
      ),
      coalesce(
        (e->>'responded_at')::timestamptz,
        ap.responded_at
      ),
      coalesce(
        (e->>'is_creator')::boolean,
        ap.is_creator,
        false
      )
    from jsonb_array_elements(p_participants) e
    left join public.activity_participants ap
      on ap.activity_id = v_activity.id
     and ap.member_id   = (e->>'member_id')::uuid
    on conflict (activity_id, member_id)
    do update set
      response     = excluded.response,
      responded_at = excluded.responded_at,
      is_creator   = excluded.is_creator;
  end if;

  return v_activity;
end
$$;


ALTER FUNCTION "public"."update_activity_with_participants"("p_activity_id" "uuid", "p_patch" "jsonb", "p_participants" "jsonb", "p_replace_participants" boolean) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activity_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "activity_id" "uuid" NOT NULL,
    "family_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "response" "public"."activity_response_status" DEFAULT 'MAYBE'::"public"."activity_response_status" NOT NULL,
    "responded_at" timestamp with time zone,
    "is_creator" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."activity_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."announcement_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "created_by_member_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "category" "text",
    "text" "text" NOT NULL,
    "week_start" "date",
    "completed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."announcement_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."announcement_tabs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "placeholder" "text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."announcement_tabs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chore_proofs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chore_id" "uuid" NOT NULL,
    "uploader_member_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "media_type" "text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "text",
    CONSTRAINT "chore_proofs_media_type_check" CHECK (("media_type" = ANY (ARRAY['image'::"text", 'video'::"text"])))
);


ALTER TABLE "public"."chore_proofs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."chore_proofs"."type" IS 'BEFORE or AFTER';



CREATE TABLE IF NOT EXISTS "public"."chore_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "default_points" integer NOT NULL,
    "created_by_id" "uuid",
    "is_archived" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."chore_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "points" integer NOT NULL,
    "status" "public"."chore_status" DEFAULT 'OPEN'::"public"."chore_status" NOT NULL,
    "due_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "done_at" timestamp with time zone,
    "approved_by_member_id" "uuid",
    "approved_at" timestamp with time zone,
    "notes" "text",
    "done_by_member_ids" "uuid"[],
    "description" "text",
    "audio_description_url" "text",
    "audio_description_duration" integer,
    "proof_note" "text",
    "assignee_member_ids" "uuid"[],
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."chores" OWNER TO "postgres";


COMMENT ON COLUMN "public"."chores"."expires_at" IS 'Optional deadline for this chore. Null means no expiration.';



CREATE TABLE IF NOT EXISTS "public"."color_palette" (
    "name" "text" NOT NULL,
    "hex" "text" NOT NULL,
    CONSTRAINT "color_palette_hex_check" CHECK (("hex" ~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'::"text"))
);


ALTER TABLE "public"."color_palette" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."families" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "code" "text" DEFAULT "substr"("encode"("extensions"."gen_random_bytes"(6), 'hex'::"text"), 1, 8) NOT NULL,
    "avatar_url" "text",
    "created_by" "uuid"
);


ALTER TABLE "public"."families" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."family_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "invited_by_profile_id" "uuid" NOT NULL,
    "invited_phone" "text" NOT NULL,
    "role" "public"."role" NOT NULL,
    "token" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "accepted_at" timestamp with time zone,
    "accepted_by_profile_id" "uuid",
    CONSTRAINT "family_invites_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'revoked'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."family_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."family_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "role" "public"."role" NOT NULL,
    "nickname" "text",
    "avatar_url" "text",
    "capabilities" "jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "color_scheme" "text" DEFAULT 'SKY'::"text" NOT NULL,
    "points" integer DEFAULT 0 NOT NULL,
    "profile_id" "uuid"
);


ALTER TABLE "public"."family_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."grocery_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "category" "text",
    "added_by_member_id" "uuid" NOT NULL,
    "purchased" boolean DEFAULT false NOT NULL,
    "purchased_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "amount" "text"
);


ALTER TABLE "public"."grocery_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."points_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "delta" integer NOT NULL,
    "reason" "text",
    "chore_id" "uuid",
    "approved_by_member_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "kind" "text" DEFAULT 'chore_earn'::"text"
);


ALTER TABLE "public"."points_ledger" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "birth_date" "date",
    "gender" "public"."gender" DEFAULT 'MALE'::"public"."gender" NOT NULL,
    "auth_user_id" "uuid",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wishlist_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "price" numeric(10,2),
    "link" "text",
    "note" "text",
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT '''open'''::"text",
    "fulfillment_mode" "text" DEFAULT '''parents'''::"text",
    "fulfilled_by" "uuid",
    "fulfilled_at" timestamp with time zone,
    "payment_method" "text"
);


ALTER TABLE "public"."wishlist_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wishlist_settings" (
    "family_id" "uuid" NOT NULL,
    "currency" "text" DEFAULT 'CAD'::"text" NOT NULL,
    "points_per_currency" integer DEFAULT 10 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "self_fulfill_max_price" numeric
);


ALTER TABLE "public"."wishlist_settings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_participants"
    ADD CONSTRAINT "activity_participants_activity_id_member_id_key" UNIQUE ("activity_id", "member_id");



ALTER TABLE ONLY "public"."activity_participants"
    ADD CONSTRAINT "activity_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcement_items"
    ADD CONSTRAINT "announcement_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcement_tabs"
    ADD CONSTRAINT "announcement_tabs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chore_proofs"
    ADD CONSTRAINT "chore_proofs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chore_templates"
    ADD CONSTRAINT "chore_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."color_palette"
    ADD CONSTRAINT "color_palette_pkey" PRIMARY KEY ("name");



ALTER TABLE ONLY "public"."families"
    ADD CONSTRAINT "families_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."family_invites"
    ADD CONSTRAINT "family_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."family_invites"
    ADD CONSTRAINT "family_invites_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grocery_items"
    ADD CONSTRAINT "grocery_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."points_ledger"
    ADD CONSTRAINT "points_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wishlist_items"
    ADD CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wishlist_settings"
    ADD CONSTRAINT "wishlist_settings_pkey" PRIMARY KEY ("family_id");



CREATE INDEX "activity_participants_activity_idx" ON "public"."activity_participants" USING "btree" ("activity_id");



CREATE INDEX "activity_participants_family_idx" ON "public"."activity_participants" USING "btree" ("family_id");



CREATE INDEX "announcement_tabs_family_id_idx" ON "public"."announcement_tabs" USING "btree" ("family_id");



CREATE INDEX "chores_expires_at_idx" ON "public"."chores" USING "btree" ("family_id", "expires_at") WHERE ("status" = 'OPEN'::"public"."chore_status");



CREATE INDEX "family_invites_family_id_idx" ON "public"."family_invites" USING "btree" ("family_id");



CREATE UNIQUE INDEX "family_invites_one_pending_per_phone" ON "public"."family_invites" USING "btree" ("family_id", "invited_phone") WHERE ("status" = 'pending'::"text");



CREATE INDEX "family_invites_token_idx" ON "public"."family_invites" USING "btree" ("token");



CREATE UNIQUE INDEX "profiles_auth_user_id_unique" ON "public"."profiles" USING "btree" ("auth_user_id") WHERE ("auth_user_id" IS NOT NULL);



CREATE UNIQUE INDEX "profiles_id_new_unique" ON "public"."profiles" USING "btree" ("id");



CREATE UNIQUE INDEX "ux_families_code" ON "public"."families" USING "btree" ("code");



CREATE INDEX "wishlist_items_family_idx" ON "public"."wishlist_items" USING "btree" ("family_id");



CREATE INDEX "wishlist_items_member_idx" ON "public"."wishlist_items" USING "btree" ("member_id");



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."family_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_participants"
    ADD CONSTRAINT "activity_participants_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_participants"
    ADD CONSTRAINT "activity_participants_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_participants"
    ADD CONSTRAINT "activity_participants_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcement_items"
    ADD CONSTRAINT "announcement_items_created_by_member_id_fkey" FOREIGN KEY ("created_by_member_id") REFERENCES "public"."family_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcement_items"
    ADD CONSTRAINT "announcement_items_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcement_tabs"
    ADD CONSTRAINT "announcement_tabs_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chore_proofs"
    ADD CONSTRAINT "chore_proofs_chore_id_fkey" FOREIGN KEY ("chore_id") REFERENCES "public"."chores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chore_proofs"
    ADD CONSTRAINT "chore_proofs_uploader_member_id_fkey" FOREIGN KEY ("uploader_member_id") REFERENCES "public"."family_members"("id");



ALTER TABLE ONLY "public"."chore_templates"
    ADD CONSTRAINT "chore_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."family_members"("id");



ALTER TABLE ONLY "public"."chore_templates"
    ADD CONSTRAINT "chore_templates_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_approved_by_member_id_fkey" FOREIGN KEY ("approved_by_member_id") REFERENCES "public"."family_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."families"
    ADD CONSTRAINT "families_created_by_profiles_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."family_invites"
    ADD CONSTRAINT "family_invites_accepted_by_profile_id_fkey" FOREIGN KEY ("accepted_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."family_invites"
    ADD CONSTRAINT "family_invites_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."family_invites"
    ADD CONSTRAINT "family_invites_invited_by_profile_id_fkey" FOREIGN KEY ("invited_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_color_scheme_fkey" FOREIGN KEY ("color_scheme") REFERENCES "public"."color_palette"("name") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_profile_id_profiles_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."grocery_items"
    ADD CONSTRAINT "grocery_items_added_by_member_id_fkey" FOREIGN KEY ("added_by_member_id") REFERENCES "public"."family_members"("id");



ALTER TABLE ONLY "public"."grocery_items"
    ADD CONSTRAINT "grocery_items_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."points_ledger"
    ADD CONSTRAINT "points_ledger_approved_by_member_id_fkey" FOREIGN KEY ("approved_by_member_id") REFERENCES "public"."family_members"("id");



ALTER TABLE ONLY "public"."points_ledger"
    ADD CONSTRAINT "points_ledger_chore_id_fkey" FOREIGN KEY ("chore_id") REFERENCES "public"."chores"("id");



ALTER TABLE ONLY "public"."points_ledger"
    ADD CONSTRAINT "points_ledger_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."points_ledger"
    ADD CONSTRAINT "points_ledger_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."wishlist_items"
    ADD CONSTRAINT "wishlist_items_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlist_items"
    ADD CONSTRAINT "wishlist_items_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlist_settings"
    ADD CONSTRAINT "wishlist_settings_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



CREATE POLICY "AP delete by family" ON "public"."activity_participants" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."activities" "a"
     JOIN "public"."family_members" "fm_me" ON (("fm_me"."family_id" = "a"."family_id")))
  WHERE (("a"."id" = "activity_participants"."activity_id") AND ("fm_me"."profile_id" = "public"."current_profile_id"()) AND ("fm_me"."is_active" = true)))));



CREATE POLICY "AP insert by family" ON "public"."activity_participants" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."activities" "a"
     JOIN "public"."family_members" "fm_me" ON (("fm_me"."family_id" = "a"."family_id")))
  WHERE (("a"."id" = "activity_participants"."activity_id") AND ("fm_me"."profile_id" = "public"."current_profile_id"()) AND ("fm_me"."is_active" = true)))));



CREATE POLICY "AP select by family" ON "public"."activity_participants" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."activities" "a"
     JOIN "public"."family_members" "fm_me" ON (("fm_me"."family_id" = "a"."family_id")))
  WHERE (("a"."id" = "activity_participants"."activity_id") AND ("fm_me"."profile_id" = "public"."current_profile_id"()) AND ("fm_me"."is_active" = true)))));



CREATE POLICY "AP update self response" ON "public"."activity_participants" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm_me"
  WHERE (("fm_me"."id" = "activity_participants"."member_id") AND ("fm_me"."profile_id" = "public"."current_profile_id"()) AND ("fm_me"."is_active" = true)))));



CREATE POLICY "Activities - delete for family members" ON "public"."activities" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm_me"
  WHERE (("fm_me"."profile_id" = "public"."current_profile_id"()) AND ("fm_me"."family_id" = "activities"."family_id") AND ("fm_me"."is_active" = true)))));



CREATE POLICY "Activities - insert for family members" ON "public"."activities" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm_me"
  WHERE (("fm_me"."profile_id" = "public"."current_profile_id"()) AND ("fm_me"."family_id" = "activities"."family_id") AND ("fm_me"."is_active" = true)))));



CREATE POLICY "Activities - select for family members" ON "public"."activities" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm_me"
  WHERE (("fm_me"."profile_id" = "public"."current_profile_id"()) AND ("fm_me"."family_id" = "activities"."family_id") AND ("fm_me"."is_active" = true)))));



CREATE POLICY "Activities - update for family members" ON "public"."activities" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm_me"
  WHERE (("fm_me"."profile_id" = "public"."current_profile_id"()) AND ("fm_me"."family_id" = "activities"."family_id") AND ("fm_me"."is_active" = true)))));



CREATE POLICY "Allow authenticated insert on chore_proofs" ON "public"."chore_proofs" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Allow authenticated select on chore_proofs" ON "public"."chore_proofs" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Join as self" ON "public"."family_members" FOR INSERT TO "authenticated" WITH CHECK (("profile_id" = "public"."current_profile_id"()));



CREATE POLICY "See own memberships" ON "public"."family_members" FOR SELECT TO "authenticated" USING (("profile_id" = "public"."current_profile_id"()));



CREATE POLICY "Wishlist:  parents inset any" ON "public"."wishlist_items" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."profile_id" = "public"."current_profile_id"()) AND ("fm"."family_id" = "wishlist_items"."family_id") AND ("fm"."is_active" = true) AND ("fm"."role" = ANY (ARRAY['MOM'::"public"."role", 'DAD'::"public"."role"]))))) AND (EXISTS ( SELECT 1
   FROM "public"."family_members" "fm2"
  WHERE (("fm2"."id" = "wishlist_items"."member_id") AND ("fm2"."family_id" = "wishlist_items"."family_id") AND ("fm2"."is_active" = true))))));



CREATE POLICY "Wishlist: kids delete own" ON "public"."wishlist_items" FOR DELETE TO "authenticated" USING (("member_id" IN ( SELECT "fm"."id"
   FROM "public"."family_members" "fm"
  WHERE (("fm"."profile_id" = "public"."current_profile_id"()) AND ("fm"."is_active" = true)))));



CREATE POLICY "Wishlist: kids insert own " ON "public"."wishlist_items" FOR INSERT TO "authenticated" WITH CHECK (("member_id" IN ( SELECT "fm"."id"
   FROM "public"."family_members" "fm"
  WHERE (("fm"."profile_id" = "public"."current_profile_id"()) AND ("fm"."is_active" = true)))));



CREATE POLICY "Wishlist: kids update own" ON "public"."wishlist_items" FOR UPDATE TO "authenticated" USING (("member_id" IN ( SELECT "fm"."id"
   FROM "public"."family_members" "fm"
  WHERE (("fm"."profile_id" = "public"."current_profile_id"()) AND ("fm"."is_active" = true))))) WITH CHECK (("member_id" IN ( SELECT "fm"."id"
   FROM "public"."family_members" "fm"
  WHERE (("fm"."profile_id" = "public"."current_profile_id"()) AND ("fm"."is_active" = true)))));



CREATE POLICY "Wishlist: parents delete any" ON "public"."wishlist_items" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."profile_id" = "public"."current_profile_id"()) AND ("fm"."family_id" = "wishlist_items"."family_id") AND ("fm"."is_active" = true) AND ("fm"."role" = ANY (ARRAY['MOM'::"public"."role", 'DAD'::"public"."role"]))))));



CREATE POLICY "Wishlist: parents update any" ON "public"."wishlist_items" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."profile_id" = "public"."current_profile_id"()) AND ("fm"."family_id" = "wishlist_items"."family_id") AND ("fm"."is_active" = true) AND ("fm"."role" = ANY (ARRAY['MOM'::"public"."role", 'DAD'::"public"."role"])))))) WITH CHECK (true);



CREATE POLICY "Wishlist: read family items" ON "public"."wishlist_items" FOR SELECT TO "authenticated" USING ((("auth"."uid"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."profile_id" = "public"."current_profile_id"()) AND ("fm"."family_id" = "wishlist_items"."family_id") AND ("fm"."is_active" = true))))));



ALTER TABLE "public"."activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."activity_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."announcement_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chore_proofs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chore_proofs: delete if member" ON "public"."chore_proofs" FOR DELETE USING ("public"."is_member"(( SELECT "c"."family_id"
   FROM "public"."chores" "c"
  WHERE ("c"."id" = "chore_proofs"."chore_id"))));



CREATE POLICY "chore_proofs: insert if member" ON "public"."chore_proofs" FOR INSERT WITH CHECK ("public"."is_member"(( SELECT "c"."family_id"
   FROM "public"."chores" "c"
  WHERE ("c"."id" = "chore_proofs"."chore_id"))));



CREATE POLICY "chore_proofs: select if member" ON "public"."chore_proofs" FOR SELECT USING ("public"."is_member"(( SELECT "c"."family_id"
   FROM "public"."chores" "c"
  WHERE ("c"."id" = "chore_proofs"."chore_id"))));



CREATE POLICY "chore_proofs: update if member" ON "public"."chore_proofs" FOR UPDATE USING ("public"."is_member"(( SELECT "c"."family_id"
   FROM "public"."chores" "c"
  WHERE ("c"."id" = "chore_proofs"."chore_id"))));



ALTER TABLE "public"."chores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chores: delete if member" ON "public"."chores" FOR DELETE USING ("public"."is_member"("family_id"));



CREATE POLICY "chores: insert if member" ON "public"."chores" FOR INSERT WITH CHECK ("public"."is_member"("family_id"));



CREATE POLICY "chores: select if member" ON "public"."chores" FOR SELECT USING ("public"."is_member"("family_id"));



CREATE POLICY "chores: update if member" ON "public"."chores" FOR UPDATE USING ("public"."is_member"("family_id"));



ALTER TABLE "public"."color_palette" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "color_palette: read" ON "public"."color_palette" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."families" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "families: delete if member" ON "public"."families" FOR DELETE USING ("public"."is_member"("id"));



CREATE POLICY "families: insert by authenticated" ON "public"."families" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "families: select if member" ON "public"."families" FOR SELECT USING ("public"."is_member"("id"));



CREATE POLICY "families: update if member" ON "public"."families" FOR UPDATE USING ("public"."is_member"("id"));



CREATE POLICY "family can create wishlist settings" ON "public"."wishlist_settings" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."profile_id" = "public"."current_profile_id"()) AND ("fm"."family_id" = "wishlist_settings"."family_id") AND ("fm"."is_active" = true)))));



CREATE POLICY "family can read wishlist settings" ON "public"."wishlist_settings" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."profile_id" = "public"."current_profile_id"()) AND ("fm"."family_id" = "wishlist_settings"."family_id") AND ("fm"."is_active" = true)))));



CREATE POLICY "family members can create announcements" ON "public"."announcement_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."profile_id" = "public"."current_profile_id"()) AND ("fm"."family_id" = "announcement_items"."family_id") AND ("fm"."is_active" = true)))));



CREATE POLICY "family members can delete announcements" ON "public"."announcement_items" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."profile_id" = "public"."current_profile_id"()) AND ("fm"."family_id" = "announcement_items"."family_id") AND ("fm"."is_active" = true) AND ("fm"."role" = ANY (ARRAY['MOM'::"public"."role", 'DAD'::"public"."role"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."profile_id" = "public"."current_profile_id"()) AND ("fm"."is_active" = true) AND ("fm"."id" = "announcement_items"."created_by_member_id"))))));



CREATE POLICY "family members can read announcements" ON "public"."announcement_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."profile_id" = "public"."current_profile_id"()) AND ("fm"."family_id" = "announcement_items"."family_id") AND ("fm"."is_active" = true)))));



CREATE POLICY "family members can update announcements" ON "public"."announcement_items" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."profile_id" = "public"."current_profile_id"()) AND ("fm"."family_id" = "announcement_items"."family_id") AND ("fm"."is_active" = true) AND ("fm"."role" = ANY (ARRAY['MOM'::"public"."role", 'DAD'::"public"."role"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."profile_id" = "public"."current_profile_id"()) AND ("fm"."is_active" = true) AND ("fm"."id" = "announcement_items"."created_by_member_id"))))));



ALTER TABLE "public"."family_invites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "family_invites: parents can revoke" ON "public"."family_invites" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."family_id" = "family_invites"."family_id") AND ("fm"."profile_id" = "public"."current_profile_id"()) AND ("fm"."is_active" = true) AND ("fm"."role" = ANY (ARRAY['MOM'::"public"."role", 'DAD'::"public"."role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."family_id" = "family_invites"."family_id") AND ("fm"."profile_id" = "public"."current_profile_id"()) AND ("fm"."is_active" = true) AND ("fm"."role" = ANY (ARRAY['MOM'::"public"."role", 'DAD'::"public"."role"]))))));



CREATE POLICY "family_invites: parents see invites" ON "public"."family_invites" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."family_id" = "family_invites"."family_id") AND ("fm"."profile_id" = "public"."current_profile_id"()) AND ("fm"."is_active" = true) AND ("fm"."role" = ANY (ARRAY['MOM'::"public"."role", 'DAD'::"public"."role"]))))));



ALTER TABLE "public"."family_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "family_members: delete if member" ON "public"."family_members" FOR DELETE USING ("public"."is_member"("family_id"));



CREATE POLICY "family_members: insert self" ON "public"."family_members" FOR INSERT TO "authenticated" WITH CHECK (("profile_id" = "public"."current_profile_id"()));



CREATE POLICY "family_members: select if same family" ON "public"."family_members" FOR SELECT USING ("public"."is_member"("family_id"));



CREATE POLICY "family_members: update if member" ON "public"."family_members" FOR UPDATE USING ("public"."is_member"("family_id"));



CREATE POLICY "grocery: delete if member" ON "public"."grocery_items" FOR DELETE USING ("public"."is_member"("family_id"));



CREATE POLICY "grocery: insert if member" ON "public"."grocery_items" FOR INSERT WITH CHECK ("public"."is_member"("family_id"));



CREATE POLICY "grocery: select if member" ON "public"."grocery_items" FOR SELECT USING ("public"."is_member"("family_id"));



CREATE POLICY "grocery: update if member" ON "public"."grocery_items" FOR UPDATE USING ("public"."is_member"("family_id"));



ALTER TABLE "public"."grocery_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "parents can update wishlist settings" ON "public"."wishlist_settings" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."profile_id" = "public"."current_profile_id"()) AND ("fm"."family_id" = "wishlist_settings"."family_id") AND ("fm"."is_active" = true) AND ("fm"."role" = ANY (ARRAY['MOM'::"public"."role", 'DAD'::"public"."role"]))))));



CREATE POLICY "points: delete if member" ON "public"."points_ledger" FOR DELETE USING ("public"."is_member"("family_id"));



CREATE POLICY "points: insert if member" ON "public"."points_ledger" FOR INSERT WITH CHECK ("public"."is_member"("family_id"));



CREATE POLICY "points: select if member" ON "public"."points_ledger" FOR SELECT USING ("public"."is_member"("family_id"));



CREATE POLICY "points: update if member" ON "public"."points_ledger" FOR UPDATE USING ("public"."is_member"("family_id"));



ALTER TABLE "public"."points_ledger" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles: insert self" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth_user_id" = "auth"."uid"()));



CREATE POLICY "profiles: read same-family" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."family_members" "fm_me"
     JOIN "public"."family_members" "fm_them" ON (("fm_them"."family_id" = "fm_me"."family_id")))
  WHERE (("fm_me"."profile_id" = "public"."current_profile_id"()) AND ("fm_me"."is_active" = true) AND ("fm_them"."profile_id" = "profiles"."id") AND ("fm_them"."is_active" = true)))));



CREATE POLICY "profiles: select self" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth_user_id" = "auth"."uid"()));



CREATE POLICY "profiles: update self" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth_user_id" = "auth"."uid"())) WITH CHECK (("auth_user_id" = "auth"."uid"()));



ALTER TABLE "public"."wishlist_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wishlist_settings" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."announcement_items";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."accept_family_invite"("invite_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_family_invite"("invite_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_family_invite"("invite_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."award_member_points"("p_member_id" "uuid", "p_delta" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."award_member_points"("p_member_id" "uuid", "p_delta" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."award_member_points"("p_member_id" "uuid", "p_delta" integer) TO "service_role";



GRANT ALL ON TABLE "public"."activities" TO "anon";
GRANT ALL ON TABLE "public"."activities" TO "authenticated";
GRANT ALL ON TABLE "public"."activities" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_activity_with_participants"("p_activity" "jsonb", "p_participants" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_activity_with_participants"("p_activity" "jsonb", "p_participants" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_activity_with_participants"("p_activity" "jsonb", "p_participants" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_family"("p_name" "text", "p_nickname" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_family"("p_name" "text", "p_nickname" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_family"("p_name" "text", "p_nickname" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_kid_member"("p_family_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_gender" "public"."gender", "p_birth_date" "date", "p_nickname" "text", "p_role" "public"."role") TO "anon";
GRANT ALL ON FUNCTION "public"."create_kid_member"("p_family_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_gender" "public"."gender", "p_birth_date" "date", "p_nickname" "text", "p_role" "public"."role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_kid_member"("p_family_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_gender" "public"."gender", "p_birth_date" "date", "p_nickname" "text", "p_role" "public"."role") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_profile_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_profile_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_profile_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."family_id_from_avatar_key"("object_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."family_id_from_avatar_key"("object_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."family_id_from_avatar_key"("object_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_invite_status"("invite_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_invite_status"("invite_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_invite_status"("invite_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_family_parent"("family" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_family_parent"("family" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_family_parent"("family" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_member"("family" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_member"("family" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_member"("family" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."join_family_by_code"("p_code" "text", "p_role" "public"."role", "p_nickname" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."join_family_by_code"("p_code" "text", "p_role" "public"."role", "p_nickname" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_family_by_code"("p_code" "text", "p_role" "public"."role", "p_nickname" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_family_invite"("invite_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_family_invite"("invite_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_family_invite"("invite_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_family_member"("p_family_id" "uuid", "p_member_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_family_member"("p_family_id" "uuid", "p_member_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_family_member"("p_family_id" "uuid", "p_member_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rotate_family_code"("p_family_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rotate_family_code"("p_family_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rotate_family_code"("p_family_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_activity_with_participants"("p_activity_id" "uuid", "p_patch" "jsonb", "p_participants" "jsonb", "p_replace_participants" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_activity_with_participants"("p_activity_id" "uuid", "p_patch" "jsonb", "p_participants" "jsonb", "p_replace_participants" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_activity_with_participants"("p_activity_id" "uuid", "p_patch" "jsonb", "p_participants" "jsonb", "p_replace_participants" boolean) TO "service_role";


















GRANT ALL ON TABLE "public"."activity_participants" TO "anon";
GRANT ALL ON TABLE "public"."activity_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_participants" TO "service_role";



GRANT ALL ON TABLE "public"."announcement_items" TO "anon";
GRANT ALL ON TABLE "public"."announcement_items" TO "authenticated";
GRANT ALL ON TABLE "public"."announcement_items" TO "service_role";



GRANT ALL ON TABLE "public"."announcement_tabs" TO "anon";
GRANT ALL ON TABLE "public"."announcement_tabs" TO "authenticated";
GRANT ALL ON TABLE "public"."announcement_tabs" TO "service_role";



GRANT ALL ON TABLE "public"."chore_proofs" TO "anon";
GRANT ALL ON TABLE "public"."chore_proofs" TO "authenticated";
GRANT ALL ON TABLE "public"."chore_proofs" TO "service_role";



GRANT ALL ON TABLE "public"."chore_templates" TO "anon";
GRANT ALL ON TABLE "public"."chore_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."chore_templates" TO "service_role";



GRANT ALL ON TABLE "public"."chores" TO "anon";
GRANT ALL ON TABLE "public"."chores" TO "authenticated";
GRANT ALL ON TABLE "public"."chores" TO "service_role";



GRANT ALL ON TABLE "public"."color_palette" TO "anon";
GRANT ALL ON TABLE "public"."color_palette" TO "authenticated";
GRANT ALL ON TABLE "public"."color_palette" TO "service_role";



GRANT ALL ON TABLE "public"."families" TO "anon";
GRANT ALL ON TABLE "public"."families" TO "authenticated";
GRANT ALL ON TABLE "public"."families" TO "service_role";



GRANT ALL ON TABLE "public"."family_invites" TO "anon";
GRANT ALL ON TABLE "public"."family_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."family_invites" TO "service_role";



GRANT ALL ON TABLE "public"."family_members" TO "anon";
GRANT ALL ON TABLE "public"."family_members" TO "authenticated";
GRANT ALL ON TABLE "public"."family_members" TO "service_role";



GRANT ALL ON TABLE "public"."grocery_items" TO "anon";
GRANT ALL ON TABLE "public"."grocery_items" TO "authenticated";
GRANT ALL ON TABLE "public"."grocery_items" TO "service_role";



GRANT ALL ON TABLE "public"."points_ledger" TO "anon";
GRANT ALL ON TABLE "public"."points_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."points_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."wishlist_items" TO "anon";
GRANT ALL ON TABLE "public"."wishlist_items" TO "authenticated";
GRANT ALL ON TABLE "public"."wishlist_items" TO "service_role";



GRANT ALL ON TABLE "public"."wishlist_settings" TO "anon";
GRANT ALL ON TABLE "public"."wishlist_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."wishlist_settings" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Allow authenticated insert 13sdkrq_0"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'chore-audio'::text));



  create policy "Allow authenticated insert chore_proofs bucket"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'chore-proofs'::text) AND (auth.uid() IS NOT NULL)));



  create policy "Allow authenticated select chore_audio audio_files 13sdkrq_0"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'chore-audio'::text));



  create policy "Allow authenticated select chore_proofs bucket"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'chore-proofs'::text));



  create policy "Family avatars public read"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'family-avatars'::text));



  create policy "Family parents delete avatar"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'family-avatars'::text) AND public.is_family_parent(public.family_id_from_avatar_key(name))));



  create policy "Family parents update avatar"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'family-avatars'::text) AND public.is_family_parent(public.family_id_from_avatar_key(name))))
with check (((bucket_id = 'family-avatars'::text) AND public.is_family_parent(public.family_id_from_avatar_key(name))));



  create policy "Family parents upload avatar"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'family-avatars'::text) AND public.is_family_parent(public.family_id_from_avatar_key(name))));



  create policy "Public read wishlist images"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'wishlist-images'::text));



  create policy "Users can upload wishlist images"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'wishlist-images'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Users delete their wishlist images"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'wishlist-images'::text) AND ((metadata ->> 'owner_id'::text) = (auth.uid())::text)));



  create policy "members can delete their avatar"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'profile-photos'::text) AND (name ~~ 'members/%'::text) AND (EXISTS ( SELECT 1
   FROM (public.family_members fm_me
     JOIN public.profiles p_me ON ((p_me.id = fm_me.profile_id)))
  WHERE ((p_me.auth_user_id = auth.uid()) AND (fm_me.is_active = true) AND ((('members/'::text || (fm_me.id)::text) || '.jpg'::text) = objects.name))))));



  create policy "members can update their avatar"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'profile-photos'::text) AND (name ~~ 'members/%'::text) AND (EXISTS ( SELECT 1
   FROM (public.family_members fm_me
     JOIN public.profiles p_me ON ((p_me.id = fm_me.profile_id)))
  WHERE ((p_me.auth_user_id = auth.uid()) AND (fm_me.is_active = true) AND ((('members/'::text || (fm_me.id)::text) || '.jpg'::text) = objects.name))))));



  create policy "members can upload their avatar"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'profile-photos'::text) AND (name ~~ 'members/%'::text) AND (EXISTS ( SELECT 1
   FROM (public.family_members fm_me
     JOIN public.profiles p_me ON ((p_me.id = fm_me.profile_id)))
  WHERE ((p_me.auth_user_id = auth.uid()) AND (fm_me.is_active = true) AND ((('members/'::text || (fm_me.id)::text) || '.jpg'::text) = objects.name))))));



  create policy "public read yndkpx_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'profile-photos'::text));



