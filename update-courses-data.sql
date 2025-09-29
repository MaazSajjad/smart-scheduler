-- Update and add courses with proper conflict handling
-- This script will update existing courses and add new ones

-- Level 1 Courses (Foundation) - Update existing and add new
INSERT INTO public.courses (code, title, level, is_fixed, typical_duration, allowable_rooms)
VALUES
  -- Core Programming
  ('CS101', 'Introduction to Programming', 1, TRUE, 90, ARRAY['A101','A102']),
  ('CS102', 'Programming Fundamentals Lab', 1, TRUE, 90, ARRAY['LAB1','LAB2']),
  ('CS103', 'Computer Science Principles', 1, TRUE, 60, ARRAY['A103','A104']),
  
  -- Mathematics
  ('MATH101', 'Calculus I', 1, TRUE, 90, ARRAY['D101','D102']),
  ('MATH102', 'Discrete Mathematics', 1, TRUE, 90, ARRAY['D103','D104']),
  ('MATH103', 'Statistics for CS', 1, FALSE, 60, ARRAY['D105','D106']),
  
  -- English and Communication
  ('ENG101', 'Academic English I', 1, TRUE, 60, ARRAY['E201','E202']),
  ('ENG102', 'Technical Writing', 1, FALSE, 60, ARRAY['E203','E204']),
  
  -- General Education
  ('PHYS101', 'Physics for CS', 1, FALSE, 90, ARRAY['P101','P102']),
  ('HUM101', 'Introduction to Humanities', 1, FALSE, 60, ARRAY['H101','H102'])
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  level = EXCLUDED.level,
  is_fixed = EXCLUDED.is_fixed,
  typical_duration = EXCLUDED.typical_duration,
  allowable_rooms = EXCLUDED.allowable_rooms;

-- Level 2 Courses (Intermediate)
INSERT INTO public.courses (code, title, level, is_fixed, typical_duration, allowable_rooms)
VALUES
  -- Core CS
  ('CS201', 'Data Structures', 2, TRUE, 90, ARRAY['B205','B206']),
  ('CS202', 'Data Structures Lab', 2, TRUE, 90, ARRAY['LAB3','LAB4']),
  ('CS203', 'Computer Organization', 2, TRUE, 90, ARRAY['B207','B208']),
  ('CS204', 'Software Engineering I', 2, TRUE, 90, ARRAY['B209','B210']),
  
  -- Mathematics
  ('MATH201', 'Linear Algebra', 2, TRUE, 90, ARRAY['D201','D202']),
  ('MATH202', 'Probability and Statistics', 2, FALSE, 90, ARRAY['D203','D204']),
  
  -- Electives
  ('CS2EL1', 'Web Development Fundamentals', 2, FALSE, 90, ARRAY['LAB5','LAB6']),
  ('CS2EL2', 'Database Design', 2, FALSE, 90, ARRAY['B211','B212']),
  ('CS2EL3', 'Mobile App Development', 2, FALSE, 90, ARRAY['LAB7','LAB8']),
  ('CS2EL4', 'Computer Graphics', 2, FALSE, 90, ARRAY['B213','B214'])
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  level = EXCLUDED.level,
  is_fixed = EXCLUDED.is_fixed,
  typical_duration = EXCLUDED.typical_duration,
  allowable_rooms = EXCLUDED.allowable_rooms;

-- Level 3 Courses (Advanced)
INSERT INTO public.courses (code, title, level, is_fixed, typical_duration, allowable_rooms)
VALUES
  -- Core CS
  ('CS301', 'Algorithms', 3, TRUE, 90, ARRAY['C301','C302']),
  ('CS302', 'Database Systems', 3, TRUE, 90, ARRAY['C303','C304']),
  ('CS303', 'Operating Systems', 3, TRUE, 90, ARRAY['C305','C306']),
  ('CS304', 'Software Engineering II', 3, TRUE, 90, ARRAY['C307','C308']),
  ('CS305', 'Computer Networks', 3, TRUE, 90, ARRAY['C309','C310']),
  
  -- Mathematics
  ('MATH301', 'Numerical Analysis', 3, FALSE, 90, ARRAY['D301','D302']),
  
  -- Electives
  ('CS3EL1', 'Machine Learning Basics', 3, FALSE, 90, ARRAY['C311','C312']),
  ('CS3EL2', 'Mobile App Development', 3, FALSE, 90, ARRAY['LAB9','LAB10']),
  ('CS3EL3', 'Web Application Development', 3, FALSE, 90, ARRAY['LAB11','LAB12']),
  ('CS3EL4', 'Game Development', 3, FALSE, 90, ARRAY['C313','C314']),
  ('CS3EL5', 'Cybersecurity Fundamentals', 3, FALSE, 90, ARRAY['C315','C316']),
  ('CS3EL6', 'Data Science', 3, FALSE, 90, ARRAY['C317','C318'])
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  level = EXCLUDED.level,
  is_fixed = EXCLUDED.is_fixed,
  typical_duration = EXCLUDED.typical_duration,
  allowable_rooms = EXCLUDED.allowable_rooms;

-- Level 4 Courses (Senior/Capstone)
INSERT INTO public.courses (code, title, level, is_fixed, typical_duration, allowable_rooms)
VALUES
  -- Core CS
  ('CS401', 'Advanced Algorithms', 4, TRUE, 90, ARRAY['C401','C402']),
  ('CS402', 'Computer Networks', 4, TRUE, 90, ARRAY['C403','C404']),
  ('CS403', 'Software Engineering Capstone', 4, TRUE, 120, ARRAY['C405','C406']),
  ('CS404', 'Senior Project', 4, TRUE, 120, ARRAY['C407','C408']),
  ('CS405', 'Distributed Systems', 4, FALSE, 90, ARRAY['C409','C410']),
  
  -- Electives
  ('CS4EL1', 'Cloud Computing', 4, FALSE, 90, ARRAY['C411','C412']),
  ('CS4EL2', 'Artificial Intelligence', 4, FALSE, 90, ARRAY['C413','C414']),
  ('CS4EL3', 'Machine Learning', 4, FALSE, 90, ARRAY['C415','C416']),
  ('CS4EL4', 'Blockchain Technology', 4, FALSE, 90, ARRAY['C417','C418']),
  ('CS4EL5', 'IoT Development', 4, FALSE, 90, ARRAY['LAB13','LAB14']),
  ('CS4EL6', 'DevOps and CI/CD', 4, FALSE, 90, ARRAY['C419','C420']),
  ('CS4EL7', 'Advanced Web Technologies', 4, FALSE, 90, ARRAY['LAB15','LAB16']),
  ('CS4EL8', 'Computer Vision', 4, FALSE, 90, ARRAY['C421','C422'])
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  level = EXCLUDED.level,
  is_fixed = EXCLUDED.is_fixed,
  typical_duration = EXCLUDED.typical_duration,
  allowable_rooms = EXCLUDED.allowable_rooms;

-- Show summary of courses by level
SELECT 
  level,
  COUNT(*) as course_count,
  COUNT(CASE WHEN is_fixed = TRUE THEN 1 END) as fixed_courses,
  COUNT(CASE WHEN is_fixed = FALSE THEN 1 END) as flexible_courses
FROM public.courses 
GROUP BY level 
ORDER BY level;
