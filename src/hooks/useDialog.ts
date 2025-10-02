import { useState, useCallback, useRef, useEffect } from 'react'

export interface DialogOptions {
  preventBackdropClose?: boolean
  preventEscapeClose?: boolean
  closeOnRouteChange?: boolean
  restoreFocus?: boolean
}

export interface DialogState {
  isOpen: boolean
  options: DialogOptions
}

/**
 * Enhanced Dialog Hook for consistent dialog management
 * Provides unified state management, focus handling, and accessibility features
 */
export function useDialog(defaultOpen = false, defaultOptions: DialogOptions = {}) {
  const [state, setState] = useState<DialogState>({
    isOpen: defaultOpen,
    options: {
      preventBackdropClose: false,
      preventEscapeClose: false,
      closeOnRouteChange: true,
      restoreFocus: true,
      ...defaultOptions
    }
  })

  const previousFocusRef = useRef<HTMLElement | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Store the previously focused element when dialog opens
  const open = useCallback((options?: Partial<DialogOptions>) => {
    if (typeof document !== 'undefined') {
      previousFocusRef.current = document.activeElement as HTMLElement
    }
    
    setState(prev => ({
      isOpen: true,
      options: { ...prev.options, ...options }
    }))
  }, [])

  // Close dialog and restore focus if needed
  const close = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false
    }))

    // Restore focus after closing animation completes
    if (state.options.restoreFocus && previousFocusRef.current) {
      setTimeout(() => {
        previousFocusRef.current?.focus()
      }, 200) // Match the dialog animation duration
    }
  }, [state.options.restoreFocus])

  // Toggle dialog state
  const toggle = useCallback((options?: Partial<DialogOptions>) => {
    if (state.isOpen) {
      close()
    } else {
      open(options)
    }
  }, [state.isOpen, open, close])

  // Update options without changing open state
  const updateOptions = useCallback((options: Partial<DialogOptions>) => {
    setState(prev => ({
      ...prev,
      options: { ...prev.options, ...options }
    }))
  }, [])

  // Handle backdrop clicks
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (state.options.preventBackdropClose) {
      event.preventDefault()
      return
    }
    close()
  }, [state.options.preventBackdropClose, close])

  // Handle escape key
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && state.isOpen) {
      if (state.options.preventEscapeClose) {
        event.preventDefault()
        return
      }
      close()
    }
  }, [state.isOpen, state.options.preventEscapeClose, close])

  // Set up escape key listener
  useEffect(() => {
    if (state.isOpen) {
      document.addEventListener('keydown', handleEscapeKey)
      return () => document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [state.isOpen, handleEscapeKey])

  // Handle route changes (close dialog when navigating)
  useEffect(() => {
    if (state.options.closeOnRouteChange && state.isOpen) {
      // Listen for navigation changes (works with Next.js and most React routers)
      const handlePopState = () => close()
      window.addEventListener('popstate', handlePopState)
      
      return () => {
        window.removeEventListener('popstate', handlePopState)
      }
    }
  }, [state.options.closeOnRouteChange, state.isOpen, close])

  return {
    // State
    isOpen: state.isOpen,
    options: state.options,
    
    // Actions
    open,
    close,
    toggle,
    updateOptions,
    
    // Event handlers
    handleBackdropClick,
    handleEscapeKey,
    
    // Refs
    dialogRef,
    previousFocusRef
  }
}

/**
 * Simple dialog hook for basic use cases
 */
export function useSimpleDialog(defaultOpen = false) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(prev => !prev), [])
  
  return { isOpen, open, close, toggle }
}

/**
 * Hook for managing multiple dialogs with unique identifiers
 */
export function useDialogManager() {
  const [dialogs, setDialogs] = useState<Record<string, boolean>>({})
  
  const openDialog = useCallback((id: string) => {
    setDialogs(prev => ({ ...prev, [id]: true }))
  }, [])
  
  const closeDialog = useCallback((id: string) => {
    setDialogs(prev => ({ ...prev, [id]: false }))
  }, [])
  
  const toggleDialog = useCallback((id: string) => {
    setDialogs(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])
  
  const closeAllDialogs = useCallback(() => {
    setDialogs({})
  }, [])
  
  const isDialogOpen = useCallback((id: string) => {
    return Boolean(dialogs[id])
  }, [dialogs])
  
  return {
    dialogs,
    openDialog,
    closeDialog,
    toggleDialog,
    closeAllDialogs,
    isDialogOpen
  }
}