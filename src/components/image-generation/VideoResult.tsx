'use client'

import { useRef, useEffect } from 'react'
import { Download, Database } from 'lucide-react'

interface VideoResultProps {
  taskId: string
  isChecking: boolean
  videoBlob?: Blob | null
  onCheckStatus: () => void
  onDownload: () => void
  onSaveToAirtable?: () => void
  isSavingToAirtable?: boolean
}

export function VideoResult({ taskId, isChecking, videoBlob, onCheckStatus, onDownload, onSaveToAirtable, isSavingToAirtable }: VideoResultProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoBlob && videoRef.current) {
      const url = URL.createObjectURL(videoBlob)
      videoRef.current.src = url
      return () => URL.revokeObjectURL(url)
    }
  }, [videoBlob])

  // Determine task ID type and styling
  const isSpecialTaskId = taskId.startsWith('temp-') || taskId.startsWith('fallback-') || taskId.startsWith('error-')
  const taskIdBgClass = isSpecialTaskId ? 'bg-amber-50 border border-amber-200' : 'bg-gray-100'
  const taskIdTextClass = isSpecialTaskId ? 'text-amber-800' : 'text-gray-800'

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center justify-center size-7 rounded-full bg-cyan-100 text-cyan-700 text-sm font-medium">
          4
        </span>
        <h2 className="text-xl font-semibold">Wait for the video to be processed</h2>
      </div>

      {!videoBlob && (
        <div>
          <p className="text-sm text-gray-600 font-medium">Task ID:</p>
          <div className={`mt-1 p-3 rounded-lg font-mono text-sm break-all ${taskIdBgClass} ${taskIdTextClass}`}>
            {taskId}
          </div>
          
          {isSpecialTaskId && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Notice:</strong> This is a temporary task ID. The video generation may not have started properly. 
                Please try generating the video again if status checking doesn't work.
              </p>
            </div>
          )}
          
          <button
            onClick={onCheckStatus}
            disabled={isChecking}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-600 text-white px-5 py-2 hover:bg-cyan-700 transition-all text-sm disabled:opacity-50"
          >
            {isChecking && (
              <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"></path>
              </svg>
            )}
            <span>Check Video Status</span>
          </button>
        </div>
      )}

      {videoBlob && (
        <div className="mt-6">
          <div className="relative min-h-56 border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50">
            <video 
              ref={videoRef}
              className="w-full h-auto rounded-lg" 
              controls
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={onDownload}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 transition-all text-sm"
            >
              <Download className="size-4" />
              Download Video
            </button>
            
            {onSaveToAirtable && (
              <button
                onClick={() => {
                  console.log('🎯 VideoResult: Save button clicked!')
                  onSaveToAirtable()
                }}
                disabled={isSavingToAirtable}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingToAirtable && (
                  <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"></path>
                  </svg>
                )}
                <Database className="size-4" />
                <span>Save to Airtable</span>
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}