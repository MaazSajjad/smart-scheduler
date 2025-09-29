import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groqApiKey = process.env.GROQ_API_KEY

if (!groqApiKey) {
  console.error('GROQ_API_KEY is not set in environment variables')
}

const groq = new Groq({
  apiKey: groqApiKey!,
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

    // Ensure API key exists in production; return 500 if missing
    if (!groqApiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 })
    }

    const prompt = `
You are an academic timetable optimizer. Generate a schedule for level ${level} students.

CRITICAL CONSTRAINTS:
- NO CLASSES BEFORE 12:00 PM (afternoon only: 12:00-17:00)
- NO CLASSES ON FRIDAY (Monday-Thursday only)
- Available days: Monday, Tuesday, Wednesday, Thursday only
- Available time slots: 12:00-17:00 (afternoon only)
- Each section should have 20-25 students maximum
- NO DUPLICATE COURSES in the same schedule

Course Requirements:
- Students per course: ${JSON.stringify(constraints.students_per_course)}
- Available rooms: ${JSON.stringify(constraints.available_rooms)}
- Rules: ${JSON.stringify(constraints.rules)}

Generate sections for FLEXIBLE courses only (fixed courses are handled separately).
Focus on courses that are NOT fixed/required.

Return a JSON array of sections with fields: course_code, section_label, timeslot (day, start, end), room, allocated_student_ids, justification, confidence_score.

Example response format:
[
  {
    "course_code": "CS2EL1",
    "section_label": "A",
    "timeslot": {
      "day": "Monday",
      "start": "12:00",
      "end": "13:30"
    },
    "room": "A101",
    "allocated_student_ids": ["student1", "student2", "student3"],
    "justification": "Afternoon slot avoiding morning constraint",
    "confidence_score": 0.95
  }
]

IMPORTANT: 
- Only return flexible/elective courses
- Do NOT include fixed courses like CS101, MATH101, ENG101
- ALL classes must be scheduled AFTER 12:00 PM
- NO duplicates of the same course code
    `

    console.log('Sending request to Groq with constraints:', constraints)
    
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
      model: "llama-3.1-8b-instant", // Using a working model
      temperature: 0.3,
    })

    console.log('Groq response received:', completion)

    const content = completion.choices[0]?.message?.content || ""
    console.log('Groq content:', content)
    
    // Parse the JSON response
    let recommendations: ScheduleRecommendation[]
    try {
      recommendations = JSON.parse(content) as ScheduleRecommendation[]
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Raw content:', content)
      // Return empty array if parsing fails
      recommendations = []
    }
    
    return NextResponse.json({ recommendations })
  } catch (error) {
    console.error('Error generating schedule:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to generate schedule recommendation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
