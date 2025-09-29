'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CourseService } from '@/lib/courseService'
import { supabase } from '@/lib/supabase'
import { Course } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Star,
  Clock,
  Users
} from 'lucide-react'

interface ElectiveChoice {
  id: string
  course_id: string
  preference_rank: number
  course: Course
}

export default function ElectivePreferencesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedElectives, setSelectedElectives] = useState<ElectiveChoice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load available elective courses (assuming level 3 for demo)
      const allCourses = await CourseService.getAllCourses()
      const electiveCourses = allCourses.filter(course => 
        course.level === 3 && !course.is_fixed
      )
      setCourses(electiveCourses)

      // Load existing preferences
      if (user?.id) {
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (student) {
          const { data: preferences } = await supabase
            .from('elective_choices')
            .select(`
              *,
              courses(*)
            `)
            .eq('student_id', student.id)
            .order('preference_rank')

          if (preferences) {
            setSelectedElectives(preferences.map(p => ({
              id: p.id,
              course_id: p.course_id,
              preference_rank: p.preference_rank,
              course: p.courses
            })))
          }
        }
      }
    } catch (error: any) {
      setError('Failed to load data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const addElective = (course: Course) => {
    if (selectedElectives.length >= 5) {
      setError('You can select a maximum of 5 elective courses')
      return
    }

    if (selectedElectives.some(e => e.course_id === course.id)) {
      setError('This course is already selected')
      return
    }

    const newRank = selectedElectives.length + 1
    const newElective: ElectiveChoice = {
      id: `temp-${Date.now()}`,
      course_id: course.id,
      preference_rank: newRank,
      course
    }

    setSelectedElectives([...selectedElectives, newElective])
    setError('')
  }

  const removeElective = (courseId: string) => {
    const updated = selectedElectives
      .filter(e => e.course_id !== courseId)
      .map((e, index) => ({ ...e, preference_rank: index + 1 }))
    
    setSelectedElectives(updated)
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    
    const updated = [...selectedElectives]
    const temp = updated[index]
    updated[index] = updated[index - 1]
    updated[index - 1] = temp
    
    // Update ranks
    updated.forEach((e, i) => {
      e.preference_rank = i + 1
    })
    
    setSelectedElectives(updated)
  }

  const moveDown = (index: number) => {
    if (index === selectedElectives.length - 1) return
    
    const updated = [...selectedElectives]
    const temp = updated[index]
    updated[index] = updated[index + 1]
    updated[index + 1] = temp
    
    // Update ranks
    updated.forEach((e, i) => {
      e.preference_rank = i + 1
    })
    
    setSelectedElectives(updated)
  }

  const savePreferences = async () => {
    if (!user?.id) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      // Get student ID
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!student) {
        throw new Error('Student record not found')
      }

      // Delete existing preferences
      await supabase
        .from('elective_choices')
        .delete()
        .eq('student_id', student.id)

      // Insert new preferences
      const preferences = selectedElectives.map(e => ({
        student_id: student.id,
        course_id: e.course_id,
        preference_rank: e.preference_rank
      }))

      const { error } = await supabase
        .from('elective_choices')
        .insert(preferences)

      if (error) throw error

      setSuccess('Elective preferences saved successfully!')
    } catch (error: any) {
      setError('Failed to save preferences: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Elective Preferences</h1>
            <p className="text-gray-600">Select and rank your preferred elective courses</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Selected: {selectedElectives.length}/5</p>
            <p className="text-xs text-gray-500">Rank your preferences from 1 (highest) to 5 (lowest)</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Courses */}
          <Card>
            <CardHeader>
              <CardTitle>Available Elective Courses</CardTitle>
              <CardDescription>Click to add courses to your preferences</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading courses...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedElectives.some(e => e.course_id === course.id)
                          ? 'border-green-200 bg-green-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                      onClick={() => addElective(course)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{course.code} - {course.title}</h4>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {course.typical_duration} min
                            </div>
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              Level {course.level}
                            </div>
                          </div>
                        </div>
                        {selectedElectives.some(e => e.course_id === course.id) ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Plus className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Your Preferences</CardTitle>
              <CardDescription>Drag to reorder or remove courses</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedElectives.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No courses selected yet</p>
                  <p className="text-sm">Choose courses from the left panel</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedElectives.map((elective, index) => (
                    <div key={elective.id} className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex flex-col space-y-1">
                            <button
                              onClick={() => moveUp(index)}
                              disabled={index === 0}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveDown(index)}
                              disabled={index === selectedElectives.length - 1}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              ↓
                            </button>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary">#{elective.preference_rank}</Badge>
                              <h4 className="font-medium">{elective.course.code}</h4>
                            </div>
                            <p className="text-sm text-gray-600">{elective.course.title}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeElective(elective.course_id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedElectives.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <Button 
                    onClick={savePreferences} 
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving Preferences...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Save Preferences
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start space-x-2">
                <Star className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-medium">Rank Your Preferences</p>
                  <p className="text-gray-600">Use the up/down arrows to rank courses from 1 (highest preference) to 5 (lowest preference)</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <BookOpen className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">Select Up to 5 Courses</p>
                  <p className="text-gray-600">Choose from available elective courses for your academic level</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Save Your Choices</p>
                  <p className="text-gray-600">Remember to save your preferences before the deadline</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
