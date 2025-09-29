-- Comprehensive RLS policy fixes for student functionality
-- Run this script to ensure all student-related tables have proper access

-- 1. Fix elective_choices table
DROP POLICY IF EXISTS "Students can manage their own elective choices" ON public.elective_choices;
DROP POLICY IF EXISTS "Committee members can view elective choices" ON public.elective_choices;

CREATE POLICY "Students can manage their own elective choices" ON public.elective_choices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE id = elective_choices.student_id
      AND user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE id = elective_choices.student_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Committee members can view all elective choices" ON public.elective_choices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('scheduling_committee', 'teaching_load_committee')
    )
  );

-- 2. Fix irregular_requirements table
DROP POLICY IF EXISTS "Students can manage their own irregular requirements" ON public.irregular_requirements;
DROP POLICY IF EXISTS "Committee members can view irregular requirements" ON public.irregular_requirements;

CREATE POLICY "Students can manage their own irregular requirements" ON public.irregular_requirements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE id = irregular_requirements.student_id
      AND user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE id = irregular_requirements.student_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Committee members can view irregular requirements" ON public.irregular_requirements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('scheduling_committee', 'teaching_load_committee')
    )
  );

-- 3. Fix enrollments table (students should be able to view their own enrollments)
DROP POLICY IF EXISTS "Students can view their own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Committee members can manage enrollments" ON public.enrollments;

CREATE POLICY "Students can view their own enrollments" ON public.enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE id = enrollments.student_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Committee members can manage enrollments" ON public.enrollments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('scheduling_committee', 'teaching_load_committee')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('scheduling_committee', 'teaching_load_committee')
    )
  );

-- 4. Ensure all tables have RLS enabled
ALTER TABLE public.elective_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irregular_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- 5. Verify policies are working
-- You can test with these queries (replace with actual user ID):
-- SELECT * FROM public.elective_choices; -- Should show only student's own choices
-- SELECT * FROM public.enrollments; -- Should show only student's own enrollments
