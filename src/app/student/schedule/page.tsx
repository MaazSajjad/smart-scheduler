'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Download,
  Printer,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

export default function StudentSchedulePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [schedule, setSchedule] = useState({
    student: {
      name: "John Doe",
      studentNumber: "2024001",
      level: 3,
      semester: "Fall 2024"
    },
    courses: [
      {
        code: "CS301",
        title: "Algorithms",
        section: "A",
        instructor: "Dr. Smith",
        time: "Monday, Wednesday",
        startTime: "09:00",
        endTime: "10:30",
        room: "A101",
        credits: 3,
        status: "active"
      },
      {
        code: "CS302",
        title: "Database Systems",
        section: "B",
        instructor: "Dr. Johnson",
        time: "Tuesday, Thursday",
        startTime: "14:00",
        endTime: "15:30",
        room: "B205",
        credits: 3,
        status: "active"
      },
      {
        code: "CS303",
        title: "Software Engineering",
        section: "A",
        instructor: "Dr. Williams",
        time: "Monday, Wednesday",
        startTime: "16:00",
        endTime: "17:30",
        room: "C301",
        credits: 3,
        status: "active"
      },
      {
        code: "MATH301",
        title: "Discrete Mathematics",
        section: "A",
        instructor: "Dr. Brown",
        time: "Tuesday, Thursday",
        startTime: "10:00",
        endTime: "11:30",
        room: "D101",
        credits: 3,
        status: "active"
      }
    ],
    conflicts: [],
    totalCredits: 12
  })

  const timeSlots = [
    { time: "08:00", label: "8:00 AM" },
    { time: "09:00", label: "9:00 AM" },
    { time: "10:00", label: "10:00 AM" },
    { time: "11:00", label: "11:00 AM" },
    { time: "12:00", label: "12:00 PM" },
    { time: "13:00", label: "1:00 PM" },
    { time: "14:00", label: "2:00 PM" },
    { time: "15:00", label: "3:00 PM" },
    { time: "16:00", label: "4:00 PM" },
    { time: "17:00", label: "5:00 PM" },
    { time: "18:00", label: "6:00 PM" }
  ]

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

  useEffect(() => {
    loadStudentSchedule()
  }, [user])

  const loadStudentSchedule = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      
      // Get student info
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (studentError) {
        console.error('Error loading student:', studentError)
        return
      }

      if (student) {
        console.log('Student found:', student)
        
        // Update student info in schedule
        setSchedule(prev => ({
          ...prev,
          student: {
            ...prev.student,
            name: user.email || "Student",
            studentNumber: student.student_number,
            level: student.level
          }
        }))

        // Get student's enrolled courses with better error handling
        const { data: enrollments, error: enrollmentError } = await supabase
          .from('enrollments')
          .select(`
            *,
            sections(
              *,
              courses(*)
            )
          `)
          .eq('student_id', student.id)

        if (enrollmentError) {
          console.error('Error loading enrollments:', enrollmentError)
          return
        }

        console.log('Enrollments found:', enrollments)

        if (enrollments && enrollments.length > 0) {
          // Get timeslots separately since the relationship might not work
          const { data: timeslots, error: timeslotError } = await supabase
            .from('timeslots')
            .select('*')

          if (timeslotError) {
            console.error('Error loading timeslots:', timeslotError)
          }

          const courses = enrollments.map(enrollment => {
            const section = enrollment.sections
            const course = section.courses
            
            // Find timeslot for this section
            const timeslot = timeslots?.find(ts => ts.section_id === section.id)
            
            return {
              code: course.code,
              title: course.title,
              section: section.label,
              instructor: section.instructor || "TBA",
              time: timeslot ? `${timeslot.day}` : "TBA",
              startTime: timeslot ? timeslot.start_time : "TBA",
              endTime: timeslot ? timeslot.end_time : "TBA",
              room: section.room || "TBA",
              credits: course.credits || 3,
              status: "active"
            }
          })

          console.log('Processed courses:', courses)

          setSchedule(prev => ({
            ...prev,
            courses,
            totalCredits: courses.reduce((sum, course) => sum + course.credits, 0)
          }))
        } else {
          console.log('No enrollments found for student')
          // Show message that no courses are enrolled
          setSchedule(prev => ({
            ...prev,
            courses: [],
            totalCredits: 0
          }))
        }
      }
    } catch (error) {
      console.error('Error loading schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCourseAtTime = (day: string, time: string) => {
    return schedule.courses.find(course => 
      course.time.includes(day) && 
      course.startTime === time
    )
  }

  const handleDownloadPDF = () => {
    // Create a simple PDF-like download
    const scheduleData = {
      student: schedule.student,
      courses: schedule.courses,
      totalCredits: schedule.totalCredits,
      generatedAt: new Date().toISOString()
    }
    
    const dataStr = JSON.stringify(scheduleData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `schedule-${schedule.student.studentNumber}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleViewFullCalendar = () => {
    // For now, just show an alert. In a real app, this would open a calendar view
    alert('Full calendar view would open here. This feature can be implemented with a calendar library like FullCalendar.')
  }

  const handleExportSchedule = () => {
    handleDownloadPDF()
  }

  const handleReportIssue = () => {
    // For now, just show an alert. In a real app, this would open a feedback form
    alert('Issue reporting form would open here. This feature can be implemented with a feedback system.')
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Schedule</h1>
            <p className="text-gray-600">{schedule.student.semester} • Level {schedule.student.level}</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleDownloadPDF} disabled={loading}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={loading}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        {/* Student Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{schedule.student.name}</h3>
                  <p className="text-sm text-gray-600">Student #{schedule.student.studentNumber}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Credits</p>
                <p className="text-2xl font-bold text-blue-600">{schedule.totalCredits}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Schedule</CardTitle>
            <CardDescription>Your class timetable for this semester</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Loading schedule...</span>
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="w-20 p-2 text-left text-sm font-medium text-gray-600">Time</th>
                    {days.map(day => (
                      <th key={day} className="p-2 text-center text-sm font-medium text-gray-600 min-w-32">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map(slot => (
                    <tr key={slot.time} className="border-t">
                      <td className="p-2 text-sm text-gray-600">{slot.label}</td>
                      {days.map(day => {
                        const course = getCourseAtTime(day, slot.time)
                        return (
                          <td key={`${day}-${slot.time}`} className="p-1">
                            {course ? (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs">
                                <div className="font-medium text-blue-900">{course.code}</div>
                                <div className="text-blue-700">{course.title}</div>
                                <div className="text-blue-600">{course.section}</div>
                                <div className="flex items-center mt-1">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {course.room}
                                </div>
                                <div className="flex items-center">
                                  <User className="h-3 w-3 mr-1" />
                                  {course.instructor}
                                </div>
                              </div>
                            ) : (
                              <div className="h-16"></div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Course List */}
        <Card>
          <CardHeader>
            <CardTitle>Course Details</CardTitle>
            <CardDescription>Detailed information about your enrolled courses</CardDescription>
          </CardHeader>
          <CardContent>
            {schedule.courses.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Courses Enrolled</h3>
                <p className="text-gray-600">You haven't been enrolled in any courses yet. Please contact your academic advisor.</p>
              </div>
            ) : (
            <div className="space-y-4">
              {schedule.courses.map((course, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium">{course.code} - {course.title}</h4>
                      <Badge variant="secondary">Section {course.section}</Badge>
                      <Badge variant="outline">{course.credits} credits</Badge>
                    </div>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {course.time} {course.startTime} - {course.endTime}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {course.room}
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {course.instructor}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              ))}
            </div>
            )}
          </CardContent>
        </Card>

        {/* Conflicts Alert */}
        {schedule.conflicts.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h4 className="font-medium text-red-900">Schedule Conflicts Detected</h4>
              </div>
              <p className="text-sm text-red-700 mt-1">
                Please contact your academic advisor to resolve these conflicts.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-20 flex-col" onClick={handleViewFullCalendar}>
                <Calendar className="h-6 w-6 mb-2" />
                View Full Calendar
              </Button>
              <Button variant="outline" className="h-20 flex-col" onClick={handleExportSchedule}>
                <Download className="h-6 w-6 mb-2" />
                Export Schedule
              </Button>
              <Button variant="outline" className="h-20 flex-col" onClick={handleReportIssue}>
                <AlertCircle className="h-6 w-6 mb-2" />
                Report Issue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
