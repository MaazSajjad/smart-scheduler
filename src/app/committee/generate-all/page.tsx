'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Brain,
  Plus,
  Trash2,
  Edit3,
  Filter,
  Search,
  Save,
  X
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { GenerateAllSchedulesService, GeneratedSchedule } from '@/lib/generateAllSchedulesService'
import { ScheduleService } from '@/lib/scheduleService'
import { generateTimetablePDF } from '@/lib/pdfGenerator'
import { TimetableView, CompactTimetableView } from '@/components/ui/TimetableView'

interface EditableSection {
  id: string
  course_code: string
  section_label: string
  day: string
  start_time: string
  end_time: string
  room: string
  instructor: string
  student_count: number
  capacity: number
}

export default function GenerateAllSchedulesPage() {
  const [existingSchedules, setExistingSchedules] = useState<GeneratedSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingLevel, setGeneratingLevel] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Filtering states
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [selectedSemester, setSelectedSemester] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  // AI Editing states
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null)
  const [editPrompt, setEditPrompt] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [currentEditingGroup, setCurrentEditingGroup] = useState('')
  const [currentEditingLevel, setCurrentEditingLevel] = useState(0)

  const levelsAvailable = [1, 2, 3, 4]
  const semestersAvailable = ['Fall 2024', 'Spring 2025', 'Summer 2025']

  useEffect(() => {
    loadExistingSchedules()
  }, [])

  const loadExistingSchedules = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Direct Supabase query instead of using the service
      const { data, error } = await supabase
        .from('schedule_versions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to load schedules: ${error.message}`)
      }

      // Convert raw data to GeneratedSchedule format
      const schedules: GeneratedSchedule[] = (data || []).map(row => {
        const diffJson = row.diff_json || {}
        
        // Handle both formats: diff_json.groups and diff_json.sections
        let groups = {}
        if (diffJson.groups) {
          groups = diffJson.groups
        } else if (diffJson.sections) {
          // Convert sections array to groups format
          const sectionsArray = Array.isArray(diffJson.sections) ? diffJson.sections : []
          groups = {
            'A': {
              student_count: 30,
              sections: sectionsArray.slice(0, Math.ceil(sectionsArray.length / 3))
            },
            'B': {
              student_count: 30,
              sections: sectionsArray.slice(Math.ceil(sectionsArray.length / 3), Math.ceil(sectionsArray.length * 2 / 3))
            },
            'C': {
              student_count: 30,
              sections: sectionsArray.slice(Math.ceil(sectionsArray.length * 2 / 3))
            }
          }
        }

        return {
          id: row.id,
          level: row.level || 1,
          semester: row.semester || 'Fall 2024',
          groups: groups,
          total_sections: diffJson.total_sections || Object.values(groups).reduce((acc: number, group: any) => acc + (group.sections?.length || 0), 0),
          conflicts: diffJson.conflicts || 0,
          efficiency: diffJson.efficiency || 85,
          generated_at: row.created_at || new Date().toISOString()
        }
      })

      setExistingSchedules(schedules)
      console.log('✅ Loaded existing schedules:', schedules.length)
      
    } catch (error: any) {
      console.error('Failed to load existing schedules:', error)
      setError(`Failed to load schedules: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const generateLevelSchedule = async (level: number) => {
    try {
      setIsGenerating(true)
      setGeneratingLevel(level)
      setError(null)
      setSuccess(null)

      const newSchedule = await GenerateAllSchedulesService.generateLevelSchedule(level)
      
      // Add to existing schedules
      setExistingSchedules(prev => [newSchedule, ...prev])
      setSuccess(`✅ Successfully generated schedule for Level ${level}!`)

    } catch (error: any) {
      setError(`❌ Failed to generate Level ${level}: ${error.message}`)
    } finally {
      setIsGenerating(false)
      setGeneratingLevel(null)
    }
  }

  const deleteSchedule = async (scheduleId: string, level: number, semester: string) => {
    if (!confirm(`Are you sure you want to delete the Level ${level} schedule for ${semester}?`)) {
      return
    }

    try {
      await GenerateAllSchedulesService.deleteSchedule(scheduleId)
      setExistingSchedules(prev => prev.filter(s => s.id !== scheduleId))
      setSuccess(`✅ Deleted Level ${level} schedule`)
    } catch (error: any) {
      setError(`❌ Failed to delete schedule: ${error.message}`)
    }
  }

  const downloadSchedule = (schedule: GeneratedSchedule) => {
    // Convert schedule to timetable entries for PDF
    const timetableEntries = Object.entries(schedule.groups).flatMap(([groupName, groupData]) =>
      groupData.sections.map((section: any) => ({
        course_code: `${section.course_code} (${groupName})`,
        course_title: section.course_title || section.course_code,
        section_label: section.section_label || 'A',
        timeslot: {
          day: section.day,
          start: section.start_time,
          end: section.end_time
        },
        room: section.room,
        instructor: section.instructor || 'TBA'
      }))
    )

    const studentInfo = {
      name: `Level ${schedule.level} - All Groups`,
      level: schedule.level,
      semester: schedule.semester
    }

    generateTimetablePDF(timetableEntries, studentInfo)
  }

  // AI Editing Functions
  const startEditing = (schedule: GeneratedSchedule, groupName: string) => {
    setEditingSchedule(`${schedule.id}-${groupName}`)
    setCurrentEditingGroup(groupName)
    setCurrentEditingLevel(schedule.level)
    setEditPrompt('')
  }

  const cancelEditing = () => {
    setEditingSchedule(null)
    setEditPrompt('')
    setCurrentEditingGroup('')
    setCurrentEditingLevel(0)
  }

  const saveEdits = async () => {
    if (!editPrompt.trim()) return

    try {
      setIsRegenerating(true)
      setError(null)
      setSuccess(null)

      // Build enhanced constraints for conflict prevention
      const enhancedConstraints = await buildEnhancedConstraints(currentEditingLevel)

      // Call AI to regenerate the schedule
      const newSchedule = await GenerateAllSchedulesService.generateLevelScheduleWithPrompt(
        currentEditingLevel,
        editPrompt,
        enhancedConstraints
      )
      
      // Update the specific group in the existing schedule
      const updatedSchedules = existingSchedules.map(schedule => {
        if (schedule.level === currentEditingLevel) {
          const updatedSchedule = {
            ...schedule,
            groups: {
              ...schedule.groups,
              [currentEditingGroup]: newSchedule.groups[currentEditingGroup] || newSchedule.groups[Object.keys(newSchedule.groups)[0]]
            },
            efficiency: newSchedule.efficiency,
            conflicts: newSchedule.conflicts,
            generated_at: new Date().toISOString()
          }
          
          // Update in database (don't create new, update existing)
          if (schedule.id) {
            GenerateAllSchedulesService.updateSchedule(schedule.id, {
              groups: updatedSchedule.groups,
              total_sections: updatedSchedule.total_sections,
              conflicts: updatedSchedule.conflicts,
              efficiency: updatedSchedule.efficiency
            }).catch(error => console.error('Failed to update schedule in DB:', error))
          }
          
          return updatedSchedule
        }
        return schedule
      })
      
      setExistingSchedules(updatedSchedules)
      setSuccess(`✅ AI successfully updated ${currentEditingGroup} for Level ${currentEditingLevel}!`)

    } catch (error: any) {
      setError(`❌ AI regeneration failed: ${error.message}`)
    } finally {
      setIsRegenerating(false)
      cancelEditing()
    }
  }

  const buildEnhancedConstraints = async (currentLevel: number) => {
    // Get existing schedules for other levels to avoid conflicts
    const otherLevelSchedules = existingSchedules.filter(s => s.level !== currentLevel)
    
    const occupiedSlots = otherLevelSchedules.flatMap(schedule =>
      Object.values(schedule.groups).flatMap((group: any) =>
        group.sections.map((section: any) => ({
          day: section.day,
          start_time: section.start_time,
          end_time: section.end_time,
          room: section.room
        }))
      )
    )

    // Get available rooms from database
    const { data: roomsData } = await supabase.from('rooms').select('name')
    const availableRooms = roomsData?.map(r => r.name) || ['A101', 'A102', 'D101', 'D102', 'E201', 'E202', 'LAB1', 'LAB2']

    return {
      level: currentLevel,
      userPrompt: editPrompt,
      occupiedSlots,
      availableRooms,
      studentCount: 80,
      conflictPreventionRules: [
        'CRITICAL: Avoid time conflicts with other levels in the same rooms',
        'CRITICAL: Maintain afternoon-only policy (12 PM onwards)',
        'CRITICAL: No classes on Friday',
        'Optimize for minimal disruption to other levels',
        'Balance instructor workload',
        'Ensure proper room utilization'
      ],
      editingMode: true,
      preserveConsistency: true
    }
  }

  // Filter schedules
  const filteredSchedules = existingSchedules.filter(schedule => {
    const matchesLevel = selectedLevel === 'all' || schedule.level.toString() === selectedLevel
    const matchesSemester = selectedSemester === 'all' || schedule.semester === selectedSemester
    const matchesSearch = searchTerm === '' || 
      schedule.level.toString().includes(searchTerm) ||
      schedule.semester.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesLevel && matchesSemester && matchesSearch
  })

  // Clear messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null)
        setError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Generate All Schedules</h1>
            <p className="text-gray-600">AI-powered schedule generation for all academic levels</p>
          </div>
          <Button onClick={loadExistingSchedules} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Status Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="level-filter">Level</Label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {levelsAvailable.map(level => (
                      <SelectItem key={level} value={level.toString()}>Level {level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="semester-filter">Semester</Label>
                <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Semesters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    {semestersAvailable.map(semester => (
                      <SelectItem key={semester} value={semester}>{semester}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="group-filter">Group View</Label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Groups" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    <SelectItem value="A">Group A</SelectItem>
                    <SelectItem value="B">Group B</SelectItem>
                    <SelectItem value="C">Group C</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search schedules..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
            </div>
            </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Loading schedules...</span>
            </CardContent>
          </Card>
        ) : existingSchedules.length === 0 ? (
          /* No Schedules - Show Generation Options */
        <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Brain className="h-6 w-6 text-blue-600" />
                No Schedules Found
            </CardTitle>
            <CardDescription>
                Generate AI-powered schedules for your academic levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {levelsAvailable.map((level) => (
                  <Card key={level} className="border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors">
                    <CardContent className="p-6 text-center">
                      <div className="mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                        <h3 className="font-semibold text-lg">Level {level}</h3>
                        <p className="text-sm text-gray-600">Generate complete schedule</p>
                  </div>

                  <Button
                    onClick={() => generateLevelSchedule(level)}
                    disabled={isGenerating}
                    className="w-full"
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
                    </CardContent>
                  </Card>
              ))}
            </div>
          </CardContent>
        </Card>
        ) : (
          /* Existing Schedules Display - Combined Groups */
          <div className="space-y-6">
            {filteredSchedules.map((schedule) => (
              <Card key={`schedule-${schedule.id}`} className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                  <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        Level {schedule.level} Schedule - {schedule.semester}
                    </CardTitle>
                      <CardDescription>
                        {Object.keys(schedule.groups).length} groups • {schedule.total_sections} total sections
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {schedule.efficiency}% Efficiency
                      </Badge>
                      <Badge variant={schedule.conflicts === 0 ? "default" : "destructive"}>
                        {schedule.conflicts} Conflicts
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadSchedule(schedule)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteSchedule(schedule.id || '', schedule.level, schedule.semester)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Combined Groups View */}
                  <div className="space-y-6">
                    {/* Group Tabs/Filters */}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {Object.keys(schedule.groups).map(groupName => (
                          <Button
                            key={groupName}
                            variant={selectedGroup === 'all' || selectedGroup === groupName ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedGroup(selectedGroup === groupName ? 'all' : groupName)}
                          >
                            {groupName}
                            <Badge variant="secondary" className="ml-2">
                              {schedule.groups[groupName].student_count}
                            </Badge>
                          </Button>
                        ))}
                        {selectedGroup !== 'all' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedGroup('all')}
                          >
                            Show All Groups
                          </Button>
                        )}
                      </div>
                      
                      {/* Edit buttons for each group */}
                      <div className="flex gap-2">
                        {Object.entries(schedule.groups)
                          .filter(([groupName]) => selectedGroup === 'all' || groupName === selectedGroup)
                          .map(([groupName]) => (
                            <Button
                              key={`edit-${groupName}`}
                              variant="outline"
                              size="sm"
                              onClick={() => startEditing(schedule, groupName)}
                              disabled={editingSchedule === `${schedule.id}-${groupName}`}
                            >
                              <Edit3 className="h-4 w-4 mr-1" />
                              Edit {groupName}
                            </Button>
                          ))}
                      </div>
                    </div>

                    {/* Combined Timetable View */}
                    {selectedGroup === 'all' ? (
                      /* Show all groups in one combined timetable */
                      <TimetableView
                        schedule={Object.entries(schedule.groups).flatMap(([groupName, groupData]) =>
                          groupData.sections.map((section: any) => ({
                            course_code: `${section.course_code} (${groupName})`,
                            section_label: section.section_label,
                            timeslot: {
                              day: section.day,
                              start: section.start_time,
                              end: section.end_time
                            },
                            room: section.room,
                            instructor_id: section.instructor || 'TBA',
                            student_count: section.student_count,
                            capacity: section.capacity
                          }))
                        )}
                        title={`Level ${schedule.level} - All Groups Combined`}
                        studentInfo={{
                          name: `All Groups (${Object.keys(schedule.groups).join(', ')})`,
                          level: schedule.level,
                          semester: schedule.semester
                        }}
                      />
                    ) : (
                      /* Show individual group */
                      Object.entries(schedule.groups)
                        .filter(([groupName]) => groupName === selectedGroup)
                        .map(([groupName, groupData]) => (
                          <div key={`group-${groupName}`}>
                            {editingSchedule === `${schedule.id}-${groupName}` ? (
                              /* AI-Powered Editing Mode */
                              <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                      <Brain className="h-5 w-5 text-purple-600" />
                                      AI Schedule Editor - {groupName}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                      Describe your changes and AI will regenerate the schedule intelligently
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button 
                                      onClick={saveEdits} 
                                      size="sm"
                                      disabled={isRegenerating || !editPrompt.trim()}
                                      className="bg-purple-600 hover:bg-purple-700"
                                    >
                                      {isRegenerating ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                          AI Regenerating...
                                        </>
                                      ) : (
                                        <>
                                          <Brain className="h-4 w-4 mr-1" />
                                          Regenerate with AI
                                        </>
                                      )}
                                    </Button>
                                    <Button onClick={cancelEditing} variant="outline" size="sm">
                                      <X className="h-4 w-4 mr-1" />
                                      Cancel
                                    </Button>
                                  </div>
                                </div>

                                {/* AI Prompt Interface */}
                                <Card className="border-purple-200 bg-purple-50">
                                  <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <Brain className="h-4 w-4 text-purple-600" />
                                      AI Editing Instructions
                                    </CardTitle>
                                    <CardDescription>
                                      Tell the AI what changes you want. It will regenerate the schedule while avoiding conflicts with other levels.
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-4">
                                      <div>
                                        <Label htmlFor="edit-prompt">Editing Instructions</Label>
                                        <Textarea
                                          id="edit-prompt"
                                          value={editPrompt}
                                          onChange={(e) => setEditPrompt(e.target.value)}
                                          placeholder="Example: Move CS301 to Wednesday afternoon, avoid conflicts with Level 2, optimize room usage..."
                                          rows={6}
                                          className="bg-white"
                                        />
                                      </div>
                                      
                                      {/* Quick Prompt Suggestions */}
                                      <div>
                                        <Label className="text-xs text-gray-600">Quick Suggestions:</Label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                          {[
                                            "Optimize for afternoon slots only",
                                            "Minimize room conflicts",
                                            "Balance instructor workload", 
                                            "Avoid overlaps with other levels",
                                            "Improve student flow between classes"
                                          ].map((suggestion) => (
                                            <Button
                                              key={suggestion}
                                              variant="outline"
                                              size="sm"
                                              className="text-xs"
                                              onClick={() => setEditPrompt(prev => prev + (prev ? '\n- ' : '- ') + suggestion)}
                                            >
                                              + {suggestion}
                                            </Button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Current Schedule Preview */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-sm">Current Schedule (Will be regenerated)</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <TimetableView
                                      schedule={groupData.sections.map((section: any) => ({
                                        course_code: section.course_code,
                                        section_label: section.section_label,
                                        timeslot: {
                                          day: section.day,
                                          start: section.start_time,
                                          end: section.end_time
                                        },
                                        room: section.room,
                                        instructor_id: section.instructor || 'TBA',
                                        student_count: section.student_count,
                                        capacity: section.capacity
                                      }))}
                                      title={`Current ${groupName} Schedule`}
                                      studentInfo={{
                                        name: `Level ${schedule.level} - ${groupName}`,
                                        level: schedule.level,
                                        semester: schedule.semester
                                      }}
                                    />
                                  </CardContent>
                                </Card>

                                {/* Conflict Prevention Info */}
                                <Alert>
                                  <CheckCircle className="h-4 w-4" />
                                  <AlertDescription>
                                    <strong>AI Conflict Prevention:</strong> The system will automatically avoid conflicts with other levels, 
                                    respect the afternoon-only policy, and maintain consistency across all schedules.
                                  </AlertDescription>
                                </Alert>
                              </div>
                            ) : (
                              /* Display Mode - Individual Group */
                              <TimetableView
                                schedule={groupData.sections.map((section: any) => ({
                                  course_code: section.course_code,
                                  section_label: section.section_label,
                                  timeslot: {
                                    day: section.day,
                                    start: section.start_time,
                                    end: section.end_time
                                  },
                                  room: section.room,
                                  instructor_id: section.instructor || 'TBA',
                                  student_count: section.student_count,
                                  capacity: section.capacity
                                }))}
                                title={`${groupName} Timetable`}
                                studentInfo={{
                                  name: `Level ${schedule.level} - ${groupName}`,
                                  level: schedule.level,
                                  semester: schedule.semester
                                }}
                              />
                            )}
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Generate More Button */}
            <Card className="border-2 border-dashed border-gray-200">
              <CardContent className="p-6 text-center">
                <div className="mb-4">
                  <Plus className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <h3 className="text-lg font-semibold text-gray-700">Generate More Schedules</h3>
                  <p className="text-sm text-gray-600">Create additional schedules for other levels</p>
                </div>
                
                <div className="flex justify-center gap-2 flex-wrap">
                  {levelsAvailable
                    .filter(level => !existingSchedules.some(s => s.level === level))
                    .map((level) => (
                      <Button
                        key={level}
                        onClick={() => generateLevelSchedule(level)}
                        disabled={isGenerating}
                        variant="outline"
                        size="sm"
                      >
                        {generatingLevel === level ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Generating Level {level}
                          </>
                        ) : (
                          <>
                            <Brain className="h-4 w-4 mr-1" />
                            Generate Level {level}
                          </>
                        )}
                      </Button>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  )
}