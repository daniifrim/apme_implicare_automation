import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { 
  FileText, 
  Mail, 
  CheckCircle, 
  Clock,
  ArrowRight
} from 'lucide-react'
import type { Prisma } from '@prisma/client'

async function getStats() {
  const [
    totalSubmissions,
    pendingSubmissions,
    processedSubmissions,
    totalTemplates,
    activeTemplates
  ] = await Promise.all([
    prisma.submission.count(),
    prisma.submission.count({ where: { status: 'pending' } }),
    prisma.submission.count({ where: { status: 'processed' } }),
    prisma.template.count(),
    prisma.template.count({ where: { status: 'active' } })
  ])

  return {
    totalSubmissions,
    pendingSubmissions,
    processedSubmissions,
    totalTemplates,
    activeTemplates
  }
}

type SubmissionWithAssignments = Prisma.SubmissionGetPayload<{
  include: {
    assignments: {
      include: {
        template: true
      }
    }
  }
}>

async function getRecentSubmissions(): Promise<SubmissionWithAssignments[]> {
  return prisma.submission.findMany({
    take: 5,
    orderBy: { submissionTime: 'desc' },
    include: {
      assignments: {
        include: {
          template: true
        }
      }
    }
  })
}

export default async function DashboardPage() {
  const stats = await getStats()
  const recentSubmissions = await getRecentSubmissions()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your email automation system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Submissions</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalSubmissions}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats.pendingSubmissions}</p>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Processed</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.processedSubmissions}</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Templates</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{stats.activeTemplates}</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Submissions</h2>
          <Link 
            href="/dashboard/submissions"
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="divide-y divide-gray-200">
          {recentSubmissions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No submissions yet
            </div>
          ) : (
            recentSubmissions.map((submission) => (
              <div key={submission.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {submission.firstName} {submission.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{submission.email}</p>
                  </div>
                  <div className="text-right">
                    <span className={`
                      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${submission.status === 'processed' 
                        ? 'bg-green-100 text-green-800' 
                        : submission.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                      }
                    `}>
                      {submission.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(submission.submissionTime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {submission.assignments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {submission.assignments.map((assignment) => (
                      <span 
                        key={assignment.id}
                        className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700"
                      >
                        {assignment.template.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
