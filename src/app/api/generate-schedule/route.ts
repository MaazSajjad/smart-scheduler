import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
})

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

export async function POST(request: NextRequest) {
  try {
    const { constraints, level } = await request.json()

    if (!constraints || !level) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const prompt = `
You are an academic timetable optimizer. Generate a schedule for level ${level} students.

Constraints:
- Students per course: ${JSON.stringify(constraints.students_per_course)}
- Blocked slots: ${JSON.stringify(constraints.blocked_slots)}
- Available rooms: ${JSON.stringify(constraints.available_rooms)}
- Rules: ${JSON.stringify(constraints.rules)}
- Objectives: ${JSON.stringify(constraints.objective_priorities)}

Return a JSON array of sections with fields: course_code, section_label, timeslot (day, start, end), room, allocated_student_ids, justification, confidence_score.

Ensure no time conflicts, respect room capacities, and provide a short justification for each section.

Example response format:
[
  {
    "course_code": "CS301",
    "section_label": "A",
    "timeslot": {
      "day": "Monday",
      "start": "09:00",
      "end": "10:30"
    },
    "room": "A101",
    "allocated_student_ids": ["student1", "student2"],
    "justification": "Optimal time slot with no conflicts",
    "confidence_score": 0.95
  }
]
    `

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful academic scheduling assistant. Always return valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "openai/gpt-oss-20b",
      temperature: 0.3,
    })

    const content = completion.choices[0]?.message?.content || ""
    
    // Parse the JSON response
    const recommendations = JSON.parse(content) as ScheduleRecommendation[]
    
    return NextResponse.json({ recommendations })
  } catch (error) {
    console.error('Error generating schedule:', error)
    return NextResponse.json(
      { error: 'Failed to generate schedule recommendation' },
      { status: 500 }
    )
  }
}
