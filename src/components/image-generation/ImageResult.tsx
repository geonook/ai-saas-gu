'use client'

import { useEffect, useRef } from 'react'
import { Download, Scissors } from 'lucide-react'

interface ImageResultProps {
  generatedImageBlob?: Blob | null
  isGenerating: boolean
  onDownload: () => void
  onCrop: () => void
  onContinueEditing?: () => void | Promise<void>
}

export function ImageResult({ generatedImageBlob, isGenerating, onDownload, onCrop, onContinueEditing }: ImageResultProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (generatedImageBlob && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        const img = new Image()
        const imageUrl = URL.createObjectURL(generatedImageBlob)
        img.onload = () => {
          canvas.width = img.width
          canvas.height = img.height
          ctx.drawImage(img, 0, 0)
          URL.revokeObjectURL(imageUrl)
        }
        img.src = imageUrl
      }
    }
  }, [generatedImageBlob])

  return (
    <div className="mt-6 relative">
      <div className="min-h-56 border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50">
        {!generatedImageBlob && !isGenerating && (
          <div className="text-gray-500 text-sm text-center">
            Your generated image will appear here.
          </div>
        )}
        
        {generatedImageBlob && (
          <canvas 
            ref={canvasRef}
            className="w-full h-auto rounded-lg"
          />
        )}
      </div>

      {isGenerating && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-xl grid place-items-center">
          <div className="flex items-center gap-3 text-gray-700 text-sm">
            <svg className="animate-spin size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"></path>
            </svg>
            <span>Generating Image…</span>
          </div>
        </div>
      )}

      {generatedImageBlob && !isGenerating && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={onDownload}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 transition-all text-sm"
          >
            <Download className="size-4" />
            Download Image
          </button>
          <button
            onClick={onCrop}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-100 text-gray-700 px-4 py-2 hover:bg-gray-200 transition-all text-sm border border-gray-200"
          >
            <Scissors className="size-4" />
            Crop Image
          </button>
          {onContinueEditing && (
            <button
              onClick={onContinueEditing}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700 transition-all text-sm"
            >
              Continue Editing
            </button>
          )}
        </div>
      )}
    </div>
  )
}
