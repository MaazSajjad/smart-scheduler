-- Fix RLS policies for schedule_versions table
-- Run this in Supabase SQL Editor

-- Drop existing policies on schedule_versions
DROP POLICY IF EXISTS "Users can view their own data" ON public.schedule_versions;
DROP POLICY IF EXISTS "Users can update their own data" ON public.schedule_versions;
DROP POLICY IF EXISTS "Committee members can manage schedule_versions" ON public.schedule_versions;

-- Create new policies for schedule_versions
CREATE POLICY "Everyone can view schedule versions" ON public.schedule_versions
  FOR SELECT USING (true);

CREATE POLICY "Committee members can insert schedule versions" ON public.schedule_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('scheduling_committee', 'teaching_load_committee')
    )
  );

CREATE POLICY "Committee members can update schedule versions" ON public.schedule_versions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('scheduling_committee', 'teaching_load_committee')
    )
  );

CREATE POLICY "Committee members can delete schedule versions" ON public.schedule_versions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('scheduling_committee', 'teaching_load_committee')
    )
  );

-- Also fix users table policies to allow committee members to insert
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;

CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow new user creation" ON public.users
  FOR INSERT WITH CHECK (true);

-- Fix students table policies
DROP POLICY IF EXISTS "Students can view their own data" ON public.students;
DROP POLICY IF EXISTS "Students can update their own data" ON public.students;

CREATE POLICY "Students can view their own data" ON public.students
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students can update their own data" ON public.students
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Committee members can manage students" ON public.students
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('scheduling_committee', 'teaching_load_committee')
    )
  );
