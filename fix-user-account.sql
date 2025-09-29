-- Fix user account issues
-- Run this in your Supabase SQL Editor

-- First, let's check if the user exists in auth.users
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'qazimaazceo@gmail.com';

-- If the user exists but isn't confirmed, confirm them
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email = 'qazimaazceo@gmail.com';

-- Check if the user exists in public.users table
SELECT id, email, role, created_at 
FROM public.users 
WHERE email = 'qazimaazceo@gmail.com';

-- If the user doesn't exist in public.users, create them
INSERT INTO public.users (id, email, role)
SELECT 
  au.id,
  au.email,
  'student' as role
FROM auth.users au
WHERE au.email = 'qazimaazceo@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.users pu 
  WHERE pu.email = 'qazimaazceo@gmail.com'
);

-- Verify the user is properly set up
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  pu.role,
  pu.created_at as profile_created
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'qazimaazceo@gmail.com';
