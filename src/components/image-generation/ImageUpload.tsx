'use client'

import { useRef, useState } from 'react'
import { Upload, Database } from 'lucide-react'
import { CharacterSelectionModal } from './modals/CharacterSelectionModal'

interface ImageUploadProps {
  onFileUpload: (file: File) => void
}

export function ImageUpload({ onFileUpload }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [showCharacterModal, setShowCharacterModal] = useState(false)

  const handleFileSelect = (files: FileList | null) => {
    if (files && files[0]) {
      onFileUpload(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleDatabaseClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowCharacterModal(true)
  }

  const handleCharacterSelect = (file: File) => {
    onFileUpload(file)
    setShowCharacterModal(false)
  }

  return (
    <>
      <div>
        {/* Drag & Drop Area */}
        <div
          onClick={handleUploadClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer select-none bg-gray-50 hover:bg-gray-100 transition ${
            isDragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            className="sr-only"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          
          <div className="flex flex-col items-center">
            <Upload className="size-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-700">
              <span className="font-medium">Click to upload</span> or drag & drop
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Images (PNG, JPG, WEBP)
            </p>
          </div>
        </div>

        {/* Database Selection Button */}
        <div className="mt-3">
          <button
            onClick={handleDatabaseClick}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Database className="size-4" />
            <span>Select Character</span>
          </button>
        </div>
      </div>

      {/* Character Selection Modal */}
      {showCharacterModal && (
        <CharacterSelectionModal
          onSelectCharacter={handleCharacterSelect}
          onClose={() => setShowCharacterModal(false)}
        />
      )}
    </>
  )
}