'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  UserPlus, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Users,
  Shield,
  RefreshCw
} from 'lucide-react'

export default function BulkAuthCreationPage() {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [needsAuth, setNeedsAuth] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [credentials, setCredentials] = useState<any[]>([])
  const [failed, setFailed] = useState<any[]>([])

  /**
   * Check how many students need auth accounts
   */
  const checkStudents = async () => {
    try {
      setChecking(true)
      setError('')
      
      const response = await fetch('/api/admin/bulk-create-auth', {
        method: 'GET'
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check students')
      }
      
      setNeedsAuth(data.count)
      setSuccess(`✅ Found ${data.count} students needing auth accounts`)
    } catch (err: any) {
      setError(`❌ Error: ${err.message}`)
    } finally {
      setChecking(false)
    }
  }

  /**
   * Create auth accounts for all students
   */
  const handleBulkCreate = async () => {
    if (!confirm('Create auth accounts for all students without accounts? This will generate random passwords.')) {
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')
      setCredentials([])
      setFailed([])

      const response = await fetch('/api/admin/bulk-create-auth', {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create auth accounts')
      }

      setCredentials(data.credentials || [])
      setFailed(data.failed || [])
      setSuccess(`✅ Successfully created ${data.count} auth accounts!`)
      setNeedsAuth(0)

    } catch (err: any) {
      setError(`❌ Failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Download credentials as CSV
   */
  const downloadCredentials = () => {
    const csvHeader = 'Full Name,Student Number,Level,Group,Email,Password\n'
    const csvRows = credentials.map(c => 
      `"${c.name}","${c.studentNumber}","${c.level}","${c.group}","${c.email}","${c.password}"`
    ).join('\n')
    const csv = csvHeader + csvRows

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `bulk_student_credentials_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bulk Auth Account Creation</h1>
          <p className="text-gray-600">Create Supabase authentication accounts for all existing students</p>
        </div>

        {/* Warning Banner */}
        <Alert className="border-yellow-200 bg-yellow-50">
          <Shield className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Important:</strong> This will create authentication accounts for all students in your database who don't have one yet. 
            Each student will get an auto-generated email and password. Make sure you download and save the credentials!
          </AlertDescription>
        </Alert>

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

        {/* Check Students Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Step 1: Check Students
            </CardTitle>
            <CardDescription>
              First, check how many students need auth accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button 
                onClick={checkStudents} 
                disabled={checking}
                variant="outline"
              >
                {checking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Check Students
                  </>
                )}
              </Button>

              {needsAuth !== null && (
                <Badge variant={needsAuth > 0 ? "default" : "secondary"} className="text-lg px-4 py-2">
                  {needsAuth} students need auth accounts
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Create Auth Accounts Card */}
        {needsAuth !== null && needsAuth > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <UserPlus className="h-5 w-5" />
                Step 2: Create Auth Accounts
              </CardTitle>
              <CardDescription className="text-blue-700">
                Create authentication accounts for {needsAuth} students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleBulkCreate} 
                disabled={loading}
                size="lg"
                className="w-full md:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Accounts...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create {needsAuth} Auth Accounts
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results Display */}
        {credentials.length > 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-green-900">
                    ✅ {credentials.length} Auth Accounts Created!
                  </CardTitle>
                  <CardDescription className="text-green-700">
                    Download the credentials and share them with students
                  </CardDescription>
                </div>
                <Button
                  onClick={downloadCredentials}
                  variant="default"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download All Credentials
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {credentials.map((cred, index) => (
                  <Card key={index} className="bg-white">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-gray-600">Name</p>
                          <p className="font-medium">{cred.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Number</p>
                          <p className="font-medium">{cred.studentNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Level</p>
                          <Badge variant="secondary">{cred.level}</Badge>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Group</p>
                          <Badge className="bg-green-100 text-green-700">{cred.group}</Badge>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Email</p>
                          <p className="font-medium text-blue-600 truncate text-xs">{cred.email}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Password</p>
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

        {/* Failed Students */}
        {failed.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-lg text-red-900">
                ❌ {failed.length} Failed
              </CardTitle>
              <CardDescription className="text-red-700">
                These students could not be processed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {failed.map((f, index) => (
                  <Alert key={index} variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{f.name}</strong> ({f.studentNumber}): {f.error}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">What this does:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Finds all students in your database without authentication accounts</li>
                  <li>Generates email addresses from their names (e.g., john.doe@university.edu)</li>
                  <li>Creates random secure passwords (8 characters, alphanumeric)</li>
                  <li>Creates Supabase Auth accounts for each student</li>
                  <li>Stores credentials in the database for admin reference</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">After creation:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li><strong>Download the CSV file</strong> - contains all credentials</li>
                  <li><strong>Distribute to students</strong> - via email, print, or secure method</li>
                  <li><strong>Students can login immediately</strong> - using their email and password</li>
                  <li><strong>Credentials are saved</strong> - accessible in the database if needed</li>
                </ul>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Security Note:</strong> Passwords are auto-generated and secure. However, you should advise 
                  students to change their passwords after first login.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}

