'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { useAuth } from '@/contexts/AuthContext'
import { StudentScheduleService } from '@/lib/studentScheduleService'
import { generateTimetablePDF } from '@/lib/pdfGenerator'
import { TimetableView, CompactTimetableView } from '@/components/ui/TimetableView'
import { ScheduleCommentsPanel } from '@/components/ui/ScheduleCommentsPanel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar, 
  Clock, 
  User, 
  Download,
  Printer,
  AlertCircle,
  MessageSquare,
  BookOpen
} from 'lucide-react'

export default function StudentSchedulePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState<any>(null)
  const [scheduleEntries, setScheduleEntries] = useState<any[]>([])
  const [totalCredits, setTotalCredits] = useState(0)
  const [conflicts, setConflicts] = useState<string[]>([])
  const [error, setError] = useState('')
  const [scheduleVersionId, setScheduleVersionId] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) {
      loadStudentSchedule()
    }
  }, [user])

  const loadStudentSchedule = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError('')
      
      const { schedule, student: studentData, totalCredits: credits, scheduleVersionId: versionId } = await StudentScheduleService.getStudentSchedule(user.id)
      
      setStudent(studentData)
      setScheduleEntries(schedule)
      setTotalCredits(credits)
      setScheduleVersionId(versionId)

      // Check for conflicts
      const detectedConflicts = StudentScheduleService.detectConflicts(schedule)
      setConflicts(detectedConflicts)

      console.log('✅ Loaded schedule:', {
        courses: schedule.length,
        credits,
        conflicts: detectedConflicts.length
      })

    } catch (error: any) {
      console.error('Error loading schedule:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = () => {
    if (!student || scheduleEntries.length === 0) return

    const timetableEntries = scheduleEntries.map(entry => ({
      course_code: entry.course_code,
      course_title: entry.course_title,
      section_label: entry.section_label,
      timeslot: {
        day: entry.day,
        start: entry.start_time,
        end: entry.end_time
      },
      room: entry.room,
      instructor: entry.instructor
    }))

    generateTimetablePDF(timetableEntries, {
      name: student.full_name || user?.email || 'Student',
      level: student.level,
      studentNumber: student.student_number
    })
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Schedule</h1>
            {student && (
              <p className="text-gray-600">
                Level {student.level} • Group {student.student_group} • {totalCredits} Credits
              </p>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleDownloadPDF} disabled={loading || !student}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={loading}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Student Info Card */}
        {student && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{student.full_name}</h3>
                    <p className="text-sm text-gray-600">
                      {student.student_number} • Level {student.level} • Group {student.student_group}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total Courses</p>
                    <p className="text-2xl font-bold text-blue-600">{scheduleEntries.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total Credits</p>
                    <p className="text-2xl font-bold text-blue-600">{totalCredits}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Electives</p>
                    <p className="text-2xl font-bold text-green-600">
                      {scheduleEntries.filter(e => e.is_elective).length}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content - Schedule + Comments Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Schedule Section (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {loading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2">Loading schedule...</span>
                </CardContent>
              </Card>
            ) : scheduleEntries.length > 0 ? (
              <>
                <TimetableView
                  schedule={scheduleEntries.map(entry => ({
                    course_code: entry.course_code,
                    course_title: entry.course_title,
                    section_label: entry.section_label,
                    timeslot: {
                      day: entry.day,
                      start: entry.start_time,
                      end: entry.end_time
                    },
                    room: entry.room,
                    instructor_id: entry.instructor,
                    student_count: 25,
                    capacity: 30
                  }))}
                  title="My Weekly Schedule"
                  studentInfo={student ? {
                    name: student.full_name,
                    level: student.level,
                    studentNumber: student.student_number
                  } : undefined}
                />

                {/* Course List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Course Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {scheduleEntries.map((entry, index) => (
                        <div key={index} className="p-4 border rounded-lg flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{entry.course_code}</h4>
                              {entry.is_elective && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  Elective
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{entry.course_title}</p>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {entry.day} {entry.start_time}-{entry.end_time}
                              </span>
                              <span>Room: {entry.room}</span>
                              <span>Instructor: {entry.instructor}</span>
                            </div>
                          </div>
                          <Badge variant="outline">{entry.credits} Credits</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Schedule Available</h3>
                  <p className="text-gray-600 mb-4">
                    Your schedule hasn't been generated yet.
                  </p>
                  <Button variant="outline" onClick={() => window.location.href = '/student/electives'}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Select Electives
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Conflicts Alert */}
            {conflicts.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Schedule Conflicts Detected:</strong>
                  <ul className="mt-2 list-disc list-inside">
                    {conflicts.map((conflict, index) => (
                      <li key={index}>{conflict}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Comments Panel (1/3 width) */}
          <div className="lg:col-span-1">
            {student && scheduleVersionId && (
              <ScheduleCommentsPanel
                scheduleVersionId={scheduleVersionId}
              />
            )}
            {student && !scheduleVersionId && (
              <Card>
                <CardContent className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Comments Yet</h3>
                  <p className="text-gray-600 text-sm">
                    Comments will be available once your schedule is generated
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
