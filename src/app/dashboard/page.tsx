'use client'

import { useAuth } from '@/contexts/AuthContext'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { 
  Calendar, 
  Users, 
  BookOpen, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  BarChart3,
  PlusCircle,
  Edit3,
  Eye,
  MessageSquare,
  Settings,
  GraduationCap,
  FileText,
  Download
} from 'lucide-react'

export default function DashboardPage() {
  const { user, userRole } = useAuth()
  const router = useRouter()

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  const handleDownloadSchedule = () => {
    // Mock download functionality
    const scheduleData = {
      student: user?.email,
      schedule: "Sample schedule data",
      timestamp: new Date().toISOString()
    }
    
    const dataStr = JSON.stringify(scheduleData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'my-schedule.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleViewSchedule = () => {
    router.push('/student/schedule')
  }

  const handleSubmitElectives = () => {
    router.push('/student/electives')
  }

  const getDashboardContent = () => {
    switch (userRole) {
      case 'student':
        return (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
                <p className="text-gray-600">Manage your academic schedule and preferences</p>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                <GraduationCap className="w-4 h-4 mr-1" />
                Student
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">My Schedule</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Current Term</div>
                  <p className="text-xs text-muted-foreground">
                    View your timetable and course schedule
                  </p>
                  <Button 
                    className="mt-4 w-full" 
                    variant="outline"
                    onClick={handleViewSchedule}
                  >
                    View Schedule
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Elective Preferences</CardTitle>
                  <PlusCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3 Selected</div>
                  <p className="text-xs text-muted-foreground">
                    Submit your elective course preferences
                  </p>
                  <Button 
                    className="mt-4 w-full" 
                    variant="outline"
                    onClick={handleSubmitElectives}
                  >
                    Manage Electives
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Exam Schedule</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Upcoming</div>
                  <p className="text-xs text-muted-foreground">
                    View your exam timetable
                  </p>
                  <Button 
                    className="mt-4 w-full" 
                    variant="outline"
                    onClick={() => handleNavigation('/student/exams')}
                  >
                    View Exams
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your latest schedule updates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Elective preferences submitted</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Schedule conflict detected</p>
                      <p className="text-xs text-muted-foreground">1 day ago</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks and shortcuts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={handleViewSchedule}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    View Full Schedule
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={handleSubmitElectives}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Submit Elective Preferences
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={handleDownloadSchedule}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Schedule PDF
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      
      case 'faculty':
        return (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Faculty Dashboard</h1>
                <p className="text-gray-600">Manage your teaching schedule and student interactions</p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <BookOpen className="w-4 h-4 mr-1" />
                Faculty
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">127</div>
                  <p className="text-xs text-muted-foreground">Across all courses</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">4</div>
                  <p className="text-xs text-muted-foreground">This semester</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Teaching Hours</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">18</div>
                  <p className="text-xs text-muted-foreground">Per week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Feedback</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <p className="text-xs text-muted-foreground">Schedule reviews</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>My Schedule</CardTitle>
                  <CardDescription>Your teaching timetable for this week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Data Structures</p>
                        <p className="text-sm text-gray-600">Monday, 9:00 AM - 10:30 AM</p>
                      </div>
                      <Badge variant="secondary">Room A101</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Algorithms</p>
                        <p className="text-sm text-gray-600">Wednesday, 2:00 PM - 3:30 PM</p>
                      </div>
                      <Badge variant="secondary">Room B205</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common faculty tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => handleNavigation('/faculty/schedule')}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    View Full Schedule
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => handleNavigation('/faculty/students')}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    View Student Lists
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => handleNavigation('/faculty/feedback')}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Provide Feedback
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      
      case 'scheduling_committee':
        return (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Scheduling Committee Dashboard</h1>
                <p className="text-gray-600">Manage and generate academic schedules</p>
              </div>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                <Calendar className="w-4 h-4 mr-1" />
                Scheduling Committee
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Schedules</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <p className="text-xs text-muted-foreground">This semester</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,247</div>
                  <p className="text-xs text-muted-foreground">Across all levels</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Courses</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">89</div>
                  <p className="text-xs text-muted-foreground">Available courses</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conflicts</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">Require attention</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PlusCircle className="mr-2 h-5 w-5 text-blue-600" />
                    Generate Schedule
                  </CardTitle>
                  <CardDescription>Create new schedules using AI assistance</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Use AI-powered algorithms to generate optimal schedules for any level.
                  </p>
                  <Button 
                    className="w-full"
                    onClick={() => handleNavigation('/committee/generate')}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Generate New Schedule
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Edit3 className="mr-2 h-5 w-5 text-green-600" />
                    Edit Schedule
                  </CardTitle>
                  <CardDescription>Collaboratively edit and refine schedules</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Real-time collaborative editing with your team members.
                  </p>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => handleNavigation('/committee/edit')}
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    Open Editor
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="mr-2 h-5 w-5 text-purple-600" />
                    Manage Rules
                  </CardTitle>
                  <CardDescription>Configure scheduling constraints and rules</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Set up rules, constraints, and preferences for scheduling.
                  </p>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => handleNavigation('/committee/rules')}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Configure Rules
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Schedules</CardTitle>
                  <CardDescription>Latest schedule activities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Level 3 Schedule</p>
                      <p className="text-sm text-gray-600">Updated 2 hours ago</p>
                    </div>
                    <Badge variant="secondary">Draft</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Level 2 Schedule</p>
                      <p className="text-sm text-gray-600">Approved yesterday</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Approved</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common committee tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => handleNavigation('/committee/courses')}
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Manage Courses
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => handleNavigation('/committee/students')}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Student Management
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => handleNavigation('/committee/analytics')}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      
      case 'teaching_load_committee':
        return (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Teaching Load Committee Dashboard</h1>
                <p className="text-gray-600">Review schedules and monitor instructor workloads</p>
              </div>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                <Users className="w-4 h-4 mr-1" />
                Teaching Load Committee
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">5</div>
                  <p className="text-xs text-muted-foreground">Awaiting review</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Instructors</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">47</div>
                  <p className="text-xs text-muted-foreground">Active faculty</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overloaded</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <p className="text-xs text-muted-foreground">Need attention</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Load</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">18.5</div>
                  <p className="text-xs text-muted-foreground">Hours per week</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Review Schedules</CardTitle>
                  <CardDescription>Review and comment on proposed schedules</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Level 3 Schedule</p>
                        <p className="text-sm text-gray-600">Submitted by John Doe</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleNavigation('/committee/review')}
                      >
                        Review
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Level 2 Schedule</p>
                        <p className="text-sm text-gray-600">Submitted by Jane Smith</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleNavigation('/committee/review')}
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Instructor Loads</CardTitle>
                  <CardDescription>Monitor and balance instructor workloads</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Dr. Johnson</p>
                        <p className="text-sm text-gray-600">22 hours/week</p>
                      </div>
                      <Badge variant="destructive">Overloaded</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Dr. Williams</p>
                        <p className="text-sm text-gray-600">18 hours/week</p>
                      </div>
                      <Badge variant="secondary">Normal</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      
      default:
        return (
          <div className="p-6 space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900">Welcome</h1>
              <p className="text-gray-600">Your role is being determined...</p>
            </div>
          </div>
        )
    }
  }

  return (
    <MainLayout>
      {getDashboardContent()}
    </MainLayout>
  )
}
