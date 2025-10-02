import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

// Convert 24-hour time to 12-hour format with AM/PM
function formatTime12Hour(time24: string): string {
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

// Days of the week
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export function generateTimetablePDF(
  schedule: TimetableEntry[],
  studentInfo: { name?: string; level?: number } = {}
): void {
  const doc = new jsPDF('landscape', 'mm', 'a4')
  
  // Title
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Class Timetable', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' })
  
  // Student/Level info
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  let yPos = 30
  if (studentInfo.name) {
    doc.text(`Student: ${studentInfo.name}`, 20, yPos)
    yPos += 7
  }
  if (studentInfo.level) {
    doc.text(`Level: ${studentInfo.level}`, 20, yPos)
    yPos += 7
  }
  
  // Create timetable grid data
  const timeSlots = getTimeSlots12Hour()
  const tableData: string[][] = []
  
  // Header row
  const headerRow = ['Time', ...DAYS]
  
  // Data rows
  timeSlots.forEach(timeSlot => {
    const row = [timeSlot]
    
    DAYS.forEach(day => {
      // Find all schedule entries for this day/time (multiple groups can overlap)
      const entries = schedule.filter(entry => {
        const entryDay = entry.timeslot.day
        const entryStartTime = formatTime12Hour(entry.timeslot.start)
        return entryDay === day && entryStartTime === timeSlot
      })
      
      if (entries.length > 0) {
        const cellContent = entries.map(entry => {
          const endTime = formatTime12Hour(entry.timeslot.end)
          return [
            `${entry.course_code}`,
            `Section ${entry.section_label}`,
            `Room ${entry.room}`,
            `${timeSlot} - ${endTime}`
          ].join('\n')
        }).join('\n\n---\n\n')
        
        row.push(cellContent)
      } else {
        row.push('') // Empty cell
      }
    })
    
    tableData.push(row)
  })
  
  // Generate table
  autoTable(doc, {
    head: [headerRow],
    body: tableData,
    startY: yPos + 10,
    styles: {
      fontSize: 9,
      cellPadding: 4,
      overflow: 'linebreak',
      valign: 'top'
    },
    headStyles: {
      fillColor: [41, 128, 185], // Blue header
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center', fontStyle: 'bold' }, // Time column
      1: { cellWidth: 50 }, // Monday
      2: { cellWidth: 50 }, // Tuesday
      3: { cellWidth: 50 }, // Wednesday
      4: { cellWidth: 50 }, // Thursday
      5: { cellWidth: 50 }  // Friday
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245] // Light gray alternating rows
    },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.1,
    margin: { left: 15, right: 15 }
  })
  
  // Footer with generation date
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.text(
    `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
    doc.internal.pageSize.getWidth() / 2,
    pageHeight - 10,
    { align: 'center' }
  )
  
  // Download the PDF
  const filename = `timetable_${studentInfo.level ? `level${studentInfo.level}_` : ''}${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}

// Generate a sample timetable for testing
export function generateSampleTimetablePDF(): void {
  const sampleSchedule: TimetableEntry[] = [
    {
      course_code: 'CS101',
      section_label: 'A',
      timeslot: { day: 'Monday', start: '09:00', end: '10:30' },
      room: 'A101',
      student_count: 25,
      capacity: 30
    },
    {
      course_code: 'MATH201',
      section_label: 'B',
      timeslot: { day: 'Tuesday', start: '14:00', end: '15:30' },
      room: 'B205',
      student_count: 22,
      capacity: 25
    },
    {
      course_code: 'ENG102',
      section_label: 'A',
      timeslot: { day: 'Wednesday', start: '11:00', end: '12:30' },
      room: 'C301',
      student_count: 28,
      capacity: 30
    },
    {
      course_code: 'PHY201',
      section_label: 'A',
      timeslot: { day: 'Thursday', start: '13:00', end: '14:30' },
      room: 'LAB1',
      student_count: 20,
      capacity: 24
    }
  ]
  
  generateTimetablePDF(sampleSchedule, {
    name: 'John Doe',
    level: 2,
    semester: 'Fall 2024'
  })
}
