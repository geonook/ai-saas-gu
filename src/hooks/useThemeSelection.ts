'use client'

import { useState, useCallback, useRef } from 'react'

export interface Theme {
  id: string
  name: string
  imageUrl: string
  imageFilename: string
  imageSize: number
  imageType: string
  createdTime: string
}

interface UseThemeSelectionReturn {
  // State
  themes: Theme[]
  isLoading: boolean
  error: string | null
  selectedTheme: Theme | null
  
  // Actions
  fetchThemes: () => Promise<void>
  selectTheme: (theme: Theme) => void
  clearSelection: () => void
  clearError: () => void
  
  // Utility
  convertImageUrlToFile: (imageUrl: string, filename: string) => Promise<File | null>
}

export function useThemeSelection(): UseThemeSelectionReturn {
  const [themes, setThemes] = useState<Theme[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null)
  const isLoadingRef = useRef(false)

  // Show error with auto-dismiss
  const showError = useCallback((message: string) => {
    setError(message)
    setTimeout(() => setError(null), 5000)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Fetch themes from API
  const fetchThemes = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('🚫 Fetch already in progress, skipping duplicate request')
      return // Prevent duplicate requests
    }
    
    console.log('🔍 Starting to fetch themes from API...')
    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/themes', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch themes`)
      }

      const data = await response.json()
      console.log('✅ Successfully fetched themes:', data.themes.length)
      
      setThemes(data.themes || [])
      
      if (data.themes.length === 0) {
        showError('No themes found in the database.')
      }
      
    } catch (err) {
      console.error('❌ Error fetching themes:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch themes'
      showError(errorMessage)
      setThemes([])
    } finally {
      console.log('🏁 Fetch completed, cleaning up...')
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [showError])

  // Select a theme
  const selectTheme = useCallback((theme: Theme) => {
    console.log('📝 Selected theme:', theme.name, theme.id)
    setSelectedTheme(theme)
  }, [])

  // Clear selection
  const clearSelection = useCallback(() => {
    console.log('🗑️ Cleared theme selection')
    setSelectedTheme(null)
  }, [])

  // Convert image URL to File object
  const convertImageUrlToFile = useCallback(async (imageUrl: string, filename: string): Promise<File | null> => {
    try {
      console.log('🔄 Converting image URL to File:', imageUrl)
      
      // Validate URL
      if (!imageUrl || !imageUrl.startsWith('http')) {
        throw new Error('Invalid image URL')
      }

      // Fetch the image
      const response = await fetch(imageUrl)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: HTTP ${response.status}`)
      }

      // Get the blob
      const blob = await response.blob()
      
      if (blob.size === 0) {
        throw new Error('Image file is empty')
      }

      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
      if (!validTypes.includes(blob.type)) {
        throw new Error(`Unsupported image type: ${blob.type}`)
      }

      // Create File object
      const file = new File([blob], filename, { 
        type: blob.type,
        lastModified: Date.now()
      })
      
      console.log('✅ Successfully converted to File:', {
        name: file.name,
        size: file.size,
        type: file.type
      })

      return file
      
    } catch (err) {
      console.error('❌ Error converting image URL to File:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to convert image'
      showError(`Failed to load theme image: ${errorMessage}`)
      return null
    }
  }, [showError])

  return {
    // State
    themes,
    isLoading,
    error,
    selectedTheme,
    
    // Actions
    fetchThemes,
    selectTheme,
    clearSelection,
    clearError,
    
    // Utility
    convertImageUrlToFile,
  }
}