import { supabase } from './supabase'
import { Student } from './supabase'

export interface CreateStudentData {
  user_id: string
  student_number: string
  level: number
  contact?: string
}

export interface UpdateStudentData extends Partial<CreateStudentData> {
  id: string
}

export class StudentService {
  static async getAllStudents(): Promise<Student[]> {
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        users(email, role)
      `)
      .order('level', { ascending: true })
      .order('student_number', { ascending: true })

    if (error) throw error
    return data || []
  }

  static async getStudentById(id: string): Promise<Student | null> {
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        users(email, role)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  static async createStudent(studentData: CreateStudentData): Promise<Student> {
    const { data, error } = await supabase
      .from('students')
      .insert(studentData)
      .select(`
        *,
        users(email, role)
      `)
      .single()

    if (error) throw error
    return data
  }

  static async updateStudent(studentData: UpdateStudentData): Promise<Student> {
    const { id, ...updateData } = studentData
    const { data, error } = await supabase
      .from('students')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        users(email, role)
      `)
      .single()

    if (error) throw error
    return data
  }

  static async deleteStudent(id: string): Promise<void> {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  static async getStudentsByLevel(level: number): Promise<Student[]> {
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        users(email, role)
      `)
      .eq('level', level)
      .order('student_number', { ascending: true })

    if (error) throw error
    return data || []
  }
}
