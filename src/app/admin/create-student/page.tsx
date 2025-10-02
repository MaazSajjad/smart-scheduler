'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  UserPlus, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Eye,
  EyeOff,
  Copy,
  Users,
  FileText
} from 'lucide-react'
import { GeneratedCredentials } from '@/lib/passwordService'
import { SystemSettingsService } from '@/lib/systemSettingsService'

export default function CreateStudentPage() {
  // Single student form
  const [fullName, setFullName] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [level, setLevel] = useState('1')
  const [contact, setContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [generatedCredentials, setGeneratedCredentials] = useState<GeneratedCredentials | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Bulk creation
  const [bulkText, setBulkText] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkCredentials, setBulkCredentials] = useState<GeneratedCredentials[]>([])

  // Group management
  const [maxStudentsPerGroup, setMaxStudentsPerGroup] = useState(25)
  const [groupStats, setGroupStats] = useState<any[]>([])
  const [loadingStats, setLoadingStats] = useState(true)

  // Load settings and statistics on mount
  useEffect(() => {
    loadSettingsAndStats()
  }, [])

  const loadSettingsAndStats = async () => {
    try {
      setLoadingStats(true)
      const [maxStudents, stats] = await Promise.all([
        SystemSettingsService.getMaxStudentsPerGroup(),
        SystemSettingsService.getGroupStatistics()
      ])
      setMaxStudentsPerGroup(maxStudents)
      setGroupStats(stats)
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const handleUpdateMaxStudents = async (newMax: number) => {
    try {
      await SystemSettingsService.updateMaxStudentsPerGroup(newMax)
      setMaxStudentsPerGroup(newMax)
      setSuccess(`✅ Updated max students per group to ${newMax}`)
      await loadSettingsAndStats()
    } catch (error: any) {
      setError(`❌ Failed to update: ${error.message}`)
    }
  }

  /**
   * Create single student
   */
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!fullName || !studentNumber) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')
      setGeneratedCredentials(null)

      // Call API route instead of direct service call
      const response = await fetch('/api/admin/create-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          studentNumber,
          level: parseInt(level),
          contact: contact || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create student')
      }

      const credentials = await response.json()

      setGeneratedCredentials(credentials)
      setSuccess(`✅ Student ${fullName} created successfully! Assigned to Group ${credentials.group}`)
      
      // Reload stats to update group counts
      await loadSettingsAndStats()
      
      // Clear form
      setFullName('')
      setStudentNumber('')
      setContact('')
    } catch (err: any) {
      setError(`❌ Failed to create student: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Create multiple students from bulk text
   * Format: Full Name, Student Number, Level, Contact (one per line)
   */
  const handleBulkCreate = async () => {
    if (!bulkText.trim()) {
      setError('Please enter student data')
      return
    }

    try {
      setBulkLoading(true)
      setError('')
      setSuccess('')
      setBulkCredentials([])

      // Parse bulk text
      const lines = bulkText.split('\n').filter(line => line.trim())
      const students = lines.map(line => {
        const parts = line.split(',').map(p => p.trim())
        return {
          fullName: parts[0] || '',
          studentNumber: parts[1] || '',
          level: parseInt(parts[2]) || 1,
          contact: parts[3] || undefined
        }
      }).filter(s => s.fullName && s.studentNumber)

      if (students.length === 0) {
        setError('No valid student data found. Format: Full Name, Student Number, Level, Contact')
        return
      }

      // Call API for bulk creation
      const response = await fetch('/api/admin/bulk-create-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create students')
      }

      const data = await response.json()
      const credentials = data.credentials
      
      setBulkCredentials(credentials)
      setSuccess(`✅ Successfully created ${credentials.length} students with automatic group assignment!`)
      setBulkText('')
      
      // Reload stats to update group counts
      await loadSettingsAndStats()
    } catch (err: any) {
      setError(`❌ Failed to create students: ${err.message}`)
    } finally {
      setBulkLoading(false)
    }
  }

  /**
   * Download credentials as CSV
   */
  const handleDownloadCredentials = (credentials: GeneratedCredentials[]) => {
    const csvHeader = 'Full Name,Student Number,Level,Group,Email,Password\n'
    const csvRows = credentials.map(c => 
      `"${c.fullName}","${c.studentNumber}","${c.level || 'N/A'}","${c.group || 'A'}","${c.email}","${c.password}"`
    ).join('\n')
    const csv = csvHeader + csvRows
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'student_credentials.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * Copy to clipboard
   */
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setSuccess('✅ Copied to clipboard!')
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Students</h1>
          <p className="text-gray-600">Add students with auto-generated credentials and automatic group assignment</p>
        </div>

        {/* Group Settings & Statistics */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Group Management Settings
            </CardTitle>
            <CardDescription className="text-blue-700">
              Students are automatically assigned to groups (A, B, C) based on capacity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Max Students Setting */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxStudents">Max Students Per Group</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="maxStudents"
                    type="number"
                    min="1"
                    max="50"
                    value={maxStudentsPerGroup}
                    onChange={(e) => setMaxStudentsPerGroup(parseInt(e.target.value) || 25)}
                    className="bg-white"
                  />
                  <Button
                    onClick={() => handleUpdateMaxStudents(maxStudentsPerGroup)}
                    variant="outline"
                  >
                    Update
                  </Button>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Current: {maxStudentsPerGroup} students per group (A, B, C)
                </p>
              </div>

              <div className="flex items-center justify-center p-4 bg-white rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Capacity Per Level</p>
                  <p className="text-3xl font-bold text-blue-600">{maxStudentsPerGroup * 3}</p>
                  <p className="text-xs text-gray-500">(3 groups × {maxStudentsPerGroup})</p>
                </div>
              </div>
            </div>

            {/* Group Statistics */}
            {!loadingStats && groupStats.length > 0 && (
              <div>
                <Label>Current Group Status</Label>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-2">
                  {[1, 2, 3, 4].map(level => {
                    const levelStats = groupStats.filter(s => s.level === level)
                    return (
                      <Card key={level} className="bg-white">
                        <CardContent className="p-3">
                          <p className="text-sm font-semibold mb-2">Level {level}</p>
                          <div className="space-y-1">
                            {['A', 'B', 'C'].map(group => {
                              const groupStat = levelStats.find(s => s.student_group === group)
                              const count = groupStat?.student_count || 0
                              const status = groupStat?.status || 'AVAILABLE'
                              const color = status === 'FULL' ? 'text-red-600' : 
                                           status === 'NEARLY FULL' ? 'text-yellow-600' : 
                                           'text-green-600'
                              return (
                                <div key={group} className="flex justify-between items-center text-xs">
                                  <span className="font-medium">Group {group}:</span>
                                  <span className={color}>
                                    {count}/{maxStudentsPerGroup}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Auto-Assignment:</strong> When you create a student, they will be automatically assigned to the first available group (A → B → C) for their level.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

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

        {/* Single Student Creation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Create Single Student
            </CardTitle>
            <CardDescription>
              Email and password will be automatically generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="studentNumber">Student Number *</Label>
                  <Input
                    id="studentNumber"
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    placeholder="2024001"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="level">Level *</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Level 1</SelectItem>
                      <SelectItem value="2">Level 2</SelectItem>
                      <SelectItem value="3">Level 3</SelectItem>
                      <SelectItem value="4">Level 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="contact">Contact (Optional)</Label>
                  <Input
                    id="contact"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="phone or email"
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full md:w-auto">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Student...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Student
                  </>
                )}
              </Button>
            </form>

            {/* Display Generated Credentials */}
            {generatedCredentials && (
              <Card className="mt-6 border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-900">✅ Student Created Successfully!</CardTitle>
                  <CardDescription className="text-blue-700">
                    Save these credentials - they won't be shown again
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-blue-900">Student Name</Label>
                      <div className="flex items-center gap-2">
                        <Input value={generatedCredentials.fullName} readOnly className="bg-white" />
                      </div>
                    </div>

                    <div>
                      <Label className="text-blue-900">Student Number</Label>
                      <div className="flex items-center gap-2">
                        <Input value={generatedCredentials.studentNumber} readOnly className="bg-white" />
                      </div>
                    </div>

                    <div>
                      <Label className="text-blue-900">Assigned Group</Label>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800 text-lg px-4 py-2">
                          Group {generatedCredentials.group || 'A'}
                        </Badge>
                        <span className="text-xs text-blue-600">
                          (Level {generatedCredentials.level})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div>
                      <Label className="text-blue-900">Email (Username)</Label>
                      <div className="flex items-center gap-2">
                        <Input value={generatedCredentials.email} readOnly className="bg-white" />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(generatedCredentials.email)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-blue-900">Password</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={generatedCredentials.password}
                          readOnly
                          className="bg-white font-mono"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(generatedCredentials.password)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      <strong>Important:</strong> Please save these credentials securely and share them with the student.
                      The password is auto-generated and cannot be recovered.
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={() => handleDownloadCredentials([generatedCredentials])}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Credentials as CSV
                  </Button>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Bulk Student Creation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Bulk Create Students
            </CardTitle>
            <CardDescription>
              Create multiple students at once. Format: Full Name, Student Number, Level, Contact (one per line)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bulkText">Student Data</Label>
              <Textarea
                id="bulkText"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="John Doe, 2024001, 1, john@email.com
Jane Smith, 2024002, 1, jane@email.com
Bob Johnson, 2024003, 2, bob@email.com"
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-sm text-gray-600 mt-2">
                Format: Full Name, Student Number, Level, Contact (one per line)
              </p>
            </div>

            <Button onClick={handleBulkCreate} disabled={bulkLoading} className="w-full md:w-auto">
              {bulkLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Students...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Bulk Create Students
                </>
              )}
            </Button>

            {/* Display Bulk Credentials */}
            {bulkCredentials.length > 0 && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg text-green-900">
                        ✅ {bulkCredentials.length} Students Created!
                      </CardTitle>
                      <CardDescription className="text-green-700">
                        Download the credentials file to share with students
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => handleDownloadCredentials(bulkCredentials)}
                      variant="default"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download All Credentials
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {bulkCredentials.map((cred, index) => (
                      <Card key={index} className="bg-white">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                            <div>
                              <Label className="text-xs text-gray-600">Name</Label>
                              <p className="font-medium">{cred.fullName}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600">Number</Label>
                              <p className="font-medium">{cred.studentNumber}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600">Group</Label>
                              <Badge className="bg-green-100 text-green-700">
                                {cred.group || 'A'} (L{cred.level})
                              </Badge>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600">Email</Label>
                              <p className="font-medium text-blue-600 truncate">{cred.email}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600">Password</Label>
                              <p className="font-mono font-bold">{cred.password}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Single Student Creation:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Fill in the student's full name and student number</li>
                  <li>Select the academic level (1-4)</li>
                  <li>Email will be auto-generated from the name (e.g., john.doe@university.edu)</li>
                  <li>Password will be automatically generated (8 characters, alphanumeric)</li>
                  <li>Download or copy the credentials to share with the student</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Bulk Student Creation:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Enter student data in CSV format (one student per line)</li>
                  <li>Format: Full Name, Student Number, Level, Contact</li>
                  <li>All fields except contact are required</li>
                  <li>Download the credentials file after creation to distribute to students</li>
                </ul>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Security Note:</strong> Auto-generated passwords are temporary. Students should be advised to 
                  change their passwords after first login for security.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}

