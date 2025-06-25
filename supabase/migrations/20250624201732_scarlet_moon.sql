/*
  # Fix Profile Email Constraint Issue

  1. Create a trigger to automatically populate email in profiles from auth.users
  2. Update the create_user_for_company function to properly handle email
  3. Add a function to sync email from auth.users to profiles
*/

-- First, let's create a function to get email from auth.users
CREATE OR REPLACE FUNCTION get_user_email_from_auth(user_id uuid)
RETURNS text AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id;
  
  RETURN user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function to automatically set email in profiles
CREATE OR REPLACE FUNCTION set_profile_email_from_auth()
RETURNS trigger AS $$
BEGIN
  -- If email is not provided, get it from auth.users
  IF NEW.email IS NULL THEN
    NEW.email := get_user_email_from_auth(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_set_profile_email ON profiles;
CREATE TRIGGER trigger_set_profile_email
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_profile_email_from_auth();

-- Update the create_user_for_company function to include email
DROP FUNCTION IF EXISTS create_user_for_company(text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION create_user_for_company(
  user_email text,
  user_password text,
  first_name text,
  last_name text,
  user_role text DEFAULT 'tech',
  phone_number text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  new_user_id uuid;
  current_user_company uuid;
  current_user_role text;
BEGIN
  -- Check if current user is admin or manager
  SELECT company_id, role INTO current_user_company, current_user_role
  FROM profiles
  WHERE id = auth.uid();
  
  IF current_user_role NOT IN ('admin', 'manager') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only admins and managers can create users'
    );
  END IF;
  
  -- Validate role
  IF user_role NOT IN ('admin', 'manager', 'tech') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid role specified'
    );
  END IF;
  
  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User with this email already exists'
    );
  END IF;
  
  -- Generate new user ID
  new_user_id := gen_random_uuid();
  
  -- Create the auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    confirmation_token,
    recovery_sent_at,
    recovery_token,
    email_change_sent_at,
    email_change,
    email_change_token_new,
    email_change_token_current,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    last_sign_in_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(), -- Email confirmed immediately
    now(),
    '',
    null,
    '',
    null,
    '',
    '',
    '',
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    false,
    null,
    phone_number,
    CASE WHEN phone_number IS NOT NULL THEN now() ELSE null END,
    '',
    '',
    null,
    0,
    null,
    '',
    null,
    false,
    null
  );
  
  -- Create the profile with explicit email
  INSERT INTO profiles (
    id,
    company_id,
    email,
    first_name,
    last_name,
    role,
    phone,
    is_active
  ) VALUES (
    new_user_id,
    current_user_company,
    user_email, -- Explicitly provide the email
    first_name,
    last_name,
    user_role,
    phone_number,
    true
  );
  
  -- Create identity record
  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at,
    email
  ) VALUES (
    new_user_id,
    new_user_id,
    format('{"sub":"%s","email":"%s"}', new_user_id::text, user_email)::jsonb,
    'email',
    null,
    now(),
    now(),
    user_email
  );
  
  RETURN json_build_object(
    'success', true,
    'user_id', new_user_id,
    'message', 'User created successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_user_for_company TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_email_from_auth TO authenticated;