'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Plus, 
  Search, 
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Template {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  tags: string[]
  createdAt: string
  updatedAt: string
  versions: Array<{
    id: string
    versionNumber: number
    isPublished: boolean
    name: string
  }>
  _count: {
    assignments: number
  }
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTemplate, setNewTemplate] = useState({ slug: '', name: '', description: '' })

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      
      const response = await fetch(`/api/templates?${params}`)
      const data = await response.json()
      setTemplates(data.templates)
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault()
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate)
      })
      
      if (response.ok) {
        setShowCreateModal(false)
        setNewTemplate({ slug: '', name: '', description: '' })
        fetchTemplates()
      }
    } catch (error) {
      console.error('Error creating template:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-gray-500 mt-1">Manage email templates and versions</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Template
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              fetchTemplates()
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No templates yet. Create your first template to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div 
              key={template.id} 
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      {template.versions.some(v => v.isPublished) && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{template.slug}</p>
                  </div>
                  
                  <div className="relative group">
                    <button className="p-2 hover:bg-gray-100 rounded-lg">
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                    
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <Link
                        href={`/dashboard/templates/${template.id}`}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Link>
                      <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <Copy className="w-4 h-4" />
                        Duplicate
                      </button>
                      <hr className="my-1" />
                      <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                
                {template.description && (
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2">{template.description}</p>
                )}
                
                <div className="mt-4 flex flex-wrap gap-2">
                  {template.tags.map((tag) => (
                    <span 
                      key={tag}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-500">
                      {template.versions.length} version{template.versions.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-gray-500">
                      {template._count.assignments} assignment{template._count.assignments !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    template.status === 'active' && 'bg-green-100 text-green-700',
                    template.status === 'draft' && 'bg-yellow-100 text-yellow-700',
                    template.status === 'archived' && 'bg-gray-100 text-gray-700'
                  )}>
                    {template.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-gray-900">Create New Template</h2>
            
            <form onSubmit={createTemplate} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Slug</label>
                <input
                  type="text"
                  value={newTemplate.slug}
                  onChange={(e) => setNewTemplate({ ...newTemplate, slug: e.target.value })}
                  placeholder="e.g., welcome-email"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Unique identifier for this template</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="e.g., Welcome Email"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Brief description of this template..."
                  rows={3}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
