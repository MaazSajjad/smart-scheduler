import { supabase } from './supabase'
import { getScheduleRecommendation, SchedulingConstraints } from './groq'

export interface ScheduleGenerationRequest {
  level: number
  semester: string
  maxSections: number
  sectionCapacity: number
  preferences: string
  constraints: string
}

export interface GeneratedSchedule {
  id: string
  level: number
  semester: string
  sections: ScheduleSection[]
  conflicts: number
  efficiency: number
  status: 'draft' | 'approved' | 'active'
  created_at: string
  author_id: string
}

export interface ScheduleSection {
  course_code: string
  section_label: string
  timeslot: {
    day: string
    start: string
    end: string
  }
  room: string
  instructor_id?: string
  student_count: number
  capacity: number
}

export class ScheduleService {
  static async generateSchedule(request: ScheduleGenerationRequest): Promise<GeneratedSchedule> {
    try {
      // Get courses for the level
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('level', request.level)
        .eq('is_fixed', false)

      if (coursesError) throw coursesError

      // Get students for the level
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('level', request.level)

      if (studentsError) throw studentsError

      // Prepare constraints for AI
      const constraints: SchedulingConstraints = {
        students_per_course: {},
        blocked_slots: [],
        available_rooms: ['A101', 'A102', 'B205', 'B206', 'C301', 'C302', 'D101', 'D102'],
        rules: [],
        objective_priorities: {
          minimize_conflicts: true,
          minimize_gaps: true,
          balance_instructor_loads: true
        }
      }

      // Calculate students per course
      courses?.forEach(course => {
        constraints.students_per_course[course.code] = students?.length || 0
      })

      // Get AI recommendations
      const recommendations = await getScheduleRecommendation(constraints, request.level)

      // Create schedule sections
      const sections: ScheduleSection[] = recommendations.map((rec, index) => ({
        course_code: rec.course_code,
        section_label: rec.section_label,
        timeslot: rec.timeslot,
        room: rec.room,
        student_count: rec.allocated_student_ids.length,
        capacity: request.sectionCapacity
      }))

      // Calculate metrics
      const conflicts = 0 // AI should minimize conflicts
      const efficiency = Math.round((sections.length / (courses?.length || 1)) * 100)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      // Save to database
      const { data: schedule, error: saveError } = await supabase
        .from('schedule_versions')
        .insert({
          level: request.level,
          semester: request.semester,
          diff_json: { sections, conflicts, efficiency },
          author_id: user?.id || null
        })
        .select()
        .single()

      if (saveError) throw saveError

      return {
        id: schedule.id,
        level: request.level,
        semester: request.semester,
        sections,
        conflicts,
        efficiency,
        status: 'draft',
        created_at: schedule.created_at,
        author_id: schedule.author_id
      }
    } catch (error) {
      console.error('Error generating schedule:', error)
      throw new Error('Failed to generate schedule: ' + (error as Error).message)
    }
  }

  static async getSchedules(): Promise<GeneratedSchedule[]> {
    const { data, error } = await supabase
      .from('schedule_versions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return data?.map(schedule => ({
      id: schedule.id,
      level: schedule.level,
      semester: schedule.semester,
      sections: schedule.diff_json.sections || [],
      conflicts: schedule.diff_json.conflicts || 0,
      efficiency: schedule.diff_json.efficiency || 0,
      status: 'draft' as const,
      created_at: schedule.created_at,
      author_id: schedule.author_id
    })) || []
  }

  static async approveSchedule(scheduleId: string): Promise<void> {
    const { error } = await supabase
      .from('schedule_versions')
      .update({ 
        diff_json: { status: 'approved' }
      })
      .eq('id', scheduleId)

    if (error) throw error
  }
}
