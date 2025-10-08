'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { useAuth } from '@/contexts/AuthContext'
import { FacultyService, Faculty } from '@/lib/facultyService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  MessageSquare,
  Send,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react'

export default function FacultyFeedbackPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [faculty, setFaculty] = useState<Faculty | null>(null)
  const [comment, setComment] = useState('')
  const [requestedChanges, setRequestedChanges] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (user?.id) {
      loadFacultyData()
    }
  }, [user])

  const loadFacultyData = async () => {
    if (!user?.id) return

    try {
      const facultyData = await FacultyService.getFacultyByUserId(user.id)
      if (facultyData) {
        setFaculty(facultyData)
      }
    } catch (error: any) {
      console.error('Error loading faculty data:', error)
    }
  }

  const handleSubmit = async () => {
    if (!faculty || !comment.trim()) {
      setError('Please enter your feedback')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      // For now, we'll submit without a specific schedule version ID
      // In production, you'd fetch the current active schedule version
      const scheduleVersionId = 'current' // TODO: Get actual schedule version ID

      await FacultyService.submitFeedback(
        faculty.id,
        scheduleVersionId,
        comment.trim(),
        requestedChanges.trim() || undefined
      )

      setSuccess('Feedback submitted successfully! The scheduling committee will review your request.')
      setComment('')
      setRequestedChanges('')

    } catch (error: any) {
      console.error('Error submitting feedback:', error)
      setError('Failed to submit feedback: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Submit Schedule Feedback</h1>
          {faculty && (
            <p className="text-gray-600">
              Provide feedback or request changes to your teaching schedule
            </p>
          )}
        </div>

        {/* Alerts */}
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

        {/* Feedback Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Your Feedback
            </CardTitle>
            <CardDescription>
              Share your thoughts on the current schedule or request specific changes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">General Feedback *</label>
              <Textarea
                placeholder="e.g., I have a conflict with Monday 10 AM class due to a recurring meeting..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Describe any issues, conflicts, or general comments about your schedule
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Requested Changes (Optional)</label>
              <Textarea
                placeholder="e.g., Please move CS301 from Monday 10 AM to Wednesday 2 PM..."
                value={requestedChanges}
                onChange={(e) => setRequestedChanges(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Specify exact changes you'd like to see in your schedule
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading || !comment.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Feedback
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>What happens next?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 rounded">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Review Process</p>
                  <p className="text-sm text-gray-600">
                    The scheduling committee will review your feedback within 2-3 business days
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-2 bg-green-100 rounded">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Response</p>
                  <p className="text-sm text-gray-600">
                    You'll receive a response via email about any changes or clarifications needed
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-2 bg-purple-100 rounded">
                  <CheckCircle className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Implementation</p>
                  <p className="text-sm text-gray-600">
                    Approved changes will be implemented in the next schedule update
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card>
          <CardHeader>
            <CardTitle>Tips for Effective Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
              <li>Be specific about time conflicts and reasons</li>
              <li>Provide alternative time slots if possible</li>
              <li>Mention any recurring commitments that affect your availability</li>
              <li>Indicate the priority/urgency of your request</li>
              <li>Keep feedback professional and constructive</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}

