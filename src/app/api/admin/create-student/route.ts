import { NextResponse } from 'next/server'
import { PasswordService } from '@/lib/passwordService'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fullName, studentNumber, level, contact } = body

    if (!fullName || !studentNumber || !level) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const credentials = await PasswordService.createStudentWithCredentials(
      fullName,
      studentNumber,
      parseInt(level),
      contact
    )

    return NextResponse.json(credentials)
  } catch (error: any) {
    console.error('Error creating student:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

