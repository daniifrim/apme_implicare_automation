'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'

interface DirtyState {
  [key: string]: boolean
}

interface UnsavedChangesContextType {
  isDirty: boolean
  markDirty: (section: string) => void
  markClean: (section: string) => void
  resetDirty: () => void
  dirtySections: string[]
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | null>(null)

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const [dirtyState, setDirtyState] = useState<DirtyState>({})

  const markDirty = useCallback((section: string) => {
    setDirtyState(prev => ({ ...prev, [section]: true }))
  }, [])

  const markClean = useCallback((section: string) => {
    setDirtyState(prev => {
      const newState = { ...prev }
      delete newState[section]
      return newState
    })
  }, [])

  const resetDirty = useCallback(() => {
    setDirtyState({})
  }, [])

  const dirtySections = Object.keys(dirtyState).filter(key => dirtyState[key])
  const isDirty = dirtySections.length > 0

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  return (
    <UnsavedChangesContext.Provider 
      value={{ isDirty, markDirty, markClean, resetDirty, dirtySections }}
    >
      {children}
    </UnsavedChangesContext.Provider>
  )
}

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext)
  if (!context) {
    throw new Error('useUnsavedChanges must be used within UnsavedChangesProvider')
  }
  return context
}

// Hook for tracking form dirty state
export function useFormDirty<T extends Record<string, unknown>>(
  section: string,
  initialValues: T,
  currentValues: T
) {
  const { markDirty, markClean } = useUnsavedChanges()

  useEffect(() => {
    const isDirty = JSON.stringify(initialValues) !== JSON.stringify(currentValues)
    if (isDirty) {
      markDirty(section)
    } else {
      markClean(section)
    }
  }, [section, initialValues, currentValues, markDirty, markClean])
}
