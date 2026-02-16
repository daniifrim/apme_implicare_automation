'use client'

import { useState } from 'react'
import { Users, UserPlus, Trash2, Shield, Mail, Lock, RotateCcw, Ban, CheckCircle, MoreHorizontal, Search, Filter } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useFormDirty } from '@/hooks/use-unsaved-changes'
import { User, UserRole, ROLE_PERMISSIONS, UserStatus } from '@/types/settings'

interface UserManagementPanelProps {
  initialUsers?: User[]
  onUsersChange?: (users: User[]) => void
}

const INITIAL_USERS: User[] = [
  { id: '1', name: 'Jane Doe', email: 'admin@apme.ro', role: 'admin', status: 'active', lastLoginAt: '2024-01-15T10:30:00Z' },
  { id: '2', name: 'John Smith', email: 'editor@apme.ro', role: 'editor', status: 'active', lastLoginAt: '2024-01-14T15:20:00Z' },
  { id: '3', name: 'Alice Johnson', email: 'viewer@apme.ro', role: 'viewer', status: 'pending', invitedAt: '2024-01-15T08:00:00Z' },
  { id: '4', name: 'Bob Wilson', email: 'bob@example.com', role: 'editor', status: 'disabled', lastLoginAt: '2024-01-10T09:00:00Z' },
]

export function UserManagementPanel({ 
  initialUsers = INITIAL_USERS,
  onUsersChange 
}: UserManagementPanelProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('editor')
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all')
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  useFormDirty('users', initialUsers as unknown as Record<string, unknown>, users as unknown as Record<string, unknown>)

  const handleUsersChange = (newUsers: User[]) => {
    setUsers(newUsers)
    onUsersChange?.(newUsers)
  }

  const handleInviteUser = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) return
    
    setActionInProgress('invite')
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const newUser: User = {
      id: Date.now().toString(),
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      status: 'pending',
      invitedAt: new Date().toISOString(),
    }
    
    handleUsersChange([...users, newUser])
    setInviteEmail('')
    setInviteRole('editor')
    setInviteDialogOpen(false)
    setActionInProgress(null)
  }

  const handleRemoveUser = (userId: string) => {
    handleUsersChange(users.filter(u => u.id !== userId))
  }

  const handleToggleUserStatus = (userId: string) => {
    handleUsersChange(users.map(u => {
      if (u.id !== userId) return u
      return {
        ...u,
        status: u.status === 'active' ? 'disabled' : 'active'
      }
    }))
  }

  const handleResendInvite = async (userId: string) => {
    setActionInProgress(userId)
    await new Promise(resolve => setTimeout(resolve, 800))
    
    handleUsersChange(users.map(u => {
      if (u.id !== userId) return u
      return { ...u, invitedAt: new Date().toISOString() }
    }))
    setActionInProgress(null)
  }

  const handleResetPassword = async (userId: string) => {
    setActionInProgress(`reset-${userId}`)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setActionInProgress(null)
    // In real implementation, this would call an API to send reset email
  }

  const handleChangeRole = (userId: string, role: UserRole) => {
    handleUsersChange(users.map(u => 
      u.id === userId ? { ...u, role } : u
    ))
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const activeCount = users.filter(u => u.status === 'active').length
  const pendingCount = users.filter(u => u.status === 'pending').length
  const disabledCount = users.filter(u => u.status === 'disabled').length

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Active Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Pending Invites</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{disabledCount}</div>
            <p className="text-xs text-muted-foreground">Disabled</p>
          </CardContent>
        </Card>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogTrigger asChild>
          <Button className="w-full sm:w-auto">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation email to a new team member.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v: UserRole) => setInviteRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {ROLE_PERMISSIONS[inviteRole].description}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleInviteUser} 
              disabled={!inviteEmail || !inviteEmail.includes('@') || actionInProgress === 'invite'}
            >
              {actionInProgress === 'invite' ? (
                <>Sending...🔄</>
              ) : (
                <>Send Invitation</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Members
          </CardTitle>
          <CardDescription>Manage existing users and their permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as UserStatus | 'all')}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found matching your criteria.
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div 
                  key={user.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{user.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      {user.lastLoginAt && (
                        <p className="text-xs text-muted-foreground">
                          Last login: {new Date(user.lastLoginAt).toLocaleDateString()}
                        </p>
                      )}
                      {user.invitedAt && user.status === 'pending' && (
                        <p className="text-xs text-muted-foreground">
                          Invited: {new Date(user.invitedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={
                        user.status === 'active' ? 'default' : 
                        user.status === 'pending' ? 'secondary' : 'outline'
                      }
                      className={user.status === 'disabled' ? 'text-muted-foreground' : ''}
                    >
                      {user.status}
                    </Badge>

                    <Select 
                      value={user.role} 
                      onValueChange={(value: UserRole) => handleChangeRole(user.id, value)}
                      disabled={user.status === 'disabled'}
                    >
                      <SelectTrigger className="w-[110px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {user.status === 'pending' && (
                          <DropdownMenuItem 
                            onClick={() => handleResendInvite(user.id)}
                            disabled={actionInProgress === user.id}
                          >
                            <Mail className="w-4 h-4 mr-2" />
                            {actionInProgress === user.id ? 'Resending...' : 'Resend Invite'}
                          </DropdownMenuItem>
                        )}
                        
                        {user.status !== 'pending' && (
                          <DropdownMenuItem 
                            onClick={() => handleResetPassword(user.id)}
                            disabled={actionInProgress === `reset-${user.id}`}
                          >
                            <Lock className="w-4 h-4 mr-2" />
                            {actionInProgress === `reset-${user.id}` ? 'Sending...' : 'Reset Password'}
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => handleToggleUserStatus(user.id)}>
                          {user.status === 'active' ? (
                            <>
                              <Ban className="w-4 h-4 mr-2" />
                              Disable User
                            </>
                          ) : user.status === 'disabled' ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Enable User
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Revoke Invite
                            </>
                          )}
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem 
                          onClick={() => handleRemoveUser(user.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Role Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Role Permissions
          </CardTitle>
          <CardDescription>Overview of what each role can do</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(Object.keys(ROLE_PERMISSIONS) as UserRole[]).map((role) => (
              <div key={role} className="p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold capitalize">{ROLE_PERMISSIONS[role].label}</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {ROLE_PERMISSIONS[role].description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {ROLE_PERMISSIONS[role].permissions.map((perm) => (
                    <Badge key={perm} variant="outline" className="text-xs">
                      {perm}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
