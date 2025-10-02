'use client'

import { useState, useEffect } from 'react'
import { X, Database, Search, User } from 'lucide-react'
import { useCharacterSelection, Character } from '@/hooks/useCharacterSelection'

interface CharacterSelectionModalProps {
  onSelectCharacter: (file: File) => void
  onClose: () => void
}

export function CharacterSelectionModal({ onSelectCharacter, onClose }: CharacterSelectionModalProps) {
  const {
    characters,
    isLoading,
    error,
    selectedCharacter,
    fetchCharacters,
    selectCharacter,
    clearSelection,
    clearError,
    convertImageUrlToFile,
  } = useCharacterSelection()

  const [searchTerm, setSearchTerm] = useState('')
  const [isConverting, setIsConverting] = useState(false)

  // Filter characters based on search term
  const filteredCharacters = characters.filter(character =>
    character.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Fetch characters when modal opens (only once)
  useEffect(() => {
    console.log('🎯 CharacterSelectionModal mounted, fetching characters...')
    fetchCharacters()
  }, [])

  // Handle character selection and conversion
  const handleSelectCharacter = async (character: Character) => {
    selectCharacter(character)
    setIsConverting(true)
    
    try {
      const file = await convertImageUrlToFile(character.imageUrl, character.imageFilename)
      
      if (file) {
        console.log('✅ Character file converted successfully:', file.name)
        onSelectCharacter(file)
        onClose()
      } else {
        console.error('❌ Failed to convert character image to file')
      }
    } catch (err) {
      console.error('❌ Error in handleSelectCharacter:', err)
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="size-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Select Character</h2>
              <p className="text-sm text-gray-500">Choose a character from the database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="size-5 text-gray-500" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search characters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-400"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
              <span className="text-red-800 text-sm">{error}</span>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-800 text-sm underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-gray-600">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span>Loading characters...</span>
              </div>
            </div>
          )}

          {/* Converting State */}
          {isConverting && (
            <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-10">
              <div className="bg-white rounded-lg p-6 shadow-xl">
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span>Loading character image...</span>
                </div>
              </div>
            </div>
          )}

          {/* Characters Grid */}
          {!isLoading && filteredCharacters.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredCharacters.map((character) => (
                <div
                  key={character.id}
                  onClick={() => handleSelectCharacter(character)}
                  className={`
                    group cursor-pointer border-2 rounded-xl overflow-hidden transition-all hover:shadow-lg
                    ${selectedCharacter?.id === character.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}
                  `}
                >
                  {/* Image */}
                  <div className="aspect-square relative bg-gray-100">
                    <img
                      src={character.imageUrl}
                      alt={character.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = '/placeholder-character.png' // Fallback image
                        target.onerror = null // Prevent infinite loop
                      }}
                    />
                  </div>
                  
                  {/* Info */}
                  <div className="p-3 bg-white">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="size-3 text-gray-400" />
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {character.name}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500">
                      {Math.round(character.imageSize / 1024)}KB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && characters.length > 0 && filteredCharacters.length === 0 && (
            <div className="text-center py-12">
              <Search className="size-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No matching characters</h3>
              <p className="text-gray-500">Try adjusting your search term</p>
            </div>
          )}

          {/* No Characters State */}
          {!isLoading && characters.length === 0 && !error && (
            <div className="text-center py-12">
              <Database className="size-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No characters found</h3>
              <p className="text-gray-500 mb-4">The character database appears to be empty</p>
              <button
                onClick={fetchCharacters}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            {filteredCharacters.length} character{filteredCharacters.length !== 1 ? 's' : ''} available
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}