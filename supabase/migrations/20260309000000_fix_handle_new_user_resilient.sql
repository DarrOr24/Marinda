-- Fix: "Database error saving new user" when handle_new_user trigger fails
-- Makes the trigger resilient: if profile insert fails, user creation still succeeds.
-- The app will create the profile on first load when missing.

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
  begin
    insert into public.profiles
      (auth_user_id, first_name, last_name, avatar_url, gender, birth_date)
    values
      (new.id, v_first, v_last, v_avatar,
       coalesce(v_gender, 'MALE'::public.gender),
       v_birth);
  exception when others then
    -- Log the error but allow user creation to succeed.
    -- The app will create the profile on first load when missing.
    raise warning 'handle_new_user: failed to create profile for auth user %: %', new.id, sqlerrm;
  end;

  return new;
end;
$_$;
