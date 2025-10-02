import { NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

/**
 * Generate email from student name
 */
function generateEmail(fullName: string, studentNumber: string): string {
  const cleanName = fullName.toLowerCase().trim()
  const nameParts = cleanName.split(' ')
  
  if (nameParts.length >= 2) {
    const firstName = nameParts[0].replace(/[^a-z]/g, '')
    const lastName = nameParts[nameParts.length - 1].replace(/[^a-z]/g, '')
    return `${firstName}.${lastName}@university.edu`
  }
  
  return `student${studentNumber}@university.edu`
}

/**
 * Generate random password
 */
function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let password = ''
  
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length)
    password += chars[randomIndex]
  }
  
  return password
}

/**
 * POST /api/admin/bulk-create-auth
 * Creates Supabase Auth accounts for all existing students without user_id
 */
export async function POST(request: Request) {
  try {
    console.log('🚀 Starting bulk auth account creation...')

    // Get all students without user_id (no auth account)
    const { data: students, error: fetchError } = await supabase
      .from('students')
      .select('id, full_name, student_number, level, student_group')
      .is('user_id', null)

    if (fetchError) {
      console.error('❌ Error fetching students:', fetchError)
      return NextResponse.json(
        { error: `Failed to fetch students: ${fetchError.message}` },
        { status: 500 }
      )
    }

    if (!students || students.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No students need auth accounts',
        count: 0,
        credentials: []
      })
    }

    console.log(`📊 Found ${students.length} students needing auth accounts`)

    const successful: any[] = []
    const failed: any[] = []

    // Process each student
    for (let i = 0; i < students.length; i++) {
      const student = students[i]
      const progress = `[${i + 1}/${students.length}]`

      try {
        console.log(`${progress} Processing: ${student.full_name} (${student.student_number})`)

        // Generate credentials
        const email = generateEmail(student.full_name, student.student_number)
        const password = generatePassword()

        // Create auth user using admin client
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true,
          user_metadata: {
            full_name: student.full_name,
            role: 'student'
          }
        })

        if (authError) {
          throw new Error(`Auth creation failed: ${authError.message}`)
        }

        if (!authData.user) {
          throw new Error('No user returned from auth creation')
        }

        console.log(`   ✅ Auth user created: ${authData.user.id}`)

        // Create user record in users table
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: email,
            role: 'student'
          })

        if (userError) {
          // User might already exist, log but continue
          console.log(`   ⚠️ User table entry: ${userError.message}`)
        }

        // Update student record with user_id and generated password
        const { error: updateError } = await supabase
          .from('students')
          .update({
            user_id: authData.user.id,
            generated_password: password,
            password_changed: false
          })
          .eq('id', student.id)

        if (updateError) {
          throw new Error(`Failed to update student record: ${updateError.message}`)
        }

        console.log(`   ✅ Student record updated`)

        successful.push({
          name: student.full_name,
          studentNumber: student.student_number,
          email: email,
          password: password,
          level: student.level,
          group: student.student_group
        })

      } catch (error: any) {
        console.error(`   ❌ Failed: ${error.message}`)
        failed.push({
          name: student.full_name,
          studentNumber: student.student_number,
          error: error.message
        })
      }
    }

    console.log(`\n✅ Completed: ${successful.length} successful, ${failed.length} failed`)

    return NextResponse.json({
      success: true,
      message: `Created ${successful.length} auth accounts`,
      count: successful.length,
      credentials: successful,
      failed: failed,
      summary: {
        total: students.length,
        successful: successful.length,
        failed: failed.length
      }
    })

  } catch (error: any) {
    console.error('❌ Fatal error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/bulk-create-auth
 * Check how many students need auth accounts
 */
export async function GET() {
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('id, full_name, student_number, level')
      .is('user_id', null)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      count: students?.length || 0,
      students: students || []
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

