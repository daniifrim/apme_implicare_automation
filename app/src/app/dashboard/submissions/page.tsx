// ABOUTME: Renders the submissions list with filters, bulk actions, and detail modal
// ABOUTME: Handles fetching submissions data and presenting read-only submission details
'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  Loader2,
  Download,
  RotateCw,
  X,
  MapPin,
  CheckSquare,
  Square,
  Edit,
  Layers,
  FileText,
  Mail,
  Phone,
  Building2,
  MapPinned
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Submission {
  id: string
  submissionId: string
  email: string | null
  firstName: string | null
  lastName: string | null
  locationType: string | null
  city: string | null
  country: string | null
  phone: string | null
  status: string
  submissionTime: string
  assignments: Array<{
    id: string
    template: { name: string }
    status: string
  }>
}

interface SubmissionDetail {
  id: string
  submissionId: string
  email: string | null
  firstName: string | null
  lastName: string | null
  phone: string | null
  locationType: string | null
  city: string | null
  country: string | null
  church: string | null
  status: string
  submissionTime: string
  assignments: Array<{
    id: string
    template: { name: string }
    status: string
  }>
  answers: Array<{
    id: string
    value: string | null
    rawValue: unknown
    question: { id: string; name: string }
  }>
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [location, setLocation] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionDetail | null>(null)

  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (status) params.set('status', status)
      if (location) params.set('location', location)
      if (search) params.set('search', search)
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)

      const response = await fetch(`/api/submissions?${params}`)
      const data = await response.json()
      
      setSubmissions(data.submissions)
      setPagination(data.pagination)
      // Clear selection when data changes
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Error fetching submissions:', error)
    } finally {
      setLoading(false)
    }
  }, [page, status, location, search, fromDate, toDate])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchSubmissions()
  }

  const clearFilters = () => {
    setSearch('')
    setStatus('')
    setLocation('')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  const hasActiveFilters = search || status || location || fromDate || toDate

  const exportToCSV = () => {
    if (!submissions.length) return

    const headers = [
      'Submission ID',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Location Type',
      'City',
      'Country',
      'Status',
      'Submission Date',
      'Assignment Count'
    ]

    const rows = submissions.map(s => [
      s.submissionId,
      s.firstName || '',
      s.lastName || '',
      s.email || '',
      s.phone || '',
      s.locationType || '',
      s.city || '',
      s.country || '',
      s.status,
      new Date(s.submissionTime).toISOString(),
      s.assignments.length.toString()
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    const dateRange = fromDate || toDate 
      ? `_${fromDate || 'start'}_to_${toDate || 'end'}`
      : ''
    
    link.setAttribute('href', url)
    link.setAttribute('download', `submissions${dateRange}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleAllSelection = () => {
    if (selectedIds.size === submissions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(submissions.map(s => s.id)))
    }
  }

  const handleBulkReprocess = async () => {
    if (selectedIds.size === 0) return
    
    setBulkProcessing(true)
    try {
      const response = await fetch('/api/submissions/bulk/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionIds: Array.from(selectedIds) })
      })

      if (!response.ok) {
        throw new Error('Bulk reprocess failed')
      }

      const result = await response.json()
      
      // Refresh the list
      await fetchSubmissions()
      
      // Show success message (you could use a toast here)
      alert(`Re-processed ${result.processed} submissions successfully`)
    } catch (error) {
      console.error('Bulk reprocess error:', error)
      alert('Failed to re-process submissions')
    } finally {
      setBulkProcessing(false)
    }
  }

  const openSubmissionDetail = async (submissionId: string) => {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailError(null)
    try {
      const response = await fetch(`/api/submissions/${submissionId}`)
      if (!response.ok) {
        throw new Error('Failed to load submission details')
      }
      const data = await response.json()
      setSelectedSubmission(data)
    } catch (error) {
      setSelectedSubmission(null)
      setDetailError(error instanceof Error ? error.message : 'Failed to load submission details')
    } finally {
      setDetailLoading(false)
    }
  }

  const closeSubmissionDetail = () => {
    setDetailOpen(false)
    setDetailError(null)
  }

  const formatAnswerValue = (value: string | null, rawValue: unknown) => {
    if (value && value.trim().length > 0) {
      return { display: value, rawDisplay: rawValue != null && rawValue !== value ? JSON.stringify(rawValue) : null }
    }

    if (rawValue == null) {
      return { display: '—', rawDisplay: null }
    }

    try {
      return { display: JSON.stringify(rawValue), rawDisplay: null }
    } catch {
      return { display: String(rawValue), rawDisplay: null }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Submissions</h1>
        <p className="text-gray-500 mt-1">Manage and review form submissions</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Row 1: Search and Status */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone, or submission ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  setPage(1)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="processed">Processed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-400" />
              <select
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value)
                  setPage(1)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Locations</option>
                <option value="romania">Romania</option>
                <option value="diaspora">Diaspora</option>
              </select>
            </div>
          </div>

          {/* Row 2: Date Range */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value)
                  setPage(1)
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value)
                  setPage(1)
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <X className="w-4 h-4" />
                Clear filters
              </button>
            )}

            <div className="flex-1" />

            <button
              type="button"
              onClick={exportToCSV}
              disabled={!submissions.length}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </form>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            <span className="text-blue-900 font-medium">
              {selectedIds.size} submission{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          
          <button
            onClick={handleBulkReprocess}
            disabled={bulkProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
          >
            {bulkProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RotateCw className="w-4 h-4" />
                Re-process Selected
              </>
            )}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No submissions found
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">
                    <button
                      onClick={toggleAllSelection}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      {selectedIds.size === submissions.length && submissions.length > 0 ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Person
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Templates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {submissions.map((submission) => (
                  <tr 
                    key={submission.id} 
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "hover:bg-gray-50 cursor-pointer",
                      selectedIds.has(submission.id) && "bg-blue-50"
                    )}
                    onClick={() => openSubmissionDetail(submission.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openSubmissionDetail(submission.id)
                      }
                    }}
                  >
                    <td className="px-4 py-4">
                      <button
                        onClick={(event) => {
                          event.stopPropagation()
                          toggleSelection(submission.id)
                        }}
                        aria-label={`Select submission ${submission.submissionId}`}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        {selectedIds.has(submission.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="block">
                        <p className="font-medium text-gray-900">
                          {submission.firstName} {submission.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{submission.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {submission.city || submission.country || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {submission.locationType || 'unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        submission.status === 'processed' && 'bg-green-100 text-green-800',
                        submission.status === 'pending' && 'bg-yellow-100 text-yellow-800',
                        submission.status === 'failed' && 'bg-red-100 text-red-800'
                      )}>
                        {submission.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {submission.assignments.map((assignment) => (
                          <span 
                            key={assignment.id}
                            className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700"
                          >
                            {assignment.template.name}
                          </span>
                        ))}
                        {submission.assignments.length === 0 && (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {new Date(submission.submissionTime).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </p>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  <span className="text-sm text-gray-600">
                    Page {page} of {pagination.pages}
                  </span>
                  
                  <button
                    onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                    disabled={page === pagination.pages}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={detailOpen} onOpenChange={(open) => {
        if (!open) {
          closeSubmissionDetail()
        }
      }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto w-full" showCloseButton={false}>
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedSubmission ? `${selectedSubmission.firstName ?? 'Unknown'} ${selectedSubmission.lastName ?? ''}` : 'Submission Details'}</DialogTitle>
          </DialogHeader>
          
          {detailLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          )}

          {detailError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {detailError}
            </div>
          )}

          {!detailLoading && !detailError && selectedSubmission && (
            <div className="space-y-6">
              {/* Header Section */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <h1 className="text-xl font-bold text-slate-900 truncate">
                    {selectedSubmission.firstName} {selectedSubmission.lastName}
                  </h1>
                  <Badge 
                    variant={selectedSubmission.status === 'processed' ? 'default' : 'secondary'}
                    className={cn(
                      'text-xs font-medium flex-shrink-0',
                      selectedSubmission.status === 'processed' && 'bg-green-100 text-green-800',
                      selectedSubmission.status === 'pending' && 'bg-yellow-100 text-yellow-800',
                      selectedSubmission.status === 'failed' && 'bg-red-100 text-red-800'
                    )}
                  >
                    {selectedSubmission.status}
                  </Badge>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Metadata Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Submission ID</p>
                  <p className="text-sm font-bold text-slate-900 font-mono">{selectedSubmission.submissionId}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Submitted</p>
                  <p className="text-sm font-bold text-slate-900">
                    {new Date(selectedSubmission.submissionTime).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Location</p>
                  <p className="text-sm font-bold text-slate-900">
                    {selectedSubmission.city || selectedSubmission.country || '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assignments</p>
                  <p className="text-sm font-bold text-slate-900">{selectedSubmission.assignments.length}</p>
                </div>
              </div>

              {/* Contact & Location Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Info */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    Contact Information
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm font-medium text-slate-900 break-all">{selectedSubmission.email ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="text-sm font-medium text-slate-900">{selectedSubmission.phone ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Church</p>
                        <p className="text-sm font-medium text-slate-900">{selectedSubmission.church ?? '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location Info */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1">
                    <MapPinned className="w-3 h-3" />
                    Location
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Type</p>
                        <p className="text-sm font-medium text-slate-900 capitalize">{selectedSubmission.locationType ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPinned className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">City</p>
                        <p className="text-sm font-medium text-slate-900">{selectedSubmission.city ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPinned className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Country</p>
                        <p className="text-sm font-medium text-slate-900">{selectedSubmission.country ?? '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assignments Section */}
              {selectedSubmission.assignments.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Assignments ({selectedSubmission.assignments.length})
                  </label>
                  <div className="space-y-2">
                    {selectedSubmission.assignments.map((assignment) => (
                      <div 
                        key={assignment.id}
                        className="flex items-center justify-between p-4 bg-gray-50/50 border border-gray-100 rounded-xl"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{assignment.template.name}</p>
                            <p className="text-xs text-gray-500">Template Assignment</p>
                          </div>
                        </div>
                        <Badge 
                          variant="outline"
                          className="text-[10px] font-extrabold uppercase"
                        >
                          {assignment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Answers Section */}
              {selectedSubmission.answers.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                    Answers ({selectedSubmission.answers.length})
                  </label>
                  <div className="space-y-2">
                    {selectedSubmission.answers.map((answer) => {
                      const formatted = formatAnswerValue(answer.value, answer.rawValue)
                      return (
                        <div key={answer.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                          <p className="text-sm font-medium text-slate-900">{answer.question.name}</p>
                          <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap break-words">
                            {formatted.display}
                          </p>
                          {formatted.rawDisplay && (
                            <p className="mt-2 text-xs text-gray-500 font-mono">
                              Raw: {formatted.rawDisplay}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
