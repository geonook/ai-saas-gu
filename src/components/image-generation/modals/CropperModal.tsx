'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface CropperModalProps {
  imageBlob: Blob
  onConfirm: (croppedBlob: Blob) => void
  onCancel: () => void
}

interface AspectRatioOption {
  label: string
  ratio: number | null
  stringRatio: string
}

const aspectRatioOptions: AspectRatioOption[] = [
  { label: '1:1', ratio: 1, stringRatio: '1:1' },
  { label: '16:9', ratio: 16/9, stringRatio: '16:9' },
  { label: '9:16', ratio: 9/16, stringRatio: '9:16' },
  { label: 'Free', ratio: null, stringRatio: 'free' },
]

export function CropperModal({ imageBlob, onConfirm, onCancel }: CropperModalProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const cropperRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)
  const [selectedRatio, setSelectedRatio] = useState<AspectRatioOption>(aspectRatioOptions[3])

  // Initialize cropper when image loads
  useEffect(() => {
    const imageUrl = URL.createObjectURL(imageBlob)
    
    if (imgRef.current) {
      imgRef.current.src = imageUrl
      imgRef.current.onload = () => {
        if (typeof window !== 'undefined' && imgRef.current && !cropperRef.current) {
          // Dynamically import Cropper.js to avoid SSR issues
          import('cropperjs').then(({ default: Cropper }) => {
            if (imgRef.current && !cropperRef.current) {
              cropperRef.current = new Cropper(imgRef.current, {
                viewMode: 1, // Restrict the crop box to not exceed the size of the canvas
                dragMode: 'move', // Move the canvas
                initialAspectRatio: NaN, // Free aspect ratio initially
                aspectRatio: NaN, // Free aspect ratio
                autoCropArea: 1.0, // Initial crop area covers full image for transparency
                responsive: true, // Re-render on window resize
                restore: false, // Don't restore after window resize
                modal: false, // No black modal background
                guides: true, // Show guidelines
                center: true, // Show center indicator
                highlight: true, // Show white modal to highlight crop area
                background: true, // Show grid background
                zoomable: true, // Allow zooming
                zoomOnTouch: true, // Allow zoom on touch
                zoomOnWheel: true, // Allow zoom on mouse wheel
                wheelZoomRatio: 0.1, // Zoom ratio when using mouse wheel
                ready: () => setIsReady(true)
              })
            }
          }).catch((error) => {
            console.error('Failed to load Cropper.js:', error)
          })
        }
      }
    }

    return () => {
      URL.revokeObjectURL(imageUrl)
      if (cropperRef.current) {
        try {
          cropperRef.current.destroy()
        } catch (e) {
          console.warn('Error destroying cropper:', e)
        }
        cropperRef.current = null
      }
      setIsReady(false)
    }
  }, [imageBlob])

  const handleRatioChange = (option: AspectRatioOption) => {
    setSelectedRatio(option)
    if (cropperRef.current && isReady) {
      try {
        const aspectRatio = option.ratio === null ? NaN : option.ratio
        cropperRef.current.setAspectRatio(aspectRatio)
      } catch (e) {
        console.warn('Error setting aspect ratio:', e)
      }
    }
  }

  const handleConfirm = async () => {
    if (!cropperRef.current || !isReady) return

    try {
      const croppedCanvas = cropperRef.current.getCroppedCanvas()
      if (croppedCanvas) {
        croppedCanvas.toBlob((blob: Blob | null) => {
          if (blob) {
            onConfirm(blob)
          }
        }, 'image/png')
      }
    } catch (e) {
      console.error('Error cropping image:', e)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Crop Image</h3>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="bg-gray-100 rounded-lg overflow-hidden" style={{ height: '70vh' }}>
          <img
            ref={imgRef}
            alt="Image for cropping"
            className="block max-w-full"
            style={{ maxHeight: '100%' }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium text-gray-600">Aspect Ratio:</p>
          {aspectRatioOptions.map((option) => (
            <button
              key={option.label}
              onClick={() => handleRatioChange(option)}
              className={`px-3 py-1 rounded-lg text-sm border transition ${
                selectedRatio.label === option.label
                  ? 'bg-blue-100 text-blue-700 border-blue-200'
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-blue-100 hover:text-blue-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl bg-gray-100 text-gray-700 px-5 py-2 hover:bg-gray-200 transition-all border border-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="rounded-xl bg-blue-600 text-white px-5 py-2 hover:bg-blue-700 transition-all"
          >
            Confirm Crop
          </button>
        </div>
      </div>
    </div>
  )
}