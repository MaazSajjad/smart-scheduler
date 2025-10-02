'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface TimetableEntry {
  course_code: string
  section_label: string
  timeslot: {
    day: string
    start: string
    end: string
  }
  room: string
  instructor_id?: string
  student_count?: number
  capacity?: number
}

interface TimetableViewProps {
  schedule: TimetableEntry[]
  title?: string
  studentInfo?: {
    name?: string
    level?: number
    studentNumber?: string
  }
}

// Convert 24-hour time to 12-hour format with AM/PM
function formatTime12Hour(time24: string): string {
  if (!time24 || time24 === 'TBA') return time24
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

// Get time slots in 12-hour format
function getTimeSlots12Hour(): string[] {
  const slots24 = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
  return slots24.map(formatTime12Hour)
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export function TimetableView({ schedule, title = "Class Timetable", studentInfo }: TimetableViewProps) {
  const timeSlots = getTimeSlots12Hour()

  const getSectionsAtTime = (day: string, timeSlot: string) => {
    return schedule.filter(entry => {
      const entryDay = entry.timeslot.day
      const entryStartTime = formatTime12Hour(entry.timeslot.start)
      return entryDay === day && entryStartTime === timeSlot
    })
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold text-gray-900">{title}</CardTitle>
        {studentInfo && (
          <div className="text-sm text-gray-600 space-y-1">
            {studentInfo.name && <p className="font-medium">Student: {studentInfo.name}</p>}
            {studentInfo.studentNumber && <p>Student Number: {studentInfo.studentNumber}</p>}
            {studentInfo.level && <p>Level: {studentInfo.level}</p>}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            {/* Header Row */}
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="border border-gray-300 px-4 py-3 text-center font-bold text-sm">
                  Time
                </th>
                {DAYS.map(day => (
                  <th key={day} className="border border-gray-300 px-4 py-3 text-center font-bold text-sm min-w-[120px]">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            
            {/* Time Slot Rows */}
            <tbody>
              {timeSlots.map((timeSlot, index) => (
                <tr key={timeSlot} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {/* Time Column */}
                  <td className="border border-gray-300 px-4 py-4 text-center font-bold text-sm bg-gray-100">
                    {timeSlot}
                  </td>
                  
                  {/* Day Columns */}
                  {DAYS.map(day => {
                    const sections = getSectionsAtTime(day, timeSlot)
                    return (
                      <td key={`${day}-${timeSlot}`} className="border border-gray-300 px-2 py-2 text-center align-top">
                        {sections.length > 0 ? (
                          <div className="text-xs leading-tight space-y-1">
                            {sections.map((section, sectionIndex) => (
                              <div 
                                key={`${section.course_code}-${section.section_label}-${sectionIndex}`}
                                className={`p-2 rounded border ${
                                  sections.length > 1 
                                    ? 'bg-blue-50 border-blue-200 mb-1' 
                                    : 'bg-white border-gray-200'
                                }`}
                              >
                                <div className="font-bold text-gray-900">{section.course_code}</div>
                                <div className="text-gray-700">Section {section.section_label}</div>
                                <div className="text-gray-600">Room {section.room}</div>
                                <div className="text-gray-500">
                                  {formatTime12Hour(section.timeslot.start)} - {formatTime12Hour(section.timeslot.end)}
                                </div>
                                {section.instructor_id && section.instructor_id !== 'TBA' && (
                                  <div className="text-gray-500 italic">{section.instructor_id}</div>
                                )}
                                {sections.length > 1 && sectionIndex < sections.length - 1 && (
                                  <div className="border-t border-blue-300 mt-1 pt-1"></div>
                                )}
                              </div>
                            ))}
                            {sections.length > 1 && (
                              <div className="text-xs text-blue-600 font-semibold mt-1">
                                {sections.length} groups
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-16"></div> // Empty cell with consistent height
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Footer with generation info */}
        <div className="mt-4 text-center text-xs text-gray-500 italic">
          Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  )
}

// Alternative compact version for smaller displays
export function CompactTimetableView({ schedule, title = "Schedule Overview" }: TimetableViewProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {schedule.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No classes scheduled</p>
          ) : (
            schedule.map((entry, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex-1">
                  <div className="font-bold text-gray-900">{entry.course_code} - Section {entry.section_label}</div>
                  <div className="text-sm text-gray-600">
                    {entry.timeslot.day} • {formatTime12Hour(entry.timeslot.start)} - {formatTime12Hour(entry.timeslot.end)}
                  </div>
                  <div className="text-sm text-gray-500">Room {entry.room}</div>
                </div>
                {entry.student_count && entry.capacity && (
                  <div className="text-xs text-gray-500">
                    {entry.student_count}/{entry.capacity}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
