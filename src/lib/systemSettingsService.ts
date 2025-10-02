import { supabase } from './supabase'

export interface SystemSetting {
  id: string
  setting_key: string
  setting_value: string
  setting_type: 'number' | 'text' | 'boolean' | 'json'
  description: string
  created_at: string
  updated_at: string
}

export interface GroupStatistics {
  level: number
  student_group: string
  student_count: number
  max_capacity: number
  status: 'FULL' | 'NEARLY FULL' | 'AVAILABLE'
  fill_percentage?: string
}

export class SystemSettingsService {
  /**
   * Get a specific setting by key
   */
  static async getSetting(key: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', key)
        .single()

      if (error) throw error

      return data?.setting_value || null
    } catch (error) {
      console.error(`Error fetching setting ${key}:`, error)
      return null
    }
  }

  /**
   * Get max students per group setting
   */
  static async getMaxStudentsPerGroup(): Promise<number> {
    const value = await this.getSetting('max_students_per_group')
    return value ? parseInt(value) : 25 // Default to 25
  }

  /**
   * Update max students per group
   */
  static async updateMaxStudentsPerGroup(maxStudents: number): Promise<void> {
    if (maxStudents < 1 || maxStudents > 50) {
      throw new Error('Max students must be between 1 and 50')
    }

    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ 
          setting_value: maxStudents.toString(),
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'max_students_per_group')

      if (error) throw error
    } catch (error: any) {
      console.error('Error updating max students per group:', error)
      throw new Error(`Failed to update setting: ${error.message}`)
    }
  }

  /**
   * Get all settings
   */
  static async getAllSettings(): Promise<SystemSetting[]> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('setting_key')

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching all settings:', error)
      return []
    }
  }

  /**
   * Get group statistics for all levels
   */
  static async getGroupStatistics(): Promise<GroupStatistics[]> {
    try {
      const { data, error } = await supabase
        .from('group_statistics')
        .select('*')
        .order('level')
        .order('student_group')

      if (error) throw error

      // Calculate fill percentage
      return (data || []).map(stat => ({
        ...stat,
        fill_percentage: `${Math.round((stat.student_count / stat.max_capacity) * 100)}%`
      }))
    } catch (error) {
      console.error('Error fetching group statistics:', error)
      return []
    }
  }

  /**
   * Get group statistics for a specific level
   */
  static async getGroupStatisticsForLevel(level: number): Promise<GroupStatistics[]> {
    try {
      const allStats = await this.getGroupStatistics()
      return allStats.filter(stat => stat.level === level)
    } catch (error) {
      console.error(`Error fetching group statistics for level ${level}:`, error)
      return []
    }
  }

  /**
   * Get next available group for a level
   */
  static async getNextAvailableGroup(level: number): Promise<string> {
    try {
      const stats = await this.getGroupStatisticsForLevel(level)
      const maxCapacity = await this.getMaxStudentsPerGroup()

      // Find first non-full group
      for (const group of ['A', 'B', 'C']) {
        const groupStat = stats.find(s => s.student_group === group)
        if (!groupStat || groupStat.student_count < maxCapacity) {
          return group
        }
      }

      // All groups full, return warning
      console.warn(`All groups are full for level ${level}`)
      return 'A' // Default to A with warning
    } catch (error) {
      console.error('Error getting next available group:', error)
      return 'A'
    }
  }

  /**
   * Check if a group is full
   */
  static async isGroupFull(level: number, group: string): Promise<boolean> {
    try {
      const stats = await this.getGroupStatisticsForLevel(level)
      const maxCapacity = await this.getMaxStudentsPerGroup()
      
      const groupStat = stats.find(s => s.student_group === group)
      return groupStat ? groupStat.student_count >= maxCapacity : false
    } catch (error) {
      console.error('Error checking if group is full:', error)
      return false
    }
  }

  /**
   * Get total students by level
   */
  static async getTotalStudentsByLevel(level: number): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('level', level)

      if (error) throw error

      return count || 0
    } catch (error) {
      console.error(`Error getting total students for level ${level}:`, error)
      return 0
    }
  }

  /**
   * Get capacity summary for all levels
   */
  static async getCapacitySummary(): Promise<{
    level: number
    total_students: number
    max_capacity: number
    utilization_percentage: number
  }[]> {
    try {
      const maxCapacity = await this.getMaxStudentsPerGroup()
      const maxPerLevel = maxCapacity * 3 // 3 groups per level

      const summary = []
      for (let level = 1; level <= 4; level++) {
        const total = await this.getTotalStudentsByLevel(level)
        summary.push({
          level,
          total_students: total,
          max_capacity: maxPerLevel,
          utilization_percentage: Math.round((total / maxPerLevel) * 100)
        })
      }

      return summary
    } catch (error) {
      console.error('Error getting capacity summary:', error)
      return []
    }
  }
}

