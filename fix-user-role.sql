-- Fix user role issue
-- Run this in your Supabase SQL Editor

-- Check if user exists in public.users table
SELECT id, email, role FROM public.users WHERE email = 'qazimaazceo@gmail.com';

-- If user doesn't exist in public.users, create them
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

-- Verify the user is now in both tables
SELECT 
  'auth.users' as table_name,
  id,
  email,
  email_confirmed_at
FROM auth.users 
WHERE email = 'qazimaazceo@gmail.com'

UNION ALL

SELECT 
  'public.users' as table_name,
  id,
  email,
  role
FROM public.users 
WHERE email = 'qazimaazceo@gmail.com';
