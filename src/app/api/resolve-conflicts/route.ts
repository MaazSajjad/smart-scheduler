import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { conflicts, currentSchedule } = await request.json()

    if (!conflicts || !currentSchedule) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const prompt = `
Analyze these scheduling conflicts and suggest resolution strategies:

Conflicts: ${JSON.stringify(conflicts)}
Current Schedule: ${JSON.stringify(currentSchedule)}

Provide specific recommendations to resolve each conflict. Focus on practical solutions that minimize disruption to students and instructors.
    `

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a conflict resolution expert for academic scheduling. Provide clear, actionable recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "openai/gpt-oss-20b",
      temperature: 0.2,
    })

    const resolution = completion.choices[0]?.message?.content || "No resolution suggestions available."
    
    return NextResponse.json({ resolution })
  } catch (error) {
    console.error('Error resolving conflicts:', error)
    return NextResponse.json(
      { error: 'Failed to generate conflict resolution' },
      { status: 500 }
    )
  }
}
