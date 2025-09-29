-- Fix RLS policies for elective_choices table
-- This allows students to manage their own elective choices

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can manage their own elective choices" ON public.elective_choices;
DROP POLICY IF EXISTS "Committee members can view elective choices" ON public.elective_choices;

-- Create new policies for elective_choices table
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

-- Also ensure the elective_choices table has RLS enabled
ALTER TABLE public.elective_choices ENABLE ROW LEVEL SECURITY;
