-- Create admin user for testing
-- This script creates an admin user that can create other users

-- First, create the auth user (you'll need to do this manually in Supabase Auth)
-- Go to Authentication > Users > Add User
-- Email: admin@smart-scheduler.com
-- Password: admin123456
-- Auto Confirm User: Yes

-- Then run this SQL to create the user record with admin role
INSERT INTO public.users (id, email, role, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000', -- Replace with actual user ID from auth.users
  'admin@smart-scheduler.com',
  'scheduling_committee', -- Admin role
  NOW(),
  NOW()
);

-- Note: You need to replace the ID above with the actual user ID from auth.users table
-- You can get it by running: SELECT id FROM auth.users WHERE email = 'admin@smart-scheduler.com';
