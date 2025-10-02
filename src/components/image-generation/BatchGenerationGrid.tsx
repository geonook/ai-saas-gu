'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Archive, Package, Bookmark } from 'lucide-react'
import type { GenerationJob } from '@/hooks/useImageGeneration'
import { useToast } from '@/components/ui/toast'

interface BatchGenerationGridProps {
  jobs: GenerationJob[]
  isGenerating: boolean
  activeJobId: string | null
  onSelect: (jobId: string) => void
  onRetry: (jobId: string) => void
  onCancel: () => void
  onSaveBatchToSnapshots?: (jobIds: string[]) => void
  onSaveAllCompleted?: () => void
}

interface BatchJobCardProps {
  job: GenerationJob
  index: number
  isActive: boolean
  isBusy: boolean
  onSelect: (jobId: string) => void
  onRetry: (jobId: string) => void
  onImageClick?: (jobId: string) => void
  isSelected?: boolean
  onToggleSelect?: (jobId: string) => void
}

function BatchJobCard({ job, index, isActive, isBusy, onSelect, onRetry, onImageClick, isSelected = false, onToggleSelect }: BatchJobCardProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (job.result) {
      const url = URL.createObjectURL(job.result)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreviewUrl(null)
    return undefined
  }, [job.result])

  const statusLabel = useMemo(() => {
    switch (job.status) {
      case 'pending':
        return 'Queued'
      case 'running':
        return 'Generating…'
      case 'completed':
        return 'Completed'
      case 'failed':
        return 'Failed'
      case 'cancelled':
        return 'Cancelled'
      default:
        return 'Unknown'
    }
  }, [job.status])

  const statusBadge = useMemo(() => {
    switch (job.status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="size-3.5" />
            Done
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
            <AlertTriangle className="size-3.5" />
            Failed
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
            <XCircle className="size-3.5" />
            Cancelled
          </span>
        )
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
            <Loader2 className="size-3.5 animate-spin" />
            Generating…
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
            In queue
          </span>
        )
    }
  }, [job.status])

  const canInteract = job.status === 'completed'

  const handleImageClick = () => {
    if (!canInteract) return
    onImageClick?.(job.id)
  }

  const handleImageKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!canInteract) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onImageClick?.(job.id)
    }
  }

  return (
    <div
      className={`rounded-xl border px-4 py-3 shadow-sm transition relative ${
        isActive
          ? 'border-emerald-400 ring-2 ring-emerald-200'
          : isSelected
          ? 'border-blue-400 ring-2 ring-blue-200'
          : 'border-gray-200'
      }`}
    >
      {/* Selection checkbox for completed jobs */}
      {job.status === 'completed' && onToggleSelect && (
        <div className="absolute top-2 left-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleSelect(job.id)
            }}
            className={`size-5 rounded border-2 transition-all ${
              isSelected
                ? 'bg-blue-500 border-blue-500'
                : 'border-gray-300 hover:border-blue-400'
            }`}
            aria-label={isSelected ? 'Deselect' : 'Select'}
          >
            {isSelected && (
              <CheckCircle2 className="size-3 text-white" strokeWidth={3} />
            )}
          </button>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-800">Variation #{index + 1}</p>
        </div>
        {statusBadge}
      </div>

      <div
        className={`mt-3 h-40 rounded-lg overflow-hidden flex items-center justify-center relative transition ${
          canInteract ? 'bg-gray-50 cursor-pointer group focus-within:ring-2 focus-within:ring-emerald-300' : 'bg-gray-100'
        }`}
        role={canInteract ? 'button' : undefined}
        tabIndex={canInteract ? 0 : undefined}
        onClick={canInteract ? handleImageClick : undefined}
        onKeyDown={canInteract ? handleImageKeyDown : undefined}
        aria-disabled={!canInteract}
      >
        {previewUrl && job.status === 'completed' ? (
          <img
            src={previewUrl}
            alt={`Variation ${index + 1}`}
            className="h-full w-full object-cover transition group-hover:brightness-105"
          />
        ) : job.status === 'running' ? (
          <Loader2 className="size-6 animate-spin text-gray-500" />
        ) : (
          <span className="text-xs text-gray-500">{statusLabel}</span>
        )}
        {canInteract && (
          <div className="pointer-events-none absolute inset-0 rounded-lg border border-transparent transition group-hover:border-emerald-300" />
        )}
      </div>

      {job.error && (
        <p className="mt-3 text-xs text-red-600">{job.error}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => (onImageClick ? onImageClick(job.id) : onSelect(job.id))}
          disabled={job.status !== 'completed'}
          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition ${
            job.status === 'completed'
              ? job.savedToSnapshot
                ? 'bg-green-50 text-green-700 border border-green-200'
                : isActive
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {job.savedToSnapshot ? (
            <>
              <Bookmark className="size-3.5" />
              Saved
            </>
          ) : (
            'Add to Snapshots'
          )}
        </button>
        {(job.status === 'failed' || job.status === 'cancelled') && (
          <button
            type="button"
            onClick={() => onRetry(job.id)}
            disabled={isBusy}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition ${
              isBusy ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <RefreshCw className="size-3.5" />
            Retry
          </button>
        )}
      </div>
    </div>
  )
}

export function BatchGenerationGrid({ jobs, isGenerating, activeJobId, onSelect, onRetry, onCancel, onSaveBatchToSnapshots, onSaveAllCompleted }: BatchGenerationGridProps) {
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set())
  if (jobs.length === 0) {
    return null
  }

  const total = jobs.length
  const completed = jobs.filter((job) => job.status === 'completed').length
  const failed = jobs.filter((job) => job.status === 'failed').length
  const running = jobs.filter((job) => job.status === 'running').length

  const { infoToast } = useToast()
  const [hasShownImageHint, setHasShownImageHint] = useState(false)

  const completedJobs = useMemo(() =>
    jobs.filter(job => job.status === 'completed' && job.result),
    [jobs]
  )

  const unsavedCompletedJobs = useMemo(() =>
    completedJobs.filter(job => !job.savedToSnapshot),
    [completedJobs]
  )

  const handleToggleSelect = useCallback((jobId: string) => {
    setSelectedJobIds(prev => {
      const next = new Set(prev)
      if (next.has(jobId)) {
        next.delete(jobId)
      } else {
        next.add(jobId)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    const unsavedJobIds = unsavedCompletedJobs.map(job => job.id)
    setSelectedJobIds(new Set(unsavedJobIds))
  }, [unsavedCompletedJobs])

  const handleDeselectAll = useCallback(() => {
    setSelectedJobIds(new Set())
  }, [])

  const handleSaveSelected = useCallback(() => {
    if (selectedJobIds.size > 0 && onSaveBatchToSnapshots) {
      onSaveBatchToSnapshots(Array.from(selectedJobIds))
      setSelectedJobIds(new Set())
    }
  }, [selectedJobIds, onSaveBatchToSnapshots])

  // Clear selections when jobs change
  useEffect(() => {
    setSelectedJobIds(prev => {
      const currentJobIds = new Set(jobs.map(job => job.id))
      const filtered = new Set(Array.from(prev).filter(id => currentJobIds.has(id)))
      return filtered
    })
  }, [jobs])

  const handleImageSelect = useCallback((jobId: string) => {
    onSelect(jobId)
    if (!hasShownImageHint) {
      infoToast.general('已加入快照', '也可以直接點圖再次加入。')
      setHasShownImageHint(true)
    }
  }, [onSelect, hasShownImageHint, infoToast])

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          Progress: {completed}/{total} completed
          {failed > 0 ? ` • ${failed} failed` : ''}
          {running > 0 ? ` • ${running} in progress` : ''}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isGenerating && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              Cancel Batch
            </button>
          )}
        </div>
      </div>

      {/* Batch save controls */}
      {!isGenerating && unsavedCompletedJobs.length > 0 && onSaveBatchToSnapshots && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-blue-800">
              {selectedJobIds.size > 0 ? (
                `Selected ${selectedJobIds.size} of ${unsavedCompletedJobs.length} unsaved results`
              ) : (
                `${unsavedCompletedJobs.length} results ready to save to snapshots`
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {unsavedCompletedJobs.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={selectedJobIds.size === unsavedCompletedJobs.length ? handleDeselectAll : handleSelectAll}
                    className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100"
                  >
                    {selectedJobIds.size === unsavedCompletedJobs.length ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedJobIds.size > 0 && (
                    <button
                      type="button"
                      onClick={handleSaveSelected}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                    >
                      <Package className="size-4" />
                      Save Selected ({selectedJobIds.size})
                    </button>
                  )}
                </>
              )}
              {onSaveAllCompleted && (
                <button
                  type="button"
                  onClick={onSaveAllCompleted}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
                >
                  <Archive className="size-4" />
                  Save All Completed
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {jobs.map((job, index) => (
          <BatchJobCard
            key={job.id}
            job={job}
            index={index}
            isActive={activeJobId === job.id}
            isBusy={isGenerating}
            onSelect={onSelect}
            onRetry={onRetry}
            onImageClick={handleImageSelect}
            isSelected={selectedJobIds.has(job.id)}
            onToggleSelect={onSaveBatchToSnapshots ? handleToggleSelect : undefined}
          />
        ))}
      </div>
    </div>
  )
}
