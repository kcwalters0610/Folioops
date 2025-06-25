/*
  # Fix create_user_for_company RPC function

  1. Changes
    - Update the create_user_for_company function to not explicitly insert email into profiles table
    - The email column is automatically populated via the foreign key relationship with auth.users
    - Remove email parameter from the profiles insert statement

  2. Function Updates
    - Keep email parameter for auth.users creation
    - Remove email from profiles table insertion
    - Maintain all other functionality
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS create_user_for_company(text, text, text, text, text, text);

-- Recreate the function without inserting email into profiles
CREATE OR REPLACE FUNCTION create_user_for_company(
  user_email text,
  user_password text,
  first_name text,
  last_name text,
  user_role text,
  phone_number text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
  current_user_company_id uuid;
  result json;
BEGIN
  -- Get the current user's company_id
  SELECT company_id INTO current_user_company_id
  FROM profiles
  WHERE id = auth.uid();

  -- Check if current user is admin or manager
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
    AND company_id = current_user_company_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;

  -- Create the auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- Create the profile (email will be populated automatically via trigger/foreign key)
  INSERT INTO profiles (
    id,
    company_id,
    first_name,
    last_name,
    role,
    phone,
    is_active
  ) VALUES (
    new_user_id,
    current_user_company_id,
    first_name,
    last_name,
    user_role,
    phone_number,
    true
  );

  RETURN json_build_object('success', true, 'user_id', new_user_id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;