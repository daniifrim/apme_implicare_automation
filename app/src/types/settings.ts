export type UserRole = 'admin' | 'editor' | 'viewer'
export type UserStatus = 'active' | 'pending' | 'disabled'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  avatar?: string
  lastLoginAt?: string
  invitedAt?: string
}

export interface Webhook {
  id: string
  url: string
  events: string[]
  status: 'active' | 'inactive'
  lastTriggered?: string
  createdAt?: string
}

export interface GeneralSettings {
  appName: string
  timezone: string
  dateFormat: string
  language: string
  logoUrl?: string
}

export interface NotificationSettings {
  emailEnabled: boolean
  emailOnNewSubmission: boolean
  emailOnAssignmentFailure: boolean
  emailOnUserAction: boolean
  emailDigest: 'realtime' | 'hourly' | 'daily' | 'weekly'
  pushEnabled: boolean
  webhookEnabled: boolean
}

export interface SecuritySettings {
  minPasswordLength: number
  requireUppercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  twoFactorEnabled: boolean
  sessionTimeout: number
  maxLoginAttempts: number
  lockoutDuration: number
}

export interface AutomationSettings {
  autoProcessEnabled: boolean
  autoRetryEnabled: boolean
  maxRetries: number
  retryDelay: number
  processingTimeout: number
  batchSize: number
  maintenanceMode: boolean
}

export interface BackupSettings {
  autoBackupEnabled: boolean
  backupFrequency: 'hourly' | 'daily' | 'weekly'
  backupRetentionDays: number
  includeAttachments: boolean
  lastBackupAt?: string
}

export interface IntegrationSettings {
  apiKey: string
  filloutWebhookSecret?: string
  smtpHost?: string
  smtpPort?: number
  smtpSecure: boolean
  smtpUser?: string
  smtpFrom?: string
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system'
  sidebarCollapsed: boolean
  denseMode: boolean
  accentColor: 'blue' | 'purple' | 'green' | 'orange'
}

export interface SettingsCategory {
  id: string
  label: string
  icon: string
  description: string
}

export const DEFAULT_SETTINGS = {
  general: {
    appName: 'APME Implicare',
    timezone: 'Europe/Bucharest',
    dateFormat: 'DD/MM/YYYY',
    language: 'ro',
  } as GeneralSettings,
  
  notifications: {
    emailEnabled: true,
    emailOnNewSubmission: true,
    emailOnAssignmentFailure: true,
    emailOnUserAction: false,
    emailDigest: 'daily' as const,
    pushEnabled: false,
    webhookEnabled: true,
  } as NotificationSettings,
  
  security: {
    minPasswordLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    twoFactorEnabled: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 30,
  } as SecuritySettings,
  
  automation: {
    autoProcessEnabled: true,
    autoRetryEnabled: true,
    maxRetries: 3,
    retryDelay: 60,
    processingTimeout: 300,
    batchSize: 100,
    maintenanceMode: false,
  } as AutomationSettings,
  
  backup: {
    autoBackupEnabled: true,
    backupFrequency: 'daily' as const,
    backupRetentionDays: 30,
    includeAttachments: true,
  } as BackupSettings,
  
  integration: {
    apiKey: 'sk_live_apme_xxxxxxxxxxxxxxxx',
    smtpSecure: true,
  } as IntegrationSettings,
  
  appearance: {
    theme: 'system' as const,
    sidebarCollapsed: false,
    denseMode: false,
    accentColor: 'blue' as const,
  } as AppearanceSettings,
}

export const ROLE_PERMISSIONS = {
  admin: {
    label: 'Admin',
    description: 'Full access to all settings and data',
    permissions: ['View all data', 'Manage users', 'Configure settings', 'Delete data', 'Manage automations'],
    canAccess: ['all'],
  },
  editor: {
    label: 'Editor',
    description: 'Can manage content and view data',
    permissions: ['View all data', 'Edit templates', 'Manage submissions', 'Cannot delete users'],
    canAccess: ['submissions', 'templates', 'mappings'],
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to data',
    permissions: ['View submissions', 'View templates', 'Cannot edit', 'Cannot configure'],
    canAccess: ['submissions', 'templates'],
  },
} as const

export const WEBHOOK_EVENTS = [
  { value: 'submission.created', label: 'Submission Created' },
  { value: 'submission.updated', label: 'Submission Updated' },
  { value: 'submission.processed', label: 'Submission Processed' },
  { value: 'assignment.completed', label: 'Assignment Completed' },
  { value: 'assignment.failed', label: 'Assignment Failed' },
  { value: 'user.invited', label: 'User Invited' },
  { value: 'user.login', label: 'User Login' },
] as const
