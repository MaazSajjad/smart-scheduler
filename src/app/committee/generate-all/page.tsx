'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Calendar, 
  Clock, 
  Building, 
  Users, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  Eye,
  RefreshCw,
  BookOpen,
  Zap,
  Brain
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { GenerateAllSchedulesService, GeneratedSchedule } from '@/lib/generateAllSchedulesService'

export default function GenerateAllSchedulesPage() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingLevel, setGeneratingLevel] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [generatedSchedules, setGeneratedSchedules] = useState<GeneratedSchedule[]>([])
  const [coursesCount, setCoursesCount] = useState(0)
  const [studentsCount, setStudentsCount] = useState(0)
  const [levelsAvailable, setLevelsAvailable] = useState<number[]>([])

  useEffect(() => {
    loadDataSummary()
  }, [])

  const loadDataSummary = async () => {
    try {
      const { count: coursesC } = await supabase.from('courses').select('*', { count: 'exact' })
      setCoursesCount(coursesC || 0)

      const { count: studentsC } = await supabase.from('students').select('*', { count: 'exact' })
      setStudentsCount(studentsC || 0)

      const { data: levels, error: levelsError } = await supabase
        .from('courses')
        .select('level')
        .order('level', { ascending: true })

      if (levelsError) throw levelsError
      
      // Get unique levels
      const uniqueLevels = [...new Set(levels?.map((l: any) => l.level) || [])]
      setLevelsAvailable(uniqueLevels)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const generateLevelSchedule = async (level: number) => {
    try {
      setIsGenerating(true)
      setGeneratingLevel(level)
      setError('')
      setSuccess('')
      setProgress(0)

      console.log(`🤖 Starting AI generation for Level ${level}...`)
      
      // Generate schedule for specific level using AI
      const schedule = await GenerateAllSchedulesService.generateLevelSchedule(level)
      
      setProgress(100)
      setGeneratedSchedules(prev => {
        const filtered = prev.filter(s => s.level !== level)
        return [...filtered, schedule]
      })
      
      setSuccess(`✅ Successfully generated AI-powered schedule for Level ${level}!`)
      
      // Save to database
      await GenerateAllSchedulesService.saveSchedulesToDatabase([schedule])

    } catch (error: any) {
      setError(`❌ Failed to generate schedule for Level ${level}: ${error.message}`)
    } finally {
      setIsGenerating(false)
      setGeneratingLevel(null)
    }
  }

  const generateAllSchedules = async () => {
    try {
      setIsGenerating(true)
      setError('')
      setSuccess('')
      setProgress(0)
      setGeneratedSchedules([])

      console.log('🤖 Starting AI generation for all levels...')
      
      // Generate schedules for all levels using AI
      const allSchedules = await GenerateAllSchedulesService.generateAllLevels()
      
      setProgress(100)
      setGeneratedSchedules(allSchedules)
      setSuccess(`✅ Successfully generated AI-powered schedules for all levels! Total: ${allSchedules.length} levels`)
      
      // Save to database
      await GenerateAllSchedulesService.saveSchedulesToDatabase(allSchedules)

    } catch (error: any) {
      setError('❌ Failed to generate schedules: ' + error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadSchedule = (schedule: GeneratedSchedule) => {
    const data = {
      level: schedule.level,
      semester: schedule.semester,
      groups: schedule.groups,
      total_sections: schedule.total_sections,
      conflicts: schedule.conflicts,
      efficiency: schedule.efficiency,
      generated_at: schedule.generated_at
    }
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`
    const link = document.createElement('a')
    link.href = jsonString
    link.download = `ai_schedule_level_${schedule.level}_${schedule.semester}.json`
    link.click()
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Brain className="h-8 w-8 text-blue-600" />
              AI-Powered Schedule Generation
            </h1>
            <p className="text-gray-600">Generate intelligent schedules for each level using AI recommendations.</p>
          </div>
          <Button
            onClick={generateAllSchedules}
            disabled={isGenerating || levelsAvailable.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {isGenerating ? 'Generating All...' : 'Generate All Levels'}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200 text-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Data Summary</CardTitle>
            <CardDescription>Overview of available data for AI scheduling.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-gray-500" />
              <p>Courses: <span className="font-semibold">{coursesCount}</span></p>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-gray-500" />
              <p>Students: <span className="font-semibold">{studentsCount}</span></p>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <p>Levels: <span className="font-semibold">{levelsAvailable.join(', ')}</span></p>
            </div>
          </CardContent>
        </Card>

        {/* Individual Level Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Generate Individual Level Schedules
            </CardTitle>
            <CardDescription>
              Generate AI-powered schedules for specific levels. Each level will be optimized independently.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {levelsAvailable.map((level) => (
                <div key={level} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Level {level}</h3>
                    <Badge variant="outline">AI-Powered</Badge>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <BookOpen className="h-4 w-4 mr-2" />
                      {coursesCount} courses
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="h-4 w-4 mr-2" />
                      {studentsCount} students
                    </div>
                  </div>

                  <Button
                    onClick={() => generateLevelSchedule(level)}
                    disabled={isGenerating}
                    className="w-full"
                    variant={generatingLevel === level ? "secondary" : "default"}
                  >
                    {generatingLevel === level ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Generate Level {level}
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {isGenerating && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Progress: {progress}%</p>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-gray-500">
              {generatingLevel ? `Generating Level ${generatingLevel}...` : 'Generating all levels...'}
            </p>
          </div>
        )}

        {generatedSchedules.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Generated AI Schedules</h2>
            {generatedSchedules.map((schedule, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-xl font-medium">
                      Level {schedule.level} - {schedule.semester}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {schedule.total_sections} Sections
                      </Badge>
                      <Badge variant={schedule.conflicts === 0 ? "default" : "destructive"}>
                        {schedule.conflicts} Conflicts
                      </Badge>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {schedule.efficiency}% Efficiency
                      </Badge>
                      <Badge variant="secondary" className="bg-purple-50 text-purple-700">
                        AI-Generated
                      </Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => downloadSchedule(schedule)}>
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                </CardHeader>
                <CardContent>
                  {Object.entries(schedule.groups).map(([groupName, groupData]) => (
                    <div key={groupName} className="mb-4">
                      <h3 className="text-lg font-semibold mb-2">{groupName} ({groupData.student_count} students)</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {groupData.sections.map((section, secIndex) => (
                              <tr key={secIndex}>
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{section.day}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{section.start_time}-{section.end_time}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{section.course_code} ({section.section_label})</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{section.room}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{section.student_count}/{section.capacity}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}