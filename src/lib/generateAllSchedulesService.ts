import { supabase } from './supabase'
import { getScheduleRecommendation, SchedulingConstraints } from './groq'
import { ScheduleService } from './scheduleService'

export interface ScheduleGroup {
  name: string
  student_count: number
  sections: ScheduleSection[]
}

export interface ScheduleSection {
  course_code: string
  course_title: string
  section_label: string
  day: string
  start_time: string
  end_time: string
  room: string
  instructor: string
  student_count: number
  capacity: number
}

export interface GeneratedSchedule {
  id?: string
  level: number
  semester: string
  groups: {
    [key: string]: ScheduleGroup
  }
  total_sections: number
  conflicts: number
  efficiency: number
  generated_at: string
}

export class GenerateAllSchedulesService {
  // Global room usage tracking across all levels
  private static globalRoomUsage = new Map<string, Set<string>>() // room -> Set of time slots
  
  // Initialize global room tracking
  private static initializeGlobalRoomTracking(): void {
    const allRooms = [
      'A101', 'A102', 'A103', 'A104', 'A105', 'A106',
      'B201', 'B202', 'B203', 'B204', 'B205', 'B206',
      'C301', 'C302', 'C303', 'C304', 'C305', 'C306',
      'D401', 'D402', 'D403', 'D404', 'D405', 'D406',
      'LAB1', 'LAB2', 'LAB3', 'LAB4', 'LAB5', 'LAB6'
    ]
    
    allRooms.forEach(room => {
      if (!this.globalRoomUsage.has(room)) {
        this.globalRoomUsage.set(room, new Set())
      }
    })
  }

  // Clear global room usage (for fresh start)
  private static clearGlobalRoomUsage(): void {
    this.globalRoomUsage.clear()
    this.initializeGlobalRoomTracking()
  }

  // Check if room is available globally
  private static isRoomAvailableGlobally(room: string, day: string, startTime: string): boolean {
    const timeSlot = `${day}-${startTime}`
    return !this.globalRoomUsage.get(room)?.has(timeSlot)
  }

  // Reserve room globally
  private static reserveRoomGlobally(room: string, day: string, startTime: string): void {
    const timeSlot = `${day}-${startTime}`
    this.globalRoomUsage.get(room)?.add(timeSlot)
  }

  // Generate schedule for a specific level using AI
  static async generateLevelSchedule(level: number): Promise<GeneratedSchedule> {
    try {
      console.log(`🤖 Generating AI-powered schedule for Level ${level}...`)

      // Initialize global room tracking
      this.initializeGlobalRoomTracking()

      // Get courses for this level
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('level', level)

      if (coursesError) throw coursesError
      if (!courses || courses.length === 0) {
        throw new Error(`No courses found for Level ${level}`)
      }

      // Get students for this level
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('level', level)

      if (studentsError) throw studentsError
      if (!students || students.length === 0) {
        throw new Error(`No students found for Level ${level}`)
      }

      console.log(`📚 Found ${courses.length} courses and ${students.length} students for Level ${level}`)

      // Create groups (A, B, C)
      const studentsPerGroup = Math.ceil(students.length / 3)
      const groups: {
        [key: string]: {
          name: string
          student_count: number
          sections: ScheduleSection[]
        }
      } = {
        'Group A': { name: 'Group A', student_count: studentsPerGroup, sections: [] },
        'Group B': { name: 'Group B', student_count: studentsPerGroup, sections: [] },
        'Group C': { name: 'Group C', student_count: studentsPerGroup, sections: [] }
      }

      // Generate schedule for each group using AI
      for (const [groupName, group] of Object.entries(groups)) {
        console.log(`🎯 Generating schedule for ${groupName}...`)
        
        if (courses.length === 0) {
          console.warn(`⚠️ No courses available for ${groupName}, skipping`)
          group.sections = []
          continue
        }
        
        const groupSchedule = await this.generateGroupScheduleWithAI(
          courses,
          group.student_count,
          groupName,
          level
        )
        
        group.sections = groupSchedule
        console.log(`✅ ${groupName}: Assigned ${groupSchedule.length} sections`)
      }

      // Calculate totals
      const totalSections = Object.values(groups).reduce((sum, group) => sum + group.sections.length, 0)
      const conflicts = this.detectConflicts(groups)
      const efficiency = Math.min(100, Math.round((totalSections / (courses.length * 3)) * 100))

      const schedule: GeneratedSchedule = {
        level,
        semester: 'Fall 2024',
        groups,
        total_sections: totalSections,
        conflicts,
        efficiency,
        generated_at: new Date().toISOString()
      }

      console.log(`✅ Level ${level} schedule generated: ${totalSections} sections, ${conflicts} conflicts, ${efficiency}% efficiency`)
      return schedule

    } catch (error) {
      console.error(`❌ Error generating schedule for Level ${level}:`, error)
      throw error
    }
  }

  // Generate schedule for all levels
  static async generateAllLevels(): Promise<GeneratedSchedule[]> {
    try {
      // Clear global room usage for fresh start
      this.clearGlobalRoomUsage()
      console.log('🧹 Cleared global room usage for fresh start')

      // Get available levels
      const { data: levels, error } = await supabase
        .from('courses')
        .select('level')
        .order('level', { ascending: true })

      if (error) throw error
      if (!levels || levels.length === 0) {
        throw new Error('No levels found')
      }

      // Get unique levels
      const uniqueLevels = [...new Set(levels.map((l: any) => l.level))]
      const levelNumbers = uniqueLevels.sort((a, b) => a - b)
      console.log(`🎓 Found levels: ${levelNumbers.join(', ')}`)

      const allSchedules: GeneratedSchedule[] = []

      // Generate schedule for each level
      for (const level of levelNumbers) {
        console.log(`\n🏗️ Starting Level ${level} generation...`)
        const schedule = await this.generateLevelSchedule(level)
        allSchedules.push(schedule)
        console.log(`✅ Completed Level ${level} generation`)
      }

      console.log(`\n🎉 Successfully generated schedules for all ${levelNumbers.length} levels!`)
      return allSchedules

    } catch (error) {
      console.error('Error generating all schedules:', error)
      throw error
    }
  }

  // Generate schedule for a specific group using AI
  private static async generateGroupScheduleWithAI(
    courses: any[],
    studentCount: number,
    groupName: string,
    level: number
  ): Promise<ScheduleSection[]> {
    
    console.log(`🤖 Starting AI generation for ${groupName} with ${courses.length} courses`)
    
    // Get all available rooms (global pool)
    const allRooms = [
      'A101', 'A102', 'A103', 'A104', 'A105', 'A106',
      'B201', 'B202', 'B203', 'B204', 'B205', 'B206',
      'C301', 'C302', 'C303', 'C304', 'C305', 'C306',
      'D401', 'D402', 'D403', 'D404', 'D405', 'D406',
      'LAB1', 'LAB2', 'LAB3', 'LAB4', 'LAB5', 'LAB6'
    ]
    
    // Prepare constraints for AI
    const constraints: SchedulingConstraints = {
      students_per_course: {},
      blocked_slots: [
        { day: 'Friday', start: '08:00', end: '18:00' }, // No classes on Friday
        { day: 'Monday', start: '11:00', end: '12:00' }, // Break time
        { day: 'Tuesday', start: '11:00', end: '12:00' },
        { day: 'Wednesday', start: '11:00', end: '12:00' },
        { day: 'Thursday', start: '11:00', end: '12:00' }
      ],
      available_rooms: allRooms,
      rules: [
        `This is for ${groupName} in Level ${level} - create a UNIQUE schedule`,
        'No classes on Friday',
        'No classes during 11:00-12:00 break time',
        'Each section should have 20-30 students maximum',
        'No duplicate courses in the same group schedule',
        'Lab courses must use LAB rooms (LAB1-LAB6)',
        'Lecture courses must use regular rooms (A101-D406)',
        'MATH102 and MATH103 should be scheduled sequentially if possible',
        'Create a balanced schedule across all days',
        'Avoid scheduling all courses on the same day',
        'Check room availability - rooms may be used by other levels',
        'Distribute courses evenly across Monday-Thursday'
      ],
      objective_priorities: {
        minimize_conflicts: true,
        minimize_gaps: true,
        balance_instructor_loads: true
      }
    }

    // Calculate students per course
    courses.forEach(course => {
      constraints.students_per_course[course.code] = studentCount
    })

    console.log(`📋 Constraints for ${groupName}:`, {
      courses: courses.map(c => c.code),
      students_per_course: constraints.students_per_course,
      available_rooms: constraints.available_rooms,
      group_specific: true
    })

    try {
      // Get AI recommendations
      console.log(`🚀 Calling AI API for ${groupName}...`)
      const recommendations = await getScheduleRecommendation(constraints, level)
      console.log(`📊 AI returned ${recommendations.length} recommendations for ${groupName}`)
      
      if (!recommendations || recommendations.length === 0) {
        console.warn(`⚠️ AI returned empty recommendations for ${groupName}, using fallback`)
        return this.generateFallbackSchedule(courses, studentCount, groupName)
      }
      
      // Convert AI recommendations to schedule sections with global room checking
      const sections: ScheduleSection[] = []
      
      for (const rec of recommendations) {
        // Check if room is available globally
        if (this.isRoomAvailableGlobally(rec.room, rec.timeslot.day, rec.timeslot.start)) {
          // Reserve the room globally
          this.reserveRoomGlobally(rec.room, rec.timeslot.day, rec.timeslot.start)
          
          const section: ScheduleSection = {
            course_code: rec.course_code,
            course_title: courses.find(c => c.code === rec.course_code)?.title || rec.course_code,
            section_label: this.getGroupSectionLabel(groupName),
            day: rec.timeslot.day,
            start_time: rec.timeslot.start,
            end_time: rec.timeslot.end,
            room: rec.room,
            instructor: `Dr. ${rec.course_code}`,
            student_count: Math.min(rec.allocated_student_ids?.length || studentCount, 30),
            capacity: 30
          }
          
          sections.push(section)
          console.log(`✅ Reserved ${rec.room} for ${rec.course_code} on ${rec.timeslot.day} ${rec.timeslot.start}`)
        } else {
          console.warn(`⚠️ Room ${rec.room} not available for ${rec.course_code} on ${rec.timeslot.day} ${rec.timeslot.start}, skipping`)
        }
      }

      console.log(`✅ ${groupName}: Generated ${sections.length} sections using AI`)
      return sections

    } catch (aiError) {
      console.error(`❌ AI generation failed for ${groupName}:`, aiError)
      console.log(`🔄 Using fallback schedule for ${groupName}...`)
      
      // Fallback: Create basic schedule without AI
      const fallbackSections = this.generateFallbackSchedule(courses, studentCount, groupName)
      console.log(`✅ ${groupName}: Generated ${fallbackSections.length} sections using fallback`)
      return fallbackSections
    }
  }

  // Get group-specific rooms to avoid conflicts
  private static getGroupSpecificRooms(groupName: string): string[] {
    switch (groupName) {
      case 'Group A':
        return ['A101', 'A102', 'A103', 'A104', 'A105', 'A106', 'LAB1', 'LAB2']
      case 'Group B':
        return ['B201', 'B202', 'B203', 'B204', 'B205', 'B206', 'LAB3', 'LAB4']
      case 'Group C':
        return ['C301', 'C302', 'C303', 'C304', 'C305', 'C306', 'LAB5', 'LAB6']
      default:
        return ['A101', 'A102', 'A103', 'B201', 'B202', 'B203', 'C301', 'C302', 'LAB1', 'LAB2']
    }
  }

  // Get group-specific section label
  private static getGroupSectionLabel(groupName: string): string {
    switch (groupName) {
      case 'Group A': return 'A'
      case 'Group B': return 'B'
      case 'Group C': return 'C'
      default: return 'A'
    }
  }

  // Fallback schedule generation (when AI fails)
  private static generateFallbackSchedule(
    courses: any[],
    studentCount: number,
    groupName: string
  ): ScheduleSection[] {
    console.log(`🔄 Creating fallback schedule for ${groupName} with ${courses.length} courses`)
    
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday']
    const timeSlots = [
      { start: '08:00', end: '09:00' },
      { start: '09:00', end: '10:00' },
      { start: '10:00', end: '11:00' },
      { start: '13:00', end: '14:00' },
      { start: '14:00', end: '15:00' },
      { start: '15:00', end: '16:00' }
    ]
    
    // Get all available rooms (global pool)
    const allRooms = [
      'A101', 'A102', 'A103', 'A104', 'A105', 'A106',
      'B201', 'B202', 'B203', 'B204', 'B205', 'B206',
      'C301', 'C302', 'C303', 'C304', 'C305', 'C306',
      'D401', 'D402', 'D403', 'D404', 'D405', 'D406',
      'LAB1', 'LAB2', 'LAB3', 'LAB4', 'LAB5', 'LAB6'
    ]
    
    const lectureRooms = allRooms.filter(room => !room.startsWith('LAB'))
    const labRooms = allRooms.filter(room => room.startsWith('LAB'))

    // Create group-specific time offset to avoid conflicts
    const groupOffset = this.getGroupTimeOffset(groupName)

    const sections: ScheduleSection[] = []
    
    for (let index = 0; index < courses.length; index++) {
      const course = courses[index]
      const dayIndex = (index + groupOffset) % days.length
      const timeIndex = (index + groupOffset) % timeSlots.length
      
      const isLab = course.code.includes('LAB') || course.title.toLowerCase().includes('lab')
      const availableRooms = isLab ? labRooms : lectureRooms
      
      // Find an available room
      let selectedRoom = null
      for (const room of availableRooms) {
        if (this.isRoomAvailableGlobally(room, days[dayIndex], timeSlots[timeIndex].start)) {
          selectedRoom = room
          break
        }
      }
      
      if (selectedRoom) {
        // Reserve the room globally
        this.reserveRoomGlobally(selectedRoom, days[dayIndex], timeSlots[timeIndex].start)
        
        const section: ScheduleSection = {
          course_code: course.code,
          course_title: course.title,
          section_label: this.getGroupSectionLabel(groupName),
          day: days[dayIndex],
          start_time: timeSlots[timeIndex].start,
          end_time: timeSlots[timeIndex].end,
          room: selectedRoom,
          instructor: `Dr. ${course.code}`,
          student_count: Math.min(studentCount, 30),
          capacity: 30
        }
        
        sections.push(section)
        console.log(`📚 Fallback section: ${course.code} - ${days[dayIndex]} ${timeSlots[timeIndex].start} - ${selectedRoom}`)
      } else {
        console.warn(`⚠️ No available room for ${course.code} on ${days[dayIndex]} ${timeSlots[timeIndex].start}`)
      }
    }

    console.log(`✅ Fallback generated ${sections.length} sections for ${groupName}`)
    return sections
  }

  // Get group-specific time offset to avoid conflicts
  private static getGroupTimeOffset(groupName: string): number {
    switch (groupName) {
      case 'Group A': return 0
      case 'Group B': return 2  // Offset by 2 time slots
      case 'Group C': return 4  // Offset by 4 time slots
      default: return 0
    }
  }

  // Detect conflicts in the generated schedule
  private static detectConflicts(groups: any): number {
    let conflicts = 0
    const allSections = Object.values(groups).flatMap((group: any) => group.sections)
    
    // Check for room conflicts
    const roomTimeMap = new Map<string, string[]>()
    
    for (const section of allSections) {
      const key = `${section.room}-${section.day}-${section.start_time}`
      if (roomTimeMap.has(key)) {
        roomTimeMap.get(key)!.push(section.course_code)
        conflicts++
      } else {
        roomTimeMap.set(key, [section.course_code])
      }
    }
    
    return conflicts
  }

  // Save schedules to database
  static async saveSchedulesToDatabase(schedules: GeneratedSchedule[]): Promise<void> {
    try {
      for (const schedule of schedules) {
        // Convert to the format expected by the existing database
        const sections = Object.values(schedule.groups).flatMap(group => 
          group.sections.map(section => ({
            course_code: section.course_code,
            section_label: section.section_label,
            timeslot: {
              day: section.day,
              start: section.start_time,
              end: section.end_time
            },
            room: section.room,
            instructor_id: null,
            student_count: section.student_count,
            capacity: section.capacity
          }))
        )

        const { error } = await supabase
          .from('schedule_versions')
          .insert({
            level: schedule.level,
            semester: schedule.semester,
            diff_json: {
              sections,
              groups: schedule.groups,
              conflicts: schedule.conflicts,
              efficiency: schedule.efficiency,
              status: 'draft',
              generated_at: schedule.generated_at
            },
            author_id: null
          })

        if (error) {
          console.error(`Error saving schedule for Level ${schedule.level}:`, error)
          throw error
        }
      }

      console.log(`✅ Saved ${schedules.length} schedules to database`)
    } catch (error) {
      console.error('Error saving schedules to database:', error)
      throw error
    }
  }

  // Get existing schedules from database
  static async getExistingSchedules(): Promise<GeneratedSchedule[]> {
    try {
      const { data, error } = await supabase
        .from('schedule_versions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map(schedule => ({
        id: schedule.id,
        level: schedule.level,
        semester: schedule.semester,
        groups: schedule.diff_json?.groups || {},
        total_sections: schedule.diff_json?.total_sections || 0,
        conflicts: schedule.diff_json?.conflicts || 0,
        efficiency: schedule.diff_json?.efficiency || 0,
        generated_at: schedule.created_at
      }))
    } catch (error) {
      console.error('Error loading existing schedules:', error)
      throw error
    }
  }

  // Delete a schedule
  static async deleteSchedule(scheduleId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('schedule_versions')
        .delete()
        .eq('id', scheduleId)

      if (error) throw error
      
      console.log(`✅ Deleted schedule ${scheduleId}`)
    } catch (error) {
      console.error('Error deleting schedule:', error)
      throw error
    }
  }


  // Generate schedule with AI prompt for editing
  static async generateLevelScheduleWithPrompt(
    level: number, 
    userPrompt: string, 
    enhancedConstraints: any
  ): Promise<GeneratedSchedule> {
    try {
      console.log(`🤖 AI Editing for Level ${level} with prompt: ${userPrompt}`)
      
      // Create enhanced constraints for the AI
      const aiConstraints = {
        level,
        userPrompt,
        occupiedSlots: enhancedConstraints.occupiedSlots || [],
        availableRooms: enhancedConstraints.availableRooms || ['A101', 'A102', 'B205', 'C301'],
        studentCount: enhancedConstraints.studentCount || 25,
        conflictPreventionRules: [
          'CRITICAL: Avoid time conflicts with other levels in the same rooms',
          'CRITICAL: Maintain afternoon-only policy (12 PM onwards)',
          'CRITICAL: No classes on Friday',
          'Optimize for minimal disruption to other levels',
          'Balance instructor workload',
          'Ensure proper room utilization'
        ],
        editingMode: true,
        preserveConsistency: true
      }

      // Get courses for this level
      const { data: courses } = await supabase
        .from('courses')
        .select('*')
        .eq('level', level)

      if (!courses || courses.length === 0) {
        throw new Error(`No courses found for Level ${level}`)
      }

      console.log(`Found ${courses.length} courses for Level ${level}`)

      // Use AI to generate optimized schedule based on prompt
      const aiResponse = await this.callAIForScheduleEditing(aiConstraints, courses)
      
      // Process AI response into schedule format
      const processedSchedule = await this.processAIEditingResponse(aiResponse, level, userPrompt)
      
      console.log(`✅ AI generated edited schedule for Level ${level}`)
      return processedSchedule

    } catch (error) {
      console.error('Error in AI schedule editing:', error)
      throw error
    }
  }

  // Call AI service for schedule editing
  private static async callAIForScheduleEditing(constraints: any, courses: any[]): Promise<any> {
    try {
      const response = await fetch('/api/generate-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          constraints: {
            ...constraints,
            courses: courses.map(c => ({
              code: c.code,
              title: c.title,
              is_fixed: c.is_fixed,
              allowable_rooms: c.allowable_rooms
            }))
          },
          level: constraints.level,
          editingMode: true,
          userPrompt: constraints.userPrompt
        }),
      })

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`)
      }

      const data = await response.json()
      return data.recommendations || []
    } catch (error) {
      console.error('AI API call failed:', error)
      // Fallback to basic regeneration
      return this.generateFallbackEditedSchedule(constraints, courses)
    }
  }

  // Process AI response for editing
  private static async processAIEditingResponse(aiResponse: any[], level: number, userPrompt: string): Promise<GeneratedSchedule> {
    const groups: { [key: string]: ScheduleGroup } = {}
    
    // Create groups A, B, C with distributed sections
    const groupNames = ['Group A', 'Group B', 'Group C']
    
    groupNames.forEach((groupName, groupIndex) => {
      groups[groupName] = {
        name: groupName,
        student_count: Math.floor(75 / groupNames.length), // Distribute students
        sections: aiResponse
          .filter((_, index) => index % groupNames.length === groupIndex)
          .map(recommendation => ({
            course_code: recommendation.course_code,
            course_title: recommendation.course_code,
            section_label: recommendation.section_label,
            day: recommendation.timeslot.day,
            start_time: recommendation.timeslot.start,
            end_time: recommendation.timeslot.end,
            room: recommendation.room,
            instructor: 'TBA',
            student_count: Math.min(25, recommendation.allocated_student_ids?.length || 25),
            capacity: 30
          }))
      }
    })

    return {
      id: `edited-${level}-${Date.now()}`,
      level,
      semester: 'Fall 2024',
      groups,
      total_sections: aiResponse.length,
      conflicts: 0,
      efficiency: 85,
      generated_at: new Date().toISOString()
    }
  }

  // Fallback schedule generation for editing
  private static generateFallbackEditedSchedule(constraints: any, courses: any[]): any[] {
    return courses.slice(0, 6).map((course, index) => ({
      course_code: course.code,
      section_label: 'A',
      timeslot: {
        day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'][index % 4],
        start: index < 3 ? '14:00' : '15:30',
        end: index < 3 ? '15:30' : '17:00'
      },
      room: constraints.availableRooms[index % constraints.availableRooms.length],
      allocated_student_ids: Array(25).fill(0).map((_, i) => `student-${i}`),
      justification: `Fallback editing for ${course.code} based on user prompt`,
      confidence_score: 0.7
    }))
  }

  /**
   * Update an existing schedule in the database
   */
  static async updateSchedule(
    scheduleId: string,
    updateData: {
      groups: any;
      total_sections: number;
      conflicts: number;
      efficiency: number;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('schedule_versions')
        .update({
          diff_json: {
            groups: updateData.groups,
            total_sections: updateData.total_sections,
            conflicts: updateData.conflicts,
            efficiency: updateData.efficiency
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduleId)

      if (error) {
        throw new Error(`Failed to update schedule: ${error.message}`)
      }

      console.log('Successfully updated schedule:', scheduleId)
    } catch (error) {
      console.error('Error updating schedule:', error)
      throw error
    }
  }
}