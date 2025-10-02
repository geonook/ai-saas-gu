'use client'

import { useState, useCallback, useRef } from 'react'

export interface Character {
  id: string
  name: string
  imageUrl: string
  imageFilename: string
  imageSize: number
  imageType: string
  createdTime: string
}

interface UseCharacterSelectionReturn {
  // State
  characters: Character[]
  isLoading: boolean
  error: string | null
  selectedCharacter: Character | null
  
  // Actions
  fetchCharacters: () => Promise<void>
  selectCharacter: (character: Character) => void
  clearSelection: () => void
  clearError: () => void
  
  // Utility
  convertImageUrlToFile: (imageUrl: string, filename: string) => Promise<File | null>
}

export function useCharacterSelection(): UseCharacterSelectionReturn {
  const [characters, setCharacters] = useState<Character[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const isLoadingRef = useRef(false)

  // Show error with auto-dismiss
  const showError = useCallback((message: string) => {
    setError(message)
    setTimeout(() => setError(null), 5000)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Fetch characters from API
  const fetchCharacters = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('🚫 Fetch already in progress, skipping duplicate request')
      return // Prevent duplicate requests
    }
    
    console.log('🔍 Starting to fetch characters from API...')
    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/characters', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch characters`)
      }

      const data = await response.json()
      console.log('✅ Successfully fetched characters:', data.characters.length)
      
      setCharacters(data.characters || [])
      
      if (data.characters.length === 0) {
        showError('No characters found in the database.')
      }
      
    } catch (err) {
      console.error('❌ Error fetching characters:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch characters'
      showError(errorMessage)
      setCharacters([])
    } finally {
      console.log('🏁 Fetch completed, cleaning up...')
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [showError])

  // Select a character
  const selectCharacter = useCallback((character: Character) => {
    console.log('📝 Selected character:', character.name, character.id)
    setSelectedCharacter(character)
  }, [])

  // Clear selection
  const clearSelection = useCallback(() => {
    console.log('🗑️ Cleared character selection')
    setSelectedCharacter(null)
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
      showError(`Failed to load character image: ${errorMessage}`)
      return null
    }
  }, [showError])

  return {
    // State
    characters,
    isLoading,
    error,
    selectedCharacter,
    
    // Actions
    fetchCharacters,
    selectCharacter,
    clearSelection,
    clearError,
    
    // Utility
    convertImageUrlToFile,
  }
}