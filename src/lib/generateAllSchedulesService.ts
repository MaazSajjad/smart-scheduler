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
  semester?: string
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
  static async generateLevelSchedule(level: number, specificGroups?: string[], skipDatabaseSave?: boolean): Promise<GeneratedSchedule> {
    try {
      console.log(`🤖 Generating AI-powered schedule for Level ${level}...`)
      if (skipDatabaseSave) {
        console.log(`⚠️ Skip database save mode - will return data only`)
      }

      // Initialize global room tracking
      this.initializeGlobalRoomTracking()

      // STRICT: Load ALL existing schedules from other levels to prevent ANY overlap
      const occupiedSlots = await this.getAllOccupiedSlotsFromOtherLevels(level)
      console.log(`🔒 STRICT MODE: Loaded ${occupiedSlots.length} occupied time/room slots from other levels`)

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

      // Group students by their assigned group
      const studentsByGroup = students.reduce((acc: any, student: any) => {
        const group = student.student_group || 'A'
        if (!acc[group]) acc[group] = []
        acc[group].push(student)
        return acc
      }, {})

      console.log(`📊 Students per group:`, Object.entries(studentsByGroup).map(([g, s]: [string, any]) => `${g}: ${s.length}`).join(', '))

      // Create groups only for groups that have students (or specificGroups if provided)
      const groups: {
        [key: string]: {
          name: string
          student_count: number
          sections: ScheduleSection[]
        }
      } = {}

      const groupsToGenerate = specificGroups || Object.keys(studentsByGroup)
      
      for (const groupLetter of groupsToGenerate) {
        const studentsInGroup = studentsByGroup[groupLetter] || []
        
        if (studentsInGroup.length === 0) {
          console.warn(`⚠️ No students in Group ${groupLetter}, skipping schedule generation`)
          continue
        }

        groups[`Group ${groupLetter}`] = {
          name: `Group ${groupLetter}`,
          student_count: studentsInGroup.length,
          sections: []
        }
      }

      if (Object.keys(groups).length === 0) {
        throw new Error(`No groups with students found for Level ${level}`)
      }

      console.log(`✅ Will generate schedules for groups: ${Object.keys(groups).join(', ')}`)

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
          level,
          occupiedSlots
        )
        
        group.sections = groupSchedule
        console.log(`✅ ${groupName}: Assigned ${groupSchedule.length} sections`)
      }

      // Calculate totals
      const totalSections = Object.values(groups).reduce((sum, group) => sum + group.sections.length, 0)
      const conflicts = this.detectConflicts(groups)
      const efficiency = Math.min(100, Math.round((totalSections / (courses.length * 3)) * 100))

      const schedule: GeneratedSchedule = {
        id: `level-${level}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        level,
        groups,
        total_sections: totalSections,
        conflicts,
        efficiency,
        generated_at: new Date().toISOString()
      }

      console.log(`🔍 Created schedule object:`, JSON.stringify(schedule, null, 2))
      console.log(`🔍 Schedule level: ${schedule.level} (type: ${typeof schedule.level})`)

      // Check for inter-level conflicts and resolve them
      const interLevelConflicts = await this.detectInterLevelConflicts(schedule)
      console.log(`🔍 Detected ${interLevelConflicts} inter-level conflicts`)

      let finalSchedule = schedule
      if (interLevelConflicts > 0) {
        console.log(`🔧 Resolving ${interLevelConflicts} inter-level conflicts...`)
        finalSchedule = await this.resolveConflicts(schedule)
        
        // Recalculate conflicts after resolution
        const resolvedConflicts = this.detectConflicts(finalSchedule.groups)
        const resolvedInterLevelConflicts = await this.detectInterLevelConflicts(finalSchedule)
        
        finalSchedule = {
          ...finalSchedule,
          conflicts: resolvedConflicts + resolvedInterLevelConflicts,
          efficiency: Math.max(0, efficiency - (interLevelConflicts * 5)) // Reduce efficiency for each conflict resolved
        }
        
        console.log(`✅ Conflict resolution complete. Final conflicts: ${finalSchedule.conflicts}`)
      }

      // Save to database immediately and get the real UUID (unless skipping)
      if (!skipDatabaseSave) {
        const savedId = await this.saveSingleScheduleToDatabase(finalSchedule)
        
        // Update finalSchedule with the real UUID from database
        if (savedId) {
          finalSchedule.id = savedId
        }

        console.log(`✅ Level ${level} schedule generated and saved with ID ${savedId}: ${finalSchedule.total_sections} sections, ${finalSchedule.conflicts} conflicts, ${finalSchedule.efficiency}% efficiency`)
      } else {
        console.log(`✅ Level ${level} schedule generated (not saved): ${finalSchedule.total_sections} sections, ${finalSchedule.conflicts} conflicts, ${finalSchedule.efficiency}% efficiency`)
      }
      
      return finalSchedule

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
    level: number,
    occupiedSlots: Array<{room: string, day: string, start: string, level: number, course: string}> = []
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
    
    // Add occupied slots from other levels as STRICT blocked slots
    const blockedSlotsFromOtherLevels = occupiedSlots.map(slot => ({
      day: slot.day,
      start: slot.start,
      end: this.calculateEndTime(slot.start, 90), // Calculate end time (90 min = 1.5 hours)
      room: slot.room
    }))
    
    // Prepare constraints for AI
    const constraints: SchedulingConstraints = {
      students_per_course: {},
      blocked_slots: [
        { day: 'Friday', start: '08:00', end: '18:00' }, // No classes on Friday
        { day: 'Monday', start: '11:00', end: '12:00' }, // Break time
        { day: 'Tuesday', start: '11:00', end: '12:00' },
        { day: 'Wednesday', start: '11:00', end: '12:00' },
        { day: 'Thursday', start: '11:00', end: '12:00' },
        ...blockedSlotsFromOtherLevels // Add occupied slots from other levels
      ],
      available_rooms: allRooms,
      rules: [
        `This is for ${groupName} in Level ${level} - create a UNIQUE schedule`,
        '🔒 CRITICAL: NEVER use time/room slots that are OCCUPIED by other levels',
        `🔒 OCCUPIED SLOTS (MUST AVOID): ${occupiedSlots.map(s => `${s.room} on ${s.day} at ${s.start} (Level ${s.level})`).join(', ') || 'None yet'}`,
        'No classes on Friday',
        'No classes during 11:00-12:00 break time',
        'Each section should have 20-30 students maximum',
        'No duplicate courses in the same group schedule',
        'Lab courses must use LAB rooms (LAB1-LAB6)',
        'Lecture courses must use regular rooms (A101-D406)',
        'MATH102 and MATH103 should be scheduled sequentially if possible',
        'Create a balanced schedule across all days',
        'Avoid scheduling all courses on the same day',
        '🔒 STRICTLY check room availability - rooms ARE used by other levels',
        'Distribute courses evenly across Monday-Thursday',
        `${occupiedSlots.length} slots are ALREADY OCCUPIED - avoid them at ALL costs`
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
    
    // Check for room conflicts within the same level
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

  // Detect conflicts with existing schedules from other levels
  private static async detectInterLevelConflicts(newSchedule: GeneratedSchedule): Promise<number> {
    try {
      let conflicts = 0
      
      // Get all existing schedules from other levels
      const { data: existingSchedules } = await supabase
        .from('schedule_versions')
        .select('level, diff_json')
        .neq('level', newSchedule.level)

      if (!existingSchedules || existingSchedules.length === 0) {
        return 0 // No other levels to conflict with
      }

      console.log(`🔍 Checking for conflicts with ${existingSchedules.length} existing schedules from other levels`)

      // Extract all time slots from existing schedules
      const existingTimeSlots = new Map<string, { level: number, course: string }>()
      
      for (const schedule of existingSchedules) {
        const groups = schedule.diff_json?.groups || {}
        for (const [groupName, groupData] of Object.entries(groups)) {
          for (const section of (groupData as any).sections || []) {
            const timeSlot = `${section.room}-${section.day}-${section.start_time}`
            existingTimeSlots.set(timeSlot, {
              level: schedule.level,
              course: section.course_code
            })
          }
        }
      }

      // Check new schedule against existing time slots
      const newSections = Object.values(newSchedule.groups).flatMap((group: any) => group.sections)
      
      for (const section of newSections) {
        const timeSlot = `${section.room}-${section.day}-${section.start_time}`
        if (existingTimeSlots.has(timeSlot)) {
          const conflict = existingTimeSlots.get(timeSlot)!
          console.log(`⚠️ Conflict detected: Level ${newSchedule.level} ${section.course_code} conflicts with Level ${conflict.level} ${conflict.course} at ${timeSlot}`)
          conflicts++
        }
      }

      return conflicts
    } catch (error) {
      console.error('Error detecting inter-level conflicts:', error)
      return 0
    }
  }

  // Resolve conflicts by adjusting schedule times and rooms
  private static async resolveConflicts(schedule: GeneratedSchedule): Promise<GeneratedSchedule> {
    try {
      console.log(`🔧 Resolving conflicts for Level ${schedule.level}...`)
      
      // Get all existing schedules from other levels
      const { data: existingSchedules } = await supabase
        .from('schedule_versions')
        .select('level, diff_json')
        .neq('level', schedule.level)

      if (!existingSchedules || existingSchedules.length === 0) {
        return schedule // No conflicts to resolve
      }

      // Extract occupied time slots from existing schedules
      const occupiedSlots = new Map<string, { level: number, course: string }>()
      
      for (const existingSchedule of existingSchedules) {
        const groups = existingSchedule.diff_json?.groups || {}
        for (const [groupName, groupData] of Object.entries(groups)) {
          for (const section of (groupData as any).sections || []) {
            const timeSlot = `${section.room}-${section.day}-${section.start_time}`
            occupiedSlots.set(timeSlot, {
              level: existingSchedule.level,
              course: section.course_code
            })
          }
        }
      }

      // Available time slots (afternoon only, no Friday)
      const availableTimes = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
      const availableDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday']
      const availableRooms = ['A101', 'A102', 'A103', 'A104', 'A105', 'A106', 'B201', 'B202', 'B203', 'B204', 'B205', 'B206', 'C301', 'C302', 'C303', 'C304', 'C305', 'C306', 'D401', 'D402', 'D403', 'D404', 'D405', 'D406', 'LAB1', 'LAB2', 'LAB3', 'LAB4', 'LAB5', 'LAB6']

      // Resolve conflicts for each group
      const resolvedGroups = { ...schedule.groups }
      
      for (const [groupName, groupData] of Object.entries(resolvedGroups)) {
        const sections = (groupData as any).sections || []
        const resolvedSections = []
        
        for (const section of sections) {
          let resolvedSection = { ...section }
          let attempts = 0
          const maxAttempts = 50
          
          // Try to find a non-conflicting time slot
          while (attempts < maxAttempts) {
            const timeSlot = `${resolvedSection.room}-${resolvedSection.day}-${resolvedSection.start_time}`
            
            if (!occupiedSlots.has(timeSlot)) {
              // No conflict, use this slot
              break
            }
            
            // Conflict found, try a different time/room
            const randomDay = availableDays[Math.floor(Math.random() * availableDays.length)]
            const randomTime = availableTimes[Math.floor(Math.random() * availableTimes.length)]
            const randomRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)]
            
            resolvedSection = {
              ...resolvedSection,
              day: randomDay,
              start_time: randomTime,
              end_time: this.calculateEndTime(randomTime, 90), // 90 minutes duration
              room: randomRoom
            }
            
            attempts++
          }
          
          if (attempts >= maxAttempts) {
            console.log(`⚠️ Could not resolve conflict for ${section.course_code} in ${groupName} after ${maxAttempts} attempts`)
          } else {
            console.log(`✅ Resolved conflict for ${section.course_code} in ${groupName}`)
          }
          
          resolvedSections.push(resolvedSection)
        }
        
        resolvedGroups[groupName] = {
          ...groupData,
          sections: resolvedSections
        }
      }

      return {
        ...schedule,
        groups: resolvedGroups
      }
    } catch (error) {
      console.error('Error resolving conflicts:', error)
      return schedule
    }
  }

  // Calculate end time based on start time and duration
  private static calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + durationMinutes
    const endHours = Math.floor(totalMinutes / 60)
    const endMinutes = totalMinutes % 60
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
  }

  // Save a single schedule to database and return the saved schedule with real UUID
  static async saveSingleScheduleToDatabase(schedule: GeneratedSchedule): Promise<string | null> {
    try {
      console.log(`💾 Attempting to save Level ${schedule.level} schedule to database...`)
      console.log(`💾 Schedule object:`, JSON.stringify(schedule, null, 2))
      
      // Validate required fields
      if (!schedule.level) {
        throw new Error('Schedule level is required but was not provided')
      }
      
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

      console.log(`💾 Prepared ${sections.length} sections for database save`)

      const semesterValue = `Level ${schedule.level}` || 'Unknown Level'
      console.log(`💾 Using semester value: "${semesterValue}"`)
      
      const insertData = {
        level: schedule.level,
        semester: semesterValue,
        diff_json: {
          sections,
          groups: schedule.groups,
          conflicts: schedule.conflicts,
          efficiency: schedule.efficiency,
          status: 'draft',
          generated_at: schedule.generated_at
        },
        author_id: null
      }

      console.log(`💾 Insert data:`, JSON.stringify(insertData, null, 2))

      console.log(`💾 About to insert into database with data:`, insertData)
      console.log(`💾 Semester value being sent: "${insertData.semester}" (type: ${typeof insertData.semester})`)

      const { data, error } = await supabase
        .from('schedule_versions')
        .insert(insertData)
        .select()

      if (error) {
        console.error(`❌ Database error saving schedule for Level ${schedule.level}:`, error)
        console.error(`❌ Error details:`, {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        console.error(`❌ Insert data that failed:`, insertData)
        
        // If it's an RLS error, provide helpful message
        if (error.code === '42501' || error.message.includes('permission denied')) {
          console.error(`❌ RLS Policy Error: You need to run the fix-schedule-insert-rls.sql file in your Supabase SQL Editor to allow schedule inserts`)
          throw new Error(`Database permission error. Please run the fix-schedule-insert-rls.sql file in your Supabase SQL Editor to allow schedule inserts.`)
        }
        
        // If it's a null constraint error, provide specific help
        if (error.message.includes('null value') && error.message.includes('semester')) {
          console.error(`❌ Semester null constraint error. Insert data:`, insertData)
          throw new Error(`Semester field is null. This should not happen. Please check the console logs for details.`)
        }
        
        throw error
      }

      // Return the UUID from the saved schedule
      const savedScheduleId = data && data.length > 0 ? data[0].id : null
      console.log(`✅ Successfully saved Level ${schedule.level} schedule to database with ID: ${savedScheduleId}`)
      return savedScheduleId
    } catch (error) {
      console.error('❌ Error saving schedule to database:', error)
      throw error
    }
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
            semester: `Level ${schedule.level}`, // Use level as semester
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
      console.log(`🗑️ Attempting to delete schedule: ${scheduleId}`)
      
      const { data, error } = await supabase
        .from('schedule_versions')
        .delete()
        .eq('id', scheduleId)
        .select()

      if (error) {
        console.error('Supabase delete error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw new Error(`Failed to delete schedule: ${error.message || 'Unknown error'}`)
      }
      
      console.log(`✅ Deleted schedule ${scheduleId}`, data)
    } catch (error: any) {
      console.error('Error deleting schedule:', {
        error,
        message: error?.message,
        scheduleId
      })
      throw new Error(error?.message || 'Failed to delete schedule')
    }
  }


  // Generate schedule with AI prompt for editing
  static async generateLevelScheduleWithPrompt(
    level: number, 
    userPrompt: string, 
    enhancedConstraints: any
  ): Promise<GeneratedSchedule> {
    try {
      console.log(`🤖 Regenerating schedule for Level ${level}`)
      console.log(`📝 User instructions: ${userPrompt}`)
      console.log(`🔒 Occupied slots from other levels: ${enhancedConstraints.occupiedSlots?.length || 0}`)
      
      // SIMPLE APPROACH: Just use the regular generation method
      // It already has all the strict conflict prevention built-in
      console.log(`✅ Using regular generation method (already has strict conflict prevention)`)
      
      // The regular generateLevelSchedule already:
      // 1. Loads occupied slots from other levels
      // 2. Passes them to AI with strict rules
      // 3. Detects and resolves conflicts
      // 4. Returns a proper schedule
      
      // Generate fresh schedule using the proven method (don't save to DB yet)
      const newSchedule = await this.generateLevelSchedule(level, undefined, true)
      
      console.log(`✅ Generated schedule for Level ${level}:`, {
        groupsCount: Object.keys(newSchedule.groups).length,
        totalSections: newSchedule.total_sections,
        conflicts: newSchedule.conflicts
      })
      
      return newSchedule

    } catch (error) {
      console.error('Error in schedule regeneration:', error)
      throw error
    }
  }

  // Call AI service for schedule editing
  private static async callAIForScheduleEditing(constraints: any, courses: any[]): Promise<any> {
    try {
      console.log(`🤖 Sending to AI:`, {
        level: constraints.level,
        occupiedSlotsCount: constraints.occupiedSlots?.length || 0,
        occupiedSlotsSample: constraints.occupiedSlots?.slice(0, 3) || [],
        userPrompt: constraints.userPrompt,
        coursesCount: courses.length
      })

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
        console.error(`❌ AI API returned error status: ${response.status}`)
        throw new Error(`AI API error: ${response.status}`)
      }

      const data = await response.json()
      console.log(`📡 AI API response:`, {
        hasRecommendations: !!data.recommendations,
        recommendationsCount: data.recommendations?.length || 0,
        dataSample: data
      })
      
      if (!data.recommendations || data.recommendations.length === 0) {
        console.warn(`⚠️ AI API returned empty recommendations`)
      }
      
      return data.recommendations || []
    } catch (error) {
      console.error('AI API call failed:', error)
      // Fallback to basic regeneration
      return this.generateFallbackEditedSchedule(constraints, courses)
    }
  }

  // Process AI response for editing
  private static async processAIEditingResponse(aiResponse: any[], level: number, userPrompt: string): Promise<GeneratedSchedule> {
    console.log(`📥 Processing AI response for Level ${level}:`, {
      aiResponseLength: aiResponse?.length || 0,
      aiResponseSample: aiResponse?.slice(0, 2) || [],
      userPrompt
    })
    
    // Check if AI response is empty
    if (!aiResponse || aiResponse.length === 0) {
      console.error(`❌ AI returned EMPTY response for Level ${level}!`)
      console.error(`❌ This means the AI API failed to generate any schedule sections.`)
      throw new Error(`AI API returned empty schedule for Level ${level}. Please try again with different instructions.`)
    }
    
    const groups: { [key: string]: ScheduleGroup } = {}
    
    // Create groups A, B, C with distributed sections
    const groupNames = ['Group A', 'Group B', 'Group C']
    
    groupNames.forEach((groupName, groupIndex) => {
      const groupSections = aiResponse
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
      
      console.log(`📋 ${groupName}: ${groupSections.length} sections`)
      
      groups[groupName] = {
        name: groupName,
        student_count: Math.floor(75 / groupNames.length), // Distribute students
        sections: groupSections
      }
    })

    // Calculate total sections from all groups
    const totalSections = Object.values(groups).reduce((sum, group) => sum + group.sections.length, 0)
    console.log(`📊 Total sections calculated: ${totalSections}`)
    
    // DON'T create a new ID - the caller will handle updating the existing schedule
    const schedule: GeneratedSchedule = {
      level,
      groups,
      total_sections: totalSections,
      conflicts: 0,
      efficiency: 85,
      generated_at: new Date().toISOString()
    }

    // Detect internal conflicts (within groups)
    const internalConflicts = this.detectConflicts(schedule.groups)
    console.log(`🔍 Detected ${internalConflicts} internal conflicts in edited schedule`)

    // Check for inter-level conflicts
    const interLevelConflicts = await this.detectInterLevelConflicts(schedule)
    console.log(`🔍 Detected ${interLevelConflicts} inter-level conflicts in edited schedule`)

    const totalConflicts = internalConflicts + interLevelConflicts

    let finalSchedule = schedule
    if (totalConflicts > 0) {
      console.warn(`⚠️ AI generated schedule still has ${totalConflicts} conflicts (${internalConflicts} internal + ${interLevelConflicts} inter-level)`)
      console.warn(`⚠️ This means the AI did NOT properly follow the conflict avoidance instructions`)
      
      // Try to resolve conflicts
      finalSchedule = await this.resolveConflicts(schedule)
      
      // Recalculate conflicts after resolution attempt
      const resolvedInternalConflicts = this.detectConflicts(finalSchedule.groups)
      const resolvedInterLevelConflicts = await this.detectInterLevelConflicts(finalSchedule)
      const finalTotalConflicts = resolvedInternalConflicts + resolvedInterLevelConflicts
      
      finalSchedule = {
        ...finalSchedule,
        conflicts: finalTotalConflicts,
        efficiency: Math.max(0, 85 - (finalTotalConflicts * 5))
      }
      
      if (finalTotalConflicts > 0) {
        console.error(`❌ Still have ${finalTotalConflicts} conflicts after resolution attempt`)
        console.error(`❌ AI is not properly avoiding occupied time slots`)
      } else {
        console.log(`✅ Conflict resolution successful! All conflicts resolved.`)
      }
    } else {
      console.log(`✅ No conflicts detected in edited schedule!`)
      finalSchedule.conflicts = 0
    }

    // DON'T save to database here - the caller (saveEdits) will handle updating the existing schedule
    console.log(`✅ Edited schedule ready (${finalSchedule.conflicts} conflicts)`)

    return finalSchedule
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
      console.log('💾 Updating schedule in database:', {
        id: scheduleId,
        groupsCount: Object.keys(updateData.groups || {}).length,
        groupNames: Object.keys(updateData.groups || {}),
        totalSections: updateData.total_sections
      })

      const { data, error } = await supabase
        .from('schedule_versions')
        .update({
          diff_json: {
            groups: updateData.groups,
            total_sections: updateData.total_sections,
            conflicts: updateData.conflicts,
            efficiency: updateData.efficiency,
            status: 'draft',
            generated_at: new Date().toISOString()
          }
        })
        .eq('id', scheduleId)
        .select()

      if (error) {
        console.error('❌ Database update error:', error)
        throw new Error(`Failed to update schedule: ${error.message}`)
      }

      console.log('✅ Successfully updated schedule in database:', {
        id: scheduleId,
        updatedData: data,
        groupsSaved: Object.keys(updateData.groups || {}).length
      })
    } catch (error) {
      console.error('Error updating schedule:', error)
      throw error
    }
  }

  /**
   * Get group statistics for a specific level
   * Returns which groups have students and how many
   */
  static async getGroupStatistics(level: number): Promise<{
    groups: { letter: string; studentCount: number; hasSchedule: boolean }[]
  }> {
    try {
      // Get students grouped by group letter
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('student_group')
        .eq('level', level)

      if (studentsError) throw studentsError

      const studentsByGroup = (students || []).reduce((acc: any, student: any) => {
        const group = student.student_group || 'A'
        acc[group] = (acc[group] || 0) + 1
        return acc
      }, {})

      // Check which groups have schedules
      const { data: schedules, error: schedulesError } = await supabase
        .from('schedule_versions')
        .select('diff_json')
        .eq('level', level)
        .order('created_at', { ascending: false })
        .limit(1)

      if (schedulesError) throw schedulesError

      const existingGroups = schedules && schedules.length > 0 
        ? Object.keys(schedules[0].diff_json?.groups || {}).map(g => g.replace('Group ', ''))
        : []

      // Build group statistics for A, B, C
      const groups = ['A', 'B', 'C'].map(letter => ({
        letter,
        studentCount: studentsByGroup[letter] || 0,
        hasSchedule: existingGroups.includes(letter)
      }))

      return { groups }
    } catch (error) {
      console.error('Error getting group statistics:', error)
      throw error
    }
  }

  /**
   * Generate schedule for specific groups of a level
   * Useful when new students are added to a group that didn't have a schedule before
   */
  static async generateGroupSchedules(level: number, groupLetters: string[]): Promise<GeneratedSchedule> {
    try {
      console.log(`🎯 Generating schedules for Level ${level}, Groups: ${groupLetters.join(', ')}`)
      
      // Generate schedule for specific groups
      const schedule = await this.generateLevelSchedule(level, groupLetters)
      
      return schedule
    } catch (error) {
      console.error(`Error generating group schedules for Level ${level}:`, error)
      throw error
    }
  }

  /**
   * Get all occupied time/room slots from ALL other levels
   * This ensures STRICT no-overlap between levels
   */
  private static async getAllOccupiedSlotsFromOtherLevels(
    currentLevel: number
  ): Promise<Array<{room: string, day: string, start: string, level: number, course: string}>> {
    try {
      const { data: schedules, error } = await supabase
        .from('schedule_versions')
        .select('level, diff_json')
        .neq('level', currentLevel)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error loading other level schedules:', error)
        return []
      }

      if (!schedules || schedules.length === 0) {
        console.log('🔒 No other level schedules found - first schedule being generated')
        return []
      }

      const occupiedSlots: Array<{room: string, day: string, start: string, level: number, course: string}> = []

      // Get the latest schedule for each level
      const latestSchedulesByLevel = new Map<number, any>()
      for (const schedule of schedules) {
        if (!latestSchedulesByLevel.has(schedule.level)) {
          latestSchedulesByLevel.set(schedule.level, schedule)
        }
      }

      // Extract all time/room slots from all groups in all levels
      for (const [levelNum, schedule] of latestSchedulesByLevel.entries()) {
        const groups = schedule.diff_json?.groups || {}
        
        for (const [groupName, groupData] of Object.entries(groups)) {
          const sections = (groupData as any).sections || []
          
          for (const section of sections) {
            occupiedSlots.push({
              room: section.room,
              day: section.day,
              start: section.start_time,
              level: levelNum,
              course: section.course_code
            })
          }
        }
      }

      console.log(`🔒 Found ${occupiedSlots.length} occupied slots from ${latestSchedulesByLevel.size} other levels`)
      return occupiedSlots
    } catch (error) {
      console.error('Error getting occupied slots:', error)
      return []
    }
  }

}