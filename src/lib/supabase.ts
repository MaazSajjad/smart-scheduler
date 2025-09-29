import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  id: string
  email: string
  role: 'student' | 'faculty' | 'scheduling_committee' | 'teaching_load_committee'
  created_at: string
  updated_at: string
}

export interface Student {
  id: string
  user_id: string
  student_number: string
  level: number
  contact: string
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  code: string
  title: string
  level: number
  is_fixed: boolean
  typical_duration: number
  allowable_rooms: string[]
  created_at: string
  updated_at: string
}

export interface Section {
  id: string
  course_id: string
  section_label: string
  capacity: number
  timeslot: {
    day: string
    start: string
    end: string
  }
  room: string
  instructor_id: string
  status: 'draft' | 'approved' | 'active'
  created_at: string
  updated_at: string
}

export interface Enrollment {
  id: string
  student_id: string
  section_id: string
  created_at: string
}

export interface ElectiveChoice {
  id: string
  student_id: string
  course_id: string
  preference_rank: number
  created_at: string
}

export interface IrregularRequirement {
  id: string
  student_id: string
  required_course_id: string
  created_at: string
}

export interface Rule {
  id: string
  name: string
  type: string
  payload: any
  created_at: string
  updated_at: string
}

export interface ScheduleVersion {
  id: string
  level: number
  semester: string
  timestamp: string
  diff_json: any
  author_id: string
  created_at: string
}

export interface Feedback {
  id: string
  schedule_id: string
  section_id?: string
  author_id: string
  content: string
  created_at: string
}
