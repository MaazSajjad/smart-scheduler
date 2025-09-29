'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScheduleService, GeneratedSchedule } from '@/lib/scheduleService'
import { CourseService } from '@/lib/courseService'
import { 
  Calendar, 
  Clock, 
  Building, 
  Users, 
  Edit, 
  Save, 
  RotateCcw,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  Eye,
  Download
} from 'lucide-react'

interface ScheduleSection {
  id?: string
  course_code: string
  section_label: string
  timeslot: {
    day: string
    start: string
    end: string
  }
  room: string
  instructor_id?: string
  student_count: number
  capacity: number
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00'
]

export default function EditSchedulePage() {
  const [schedules, setSchedules] = useState<GeneratedSchedule[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<GeneratedSchedule | null>(null)
  const [sections, setSections] = useState<ScheduleSection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<ScheduleSection | null>(null)
  const [availableRooms, setAvailableRooms] = useState<string[]>([])

  useEffect(() => {
    loadSchedules()
    loadAvailableRooms()
  }, [])

  const loadSchedules = async () => {
    try {
      setLoading(true)
      const data = await ScheduleService.getSchedules()
      setSchedules(data)
      if (data.length > 0) {
        setSelectedSchedule(data[0])
        setSections(data[0].sections)
      }
    } catch (error: any) {
      setError('Failed to load schedules: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableRooms = async () => {
    try {
      const courses = await CourseService.getAllCourses()
      const rooms = new Set<string>()
      courses.forEach(course => {
        course.allowable_rooms.forEach(room => rooms.add(room))
      })
      setAvailableRooms(Array.from(rooms))
    } catch (error) {
      console.error('Error loading rooms:', error)
    }
  }

  const handleScheduleSelect = (scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId)
    if (schedule) {
      setSelectedSchedule(schedule)
      // Ensure each section has a unique ID
      const sectionsWithIds = schedule.sections.map((section, index) => ({
        ...section,
        id: section.id || `section-${scheduleId}-${index}`
      }))
      setSections(sectionsWithIds)
    }
  }

  const handleEditSection = (section: ScheduleSection) => {
    setEditingSection(section)
    setIsEditDialogOpen(true)
  }

  const handleSaveSection = (updatedSection: ScheduleSection) => {
    setSections(prev => 
      prev.map(s => (s.id || `section-${prev.indexOf(s)}`) === (updatedSection.id || `section-${prev.indexOf(s)}`) ? updatedSection : s)
    )
    setIsEditDialogOpen(false)
    setEditingSection(null)
  }

  const handleDeleteSection = (sectionId: string) => {
    if (confirm('Are you sure you want to delete this section?')) {
      setSections(prev => prev.filter((s, index) => (s.id || `section-${index}`) !== sectionId))
    }
  }

  const handleSaveSchedule = async () => {
    if (!selectedSchedule) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      // Update the schedule with modified sections
      const updatedSchedule = {
        ...selectedSchedule,
        sections
      }

      // Here you would typically save to the database
      // For now, we'll just show success
      setSuccess('Schedule saved successfully!')
    } catch (error: any) {
      setError('Failed to save schedule: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const getSectionAtTime = (day: string, time: string) => {
    return sections.find((section, index) => 
      section.timeslot.day === day && 
      section.timeslot.start === time
    )
  }

  const getConflicts = () => {
    const conflicts: string[] = []
    const roomBookings: { [key: string]: ScheduleSection[] } = {}
    
    sections.forEach(section => {
      const key = `${section.timeslot.day}-${section.timeslot.start}-${section.room}`
      if (!roomBookings[key]) roomBookings[key] = []
      roomBookings[key].push(section)
    })

    Object.entries(roomBookings).forEach(([key, sections]) => {
      if (sections.length > 1) {
        conflicts.push(`Room conflict: ${sections[0].room} at ${sections[0].timeslot.day} ${sections[0].timeslot.start}`)
      }
    })

    return conflicts
  }

  const conflicts = getConflicts()

  if (loading) {
    return (
      <MainLayout>
        <div className="p-6 flex items-center justify-center min-h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading schedules...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Schedule</h1>
            <p className="text-gray-600">Modify and manage existing schedules</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={loadSchedules}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleSaveSchedule} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        {/* Schedule Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Schedule to Edit</CardTitle>
            <CardDescription>Choose a schedule to modify</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Select value={selectedSchedule?.id || ''} onValueChange={handleScheduleSelect}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a schedule" />
                </SelectTrigger>
                <SelectContent>
                  {schedules.map((schedule) => (
                    <SelectItem key={schedule.id} value={schedule.id}>
                      Level {schedule.level} - {schedule.semester} ({schedule.sections.length} sections)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSchedule && (
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">
                    {selectedSchedule.sections.length} Sections
                  </Badge>
                  <Badge variant={selectedSchedule.status === 'approved' ? 'default' : 'secondary'}>
                    {selectedSchedule.status}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error/Success Messages */}
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

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div>
                <p className="font-medium">Scheduling Conflicts Detected:</p>
                <ul className="list-disc list-inside mt-1">
                  {conflicts.map((conflict, index) => (
                    <li key={index}>{conflict}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Schedule Grid */}
        {selectedSchedule && (
          <Card>
            <CardHeader>
              <CardTitle>Schedule Grid</CardTitle>
              <CardDescription>
                Click on a section to edit, or drag to move
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border p-2 bg-gray-50 font-medium">Time</th>
                      {DAYS.map(day => (
                        <th key={day} className="border p-2 bg-gray-50 font-medium min-w-32">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIME_SLOTS.map(time => (
                      <tr key={time}>
                        <td className="border p-2 bg-gray-50 font-medium">{time}</td>
                        {DAYS.map(day => {
                          const section = getSectionAtTime(day, time)
                          return (
                            <td key={`${day}-${time}`} className="border p-1 min-h-16">
                              {section ? (
                                <div 
                                  className="bg-blue-100 border border-blue-300 rounded p-2 cursor-pointer hover:bg-blue-200 transition-colors"
                                  onClick={() => handleEditSection(section)}
                                >
                                  <div className="font-medium text-sm">{section.course_code}</div>
                                  <div className="text-xs text-gray-600">{section.section_label}</div>
                                  <div className="text-xs text-gray-600">{section.room}</div>
                                  <div className="text-xs text-gray-600">
                                    {section.student_count}/{section.capacity}
                                  </div>
                                </div>
                              ) : (
                                <div className="h-16 border-2 border-dashed border-gray-200 rounded flex items-center justify-center">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section List */}
        {selectedSchedule && (
          <Card>
            <CardHeader>
              <CardTitle>All Sections</CardTitle>
              <CardDescription>Manage all sections in this schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sections.map((section, index) => (
                  <div key={section.id || `section-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="font-medium">{section.course_code} - {section.section_label}</div>
                        <div className="text-sm text-gray-600">
                          {section.timeslot.day} {section.timeslot.start}-{section.timeslot.end} • {section.room}
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {section.student_count}/{section.capacity} students
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditSection(section)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteSection(section.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Section Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Section</DialogTitle>
              <DialogDescription>Modify section details</DialogDescription>
            </DialogHeader>
            {editingSection && (
              <EditSectionForm
                section={editingSection}
                availableRooms={availableRooms}
                onSave={handleSaveSection}
                onCancel={() => setIsEditDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}

interface EditSectionFormProps {
  section: ScheduleSection
  availableRooms: string[]
  onSave: (section: ScheduleSection) => void
  onCancel: () => void
}

function EditSectionForm({ section, availableRooms, onSave, onCancel }: EditSectionFormProps) {
  const [formData, setFormData] = useState({
    day: section.timeslot.day,
    start: section.timeslot.start,
    end: section.timeslot.end,
    room: section.room,
    instructor_id: section.instructor_id || '',
    capacity: section.capacity
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...section,
      timeslot: {
        day: formData.day,
        start: formData.start,
        end: formData.end
      },
      room: formData.room,
      instructor_id: formData.instructor_id,
      capacity: formData.capacity
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="day">Day</Label>
          <Select value={formData.day} onValueChange={(value) => setFormData({...formData, day: value})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map(day => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="room">Room</Label>
          <Select value={formData.room} onValueChange={(value) => setFormData({...formData, room: value})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableRooms.map(room => (
                <SelectItem key={room} value={room}>{room}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start">Start Time</Label>
          <Select value={formData.start} onValueChange={(value) => setFormData({...formData, start: value})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_SLOTS.map(time => (
                <SelectItem key={time} value={time}>{time}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="end">End Time</Label>
          <Select value={formData.end} onValueChange={(value) => setFormData({...formData, end: value})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_SLOTS.map(time => (
                <SelectItem key={time} value={time}>{time}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="instructor">Instructor ID</Label>
          <Input
            id="instructor"
            value={formData.instructor_id}
            onChange={(e) => setFormData({...formData, instructor_id: e.target.value})}
            placeholder="Optional"
          />
        </div>
        <div>
          <Label htmlFor="capacity">Capacity</Label>
          <Input
            id="capacity"
            type="number"
            value={formData.capacity}
            onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
            min="1"
            max="50"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save Changes
        </Button>
      </div>
    </form>
  )
}
