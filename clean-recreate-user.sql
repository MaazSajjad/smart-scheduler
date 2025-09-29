-- Clean and recreate user account
-- Run this in your Supabase SQL Editor

-- Delete from public.users first (due to foreign key constraints)
DELETE FROM public.users WHERE email = 'qazimaazceo@gmail.com';

-- Delete from auth.users
DELETE FROM auth.users WHERE email = 'qazimaazceo@gmail.com';

-- Now you can create a fresh account through the app
-- Or create it directly here:

-- Insert into auth.users (this is usually done by Supabase Auth)
-- But we can manually create it for testing:
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  confirmed_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'qazimaazceo@gmail.com',
  crypt('123456', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NULL,
  '',
  '',
  NULL,
  NULL,
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  NOW(),
  '',
  0,
  NULL,
  '',
  NULL
);

-- Get the user ID we just created
WITH new_user AS (
  SELECT id FROM auth.users WHERE email = 'qazimaazceo@gmail.com'
)
INSERT INTO public.users (id, email, role)
SELECT id, 'qazimaazceo@gmail.com', 'student'
FROM new_user;
