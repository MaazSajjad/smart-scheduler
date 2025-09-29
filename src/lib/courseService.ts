import { supabase } from './supabase'
import { Course } from './supabase'

export interface CreateCourseData {
  code: string
  title: string
  level: number
  is_fixed: boolean
  typical_duration: number
  allowable_rooms: string[]
}

export interface UpdateCourseData extends Partial<CreateCourseData> {
  id: string
}

export class CourseService {
  static async getAllCourses(): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('level', { ascending: true })
      .order('code', { ascending: true })

    if (error) throw error
    return data || []
  }

  static async getCourseById(id: string): Promise<Course | null> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  static async createCourse(courseData: CreateCourseData): Promise<Course> {
    const { data, error } = await supabase
      .from('courses')
      .insert(courseData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateCourse(courseData: UpdateCourseData): Promise<Course> {
    const { id, ...updateData } = courseData
    const { data, error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteCourse(id: string): Promise<void> {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  static async getCoursesByLevel(level: number): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('level', level)
      .order('code', { ascending: true })

    if (error) throw error
    return data || []
  }
}
