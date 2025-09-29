'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RuleService, CreateRuleData, Rule } from '@/lib/ruleService'
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  Clock,
  Users,
  Building,
  Loader2,
  AlertCircle,
  CheckCircle,
  Code,
  Shield
} from 'lucide-react'

export default function RulesManagementPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState<CreateRuleData>({
    name: '',
    type: 'blackout',
    payload: {}
  })

  const [payloadJson, setPayloadJson] = useState('{}')

  // Load rules on component mount
  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    try {
      setLoading(true)
      const data = await RuleService.getAllRules()
      setRules(data)
    } catch (error: any) {
      setError('Failed to load rules: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError('')
    setSuccess('')

    try {
      // Parse JSON payload
      const parsedPayload = JSON.parse(payloadJson)

      const ruleData = {
        ...formData,
        payload: parsedPayload
      }

      if (editingRule) {
        await RuleService.updateRule({
          id: editingRule.id,
          ...ruleData
        })
        setSuccess('Rule updated successfully!')
      } else {
        await RuleService.createRule(ruleData)
        setSuccess('Rule created successfully!')
      }
      
      await loadRules()
      resetForm()
      setIsAddDialogOpen(false)
    } catch (error: any) {
      setError('Failed to save rule: ' + error.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return

    try {
      await RuleService.deleteRule(id)
      setSuccess('Rule deleted successfully!')
      await loadRules()
    } catch (error: any) {
      setError('Failed to delete rule: ' + error.message)
    }
  }

  const handleEdit = (rule: Rule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      type: rule.type,
      payload: rule.payload
    })
    setPayloadJson(JSON.stringify(rule.payload, null, 2))
    setIsAddDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'blackout',
      payload: {}
    })
    setPayloadJson('{}')
    setEditingRule(null)
  }

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case 'blackout':
        return <Clock className="h-4 w-4" />
      case 'capacity':
        return <Users className="h-4 w-4" />
      case 'room':
        return <Building className="h-4 w-4" />
      case 'policy':
        return <Shield className="h-4 w-4" />
      default:
        return <Settings className="h-4 w-4" />
    }
  }

  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case 'blackout':
        return 'bg-red-100 text-red-800'
      case 'capacity':
        return 'bg-blue-100 text-blue-800'
      case 'room':
        return 'bg-green-100 text-green-800'
      case 'policy':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.type.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || rule.type === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rules Management</h1>
            <p className="text-gray-600">Manage scheduling rules and constraints</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingRule ? 'Edit Rule' : 'Add New Rule'}
                </DialogTitle>
                <DialogDescription>
                  {editingRule ? 'Update rule configuration' : 'Create a new scheduling rule'}
                </DialogDescription>
              </DialogHeader>
              
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

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Rule Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., No Friday Classes"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="type">Rule Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rule type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blackout">Blackout Times</SelectItem>
                      <SelectItem value="capacity">Room Capacity</SelectItem>
                      <SelectItem value="room">Room Assignment</SelectItem>
                      <SelectItem value="policy">General Policy</SelectItem>
                      <SelectItem value="custom">Custom Rule</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="payload">Rule Configuration (JSON) *</Label>
                  <Textarea
                    id="payload"
                    value={payloadJson}
                    onChange={(e) => setPayloadJson(e.target.value)}
                    placeholder='{"days": ["Friday"], "reason": "Prayer day"}'
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter valid JSON configuration for this rule
                  </p>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={formLoading}>
                    {formLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingRule ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingRule ? 'Update Rule' : 'Create Rule'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search rules..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="blackout">Blackout</SelectItem>
                    <SelectItem value="capacity">Capacity</SelectItem>
                    <SelectItem value="room">Room</SelectItem>
                    <SelectItem value="policy">Policy</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

        {/* Rules Table */}
        <Card>
          <CardHeader>
            <CardTitle>Rules ({filteredRules.length})</CardTitle>
            <CardDescription>Manage all scheduling rules and constraints</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading rules...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Configuration</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No rules found. Create your first rule to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>
                          <Badge className={getRuleTypeColor(rule.type)}>
                            <div className="flex items-center space-x-1">
                              {getRuleTypeIcon(rule.type)}
                              <span className="capitalize">{rule.type}</span>
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <code className="text-xs bg-gray-100 p-1 rounded">
                              {JSON.stringify(rule.payload).substring(0, 50)}
                              {JSON.stringify(rule.payload).length > 50 && '...'}
                            </code>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(rule.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(rule)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(rule.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Settings className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">{rules.length}</p>
                  <p className="text-sm text-gray-600">Total Rules</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">
                    {rules.filter(r => r.type === 'blackout').length}
                  </p>
                  <p className="text-sm text-gray-600">Blackout Rules</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">
                    {rules.filter(r => r.type === 'capacity').length}
                  </p>
                  <p className="text-sm text-gray-600">Capacity Rules</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p4">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">
                    {rules.filter(r => r.type === 'policy').length}
                  </p>
                  <p className="text-sm text-gray-600">Policy Rules</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
