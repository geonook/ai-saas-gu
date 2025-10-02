'use client'

import { useRef, useState, useEffect } from 'react'
import { Upload, Database } from 'lucide-react'
import { ProductSelectionModal, ThemeSelectionModal } from '@/components/image-generation/modals'

interface ProductUploadProps {
  onFileUpload: (file: File) => void
  onReset?: () => void
  imageFile?: File | null
}

export function ProductUpload({ onFileUpload, onReset, imageFile }: ProductUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showThemeModal, setShowThemeModal] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (imageFile) {
      const img = new Image()
      const imageUrl = URL.createObjectURL(imageFile)
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(imageUrl)
      }
      img.src = imageUrl
      return () => {
        URL.revokeObjectURL(imageUrl)
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [imageFile])

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

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleSelectProduct = (file: File) => {
    onFileUpload(file)
    setShowProductModal(false)
  }

  const handleSelectTheme = (file: File) => {
    onFileUpload(file)
    setShowThemeModal(false)
  }

  return (
    <div>
      {/* Drag & Drop Area */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer select-none bg-gray-50 hover:bg-gray-100 transition ${
          isDragActive 
            ? 'border-purple-500 bg-purple-50' 
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

      {/* Action Buttons */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => setShowProductModal(true)}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
        >
          <Database className="size-4" />
          <span>Select Product</span>
        </button>
        <button
          onClick={() => setShowThemeModal(true)}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          <Database className="size-4" />
          <span>Select Theme</span>
        </button>
        {onReset && imageFile && (
          <button
            onClick={onReset}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>
        )}
      </div>

      {imageFile && (
        <div className="mt-3">
          <div className="border rounded-xl overflow-hidden">
            <canvas ref={canvasRef} className="w-full h-auto block" />
          </div>
        </div>
      )}

      {/* Product Selection Modal */}
      {showProductModal && (
        <ProductSelectionModal
          onSelectProduct={handleSelectProduct}
          onClose={() => setShowProductModal(false)}
        />
      )}

      {/* Theme Selection Modal */}
      {showThemeModal && (
        <ThemeSelectionModal
          onSelectTheme={handleSelectTheme}
          onClose={() => setShowThemeModal(false)}
        />
      )}
    </div>
  )
}
