import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SettingsPage from './page'

// Mock clipboard API
global.navigator.clipboard = {
  writeText: vi.fn(),
} as unknown as Clipboard

// Mock window.location.reload
Object.defineProperty(window, 'location', {
  writable: true,
  value: { reload: vi.fn() },
})

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Navigation', () => {
    it('renders the settings page with header', () => {
      render(<SettingsPage />)
      
      // Check for the h1 heading specifically
      expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
      expect(screen.getByText('Manage your application preferences and configurations')).toBeInTheDocument()
    })

    it('renders all category navigation items', () => {
      render(<SettingsPage />)
      
      // Use getAllByText and check at least one exists for each
      expect(screen.getAllByText('General').length).toBeGreaterThan(0)
      expect(screen.getByText('User Management')).toBeInTheDocument()
      expect(screen.getByText('Notifications')).toBeInTheDocument()
      expect(screen.getByText('Integrations')).toBeInTheDocument()
      expect(screen.getByText('Security')).toBeInTheDocument()
    })

    it('switches between categories when clicked', () => {
      render(<SettingsPage />)
      
      // Default is General
      expect(screen.getByText('Application Details')).toBeInTheDocument()
      
      // Click on Users
      fireEvent.click(screen.getByText('User Management'))
      expect(screen.getByText('Invite User')).toBeInTheDocument()
      
      // Click on Notifications
      fireEvent.click(screen.getByText('Notifications'))
      expect(screen.getByText('Email Notifications')).toBeInTheDocument()
      
      // Click on Integrations
      fireEvent.click(screen.getByText('Integrations'))
      expect(screen.getAllByText('API Key')[0]).toBeInTheDocument()
      
      // Click on Security
      fireEvent.click(screen.getByText('Security'))
      expect(screen.getByText('Password Policy')).toBeInTheDocument()
    })

    it('shows breadcrumb with current category', () => {
      render(<SettingsPage />)
      
      // Check breadcrumb is present (in nav element)
      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
      expect(nav.textContent).toContain('general')
      
      // Switch category
      fireEvent.click(screen.getByText('User Management'))
      expect(nav.textContent).toContain('users')
    })
  })

  describe('General Settings', () => {
    it('renders application details form', () => {
      render(<SettingsPage />)
      
      expect(screen.getByLabelText('Application Name')).toBeInTheDocument()
      expect(screen.getByText('Logo')).toBeInTheDocument()
    })

    it('allows changing application name', () => {
      render(<SettingsPage />)
      
      const input = screen.getByLabelText('Application Name')
      fireEvent.change(input, { target: { value: 'New App Name' } })
      
      expect(input).toHaveValue('New App Name')
    })

    it('renders regional settings', () => {
      render(<SettingsPage />)
      
      expect(screen.getByText('Regional Settings')).toBeInTheDocument()
      expect(screen.getByLabelText('Timezone')).toBeInTheDocument()
      expect(screen.getByLabelText('Date Format')).toBeInTheDocument()
      expect(screen.getByLabelText('Language')).toBeInTheDocument()
    })
  })

  describe('User Management', () => {
    beforeEach(() => {
      render(<SettingsPage />)
      fireEvent.click(screen.getByText('User Management'))
    })

    it('renders user list', () => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
      expect(screen.getByText('admin@apme.ro')).toBeInTheDocument()
      expect(screen.getByText('John Smith')).toBeInTheDocument()
    })

    it('allows inviting new users', () => {
      const emailInput = screen.getByPlaceholderText('Enter email address')
      fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } })
      
      // Find the actual Invite button by looking for the one that's not disabled and has the icon
      const allButtons = screen.getAllByRole('button')
      const inviteButton = allButtons.find(btn => 
        btn.textContent?.toLowerCase().includes('invite') && 
        !btn.className.includes('w-full flex items-center') // Exclude sidebar nav button
      )
      if (inviteButton) {
        fireEvent.click(inviteButton)
      }
      
      // The user's name (from email prefix) should appear in the list
      expect(screen.getByText('newuser')).toBeInTheDocument()
    })

    it('shows role permissions overview', () => {
      expect(screen.getByText('Role Permissions')).toBeInTheDocument()
      // Check for role headings (h4 elements)
      const headings = screen.getAllByRole('heading', { level: 4 })
      expect(headings.some(h => h.textContent === 'Admin')).toBe(true)
      expect(headings.some(h => h.textContent === 'Editor')).toBe(true)
      expect(headings.some(h => h.textContent === 'Viewer')).toBe(true)
    })

    it('allows removing users', () => {
      const initialUserCount = screen.getAllByText(/@apme\.ro/).length
      
      // Find and click the first delete button
      const deleteButtons = screen.getAllByRole('button', { name: '' })
      const deleteButton = deleteButtons.find(btn => btn.querySelector('svg'))
      if (deleteButton) {
        fireEvent.click(deleteButton)
      }
      
      // User should be removed
      expect(screen.getAllByText(/@apme\.ro/).length).toBeLessThan(initialUserCount)
    })
  })

  describe('Notifications Settings', () => {
    beforeEach(() => {
      render(<SettingsPage />)
      fireEvent.click(screen.getByText('Notifications'))
    })

    it('renders email notification toggles', () => {
      expect(screen.getByText('Enable Email Notifications')).toBeInTheDocument()
      expect(screen.getByText('New Submission')).toBeInTheDocument()
      expect(screen.getByText('Assignment Failures')).toBeInTheDocument()
    })

    it('renders email digest frequency dropdown', () => {
      expect(screen.getByText('Email Digest Frequency')).toBeInTheDocument()
    })

    it('renders push notification settings', () => {
      expect(screen.getByText('Push Notifications')).toBeInTheDocument()
      expect(screen.getByText('Enable Push Notifications')).toBeInTheDocument()
    })
  })

  describe('Integrations Settings', () => {
    beforeEach(() => {
      render(<SettingsPage />)
      fireEvent.click(screen.getByText('Integrations'))
    })

    it('renders API key section', () => {
      // API Key appears multiple times (title and label), so check at least one exists
      expect(screen.getAllByText('API Key')[0]).toBeInTheDocument()
      // Find the Copy button by role since there are multiple buttons
      const copyButtons = screen.getAllByRole('button', { name: /copy/i })
      expect(copyButtons.length).toBeGreaterThan(0)
    })

    it('allows copying API key', async () => {
      const copyButtons = screen.getAllByRole('button', { name: /copy/i })
      fireEvent.click(copyButtons[0])
      
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    })

    it('renders webhook configuration', () => {
      expect(screen.getByText('Webhooks')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('https://your-app.com/webhook')).toBeInTheDocument()
    })

    it('allows adding webhooks', () => {
      const urlInput = screen.getByPlaceholderText('https://your-app.com/webhook')
      fireEvent.change(urlInput, { target: { value: 'https://example.com/webhook' } })
      
      const addButton = screen.getByRole('button', { name: /add webhook/i })
      fireEvent.click(addButton)
      
      // Check that webhook was added (may be multiple if existing ones match)
      const webhookElements = screen.getAllByText('https://example.com/webhook')
      expect(webhookElements.length).toBeGreaterThan(0)
    })
  })

  describe('Security Settings', () => {
    beforeEach(() => {
      render(<SettingsPage />)
      fireEvent.click(screen.getByText('Security'))
    })

    it('renders password policy settings', () => {
      expect(screen.getByText('Password Policy')).toBeInTheDocument()
      expect(screen.getByLabelText('Minimum Password Length')).toBeInTheDocument()
    })

    it('renders password requirement toggles', () => {
      expect(screen.getByText('Require Uppercase Letters')).toBeInTheDocument()
      expect(screen.getByText('Require Numbers')).toBeInTheDocument()
      expect(screen.getByText('Require Special Characters')).toBeInTheDocument()
    })

    it('renders 2FA settings', () => {
      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument()
      expect(screen.getByText('Enforce 2FA for Admins')).toBeInTheDocument()
    })

    it('renders session timeout settings', () => {
      expect(screen.getByText('Session Settings')).toBeInTheDocument()
      expect(screen.getByLabelText('Session Timeout (minutes)')).toBeInTheDocument()
    })
  })

  describe('Save Functionality', () => {
    it('shows save button', () => {
      render(<SettingsPage />)
      
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    })

    it('shows cancel button', () => {
      render(<SettingsPage />)
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('clicking cancel reloads page', () => {
      render(<SettingsPage />)
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)
      
      expect(window.location.reload).toHaveBeenCalled()
    })

    it('shows loading state when saving', async () => {
      render(<SettingsPage />)
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(saveButton)
      
      expect(screen.getByText('Saving...')).toBeInTheDocument()
      
      // Wait for save to complete
      await waitFor(() => {
        expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('Save/Cancel Actions', () => {
    it('has working save and cancel buttons in each category', () => {
      render(<SettingsPage />)
      
      const categories = ['User Management', 'Notifications', 'Integrations', 'Security']
      
      categories.forEach(category => {
        fireEvent.click(screen.getByText(category))
        
        expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      })
    })
  })
})
