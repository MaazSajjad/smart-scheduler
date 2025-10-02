/**
 * CREATE AUTH USERS FOR STUDENTS
 * ================================
 * This script creates Supabase auth users for all students
 * Run with: node create-auth-users.js
 * 
 * Prerequisites:
 * 1. npm install @supabase/supabase-js
 * 2. Set your Supabase credentials below
 * 3. Run seed-complete-dataset.sql first
 */

const { createClient } = require('@supabase/supabase-js')

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================
const SUPABASE_URL = 'YOUR_SUPABASE_URL' // e.g., 'https://xxx.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY' // NOT anon key!

// Initialize Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// ============================================
// STUDENT CREDENTIALS
// ============================================
const students = [
  // Level 1 Students (30)
  ...Array.from({ length: 30 }, (_, i) => ({
    email: `student${i + 1}@university.edu`,
    password: `Pass${i + 1}!L1`,
    level: 1
  })),
  
  // Level 2 Students (28)
  ...Array.from({ length: 28 }, (_, i) => ({
    email: `student${i + 31}@university.edu`,
    password: `Pass${i + 31}!L2`,
    level: 2
  })),
  
  // Level 3 Students (26)
  ...Array.from({ length: 26 }, (_, i) => ({
    email: `student${i + 59}@university.edu`,
    password: `Pass${i + 59}!L3`,
    level: 3
  })),
  
  // Level 4 Students (24)
  ...Array.from({ length: 24 }, (_, i) => ({
    email: `student${i + 85}@university.edu`,
    password: `Pass${i + 85}!L4`,
    level: 4
  }))
]

// ============================================
// CREATE AUTH USERS
// ============================================
async function createAuthUsers() {
  console.log('🚀 Starting auth user creation...')
  console.log(`📊 Total students to create: ${students.length}`)
  console.log('')
  
  let successCount = 0
  let errorCount = 0
  const errors = []

  for (const student of students) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: student.email,
        password: student.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          level: student.level
        }
      })

      if (authError) {
        console.error(`❌ Failed to create ${student.email}: ${authError.message}`)
        errorCount++
        errors.push({ email: student.email, error: authError.message })
        continue
      }

      console.log(`✅ Created auth user: ${student.email}`)

      // Update students table with correct user_id
      const { error: updateError } = await supabase
        .from('students')
        .update({ user_id: authData.user.id })
        .eq('email', student.email)

      if (updateError) {
        console.warn(`⚠️  Auth user created but failed to update students table for ${student.email}`)
        console.warn(`   Manual fix needed: UPDATE students SET user_id = '${authData.user.id}' WHERE email = '${student.email}'`)
      }

      successCount++
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error) {
      console.error(`❌ Unexpected error for ${student.email}:`, error.message)
      errorCount++
      errors.push({ email: student.email, error: error.message })
    }
  }

  console.log('')
  console.log('╔════════════════════════════════════════╗')
  console.log('║       AUTH USER CREATION COMPLETE       ║')
  console.log('╚════════════════════════════════════════╝')
  console.log('')
  console.log(`✅ Success: ${successCount} users`)
  console.log(`❌ Errors: ${errorCount} users`)
  console.log('')

  if (errors.length > 0) {
    console.log('❌ Failed users:')
    errors.forEach(({ email, error }) => {
      console.log(`   - ${email}: ${error}`)
    })
  }

  console.log('')
  console.log('📝 Next steps:')
  console.log('1. Test login with: student1@university.edu / Pass1!L1')
  console.log('2. Verify users in Supabase Dashboard → Authentication')
  console.log('3. Check students table has user_id populated')
  console.log('')
}

// ============================================
// VERIFY SETUP
// ============================================
async function verifySetup() {
  console.log('🔍 Verifying database setup...')
  
  // Check if students exist
  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .select('count')
    .limit(1)

  if (studentError) {
    console.error('❌ Cannot access students table. Did you run seed-complete-dataset.sql?')
    console.error('   Error:', studentError.message)
    return false
  }

  const { count } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })

  console.log(`✅ Found ${count} students in database`)

  if (count === 0) {
    console.error('❌ No students found. Please run seed-complete-dataset.sql first')
    return false
  }

  return true
}

// ============================================
// MAIN EXECUTION
// ============================================
async function main() {
  console.log('╔════════════════════════════════════════╗')
  console.log('║   SUPABASE AUTH USER CREATOR           ║')
  console.log('║   Smart Scheduler System               ║')
  console.log('╚════════════════════════════════════════╝')
  console.log('')

  // Verify configuration
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY') {
    console.error('❌ Please update SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the script')
    console.log('')
    console.log('📝 How to find your credentials:')
    console.log('1. Go to Supabase Dashboard')
    console.log('2. Select your project')
    console.log('3. Go to Settings → API')
    console.log('4. Copy:')
    console.log('   - Project URL → SUPABASE_URL')
    console.log('   - service_role key → SUPABASE_SERVICE_ROLE_KEY')
    console.log('')
    console.log('⚠️  IMPORTANT: Use service_role key, NOT anon key!')
    process.exit(1)
  }

  // Verify database setup
  const setupOk = await verifySetup()
  if (!setupOk) {
    process.exit(1)
  }

  console.log('')
  console.log('⚠️  WARNING: This will create 108 auth users')
  console.log('   Continue? Press Ctrl+C to cancel, or wait 5 seconds...')
  console.log('')

  await new Promise(resolve => setTimeout(resolve, 5000))

  // Create auth users
  await createAuthUsers()
}

// Run the script
main().catch(error => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})

// ============================================
// MANUAL ALTERNATIVE
// ============================================
/*
If you prefer to create users manually via Supabase Dashboard:

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User"
3. Use these credentials:

Level 1 Sample:
  Email: student1@university.edu
  Password: Pass1!L1

Level 2 Sample:
  Email: student31@university.edu
  Password: Pass31!L2

Level 3 Sample:
  Email: student59@university.edu
  Password: Pass59!L3

Level 4 Sample:
  Email: student85@university.edu
  Password: Pass85!L4

4. After creating each user, update students table:
   UPDATE students 
   SET user_id = 'auth-user-id-from-dashboard' 
   WHERE email = 'student-email';

Full credentials list in: student-credentials-export.sql
*/

