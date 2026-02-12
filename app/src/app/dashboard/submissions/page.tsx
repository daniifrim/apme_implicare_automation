'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
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
  Square
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
                    className={cn(
                      "hover:bg-gray-50",
                      selectedIds.has(submission.id) && "bg-blue-50"
                    )}
                  >
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleSelection(submission.id)}
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
                      <Link 
                        href={`/dashboard/submissions/${submission.id}`}
                        className="block"
                      >
                        <p className="font-medium text-gray-900">
                          {submission.firstName} {submission.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{submission.email}</p>
                      </Link>
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
    </div>
  )
}
