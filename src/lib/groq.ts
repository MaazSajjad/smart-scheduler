export interface ScheduleRecommendation {
  course_code: string
  section_label: string
  timeslot: {
    day: string
    start: string
    end: string
  }
  room: string
  allocated_student_ids: string[]
  justification: string
  confidence_score: number
}

export interface SchedulingConstraints {
  students_per_course: Record<string, number>
  blocked_slots: Array<{ day: string; start: string; end: string }>
  available_rooms: string[]
  rules: any[]
  objective_priorities: {
    minimize_conflicts: boolean
    minimize_gaps: boolean
    balance_instructor_loads: boolean
  }
}

export const getScheduleRecommendation = async (
  constraints: SchedulingConstraints,
  level: number
): Promise<ScheduleRecommendation[]> => {
  try {
    const response = await fetch('/api/generate-schedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ constraints, level }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.recommendations
  } catch (error) {
    console.error('Error getting schedule recommendation:', error)
    throw new Error('Failed to generate schedule recommendation')
  }
}

export const getConflictResolution = async (
  conflicts: any[],
  currentSchedule: any
): Promise<string> => {
  try {
    const response = await fetch('/api/resolve-conflicts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conflicts, currentSchedule }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.resolution || "No resolution suggestions available."
  } catch (error) {
    console.error('Error getting conflict resolution:', error)
    throw new Error('Failed to generate conflict resolution')
  }
}
