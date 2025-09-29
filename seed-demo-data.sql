-- Smart Scheduler Demo Seed Data
-- Run in Supabase SQL editor. This avoids inserting into public.users (FK to auth.users).
-- It seeds: courses, sections, students (user_id NULL), enrollments, elective_choices,
-- irregular_requirements, rules, schedule_versions, feedback.

-- Optional: reset data (order matters due to FKs)
BEGIN;

TRUNCATE TABLE public.feedback RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.schedule_versions RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.enrollments RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.elective_choices RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.irregular_requirements RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.sections RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.students RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.courses RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.rules RESTART IDENTITY CASCADE;

-- Courses (core + electives across levels)
WITH inserted_courses AS (
  INSERT INTO public.courses (code, title, level, is_fixed, typical_duration, allowable_rooms)
  VALUES
    -- Level 1 core
    ('CS101', 'Introduction to Programming', 1, FALSE, 90, ARRAY['A101','A102']),
    ('MATH101', 'Calculus I', 1, TRUE, 90, ARRAY['D101','D102']),
    ('ENG101', 'Academic English I', 1, FALSE, 60, ARRAY['E201','E202']),
    -- Level 2 core + elective
    ('CS201', 'Data Structures', 2, FALSE, 90, ARRAY['B205','B206']),
    ('MATH201', 'Linear Algebra', 2, TRUE, 90, ARRAY['D201','D202']),
    ('CS2EL1', 'Web Development Fundamentals', 2, FALSE, 90, ARRAY['LAB1','LAB2']),
    -- Level 3 core + electives
    ('CS301', 'Algorithms', 3, FALSE, 90, ARRAY['C301','C302']),
    ('CS302', 'Database Systems', 3, FALSE, 90, ARRAY['C303','C304']),
    ('CS3EL1', 'Machine Learning Basics', 3, FALSE, 90, ARRAY['C305','C306']),
    ('CS3EL2', 'Mobile App Development', 3, FALSE, 90, ARRAY['LAB3','LAB4']),
    -- Level 4 core + electives
    ('CS401', 'Operating Systems', 4, FALSE, 90, ARRAY['C401','C402']),
    ('CS402', 'Computer Networks', 4, FALSE, 90, ARRAY['C403','C404']),
    ('CS4EL1', 'Cloud Computing', 4, FALSE, 90, ARRAY['C405','C406']),
    ('CS4EL2', 'Artificial Intelligence', 4, FALSE, 90, ARRAY['C407','C408'])
  RETURNING id, code
)
SELECT 1;

-- Sections (a few per course)
WITH course_ids AS (
  SELECT id, code FROM public.courses
), inserted_sections AS (
  INSERT INTO public.sections (course_id, section_label, capacity, timeslot, room, instructor_id, status)
  VALUES
    -- CS101
    ((SELECT id FROM course_ids WHERE code='CS101'), 'A', 30, '{"day":"Monday","start":"09:00","end":"10:30"}', 'A101', NULL, 'draft'),
    ((SELECT id FROM course_ids WHERE code='CS101'), 'B', 30, '{"day":"Wednesday","start":"09:00","end":"10:30"}', 'A102', NULL, 'draft'),
    -- MATH101 (fixed)
    ((SELECT id FROM course_ids WHERE code='MATH101'), 'A', 40, '{"day":"Tuesday","start":"10:00","end":"11:30"}', 'D101', NULL, 'approved'),
    -- CS201
    ((SELECT id FROM course_ids WHERE code='CS201'), 'A', 30, '{"day":"Sunday","start":"11:00","end":"12:30"}', 'B205', NULL, 'draft'),
    ((SELECT id FROM course_ids WHERE code='CS201'), 'B', 30, '{"day":"Tuesday","start":"11:00","end":"12:30"}', 'B206', NULL, 'draft'),
    -- CS301
    ((SELECT id FROM course_ids WHERE code='CS301'), 'A', 25, '{"day":"Monday","start":"12:00","end":"13:30"}', 'C301', NULL, 'draft'),
    ((SELECT id FROM course_ids WHERE code='CS301'), 'B', 25, '{"day":"Wednesday","start":"12:00","end":"13:30"}', 'C302', NULL, 'draft'),
    -- CS302
    ((SELECT id FROM course_ids WHERE code='CS302'), 'A', 25, '{"day":"Sunday","start":"14:00","end":"15:30"}', 'C303', NULL, 'draft'),
    -- CS3EL1
    ((SELECT id FROM course_ids WHERE code='CS3EL1'), 'A', 25, '{"day":"Tuesday","start":"14:00","end":"15:30"}', 'C305', NULL, 'draft'),
    ((SELECT id FROM course_ids WHERE code='CS3EL1'), 'B', 25, '{"day":"Thursday","start":"09:00","end":"10:30"}', 'C306', NULL, 'draft'),
    -- CS3EL2
    ((SELECT id FROM course_ids WHERE code='CS3EL2'), 'A', 25, '{"day":"Thursday","start":"11:00","end":"12:30"}', 'LAB3', NULL, 'draft'),
    -- CS401
    ((SELECT id FROM course_ids WHERE code='CS401'), 'A', 25, '{"day":"Monday","start":"09:00","end":"10:30"}', 'C401', NULL, 'draft'),
    -- CS402
    ((SELECT id FROM course_ids WHERE code='CS402'), 'A', 25, '{"day":"Wednesday","start":"09:00","end":"10:30"}', 'C403', NULL, 'draft'),
    -- CS4EL1
    ((SELECT id FROM course_ids WHERE code='CS4EL1'), 'A', 25, '{"day":"Sunday","start":"09:00","end":"10:30"}', 'C405', NULL, 'draft'),
    -- CS4EL2
    ((SELECT id FROM course_ids WHERE code='CS4EL2'), 'A', 25, '{"day":"Tuesday","start":"09:00","end":"10:30"}', 'C407', NULL, 'draft')
  RETURNING id, course_id, section_label
)
SELECT 1;

-- Students (user_id is NULL to avoid FK to auth)
-- English transliterations of Arabic names
WITH inserted_students AS (
  INSERT INTO public.students (user_id, student_number, level, contact)
  VALUES
    (NULL, '2024001', 1, 'ahmed.al-sayed@example.com'),
    (NULL, '2024002', 1, 'fatima.hassan@example.com'),
    (NULL, '2024003', 1, 'omar.khaled@example.com'),
    (NULL, '2024004', 1, 'layla.abdullah@example.com'),
    (NULL, '2024005', 1, 'youssef.ali@example.com'),
    (NULL, '2024101', 2, 'mohamed.samir@example.com'),
    (NULL, '2024102', 2, 'salma.nasser@example.com'),
    (NULL, '2024103', 2, 'kareem.hosny@example.com'),
    (NULL, '2024104', 2, 'mona.amer@example.com'),
    (NULL, '2024105', 2, 'ziad.ahmed@example.com'),
    (NULL, '2024201', 3, 'hassan.ismail@example.com'),
    (NULL, '2024202', 3, 'rasha.fouad@example.com'),
    (NULL, '2024203', 3, 'nour.el-din@example.com'),
    (NULL, '2024204', 3, 'amal.karim@example.com'),
    (NULL, '2024205', 3, 'tareq.mahdi@example.com'),
    (NULL, '2024301', 4, 'ali.mansour@example.com'),
    (NULL, '2024302', 4, 'dina.mostafa@example.com'),
    (NULL, '2024303', 4, 'hadi.rashid@example.com'),
    (NULL, '2024304', 4, 'sara.hamdy@example.com'),
    (NULL, '2024305', 4, 'faris.nabil@example.com')
  RETURNING id, student_number, level
)
SELECT 1;

-- Elective choices (for level 3 students)
INSERT INTO public.elective_choices (student_id, course_id, preference_rank)
SELECT 
  s.id, 
  (SELECT id FROM public.courses WHERE code='CS3EL1'), 
  1 
FROM public.students s 
WHERE s.level=3 
ORDER BY s.student_number 
LIMIT 3;

INSERT INTO public.elective_choices (student_id, course_id, preference_rank)
SELECT 
  s.id, 
  (SELECT id FROM public.courses WHERE code='CS3EL2'), 
  2 
FROM public.students s 
WHERE s.level=3 
ORDER BY s.student_number 
LIMIT 3;

INSERT INTO public.elective_choices (student_id, course_id, preference_rank)
SELECT 
  s.id, 
  (SELECT id FROM public.courses WHERE code='CS302'), 
  3 
FROM public.students s 
WHERE s.level=3 
ORDER BY s.student_number 
LIMIT 3;

-- Irregular requirements (a couple of students needing past-level courses)
INSERT INTO public.irregular_requirements (student_id, required_course_id)
SELECT 
  s.id, 
  (SELECT id FROM public.courses WHERE code='MATH101')
FROM public.students s 
WHERE s.level=3 
ORDER BY s.student_number 
LIMIT 1;

INSERT INTO public.irregular_requirements (student_id, required_course_id)
SELECT 
  s.id, 
  (SELECT id FROM public.courses WHERE code='CS201')
FROM public.students s 
WHERE s.level=3 
ORDER BY s.student_number 
OFFSET 1 
LIMIT 1;

-- Simple enrollments (assign some level 1 students to CS101 sections)
INSERT INTO public.enrollments (student_id, section_id)
SELECT 
  s.id, 
  (SELECT id FROM public.sections WHERE course_id = (SELECT id FROM public.courses WHERE code='CS101') AND section_label='A')
FROM public.students s 
WHERE s.level=1 
ORDER BY s.student_number 
LIMIT 2;

INSERT INTO public.enrollments (student_id, section_id)
SELECT 
  s.id, 
  (SELECT id FROM public.sections WHERE course_id = (SELECT id FROM public.courses WHERE code='CS101') AND section_label='B')
FROM public.students s 
WHERE s.level=1 
ORDER BY s.student_number 
OFFSET 2 
LIMIT 1;

-- Rules examples
INSERT INTO public.rules (name, type, payload)
VALUES
  ('No Classes Friday', 'blackout', '{"days":["Friday"],"reason":"Prayer and community day"}'),
  ('Room Capacity Limit', 'capacity', '{"default":25,"labs":20}'),
  ('Instructor Load', 'policy', '{"max_sections_per_instructor":3}');

-- A demo schedule version (diff_json carries a snapshot-like payload for demo)
INSERT INTO public.schedule_versions (level, semester, diff_json)
VALUES
  (3, 'spring-2025', '{"sections_count": 8, "conflicts": 0, "efficiency": 92}');

-- Optional feedback linked to a section
WITH any_section AS (
  SELECT id FROM public.sections LIMIT 1
)
INSERT INTO public.feedback (schedule_id, section_id, author_id, content)
SELECT NULL, id, NULL, 'Looks good. Consider moving to a larger room if enrollments increase.' FROM any_section;

COMMIT;
